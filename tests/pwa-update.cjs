/* Prova autoral de atualização PWA: origem estável, duas edições reais e perfil descartável. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const raiz = path.resolve(__dirname, '..');
const destino = process.env.PWA_QA_DIR || fs.mkdtempSync(path.join(os.tmpdir(), 'pwa-provas-'));
const temporario = fs.mkdtempSync(path.join(os.tmpdir(), 'IA-Codex-pwa-'));
const resultado = { casos: [], publicacoes: [], erros: [], escritas: [], requisicoes: [], estado: 'RODANDO' };
const obrigatorias = ['receita', 'atendimento', 'soap', 'guias', 'institucionais', 'pacientes'];
const sentinela = 'QA-RASCUNHO-NAO-PERSISTIR';
const entrada = process.env.PWA_ENTRY || 'index-f2.html';
let edicao = 0, atual, corromper = null, origem, contexto, pagina;
fs.mkdirSync(destino, { recursive: true });

function publicar() {
  const version = `qa-pwa-${String(++edicao).padStart(4, '0')}`;
  const dir = path.join(temporario, version);
  const resumo = JSON.parse(execFileSync('python3', ['scripts/build-pwa.py', '--output', dir, '--version', version], { cwd: raiz, encoding: 'utf8' }));
  const manifesto = JSON.parse(fs.readFileSync(path.join(dir, 'release.json')));
  const nomes = manifesto.assets.map(a => a.url);
  assert.ok(nomes.includes('index.html') && nomes.includes('index-f2.html') && nomes.includes('js/pwa-update.js'));
  assert.ok(nomes.includes('manifest.webmanifest'));
  // Fichas do Orquestrator (25/09): índice, carregador, busca e pedaços precisam estar no pacote para abrir offline.
  for (const n of ['js/fichas-painel.js', 'js/fichas/_indice.js', 'js/meds-index.js', 'js/meds-busca.js']) assert.ok(nomes.includes(n), `faltou no pacote: ${n}`);
  assert.ok(nomes.some(n => /^js\/fichas\/[A-Z0-9]+\.js$/.test(n)), 'nenhum pedaço de ficha no pacote');
  assert.ok(!nomes.includes('sw.js'), 'O worker gerado não pode integrar seu próprio manifesto');
  assert.ok(!nomes.some(n => /(^|\/)(tests|backups|\.git)\//.test(n)));
  for (const ativo of manifesto.assets) {
    const bytes = fs.readFileSync(path.join(dir, decodeURIComponent(ativo.url)));
    assert.equal(bytes.length, ativo.bytes);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), ativo.sha256);
  }
  // Controle negativo opcional: quebra só o artefato descartável, nunca a fonte do projeto.
  if (process.env.PWA_MUTANT === 'sem-veto') {
    const worker = path.join(dir, 'sw.js'), codigo = fs.readFileSync(worker, 'utf8');
    const veto = 'if (estados.some(e => !e || !e.safe)) return;';
    assert.ok(codigo.includes(veto), 'Ponto da mutação mudou; não é permitido um falso controle negativo');
    fs.writeFileSync(worker, codigo.replace(veto, '/* Mutação QA: veto das janelas removido intencionalmente. */'));
    resultado.mutacao = 'sem-veto';
  }
  resumo.workerSha256 = crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, 'sw.js'))).digest('hex');
  atual = { version, dir, manifesto };
  resultado.publicacoes.push(resumo);
  return atual;
}

