/* Prova do cabeçalho sobre bauer-hub-v2, com sessão fictícia em perfil descartável.
 * Exige Playwright e pngjs disponíveis no ambiente; não usa dados ou senhas do operador.
 */
const { chromium } = require('playwright');
const { PNG } = require('pngjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const base = process.env.BASE_URL || 'http://127.0.0.1:8931';
const original = process.env.BASELINE_URL || 'http://127.0.0.1:8934';
const destino = process.env.HEADER_QA_DIR || fs.mkdtempSync(path.join(os.tmpdir(), 'header-v2-provas-'));
const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'IA-Codex-header-v2-'));
const resultado = { base, original, baseline: '7fc911c', casos: [], erros: [] };
fs.mkdirSync(destino, { recursive: true });

async function aguardar(pagina) {
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.waitForTimeout(420); // Inclui a transição original de 340ms.
}

async function rolar(pagina, delta) {
  await pagina.evaluate(() => {
    window.__fimRolagemQA = new Promise(resolve => {
      const fim = () => { clearTimeout(limite); removeEventListener('scrollend', fim); resolve(); };
      const limite = setTimeout(fim, 1000); // Também termina quando já está no limite da página.
      addEventListener('scrollend', fim, { once: true });
    });
  });
  await pagina.mouse.wheel(0, delta);
  await pagina.evaluate(() => window.__fimRolagemQA);
  await aguardar(pagina);
}

async function abrir(pagina, origem, entrada) {
  await pagina.goto(`${origem}/${entrada}?test=1#pre-natal-rotina`);
  await pagina.waitForFunction(() => window.__HUB_TEST__?.state.topic && window.HubNav);
  await aguardar(pagina);
}

async function medir(pagina) {
  return pagina.evaluate(() => {
    const caixa = seletor => {
      const e = document.querySelector(seletor), r = e.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height, bottom: r.bottom, documentoY: r.y + scrollY };
    };
    return {
      y: scrollY, largura: innerWidth, larguraDocumento: document.documentElement.scrollWidth,
      marca: document.querySelector('.brand strong').textContent,
      bar: caixa('header.appbar'), faixa: caixa('#workspaceView > .workspace-toolbar'),
      print: caixa('#printBtn'), hoje: caixa('#todayBtn'), novo: caixa('#newPatientBtn'),
      acoes: document.querySelector('.actions-panel').outerHTML,
      lateral: ['printBtn', 'todayBtn', 'newPatientBtn'].every(id => !!document.querySelector(`.side-panel #${id}`)),
    };
  });
}

function aberto(m, nome, inicio = false) {
  assert.ok(Math.abs(m.bar.y) <= 1, `${nome}: cabeçalho não encosta no topo`);
  assert.ok(Math.abs(m.faixa.y - m.bar.bottom) <= 1, `${nome}: faixa separada do cabeçalho`);
  if (inicio) assert.ok(m.y <= 1, `${nome}: início deslocado ${m.y}px`);
}

function preservarLateral(antes, depois, nome) {
  assert.equal(depois.marca, 'Receituários Orquestrador', `${nome}: fonte errada`);
  assert.equal(depois.lateral, true, `${nome}: ação saiu da lateral`);
  assert.equal(depois.acoes, antes.acoes, `${nome}: HTML da lateral mudou`);
  for (const id of ['print', 'hoje', 'novo']) {
    for (const eixo of ['x', 'documentoY', 'w', 'h']) {
      assert.ok(Math.abs(antes[id][eixo] - depois[id][eixo]) <= 1, `${nome}: ${id}.${eixo} mudou`);
    }
  }
  assert.ok(depois.larguraDocumento <= antes.larguraDocumento + 1, `${nome}: novo overflow`);
}

async function conferirPixelsLateral(pagina, entrada, imagemAntes) {
  // Captura o elemento real, sem reconstruir a folha ou modificar CSS para o teste.
  const imagemDepois = await pagina.locator('.actions-panel').screenshot({ animations: 'disabled' });
  const a = PNG.sync.read(imagemAntes), b = PNG.sync.read(imagemDepois);
  assert.equal(b.width, a.width);
  assert.equal(b.height, a.height);
  assert.ok(a.data.equals(b.data), `${entrada}: pixels do painel lateral mudaram`);
  fs.writeFileSync(path.join(destino, `${entrada}-acoes-preservadas.png`), imagemDepois);
}

