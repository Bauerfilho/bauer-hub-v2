/* tests/lacunas.cjs — prova do MÓDULO js/lacunas.js (autor: braço k3, 26/09/2026).
   Cobre a lista de 30 achados de ~/Projetos/banco-medicamentos/contratos/ACHADOS-REVISAO-LACUNAS.md
   um a um (cada caso cita o achado) + proteção de falha (módulo inerte) + preditivo mobile.
   Rodar (raiz do worktree): NODE_PATH=~/Projetos/Tangent/node_modules node tests/lacunas.cjs [chromium|webkit]
   Padrão de tests/fichas-painel.cjs: servidor próprio, Playwright headless, URL com ?test. */
const pw = require('playwright'), http = require('http'), fs = require('fs'), path = require('path');
const RAIZ = path.resolve(__dirname, '..');
const MOTOR = String(process.argv[2] || 'chromium').toLowerCase();
const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const srv = http.createServer((q, r) => { const f = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': tipos[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
const res = [];
const MOD = process.platform === 'darwin' ? 'Meta' : 'Control';
const check = (n, ok, det = '') => { res.push(!!ok); console.log(`  ${ok ? '✅' : '🔴'} ${n}${det ? ' — ' + det : ''}`); };
const J = v => { const s = JSON.stringify(v); return s && s.length > 130 ? s.slice(0, 130) + '…' : s; };

(async () => {
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok));
  const ORIGEM = `http://127.0.0.1:${srv.address().port}`;
  let b;
  if (MOTOR === 'webkit') b = await pw.webkit.launch({ headless: true });
  else { try { b = await pw.chromium.launch({ channel: 'chrome', headless: true }); } catch (_) { b = await pw.chromium.launch({ headless: true }); } }
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const erros = [];
  p.on('pageerror', e => erros.push(String(e).split('\n')[0].slice(0, 160)));
  const wait = ms => p.waitForTimeout(ms);
  const undo = async () => { await p.keyboard.press(`${MOD}+z`); await wait(150); };
  const instalar = () => p.evaluate(() => {
    const L = {
      ponto(el, off) { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let acc = 0, n, last = null; while ((n = w.nextNode())) { last = n; if (off <= acc + n.data.length) return [n, off - acc]; acc += n.data.length; } return last ? [last, last.data.length] : [el, 0]; },
      caret(sel, off) { const el = document.querySelector(sel); if (!el) return null; const [n, o] = L.ponto(el, off); const r = document.createRange(); r.setStart(n, o); r.collapse(true); const s = getSelection(); s.removeAllRanges(); s.addRange(r); el.focus(); return true; },
      selecionar(sel, a, b2) { const el = document.querySelector(sel); if (!el) return null; el.focus(); const [n1, o1] = L.ponto(el, a), [n2, o2] = L.ponto(el, b2); const r = document.createRange(); r.setStart(n1, o1); r.setEnd(n2, o2); const s = getSelection(); s.removeAllRanges(); s.addRange(r); return s.toString(); },
      set(sel, t) { const el = document.querySelector(sel); if (!el) return null; el.textContent = t; el.dispatchEvent(new Event('input', { bubbles: true })); return el.textContent; },
      txt(sel) { const el = document.querySelector(sel); return el ? el.textContent : null; },
      inner(sel) { const el = document.querySelector(sel); return el ? el.innerText : null; },
      setV(sel, t) { const el = document.querySelector(sel); if (!el) return null; el.value = t; el.dispatchEvent(new Event('input', { bubbles: true })); el.focus(); return el.value; },
      caretV(sel, a, b2) { const el = document.querySelector(sel); if (!el) return null; el.focus(); el.setSelectionRange(a, b2 == null ? a : b2); return true; },
      val(sel) { const el = document.querySelector(sel); return el ? el.value : null; },
      contar(sel) { const el = document.querySelector(sel); window.__cnt = 0; window.__cntH = e => { if (e.target === el) window.__cnt++; }; document.addEventListener('input', window.__cntH, true); return !!el; },
      contado() { document.removeEventListener('input', window.__cntH, true); return window.__cnt; },
    };
    window.__LACX = L; return true;
  });
  const L = new Proxy({}, { get: (_, n) => (...a) => p.evaluate(([n, a]) => window.__LACX[n](...a), [n, a]) });

  try {
    /* ── PROTEÇÃO DE FALHA (requisito C): módulo "404" de fábrica não altera nada ──
       Interceptamos as requisições de js/lacunas.js e devolvemos 404; a página inteira
       segue de pé sem OrqLacunas (net::ERR_ABORTED é console do recurso, não pageerror). */
    await p.route('**/js/lacunas.js**', rota => rota.fulfill({ status: 404, contentType: 'text/javascript', body: '' }));
    await p.goto(`${ORIGEM}/index.html?test`, { waitUntil: 'networkidle', timeout: 45000 });
    if (await p.$('#f2xLoginCrm')) { await p.fill('#f2xLoginCrm', 'Orquestrator'); await p.fill('#f2xLoginSenha', 'Medicalhub1234'); await p.click('#f2xLoginEntrar'); }
    const prot = await p.evaluate(() => ({
      api: !!window.OrqLacunas,
      guards: (window.OrqPWA && window.OrqPWA.status().guards) || [],
      hubtest: !!(window.__HUB_TEST__ && window.__HUB_TEST__.catalog && window.__HUB_COMPOSE__),
    }));
    check('C-off · módulo 404: API ausente, 6 guardas PWA intactas, hub teste sobe', !prot.api && prot.hubtest && ['receita', 'soap', 'institucionais', 'guias', 'pacientes', 'atendimento'].every(g => prot.guards.includes(g)), J(prot));
    await p.unroute('**/js/lacunas.js**');

    /* ── 1 · módulo real: todas as superfícies ── */
    await p.goto(`${ORIGEM}/index.html?test`, { waitUntil: 'networkidle', timeout: 45000 });
    if (await p.$('#f2xLoginCrm')) { await p.fill('#f2xLoginCrm', 'Orquestrator'); await p.fill('#f2xLoginSenha', 'Medicalhub1234'); await p.click('#f2xLoginEntrar'); }
    await p.waitForFunction(() => window.__HUB_TEST__ && window.__HUB_TEST__.catalog && window.__HUB_COMPOSE__, null, { timeout: 30000 });
    check('C-on · módulo real carregado (window.OrqLacunas exposto)', await p.evaluate(() => !!(window.OrqLacunas && typeof window.OrqLacunas.transformarParaImpressao === 'function')), '');
    await instalar();

    /* unidade: detecção pura da lacuna (inclusiva nas bordas) */
    check('U1 · lacunaEm: meio, bordas in/out, vizinho fora', await p.evaluate(() => {
      const g = window.OrqLacunas.lacunaEm;
      return [g('ab___cd', 0), g('ab___cd', 2), g('ab___cd', 3), g('ab___cd', 4), g('ab___cd', 5), g('ab___cd', 6), g('ab___cd', 1)];
    }).then(v => JSON.stringify(v) === JSON.stringify([null, { inicio: 2, fim: 5 }, { inicio: 2, fim: 5 }, { inicio: 2, fim: 5 }, { inicio: 2, fim: 5 }, null, null])), '');

    /* palco real: doença + linha livre + controle especial (2 vias) */
    await p.evaluate(() => { const H = window.__HUB_TEST__; H.open(H.catalog.find(t => (t.regimens || []).length > 1).id); });
    await wait(800);
    await p.evaluate(() => { window.__HUB_COMPOSE__.adicionarLivre('Diazepam 5 mg, comprimido — ______.\nTomar ______, via oral, de ___ em ___ horas, por ___ dias.'); window.__HUB_COMPOSE__.montar(); });
    await wait(500);
    await p.evaluate(() => { const s = document.getElementById('documentTypeSelect'); if (s.value !== 'control-special') { s.value = 'control-special'; s.dispatchEvent(new Event('change', { bubbles: true })); } });
    await wait(400);
    const RX = '#recipePrint .rx-copy .rx-body[data-field="prescription"]';

    /* #16/#26 seleção não colapsada que TOCA lacuna: o nativo manda */
    await L.set(RX, 'de ___ em ___ horas, por ___ dias.');
    const selTxt = await L.selecionar(RX, 3, 19);
    await p.keyboard.type('X');
    let t = await L.txt(RX);
    check('A · seleção 3..19 (cobre 2 lacunas) + "X" → "de X, por ___ dias." (nativo, #16 #26)', selTxt === '___ em ___ horas' && t === 'de X, por ___ dias.', J(t));

    /* #18/#28 · UM input por tecla dentro da lacuna, no rx-body e nas bordas */
    await L.set(RX, 'Tomar ______ mg'); await L.caret(RX, 12); await L.contar(RX); await p.keyboard.press('8');
    const n1 = await L.contado(); t = await L.txt(RX);
    check('A · tecla no FIM da lacuna: 1 `input` e "Tomar 8 mg" (#18 #28)', n1 === 1 && t === 'Tomar 8 mg', J({ n1, t }));

    /* undo em sequência de duas substituições (pilha passo a passo) */
    await L.set(RX, 'Tomar ___ em ___ h'); await L.caret(RX, 6); await p.keyboard.type('1'); await L.caret(RX, 11); await p.keyboard.type('2');
    const meio = await L.txt(RX);
    await undo(); const depois1 = await L.txt(RX);
    await undo(); const depois2 = await L.txt(RX);
    check('A · undo×2 desfaz passo a passo: "1 em 2 h" → "1 em ___ h" → lacunas', meio === 'Tomar 1 em 2 h' && depois1 === 'Tomar 1 em ___ h' && depois2 === 'Tomar ___ em ___ h', J({ meio, depois1, depois2 }));

    /* insertText multi-caractere num campo de 2 lacunas (#20b corrompia offset) */
    await L.set(RX, 'de ___ em ___ h'); await L.caret(RX, 5); await p.keyboard.insertText('AB'); await wait(120);
    t = await L.txt(RX);
    check('A · insertText("AB") no MEIO da 1ª: "de AB em ___ h", 2ª intacta (#10 #20b)', t === 'de AB em ___ h', J(t));

    /* preditivo do celular: insertReplacementText (autocorreção) (#27) */
    await L.set(RX, 'Tomar ___ cp'); await L.caret(RX, 6); await p.evaluate(sel => {
      const el = document.querySelector(sel), w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), n = w.nextNode();
      const r = document.createRange(); r.setStart(n, 6); r.collapse(true); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      const e = new InputEvent('beforeinput', { inputType: 'insertReplacementText', data: '3', bubbles: true, cancelable: true, composed: true });
      el.dispatchEvent(e);
      if (!e.defaultPrevented) { const s2 = getSelection(); if (s2.rangeCount) { const r2 = s2.getRangeAt(0); r2.deleteContents(); r2.insertNode(document.createTextNode('3')); r2.collapse(false); el.dispatchEvent(new Event('input', { bubbles: true })); } }
    }, RX);
    await wait(120);
    t = await L.txt(RX);
    check('A · insertReplacementText (preditivo) substitui a lacuna → "Tomar 3 cp" (#27)', t === 'Tomar 3 cp', J(t));

    /* drop: insertFromDrop com dataTransfer (#24 estende) */
    await L.set(RX, 'Tomar ______ mg'); await L.caret(RX, 9); await p.evaluate(sel => {
      const el = document.querySelector(sel), w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), n = w.nextNode();
      const dt2 = new DataTransfer(); dt2.setData('text/plain', 'ZQ9');
      const r = document.createRange(); r.setStart(n, 9); r.collapse(true); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      const e = new InputEvent('beforeinput', { inputType: 'insertFromDrop', bubbles: true, cancelable: true, composed: true, dataTransfer: dt2 });
      el.dispatchEvent(e);
      if (!e.defaultPrevented) { const s2 = getSelection(); if (s2.rangeCount) { const r2 = s2.getRangeAt(0); r2.deleteContents(); r2.insertNode(document.createTextNode(dt2.getData('text/plain'))); r2.collapse(false); el.dispatchEvent(new Event('input', { bubbles: true })); } }
    }, RX);
    await wait(120);
    t = await L.txt(RX);
    check('A · insertFromDrop lê dataTransfer e substitui → "Tomar ZQ9 mg"', t === 'Tomar ZQ9 mg', J(t));

    /* Backspace/Delete em TODAS as posições — comportamento nativo em cada uma (#3 #17 #25).
       Mapa do texto 'A ______ B' (10 chars): A(0) ' '(1) _(2..7) ' '(8) B(9).
       Backspace apaga o caractere ANTERIOR ao caret; Delete, o POSTERIOR. */
    await L.set(RX, 'A ______ B'); await L.caret(RX, 2); await wait(60); await p.keyboard.press('Backspace'); const b1 = await L.txt(RX);
    await L.set(RX, 'A ______ B'); await L.caret(RX, 5); await wait(60); await p.keyboard.press('Backspace'); const b2 = await L.txt(RX);
    await L.set(RX, 'A ______ B'); await L.caret(RX, 8); await wait(60); await p.keyboard.press('Backspace'); const b3 = await L.txt(RX);
    await L.set(RX, 'A ______ B'); await L.caret(RX, 10); await wait(60); await p.keyboard.press('Backspace'); const b4 = await L.txt(RX);
    await L.set(RX, 'A ______ B'); await L.caret(RX, 2); await wait(60); await p.keyboard.press('Delete'); const d1 = await L.txt(RX);
    await L.set(RX, 'A ______ B'); await L.caret(RX, 8); await wait(60); await p.keyboard.press('Delete'); const d2 = await L.txt(RX);
    check('A · Backspace/Delete nativos em borda e miolo — lacuna nunca salta fora (#3 #17 #25)',
      b1 === 'A______ B'    &&  /* caret antes do 1º "_": apaga o espaço (cola a lacuna) */
      b2 === 'A _____ B'   &&  /* caret dentro: apaga um "_" */
      b3 === 'A _____ B'   &&  /* caret logo depois do último "_": idem */
      b4 === 'A ______ '   &&  /* caret no fim: apaga o "B" */
      d1 === 'A _____ B'   &&  /* caret antes do 1º "_": apaga o "_" */
      d2 === 'A ______B',     /* caret antes do espaço: Delete não tem efeito líquido no WebKit/Chromium headless */
      J({ got: { b1, b2, b3, b4, d1, d2 }, esp: 'A______ B · A _____ B · A _____ B · A ______  · A _____ B · A ______ ' }));

    /* guias no palco + #9 do item livre fora do compose */
    const TA = '#composeTray .compose-livre-editor textarea';
    await p.evaluate(() => document.querySelector('[data-compose="livre"]').click()); await wait(250);
    await L.setV(TA, 'Tomar ______, via oral'); await L.caretV(TA, 12);
    await L.contar(TA); await p.keyboard.press('Delete'); const c2 = await L.contado(); const t7 = await L.val(TA);
    check('A · item livre: Delete na borda apaga a vírgula, 1 input, lacuna intacta (#7 #25)', c2 <= 1 && t7 === 'Tomar ______ via oral', J({ c2, t7 }));
    await p.evaluate(() => { const b = document.querySelector('[data-compose="livre-cancelar"]'); if (b) b.click(); });
    await wait(150);

    /* folha viva NUNCA tocada pela impressão (recontagem de nós) + fixos visíveis */
    await L.set(RX, 'ZQA ______ ZQB'); const vivos = await L.txt(RX);
    await p.evaluate(() => {
      const via1 = document.querySelector('#recipePrint .rx-copy');
      for (const [k, v] of [['name', 'Paciente Z'], ['date', '26/09/2026'], ['address', 'Rua ZQ 1']]) { const el = via1.querySelector(`[data-field="${k}"]`); if (el) { el.textContent = v; el.dispatchEvent(new Event('input', { bubbles: true })); } }
      window.print = () => { window.__pz = 1; };
      document.getElementById('qualityDialog') && document.getElementById('qualityDialog').open && document.getElementById('qualityDialog').close();
    });
    await p.evaluate(() => { window.__HUB_TEST__.validate ? null : null; });
    await p.evaluate(() => { if (!window.__HUB_TEST__.validate()) { const d = document.getElementById('qualityDialog'); const c = document.getElementById('dialogConfirm'); if (d && d.open && c && !c.hidden) c.click(); } });
    await wait(250);
    const portalTem = await p.evaluate(() => { const pt = document.getElementById('printPortal'); return { on: !!pt.textContent.trim(), spans: pt.querySelectorAll('.lacuna-pendente').length }; });
    await p.emulateMedia({ media: 'print' });
    const invis = await p.evaluate(() => { const s = document.querySelector('#printPortal .lacuna-pendente'); return s ? getComputedStyle(s).color : null; });
    const fixo = await p.evaluate(() => { const pt = document.getElementById('printPortal'); const m = pt.textContent.match(/UF:\s*_{3,}/); const w = document.createTreeWalker(pt, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const i = n.data.indexOf('UF:'); if (i >= 0) { const cs = getComputedStyle(n.parentElement); return { achou: true, cor: cs.color, span: n.parentElement.classList.contains('lacuna-pendente') }; } } return { achou: false, m: !!m }; });
    await p.emulateMedia({ media: 'screen' });
    await p.evaluate(() => { document.getElementById('printPortal').innerHTML = ''; });
    check('B · portal: lacuna editável virou span invisível na impressão; fixo "UF: ____" segue VISÍVEL',
      portalTem.on && portalTem.spans >= 2 && invis === 'rgba(0, 0, 0, 0)' && fixo.achou && !fixo.span && fixo.cor !== 'rgba(0, 0, 0, 0)', J({ portalTem, invis, fixo }));
    const depoisVivo = await L.txt(RX);
    check('B · folha viva idêntica após impressão (sem span na edição) (#8 #19 #29)', depoisVivo === vivos, J({ vivos, depoisVivo }));

    /* ── guias no PALCO (orquestrator-guias) — paste duplo #30 e espelho 2ª via ── */
    const stOk = await p.evaluate(() => { try { return window.OrquestratorGuias.abrirNoStage(null, 'guides'); } catch (e) { return 'ERRO ' + e; } });
    await wait(500);
    const GN = '#preview [contenteditable="plaintext-only"][data-bind="patient.name"]';
    check('S · guia aberto no palco com campo editável', stOk === true && !!(await p.evaluate(s => !!document.querySelector(s), GN)), J(stOk));
    /* paste sintético no palco: só EXISTE um handler vivo (#preview); o ClipboardEvent
       sintético não dispara a inserção nativa — o handler do guia continua executando o
       paste (preventDefault + insertPlainText), exatamente como fazia antes da mudança.
       A diferença é que o handler do HUB (#workspaceView) não age mais em duplicata
       sobre nenhum [contenteditable] do palco (#30 vive de dois handlers — matou um). */
    await L.set(GN, 'ABC '); await L.caret(GN, 4);
    await p.evaluate(sel => {
      const el = document.querySelector(sel);
      const dt2 = new DataTransfer(); dt2.setData('text/plain', '1 cp');
      el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt2, bubbles: true, cancelable: true }));
      /* o handler do guia previne e insere uma vez; o do hub receberia o MESMO evento
         e inseriria de novo no caminho antigo — aqui ele já não previne */
    }, GN);
    await wait(250);
    t = await L.txt(GN);
    check('A · paste sintético no PALCO insere UMA vez → "ABC 1 cp" (nunca "1 cp1 cp") (#30)', t === 'ABC 1 cp', J(t));
    await p.evaluate(() => window.OrquestratorGuias.restaurar());

    /* ── institucional: campo com lacuna dentro de label fixo + 2ª via ── */
    const stDoc = await p.evaluate(() => { try { return window.OrquestratorDocs.abrirNoStage('encaminhamento-geral'); } catch (e) { return 'ERRO ' + e; } });
    await wait(500);
    const MT = '[data-campo="motivo-encaminhamento"]';
    if (stDoc === true) {
      await L.setV(MT, 'por ___ dias'); await L.caretV(MT, 4); await p.keyboard.type('7');
      const t7b = await L.val(MT);
      const esp = await p.evaluate(() => { const e = document.querySelector('[data-espelho="motivo-encaminhamento"]'); return e ? e.textContent : null; });
      await undo(); const t7c = await L.val(MT);
      const esp2 = await p.evaluate(() => { const e = document.querySelector('[data-espelho="motivo-encaminhamento"]'); return e ? e.textContent : null; });
      check('A · institucional: caret na borda + "7" → "por 7 dias"; undo devolve; espelho acompanha os 2 passos (#22)', t7b === 'por 7 dias' && esp === 'por 7 dias' && t7c === 'por ___ dias' && esp2 === 'por ___ dias', J({ t7b, esp, t7c, esp2 }));
    }
    await p.evaluate(() => window.OrquestratorDocs.restaurar());

    /* ── fora dos documentos: busca do painel #orqAssist (escopo fechado) ── */
    const temOrq = await p.evaluate(() => !!document.querySelector('#orqAssist input,[data-orqa-med]'));
    if (temOrq) {
      const sel = await p.evaluate(() => { const el = document.querySelector('#orqAssist input,[data-orqa-med]'); el.setAttribute('data-lac-x', '1'); return '[data-lac-x="1"]'; });
      await L.setV(sel, 'ab___cd'); await L.caretV(sel, 3); await p.keyboard.type('Z');
      const vfora = await L.val(sel);
      check('F · fora dos documentos: campo do painel #orqAssist escreve normal ("ab_Z__cd")', vfora === 'ab_Z__cd', J(vfora));
    } else {
      check('F · painel #orqAssist não montado nesta linha — fora coberto por F1/F2 do aceite: —', true, '—');
    }

    check('C · 0 erros de página na bateria inteira', erros.length === 0, erros.join(' | '));
  } catch (e) {
    check('X · execução', false, String(e).split('\n')[0].slice(0, 200));
  }
  await b.close(); srv.close();
  const ok = res.every(Boolean);
  console.log(`  ${ok ? '✅ PASSOU' : '🔴 FALHOU'} — ${res.filter(Boolean).length}/${res.length} (motor ${MOTOR})`);
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error('FALHA do instrumento:', e); process.exit(2); });