const servidor = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  resultado.requisicoes.push({ metodo: req.method, caminho: url.pathname });
  const relativo = decodeURIComponent(url.pathname.replace(/^\/bauer-hub-v2\//, '')) || 'index.html';
  if (!url.pathname.startsWith('/bauer-hub-v2/') || relativo.split('/').includes('..')) { res.writeHead(404).end(); return; }
  if (relativo === 'nao-cachear.json') { res.setHeader('Content-Type', 'application/json'); res.end('{"dinamico":true}'); return; }
  const arquivo = path.join(atual.dir, relativo);
  if (!fs.existsSync(arquivo) || !fs.statSync(arquivo).isFile()) { res.writeHead(404).end(); return; }
  const mime = { '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.html': 'text/html', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
  res.setHeader('Content-Type', mime[path.extname(arquivo)] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-store');
  res.end(corromper === relativo ? Buffer.from('ATIVO-CORROMPIDO-QA') : fs.readFileSync(arquivo));
});

async function local(p = pagina) {
  return p.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])));
}
async function status(p = pagina) { return p.evaluate(() => window.OrqPWA?.status()); }
async function blur(p = pagina) { await p.evaluate(() => document.activeElement?.blur()); }
async function seguro(p = pagina) {
  await blur(p);
  await p.waitForFunction(() => window.OrqPWA?.status().safe, null, { timeout: 12000 });
}
async function versão(p = pagina) {
  return p.evaluate(() => document.querySelector('meta[name="orq-release"]')?.content);
}
async function pronta(p = pagina) {
  await p.waitForFunction(() => window.OrqPWA && window.HubNav && window.F2DB, null, { timeout: 20000 });
  // Os guardas das views registram logo após os globais: esperar por eles (o critério continua os 6 exatos).
  await p.waitForFunction(obr => { const s = window.OrqPWA && window.OrqPWA.status(); return !!s && obr.every(g => s.guards.includes(g)); }, obrigatorias, { timeout: 20000 }).catch(() => {});
  assert.deepEqual((await status(p)).guards.sort(), [...obrigatorias].sort());
}
async function esperarVersao(version, p = pagina) {
  await p.waitForFunction(v => document.querySelector('meta[name="orq-release"]')?.content === v, version, { timeout: 25000 });
  await pronta(p);
}
async function controlador(p = pagina) {
  return p.evaluate(async () => {
    const c = new MessageChannel();
    return await new Promise(resolve => {
      c.port1.onmessage = e => { c.port1.close(); resolve(e.data.version); };
      navigator.serviceWorker.controller.postMessage({ type: 'ORQ_PWA_VERSION' }, [c.port2]);
    });
  });
}
async function cacheCompleto(version, p = pagina) {
  const esperado = atual.manifesto.assets.length;
  const provas = await p.evaluate(async ({ version, esperado }) => {
    const nomes = await caches.keys();
    const nome = nomes.find(n => n.startsWith('orq-receituarios:') && n.endsWith(':' + version));
    if (!nome) return { completo: false, nomes };
    const cache = await caches.open(nome), urls = (await cache.keys()).map(r => r.url);
    const manifesto = await cache.match(new URL('release.json', location.href));
    return { completo: !!manifesto && urls.length === esperado + 1, quantidade: urls.length, nomes };
  }, { version, esperado });
  assert.equal(provas.completo, true, JSON.stringify(provas));
  return provas;
}
async function aguardarRodadas(p, quantidade = 2) {
  const inicio = await p.evaluate(() => window.__qaPerguntas || 0);
  await p.waitForFunction(n => (window.__qaPerguntas || 0) >= n + 2, inicio, { timeout: quantidade * 6500 });
}
async function aguardarCondicao(ler, mensagem, limite = 30000) {
  const fim = Date.now() + limite;
  while (Date.now() < fim) {
    if (await ler()) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert.fail(mensagem);
}
async function prepararAtualizacao() {
  const antiga = await versão();
  const nova = publicar();
  await pagina.evaluate(() => OrqPWA.check());
  await aguardarCondicao(() => pagina.evaluate(async esperada => {
    const waiting = (await navigator.serviceWorker.getRegistration()).waiting;
    if (!waiting) return false;
    const canal = new MessageChannel();
    const recebida = await new Promise(resolve => {
      canal.port1.onmessage = e => { canal.port1.close(); resolve(e.data.version); };
      waiting.postMessage({ type: 'ORQ_PWA_VERSION' }, [canal.port2]);
    });
    return recebida === esperada;
  }, nova.version), 'A edição nova não chegou ao estado waiting');
  await cacheCompleto(nova.version);
  return { antiga, nova };
}
async function conferirBloqueio(troca, campo, p = pagina) {
  await blur(p);
  assert.equal((await status(p)).safe, false, 'O editor com rascunho foi declarado seguro');
  await p.evaluate(() => OrqPWA.recheck());
  // Uma janela segura solicita a troca; a janela do editor precisa vetá-la de fato.
  const suporte = await contexto.newPage();
  await suporte.goto(`${origem}/${entrada}?test=1`);
  await pronta(suporte);
  await seguro(suporte);
  await suporte.evaluate(() => OrqPWA.recheck());
  await aguardarRodadas(p);
  assert.equal(await versão(p), troca.antiga, 'A página recarregou com rascunho pendente');
  assert.equal(await controlador(p), troca.antiga, 'O SW ativou apesar da janela insegura');
  if (campo) assert.ok((await p.locator(campo).first().inputValue()).includes(sentinela), 'Rascunho em RAM perdeu conteúdo');
  await suporte.close();
}
async function concluirTroca(troca, antes, acao) {
  await acao();
  await blur();
  // Não chama recheck: a resolução do editor precisa permitir a retomada automática.
  await esperarVersao(troca.nova.version);
  assert.equal(await controlador(), troca.nova.version);
  if (antes) assert.deepEqual(await local(), antes, 'A atualização escreveu no armazenamento clínico');
}
async function caso(nome, executar) {
  if (process.env.PWA_CASES && !/primeira instalação/.test(nome) && !new RegExp(process.env.PWA_CASES).test(nome)) return;
  const inicio = Date.now();
  try {
    await executar();
    resultado.casos.push({ nome, estado: 'PASS', ms: Date.now() - inicio });
    fs.writeFileSync(path.join(destino, 'resultado.json'), JSON.stringify(resultado, null, 2));
    console.log(`PASS ${nome}`);
  } catch (erro) {
    resultado.casos.push({ nome, estado: 'FAIL', ms: Date.now() - inicio, erro: erro.stack, status: pagina && !pagina.isClosed() ? await status().catch(() => null) : null });
    if (pagina && !pagina.isClosed()) await pagina.screenshot({ path: path.join(destino, 'falha.png'), fullPage: false }).catch(() => {});
    throw erro;
  }
}

async function testar() {
  publicar();
  await new Promise(resolve => servidor.listen(0, '127.0.0.1', resolve));
  origem = `http://127.0.0.1:${servidor.address().port}/bauer-hub-v2`;
  resultado.origem = origem;
  resultado.entrada = entrada;
  contexto = await chromium.launchPersistentContext(path.join(temporario, 'perfil'), { channel: 'chrome', headless: true, viewport: { width: 1440, height: 900 } });
  await contexto.exposeBinding('__qaGravacao', (_, registro) => resultado.escritas.push(registro));
  await contexto.addInitScript(() => {
    if (location.hostname !== '127.0.0.1') return;
    if (!localStorage.getItem('ubs2026.v1.session')) {
      localStorage.setItem('ubs2026.v1.session', JSON.stringify({ crm: 'TESTE-QA', nome: 'Teste', loginAt: '2026-09-20T00:00:00Z' }));
      localStorage.setItem('ubs2026.v1.patients', JSON.stringify([{ id: 'qa-paciente', nome: 'Pessoa sintética QA', nascimento: '2000-01-01', cns: '', cpf: '', cids: [] }]));
      localStorage.setItem('ubs2026.v1.consults', '[]');
      localStorage.setItem('ubs2026.v1.meta', JSON.stringify({ avisoPrivacidadeVisto: true }));
      localStorage.setItem('qa:sentinela-preservada', 'bytes-exatos-ç-123');
    }
    const gravar = Storage.prototype.setItem;
    Storage.prototype.setItem = function(k, v) {
      window.__qaGravacao({ armazenamento: this === localStorage ? 'local' : 'session', chave: String(k), rascunho: String(v).includes('QA-RASCUNHO-NAO-PERSISTIR') });
      return gravar.call(this, k, v);
    };
    window.__qaPerguntas = 0;
    navigator.serviceWorker.addEventListener('message', e => {
      if (e.data?.type !== 'ORQ_PWA_STATUS') return;
      window.__qaPerguntas++;
      if (!window.__qaEdicaoAposVoto || !e.ports[0]) return;
      // Simula digitação logo após a resposta segura, antes do controllerchange.
      const port = e.ports[0], responder = port.postMessage.bind(port);
      port.postMessage = dados => {
        responder(dados);
        if (!dados.safe || !window.__qaEdicaoAposVoto) return;
        window.__qaEdicaoAposVoto = false;
        const campo = document.querySelector('#recipePrint [contenteditable][data-field="name"]');
        campo.textContent = 'QA-RASCUNHO-NAO-PERSISTIR';
        campo.dispatchEvent(new Event('input', { bubbles: true }));
      };
    });
  });
  contexto.on('page', p => {
    p.on('pageerror', e => resultado.erros.push(e.message));
    p.on('dialog', d => d.accept());
  });
  pagina = contexto.pages()[0];
  pagina.on('pageerror', e => resultado.erros.push(e.message));
  pagina.on('dialog', d => d.accept());

  await caso('primeira instalação completa sem recarga extra', async () => {
    let navegacoes = 0;
    pagina.on('framenavigated', f => { if (f === pagina.mainFrame()) navegacoes++; });
    await pagina.goto(`${origem}/${entrada}?test=1`);
    await pronta();
    await pagina.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 40000 });
    await seguro();
    await cacheCompleto(atual.version);
    await pagina.evaluate(() => OrqPWA.check());
    assert.equal(await controlador(), atual.version);
    assert.equal(navegacoes, 1);
    await pagina.evaluate(async () => { await (await caches.open('cache-alheio-qa')).put('/fora-do-pwa', new Response('preservado')); });
  });

  await caso('hub recebe a próxima edição sem fechar janela e preserva localStorage', async () => {
    const antes = await local(), id = pagina;
    const nova = publicar();
    await pagina.evaluate(() => OrqPWA.check());
    await esperarVersao(nova.version);
    assert.equal(pagina, id);
    assert.deepEqual(await local(), antes);
    assert.equal(await controlador(), nova.version);
    await cacheCompleto(nova.version);
  });

  await caso('rascunho da receita veta ativação e Novo paciente libera automaticamente', async () => {
    await pagina.evaluate(() => HubNav.openTopic('pre-natal-rotina'));
    const campo = '#recipePrint [contenteditable][data-field="name"]';
    await pagina.locator(campo).first().fill(sentinela);
    const antes = await local(), troca = await prepararAtualizacao();
    await conferirBloqueio(troca, null);
    assert.ok((await pagina.locator(campo).first().textContent()).includes(sentinela));
    assert.deepEqual(await local(), antes);
    await concluirTroca(troca, antes, () => pagina.locator('#newPatientBtn').click());
  });

  await caso('receita composta mantém itens e Limpar permite a atualização', async () => {
    await pagina.evaluate(() => HubNav.openTopic('pre-natal-rotina'));
    await pagina.locator('#regimenCards .regimen-check').first().check();
    const antes = await local(), troca = await prepararAtualizacao();
    await conferirBloqueio(troca);
    assert.equal(await pagina.evaluate(() => __HUB_COMPOSE__.itens()), 1);
    await concluirTroca(troca, antes, () => pagina.locator('[data-compose="limpar"]').click());
  });

  await caso('item livre ainda não adicionado continua protegido ao voltar ao hub', async () => {
    await pagina.evaluate(() => HubNav.openTopic('pre-natal-rotina'));
    await pagina.locator('[data-compose="livre"]').click();
    await pagina.locator('.compose-livre-editor textarea').fill(sentinela);
    await pagina.evaluate(() => HubNav.backHub());
    const antes = await local(), troca = await prepararAtualizacao();
    await conferirBloqueio(troca, '.compose-livre-editor textarea');
    await concluirTroca(troca, antes, () => pagina.evaluate(() => document.querySelector('[data-compose="livre-cancelar"]').click()));
  });

  await caso('edição iniciada entre voto e ativação preserva a edição antiga até limpar', async () => {
    await pagina.evaluate(() => { HubNav.openTopic('pre-natal-rotina'); window.dispatchEvent(new Event('beforeprint')); });
    const antes = await local(), troca = await prepararAtualizacao();
    await pagina.evaluate(() => { window.dispatchEvent(new Event('afterprint')); window.__qaEdicaoAposVoto = true; });
    await blur();
    await aguardarCondicao(() => pagina.evaluate(async esperada => {
      if (!navigator.serviceWorker.controller) return false;
      const canal = new MessageChannel();
      const ativa = await new Promise(resolve => {
        canal.port1.onmessage = e => { canal.port1.close(); resolve(e.data.version); };
        navigator.serviceWorker.controller.postMessage({ type: 'ORQ_PWA_VERSION' }, [canal.port2]);
      });
      return ativa === esperada;
    }, troca.nova.version), 'O SW novo não ativou após o voto seguro');
    assert.equal(await versão(), troca.antiga, 'A corrida perdeu o rascunho e recarregou a página');
    assert.equal((await status()).safe, false);
    const pinning = await pagina.evaluate(async antiga => {
      const html = await (await fetch('index.html')).text();
      const nomes = await caches.keys();
      return { ativoAntigo: html.includes(`content="${antiga}"`), cacheAntigo: nomes.some(n => n.endsWith(':' + antiga)) };
    }, troca.antiga);
    assert.deepEqual(pinning, { ativoAntigo: true, cacheAntigo: true });
    assert.deepEqual(await local(), antes);
    await concluirTroca(troca, antes, () => pagina.locator('#newPatientBtn').click());
  });

  await caso('SOAP da doença conserva texto e salvar libera a próxima edição', async () => {
    await pagina.evaluate(() => HubNav.openTopic('pre-natal-rotina'));
    await pagina.locator('[data-f2view="soap"]').click();
    await pagina.locator('#f2SoapPac').selectOption('qa-paciente');
    await pagina.locator('#f2SoapS').fill(sentinela);
    const antes = await local(), troca = await prepararAtualizacao();
    await conferirBloqueio(troca, '#f2SoapS');
    assert.deepEqual(await local(), antes);
    await pagina.locator('[data-f2s="salvar"]').click();
    const salvo = await local();
    assert.ok(salvo['ubs2026.v1.consults'].includes(sentinela));
    await concluirTroca(troca, salvo, async () => {});
  });

  await caso('SOAP do atendimento preserva texto ao esconder a view e salvar libera', async () => {
    await pagina.evaluate(() => HubNav.openEncounter({ patientId: 'qa-paciente' }));
    await pagina.locator('#encounterView #txS').fill(sentinela);
    const antes = await local(), troca = await prepararAtualizacao();
    await conferirBloqueio(troca, '#encounterView #txS');
    await pagina.evaluate(() => HubNav.backHub());
    await blur();
    assert.equal((await status()).safe, false, 'Ocultar a view apagou a guarda do rascunho');
    assert.deepEqual(await local(), antes);
    await pagina.evaluate(() => document.querySelector('#encounterView #btnSalvar').click());
    const salvo = await local();
    await concluirTroca(troca, salvo, async () => {});
  });

  await caso('guia editado aguarda Limpar paciente sem persistir rascunho', async () => {
    await pagina.evaluate(() => HubNav.openDocuments());
    await pagina.locator('#documentsView #patientName').fill(sentinela);
    const antes = await local(), troca = await prepararAtualizacao();
    await conferirBloqueio(troca, '#documentsView #patientName');
    assert.deepEqual(await local(), antes);
    await concluirTroca(troca, antes, () => pagina.locator('#documentsView #clearPatient').click());
  });

  await caso('documento institucional editado aguarda Novo paciente', async () => {
    await pagina.evaluate(() => { HubNav.openDocuments(); GuiasView.openInstitutional(F1Registro.todos()[0].id); });
    const campo = '#f1-formulario [data-campo="nome"]';
    await pagina.locator(campo).first().fill(sentinela);
    const antes = await local(), troca = await prepararAtualizacao();
    await conferirBloqueio(troca, campo);
    assert.deepEqual(await local(), antes);
    await concluirTroca(troca, antes, () => pagina.locator('#f1-novo').click());
  });

  await caso('cadastro de paciente em edição bloqueia e Cancelar retoma', async () => {
    await pagina.evaluate(() => HubNav.openPatients('qa-paciente'));
    await pagina.locator('#patientsView #btnEditarPac').click();
    await pagina.locator('#patientsView #edNome').fill(sentinela);
    const antes = await local(), troca = await prepararAtualizacao();
    await conferirBloqueio(troca, '#patientsView #edNome');
    await concluirTroca(troca, antes, () => pagina.locator('#patientsView #btnCancelarEdicao').click());
  });

  await caso('modal e impressão adiam ativação sem fechar a janela', async () => {
    await pagina.evaluate(() => document.querySelector('#qualityDialog').showModal());
    const antes = await local(), troca = await prepararAtualizacao();
    await conferirBloqueio(troca);
    await pagina.evaluate(() => { window.dispatchEvent(new Event('beforeprint')); document.querySelector('#qualityDialog').close(); });
    assert.equal((await status()).safe, false);
    await concluirTroca(troca, antes, () => pagina.evaluate(() => window.dispatchEvent(new Event('afterprint'))));
  });

  await caso('ativo corrompido impede promoção e uma nova publicação recupera', async () => {
    await seguro();
    const antiga = await versão(), quebrada = publicar();
    corromper = 'index-f2.html';
    await pagina.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      window.__qaInstalacaoTerminou = false;
      reg.addEventListener('updatefound', () => { const worker = reg.installing; worker.addEventListener('statechange', () => { if (worker.state === 'redundant') window.__qaInstalacaoTerminou = true; }); }, { once: true });
      await OrqPWA.check();
    });
    await pagina.waitForFunction(() => window.__qaInstalacaoTerminou, null, { timeout: 30000 });
    assert.equal(await versão(), antiga);
    assert.equal(await controlador(), antiga);
    assert.equal(await pagina.evaluate(async v => {
      for (const nome of await caches.keys()) if (nome.endsWith(':' + v)) return !!(await (await caches.open(nome)).match(new URL('release.json', location.href)));
      return false;
    }, quebrada.version), false);
    corromper = null;
    const nova = publicar();
    await pagina.evaluate(() => OrqPWA.check());
    await esperarVersao(nova.version);
  });

  await caso('offline abre ambas entradas e reconexão atualiza sem reiniciar', async () => {
    const antiga = await versão(), antes = await local();
    await contexto.setOffline(true);
    await pagina.reload();
    await pronta();
    assert.equal(await versão(), antiga);
    // Um pedaço de ficha carregado sob demanda abre OFFLINE (servido pelo precache).
    const fichasOffline = await pagina.evaluate(async () => { try { const a = await window.OrqFichas.carregarLote('C08'); return a.length; } catch (e) { return 'ERRO ' + e.message; } });
    assert.ok(typeof fichasOffline === 'number' && fichasOffline > 0, `pedaço de ficha offline: ${fichasOffline}`);
    const outra = await contexto.newPage();
    await outra.goto(`${origem}/index.html?test=1`);
    await pronta(outra);
    assert.equal(await versão(outra), antiga);
    await outra.close();
    await seguro();
    const nova = publicar();
    await contexto.setOffline(false);
    await esperarVersao(nova.version);
    assert.deepEqual(await local(), antes);
  });

  await caso('cache alheio e respostas fora do manifesto permanecem isolados', async () => {
    const dados = await pagina.evaluate(async () => {
      await fetch('nao-cachear.json');
      const nomes = await caches.keys(), urls = [];
      for (const nome of nomes.filter(n => n.startsWith('orq-receituarios:'))) urls.push(...(await (await caches.open(nome)).keys()).map(r => r.url));
      return { nomes, urls, alheio: await (await (await caches.open('cache-alheio-qa')).match('/fora-do-pwa')).text() };
    });
    assert.equal(dados.alheio, 'preservado');
    assert.ok(!dados.urls.some(u => /nao-cachear|QA-RASCUNHO/.test(u)));
    assert.ok(dados.urls.every(u => new URL(u).pathname.startsWith('/bauer-hub-v2/')));
    assert.deepEqual(resultado.erros, []);
    assert.ok(resultado.requisicoes.every(r => r.metodo === 'GET'));
    assert.ok(!resultado.escritas.some(e => e.rascunho && e.armazenamento === 'session'));
  });

  await caso('perda do selo de integridade recusa ativos em vez de misturar a rede', async () => {
    const prova = await pagina.evaluate(async () => {
      const versao = document.querySelector('meta[name="orq-release"]').content;
      const nome = (await caches.keys()).find(n => n.startsWith('orq-receituarios:') && n.endsWith(':' + versao));
      const cache = await caches.open(nome), url = new URL('release.json', location.href);
      const selo = await cache.match(url);
      if (!selo) throw new Error('A edição inicial já estava sem seu selo');
      await cache.delete(url);
      let recusado = false;
      try { await fetch('index-f2.html?qa=sem-selo'); }
      catch (_) { recusado = true; }
      finally { await cache.put(url, selo); }
      return { recusado, restaurado: !!(await cache.match(url)) };
    });
    assert.deepEqual(prova, { recusado: true, restaurado: true });
  });
  resultado.estado = 'PASS';
}

testar().catch(erro => { resultado.estado = 'FAIL'; resultado.falha = erro.stack; console.error(erro); process.exitCode = 1; }).finally(async () => {
  fs.writeFileSync(path.join(destino, 'resultado.json'), JSON.stringify(resultado, null, 2) + '\n');
  if (contexto) await contexto.close();
  await new Promise(resolve => servidor.close(resolve));
  fs.rmSync(temporario, { recursive: true, force: true });
  console.log(`Prova: ${path.join(destino, 'resultado.json')}`);
});