async function caso(pagina, entrada, largura, altura) {
  const nome = `${entrada}-${largura}`;
  await pagina.setViewportSize({ width: largura, height: altura });
  await abrir(pagina, original, entrada);
  const antes = await medir(pagina);
  const pixelsAntes = largura === 1440 ? await pagina.locator('.actions-panel').screenshot({ animations: 'disabled' }) : null;
  await abrir(pagina, base, entrada);
  const inicio = await medir(pagina);
  preservarLateral(antes, inicio, nome);
  aberto(inicio, nome, true);
  await pagina.screenshot({ path: path.join(destino, `${nome}-inicio.png`) });
  if (pixelsAntes) {
    await conferirPixelsLateral(pagina, entrada, pixelsAntes);
    await pagina.evaluate(() => window.HubNav.openTopic('pre-natal-rotina'));
    await aguardar(pagina);
  }
  await pagina.mouse.move(largura - 15, altura - 50);
  await rolar(pagina, 35);
  aberto(await medir(pagina), `${nome}: início da rolagem`);
  await rolar(pagina, 900);
  const descida = await medir(pagina);
  assert.ok(descida.bar.bottom <= 1 && descida.faixa.bottom <= 1, `${nome}: uma faixa permaneceu visível`);
  await pagina.screenshot({ path: path.join(destino, `${nome}-descida.png`) });
  await rolar(pagina, -100);
  aberto(await medir(pagina), `${nome}: subida`);
  await rolar(pagina, 900);
  await pagina.evaluate(() => window.HubNav.openTopic('itu-gestante'));
  await aguardar(pagina);
  aberto(await medir(pagina), `${nome}: troca de doença`, true);

  await pagina.locator('#regimenSelect').selectOption({ index: 1 });
  await pagina.locator('[data-tab="orientation"]').click();
  assert.equal(await pagina.locator('[data-tab="orientation"]').getAttribute('aria-selected'), 'true');
  await pagina.locator('[data-tab="recipe"]').click();
  assert.equal(await pagina.evaluate(() => window.__HUB_TEST__.syncCheck()), true);
  await pagina.locator('#todayBtn').click();
  assert.ok(await pagina.evaluate(() => !!window.__HUB_TEST__.state.patient.date));
  await pagina.locator('#newPatientBtn').click();
  assert.equal(await pagina.evaluate(() => window.__HUB_TEST__.state.patient.date), '');

  await pagina.evaluate(() => document.activeElement.blur());
  await pagina.mouse.move(largura - 15, altura - 50);
  await rolar(pagina, 900);
  await pagina.evaluate(() => document.querySelector('#menuBtn').focus({ preventScroll: true }));
  await aguardar(pagina);
  aberto(await medir(pagina), `${nome}: foco`);
  await pagina.locator('#menuBtn').press('Enter');
  assert.equal(await pagina.locator('#menuBtn').getAttribute('aria-expanded'), 'true');
  await pagina.locator('#closeDrawer').click();
  await pagina.locator('#homeBtn').click();
  await aguardar(pagina);
  assert.equal(await pagina.locator('#workspaceView').isVisible(), false);
  assert.ok(Math.abs((await pagina.locator('header.appbar').boundingBox()).y) <= 1);
  await pagina.evaluate(() => window.HubNav.openDocuments());
  await aguardar(pagina);
  assert.equal(await pagina.locator('#workspaceView').isVisible(), false);
  assert.ok(Math.abs((await pagina.locator('header.appbar').boundingBox()).y) <= 1);

  await pagina.evaluate(() => window.HubNav.openTopic('pre-natal-rotina'));
  await aguardar(pagina);
  await pagina.emulateMedia({ media: 'print' });
  assert.equal(await pagina.locator('header.appbar').isVisible(), false);
  assert.equal(await pagina.locator('#workspaceView').isVisible(), false);
  assert.equal(await pagina.locator('#printPortal').evaluate(e => getComputedStyle(e).display), 'block');
  await pagina.emulateMedia({ media: 'screen', reducedMotion: 'reduce' });
  assert.equal(await pagina.locator('header.appbar').evaluate(e => getComputedStyle(e).transitionDuration), '0s');
  await pagina.emulateMedia({ reducedMotion: 'no-preference' });
  resultado.casos.push({ entrada, largura, altura, lateral: 'HTML e geometria preservados', pixelsLateral: pixelsAntes ? 'idênticos' : 'não aplicável', estado: 'PASS' });
}

async function catalogo(pagina, entrada) {
  await pagina.setViewportSize({ width: 1440, height: 900 });
  await abrir(pagina, base, entrada);
  const dados = await pagina.evaluate(async () => {
    const falhas = [];
    for (const topico of window.__HUB_TEST__.catalog) {
      window.HubNav.openTopic(topico.id);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const bar = document.querySelector('header.appbar').getBoundingClientRect();
      const faixa = document.querySelector('#workspaceView > .workspace-toolbar').getBoundingClientRect();
      if (scrollY > 1 || Math.abs(bar.y) > 1 || Math.abs(faixa.y - bar.bottom) > 1 || !document.querySelector('.actions-panel #printBtn')) falhas.push(topico.id);
    }
    return { quantidade: window.__HUB_TEST__.catalog.length, falhas };
  });
  assert.deepEqual(dados.falhas, [], `${entrada}: tópicos com cabeçalho ou lateral incorretos`);
  resultado.casos.push({ entrada, topicos: dados.quantidade, estado: 'PASS' });
}

(async () => {
  const contexto = await chromium.launchPersistentContext(perfil, { channel: 'chrome', headless: true });
  // Fixture de identidade em armazenamento temporário; nenhum login ou senha real é usado.
  await contexto.addInitScript(() => {
    if (location.hostname === '127.0.0.1') {
      localStorage.clear();
      localStorage.setItem('ubs2026.v1.session', JSON.stringify({ crm: 'TESTE-QA', nome: 'Prévia local de teste', loginAt: '2026-09-20T00:00:00Z' }));
    }
  });
  try {
    const pagina = contexto.pages()[0];
    pagina.on('pageerror', erro => resultado.erros.push(erro.message));
    for (const entrada of ['index.html', 'index-f2.html']) {
      for (const [largura, altura] of [[1440, 900], [390, 844], [320, 568]]) await caso(pagina, entrada, largura, altura);
      await catalogo(pagina, entrada);
    }
    assert.deepEqual(resultado.erros, [], 'Erros JavaScript na fonte correta ou no patch');
    resultado.estado = 'PASS';
  } catch (erro) {
    resultado.estado = 'FAIL';
    resultado.falha = erro.stack;
    process.exitCode = 1;
  } finally {
    fs.writeFileSync(path.join(destino, 'resultado.json'), JSON.stringify(resultado, null, 2) + '\n');
    console.log(JSON.stringify(resultado, null, 2));
    await contexto.close();
    fs.rmSync(perfil, { recursive: true, force: true });
  }
})().catch(erro => { console.error(erro); process.exitCode = 1; });
