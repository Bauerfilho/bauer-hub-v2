/* tests/fichas-painel.cjs — prova no DOM vivo da FICHA no painel do Orquestrator (25/09/2026).
   Rodar (da raiz do repo): NODE_PATH=~/Projetos/Tangent/node_modules node tests/fichas-painel.cjs [index-f2.html]
   Sobe servidor local próprio (127.0.0.1), Chromium headless em janela própria, service worker bloqueado
   (o PWA/offline tem prova própria em tests/pwa-update.cjs). Critério binário por item; exit 0/1. */
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const RAIZ = path.resolve(__dirname, '..');
const PAGINA = process.argv[2] || 'index-f2.html';
const PORTA = 8960 + Math.floor(Math.random() * 30);
const PROVAS = path.join(RAIZ, 'provas-meds');
const res = [];
const passa = (nome, ok, det = '') => { res.push({ nome, ok: !!ok }); console.log(`  ${ok ? '✅' : '🔴'} ${nome}${det ? ' — ' + det : ''}`); };

(async () => {
  const srv = spawn('/usr/bin/python3', ['-m', 'http.server', String(PORTA), '--bind', '127.0.0.1'], { cwd: RAIZ, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 900));
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const erros = [];
  p.on('pageerror', e => erros.push(String(e).slice(0, 160)));
  p.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_FILE_NOT_FOUND/.test(m.text())) erros.push('console: ' + m.text().slice(0, 140)); });
  try {
    await p.goto(`http://127.0.0.1:${PORTA}/${PAGINA}?test`, { waitUntil: 'networkidle', timeout: 45000 });

    /* login (mesmo gesto da prova de 25/09) */
    await p.evaluate(() => {
      const crm = document.querySelector('#f2xLoginCrm'), s = document.querySelector('#f2xLoginSenha');
      if (crm && s) { crm.value = 'Orquestrator'; s.value = 'Medicalhub1234';
        crm.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('input', { bubbles: true }));
        document.querySelector('#f2xLoginEntrar')?.click(); }
    });
    await p.waitForTimeout(1200);

    /* 0. base carregada + guardas da PWA intactos */
    const base = await p.evaluate(() => ({ idx: !!(window.ORQ_FICHAS_INDICE && window.ORQ_FICHAS_INDICE.m), api: typeof (window.OrqFichas && window.OrqFichas.fichasDe),
      guardas: window.OrqPWA ? window.OrqPWA.status().guards : null }));
    passa('índice de fichas e OrqFichas carregados', base.idx && base.api === 'function');
    const obrig = ['receita', 'atendimento', 'soap', 'guias', 'institucionais', 'pacientes'];
    passa('os 6 guardas da PWA registrados (a atualização segue possível)', base.guardas && obrig.every(g => base.guardas.includes(g)), base.guardas ? base.guardas.join(',') : 'OrqPWA ausente');

    /* abrir uma doença com esquemas (para existir a receita) */
    const topico = await p.evaluate(() => { try { const H = window.__HUB_TEST__; const t = H.catalog.find(t => (t.regimens || []).length > 1); H.open(t.id); return t.id; } catch (e) { return 'ERRO ' + e; } });
    await p.waitForTimeout(900);
    passa('doença aberta com receita na tela', await p.evaluate(() => !!document.querySelector('#recipePrint .rx-copy .rx-body[data-field="prescription"]')), topico);

    /* abrir o painel pelo selo */
    await p.evaluate(() => { const s = document.querySelector('.orq-marca') || [...document.querySelectorAll('button,[role=button]')].find(e => /orquestrator/i.test(e.textContent || '') && e.offsetParent); s && s.click(); });
    await p.waitForTimeout(700);
    const buscar = async q => { await p.evaluate(q => { const el = document.querySelector('[data-orqa-med]'); el.value = q; el.dispatchEvent(new Event('input', { bubbles: true })); }, q); await p.waitForTimeout(450); };

    /* 1. ficha abre sob o item, com tempo medido dentro da página (frio = 1º pedaço) */
    await buscar('losar');
    const frio = await p.evaluate(() => new Promise(ok => {
      const btn = [...document.querySelectorAll('[data-orqa-med-pick]')].find(b => /losartana pot/i.test(b.dataset.orqaMedPick));
      if (!btn) return ok({ ms: -1 });
      const mo = new MutationObserver(() => { const f = btn.nextElementSibling && btn.nextElementSibling.querySelector('.orqa-fi'); if (f) { mo.disconnect(); ok({ ms: performance.now() - t0 }); } });
      mo.observe(btn.parentElement, { childList: true, subtree: true }); const t0 = performance.now(); btn.click();
    }));
    const ficha = await p.evaluate(() => { const f = document.querySelector('.orqa-fi'); return f && { selo: /não conferido pelo médico/.test(f.textContent), aps: f.querySelectorAll('.orqa-fi-chip').length,
      dose: !!f.querySelector('.orqa-fi-dose'), rx: f.querySelectorAll('[data-orqa-rx-somar]').length }; });
    passa('ficha da losartana abre com selo, apresentações, dose e linhas prontas', ficha && ficha.selo && ficha.aps > 0 && ficha.dose && ficha.rx > 0, JSON.stringify(ficha));
    passa('ficha fria < 100 ms (inclui carregar o pedaço)', frio.ms >= 0 && frio.ms < 100, frio.ms.toFixed(1) + ' ms');
    const quente = await p.evaluate(() => new Promise(ok => {
      const btn = [...document.querySelectorAll('[data-orqa-med-pick]')].find(b => /losartana pot/i.test(b.dataset.orqaMedPick));
      btn.click(); /* fecha */
      const mo = new MutationObserver(() => { const f = btn.nextElementSibling && btn.nextElementSibling.querySelector('.orqa-fi'); if (f) { mo.disconnect(); ok(performance.now() - t0); } });
      mo.observe(btn.parentElement, { childList: true, subtree: true }); const t0 = performance.now(); btn.click(); /* reabre */
    }));
    passa('ficha quente < 16 ms', quente < 16, quente.toFixed(1) + ' ms');
    const busca = await p.evaluate(() => { const t0 = performance.now(); for (const q of ['dipi', 'losar', 'amox', 'metf', 'omep', 'sert', 'ibup', 'predn', 'azit', 'levo']) window.MedsBusca.buscar(q, 8); return (performance.now() - t0) / 10; });
    passa('busca de medicamento < 5 ms por consulta', busca < 5, busca.toFixed(2) + ' ms');

    /* 2. Somar à receita → funil de composição → 1 folha, 2 vias idênticas */
    const antes = await p.evaluate(() => window.__HUB_COMPOSE__.itens());
    const linha = await p.evaluate(() => { const b = document.querySelector('[data-orqa-rx-somar]'); const [k, id] = b.dataset.orqaRxSomar.split('|'); b.click(); return window.OrqFichas.rx(k, id); });
    const depois = await p.evaluate(() => window.__HUB_COMPOSE__.itens());
    passa('Somar à receita põe a linha na bandeja do atendimento', depois === antes + 1, `${antes}→${depois}`);
    await p.evaluate(() => window.__HUB_COMPOSE__.montar()); await p.waitForTimeout(700);
    const folha = await p.evaluate(l => { const cps = [...document.querySelectorAll('#recipePrint .rx-copy .rx-body[data-field="prescription"]')].map(e => e.textContent);
      const H = window.__HUB_TEST__; return { n: cps.length, iguais: cps.length === 2 && cps[0] === cps[1] && H.syncCheck(), tem: cps[0] && cps[0].includes(l.split('\n')[0].slice(0, 25)), cabe1folha: !H.overflow() }; }, linha);
    passa('receita montada contém a linha, 2 vias idênticas, cabe em 1 folha', folha.n === 2 && folha.iguais && folha.tem && folha.cabe1folha, JSON.stringify(folha));
    const dup = await p.evaluate(() => { const b = document.querySelector('[data-orqa-rx-somar]'); const n = window.__HUB_COMPOSE__.itens(); b.click(); return window.__HUB_COMPOSE__.itens() === n; });
    passa('a mesma linha não entra duas vezes', dup);

    /* 3. CERCA: foco fora da receita → "no cursor" não escreve nada */
    const cerca = await p.evaluate(() => {
      const fora = [...document.querySelectorAll('input[type="text"],input[type="search"],input:not([type]),textarea')].find(e => e.offsetParent && !e.closest('#orqAssist') && !e.closest('#recipePrint,#orientationPrint,#composeTray'));
      if (!fora) return { ok: null };
      fora.focus(); const v0 = fora.value;
      document.querySelector('[data-orqa-rx-cursor]').click();
      return { ok: fora.value === v0, alvo: fora.id || fora.name || fora.className };
    });
    passa('cerca: campo fora da receita fica intocado', cerca.ok === true, cerca.alvo || 'sem campo fora da receita visível');

    /* 4. foco no corpo da receita → insere no cursor; depois de renderRecipe o alvo órfão é reencontrado */
    const noCursor = await p.evaluate(() => {
      const rx = document.querySelector('#recipePrint .rx-copy .rx-body[data-field="prescription"][contenteditable]');
      rx.focus(); const s = getSelection(); s.selectAllChildren(rx); s.collapseToEnd();
      const b = document.querySelector('[data-orqa-rx-cursor]'); const [k, id] = b.dataset.orqaRxCursor.split('|'); const t = window.OrqFichas.rx(k, id);
      const n0 = rx.textContent.split(t.split('\n')[0]).length; b.click();
      return rx.textContent.split(t.split('\n')[0]).length > n0;
    });
    passa('"no cursor" com foco na receita escreve na receita', noCursor);
    const orfao = await p.evaluate(() => {
      const sel = document.querySelector('#regimenSelect'); if (!sel || sel.options.length < 2) return null;
      sel.value = sel.options[sel.options.length - 1].value; sel.dispatchEvent(new Event('change', { bubbles: true }));   /* renderRecipe → nó antigo órfão */
      const b = document.querySelector('[data-orqa-rx-cursor]'); const [k, id] = b.dataset.orqaRxCursor.split('|'); const t = window.OrqFichas.rx(k, id);
      b.click(); const rx = document.querySelector('#recipePrint .rx-copy .rx-body[data-field="prescription"][contenteditable]');
      return !!rx && rx.textContent.includes(t.split('\n')[0].slice(0, 20));
    });
    passa('depois de trocar o esquema (folha recriada), "no cursor" reencontra a receita', orfao === true, orfao === null ? 'sem 2º esquema' : '');

    /* 5. princípio sem ficha → comportamento antigo intacto (nome, só na receita) */
    await buscar('dipi');
    const semFicha = await p.evaluate(() => { const b = [...document.querySelectorAll('[data-orqa-med-pick]')].find(x => /dipirona/i.test(x.dataset.orqaMedPick)); if (!b) return null; b.click();
      const c = b.nextElementSibling; return !!(c && /Ficha em preparo/.test(c.textContent) && c.querySelector('[data-orqa-nome-cursor]')); });
    passa('sem ficha: "ficha em preparo" + inserir o nome na receita', semFicha === true);

    /* 6. zero erro de página; capturas para OLHAR (3 larguras) */
    await buscar('nifedip');
    await p.evaluate(() => { const b = [...document.querySelectorAll('[data-orqa-med-pick]')].find(x => /^nifedipino$/i.test(x.dataset.orqaMedPick)); b && b.click(); });
    await p.waitForTimeout(400);
    fs.mkdirSync(PROVAS, { recursive: true });
    for (const [w, h, nome] of [[1440, 900, 'desktop'], [900, 1100, 'tablet'], [390, 844, 'celular']]) {
      await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(250);
      const painel = await p.$('#orqAssist'); if (painel) await painel.screenshot({ path: path.join(PROVAS, `ficha-painel-${nome}.png`) });
    }
    passa('zero erro de página/console', erros.length === 0, erros.join(' | ').slice(0, 300));
  } catch (e) {
    passa('execução da prova', false, String(e).slice(0, 200));
  } finally {
    await b.close(); srv.kill();
  }
  const ok = res.every(r => r.ok);
  console.log(`\n  ${ok ? '✅ PASSOU' : '🔴 FALHOU'} — ${res.filter(r => r.ok).length}/${res.length}`);
  process.exit(ok ? 0 : 1);
})();
