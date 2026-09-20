/* Observa a atualização real por temporizador, sem invocar check/recheck/reload. */
const { chromium } = require('playwright');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const esperado = process.argv[2];
if (!/^[0-9a-f]{40}$/.test(esperado || '')) throw new Error('Informe o SHA publicado esperado.');
const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'IA-Codex-pwa-troca-real-'));
const provas = process.env.PWA_LIVE_QA_DIR || fs.mkdtempSync(path.join(os.tmpdir(), 'pwa-publicacao-provas-'));
fs.mkdirSync(provas, { recursive: true });
(async () => {
  const contexto = await chromium.launchPersistentContext(perfil, { channel: 'chrome', headless: true });
  try {
    const pagina = contexto.pages()[0];
    // Semeia a fixture uma única vez na origem. Nenhum initScript a recria após a atualização.
    await pagina.goto('https://bauerfilho.github.io/bauer-hub-v2/icone-app.png');
    await pagina.evaluate(() => {
      localStorage.setItem('ubs2026.v1.session', JSON.stringify({ crm: 'TESTE-QA', nome: 'Prévia local de teste' }));
      localStorage.setItem('qa:sentinela', 'PRESERVAR-NA-ATUALIZACAO');
    });
    let navegacoes = 0;
    let sinaisRota = 0;
    const erros = [];
    // history.replaceState também dispara framenavigated; só DOMContentLoaded conta documentos novos.
    pagina.on('domcontentloaded', () => { navegacoes++; });
    pagina.on('framenavigated', frame => { if (frame === pagina.mainFrame()) sinaisRota++; });
    pagina.on('pageerror', erro => erros.push(erro.message));
    await pagina.goto('https://bauerfilho.github.io/bauer-hub-v2/#pre-natal-rotina');
    await pagina.waitForFunction(() => !!window.OrqPWA);
    const inicial = await pagina.evaluate(() => window.OrqPWA.status().version);
    if (inicial === esperado) throw new Error('A nova edição já carregou inicialmente; não houve observação de troca.');
    const prazoInstalacao = Date.now() + 90000;
    let instalado = false;
    while (Date.now() < prazoInstalacao) {
      instalado = await pagina.evaluate(() => !!navigator.serviceWorker.controller && window.OrqPWA.status().state === 'atual');
      if (instalado) break;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (!instalado) throw new Error('A primeira edição não terminou de instalar; publicação seguinte ainda não deve começar.');
    console.log(JSON.stringify({ estado: 'OBSERVANDO', inicial, esperado }));
    const armazenamentoInicial = await pagina.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])));
    const prazo = Date.now() + 240000;
    let atual = inicial;
    while (Date.now() < prazo) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      try { atual = await pagina.evaluate(() => window.OrqPWA?.status().version); }
      catch (erro) { if (/Execution context was destroyed|Cannot find context/.test(erro.message)) continue; throw erro; }
      if (atual === esperado) break;
    }
    await pagina.waitForLoadState('load');
    await new Promise(resolve => setTimeout(resolve, 2500));
    const armazenamentoFinal = await pagina.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])));
    if (atual !== esperado || navegacoes !== 2 || erros.length || JSON.stringify(armazenamentoInicial) !== JSON.stringify(armazenamentoFinal)) {
      throw new Error(JSON.stringify({ inicial, atual, esperado, navegacoes, erros, storageIgual: JSON.stringify(armazenamentoInicial) === JSON.stringify(armazenamentoFinal) }));
    }
    const prova = { estado: 'PASS', inicial, atual, documentosCarregados: navegacoes, sinaisRota, mesmaJanela: true, gatilho: 'temporizador automático; sem chamadas check/recheck/reload', localStoragePreservado: true, erros };
    fs.writeFileSync(path.join(provas, 'TROCA-AUTOMATICA-EM-PRODUCAO.json'), JSON.stringify(prova, null, 2));
    console.log(JSON.stringify(prova, null, 2));
  } finally {
    await contexto.close();
    fs.rmSync(perfil, { recursive: true, force: true });
  }
})().catch(erro => { console.error(erro); process.exitCode = 1; });
