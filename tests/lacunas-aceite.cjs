#!/usr/bin/env node
/* PROVA DE ACEITE — LACUNAS ("___" em campos editáveis de documento) · auditor ≠ autor · 26/09/2026
   uso: NODE_PATH=~/Projetos/Tangent/node_modules node /tmp/lacunas-aceite.cjs <raiz-do-app> <chromium|webkit>

   Requisitos: (A) escrever preenche a lacuna · (B) impressão esconde a lacuna editável e mantém o espaço; fixos seguem
   impressos · (C) estabilidade. Cada checagem cita o requisito e/ou o achado (#n) de ACHADOS-REVISAO-LACUNAS.md.

   Categorias (para ler os controles):
     A-fill    troca da lacuna — DEVE FALHAR no app sem a funcionalidade
     A-nativo  comportamento nativo preservado ("_" digitado, bordas, seleção) — passa sem a funcionalidade, por construção
     B-oculta  lacuna editável invisível na impressão — DEVE FALHAR sem a funcionalidade
     B-espaco  lacuna mantém espaço na impressão — passa sem a funcionalidade (traço visível ocupa espaço)
     B-fixo    campos fixos do modelo continuam impressos
     fora      nada muda fora dos documentos
     C         0 erros de página · 6/6 guardas · 1 `input` por tecla · sem reentrância · folha viva intocada pela impressão

   Medição de impressão sem depender da implementação: o campo recebe sentinelas "ZQx ______ ZQy"; no portal, em
   media print, mede-se cada run de "_" entre as sentinelas (cor/visibilidade/largura) e a distância A→B. */
const pw = require('playwright'), http = require('http'), fs = require('fs'), path = require('path');
const RAIZ = process.argv[2], MOTOR = String(process.argv[3] || 'chromium').toLowerCase();
if (!RAIZ || !fs.existsSync(path.join(RAIZ, 'index.html')) || !['chromium', 'webkit'].includes(MOTOR)) {
  console.error('uso: NODE_PATH=~/Projetos/Tangent/node_modules node /tmp/lacunas-aceite.cjs <raiz-do-app> <chromium|webkit>');
  process.exit(2);
}
const MOD = process.platform === 'darwin' ? 'Meta' : 'Control';
const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(RAIZ, u === '/' ? 'index.html' : u); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': tipos[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });

const res = [], nv = [];
const check = (id, cat, ok, det = '') => { res.push({ id, cat, ok: !!ok }); console.log(`  ${ok ? '✅' : '🔴'} ${id} [${cat}]${det ? ' — ' + det : ''}`); return !!ok; };
const naoVerificavel = (id, cat, motivo) => { nv.push({ id, cat }); console.log(`  ⚠️ ${id} [${cat}] — não verificável neste motor: ${motivo}`); };
const J = (v, n = 110) => { const s = JSON.stringify(v); return s && s.length > n ? s.slice(0, n) + '…' : s; };

(async () => {
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok)); const porta = srv.address().port, ORIGEM = `http://127.0.0.1:${porta}`;
  let b, canal = MOTOR;
  if (MOTOR === 'webkit') b = await pw.webkit.launch({ headless: true });
  else { try { b = await pw.chromium.launch({ channel: 'chrome', headless: true }); canal = 'chromium (canal chrome)'; } catch (_) { b = await pw.chromium.launch({ headless: true }); canal = 'chromium (headless shell)'; } }
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  if (MOTOR === 'chromium') { try { await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: ORIGEM }); } catch (_) { /* sem permissão: o controle de clipboard abaixo decide */ } }
  const p = await ctx.newPage(); const erros = []; p.on('pageerror', e => erros.push(String(e).split('\n')[0].slice(0, 160)));
  console.log(`PROVA DE ACEITE — lacunas · raiz ${RAIZ} · motor ${canal}`);
  const wait = ms => p.waitForTimeout(ms);
  const undo = async () => { await p.keyboard.press(`${MOD}+z`); await wait(120); };
  /* helpers de página (offsets globais por TreeWalker: valem para 1 ou N text nodes) */
  const instalar = () => p.evaluate(() => {
    const L = {
      ponto(el, off) { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let acc = 0, n, last = null; while ((n = w.nextNode())) { last = n; if (off <= acc + n.data.length) return [n, off - acc]; acc += n.data.length; } return last ? [last, last.data.length] : [el, 0]; },
      caret(sel, off) { const el = document.querySelector(sel); if (!el) return null; el.focus(); const [n, o] = L.ponto(el, off); const r = document.createRange(); r.setStart(n, o); r.collapse(true); const s = getSelection(); s.removeAllRanges(); s.addRange(r); const t = el.textContent; return t.slice(Math.max(0, off - 8), off) + '|' + t.slice(off, off + 8); },
      caretMk(sel, mk, k) { const el = document.querySelector(sel); if (!el) return null; const i = el.textContent.indexOf(mk); if (i < 0) return null; return L.caret(sel, i + mk.length + k); },
      selecionar(sel, a, b) { const el = document.querySelector(sel); el.focus(); const [n1, o1] = L.ponto(el, a), [n2, o2] = L.ponto(el, b); const r = document.createRange(); r.setStart(n1, o1); r.setEnd(n2, o2); const s = getSelection(); s.removeAllRanges(); s.addRange(r); return s.toString(); },
      set(sel, t) { const el = document.querySelector(sel); if (!el) return null; el.textContent = t; el.dispatchEvent(new Event('input', { bubbles: true })); return el.textContent; },
      txt(sel) { const el = document.querySelector(sel); return el ? el.textContent : null; },
      inner(sel) { const el = document.querySelector(sel); return el ? el.innerText : null; },
      setV(sel, t) { const el = document.querySelector(sel); if (!el) return null; el.value = t; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.focus(); return el.value; },
      caretV(sel, a, b) { const el = document.querySelector(sel); if (!el) return null; el.focus(); el.setSelectionRange(a, b == null ? a : b); return el.value.slice(Math.max(0, a - 8), a) + '|' + el.value.slice(a, a + 8); },
      val(sel) { const el = document.querySelector(sel); return el ? el.value : null; },
      contar(sel) { const el = document.querySelector(sel); window.__cnt = 0; window.__cntH = e => { if (e.target === el) window.__cnt++; }; document.addEventListener('input', window.__cntH, true); return !!el; },
      contado() { document.removeEventListener('input', window.__cntH, true); return window.__cnt; },
      foto(sel) { const el = document.querySelector(sel); return el ? { t: el.textContent, n: el.querySelectorAll('*').length } : null; },
      _alpha(c) { if (!c) return 1; if (c === 'transparent') return 0; const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return 1; const ps = m[1].split(',').map(parseFloat); return ps.length === 4 ? ps[3] : 1; },
      _vis(pt, el) { let e = el; while (e && e !== pt) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false; e = e.parentElement; } const cs = getComputedStyle(el); if (L._alpha(cs.color) === 0 || L._alpha(cs.webkitTextFillColor) === 0 || parseFloat(cs.fontSize) === 0) return false; return true; },
      /* runs de "_" entre as sentinelas A e B, por ocorrência (cada via) */
      medir(portalSel, A, B) {
        const pt = document.querySelector(portalSel); if (!pt) return [{ erro: 'sem portal' }];
        const nos = []; const w = document.createTreeWalker(pt, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) nos.push(n);
        const out = [];
        nos.forEach((na, i) => {
          const ia = na.data.indexOf(A); if (ia < 0) return;
          let ib = -1, nb = null, j;
          for (j = i; j < Math.min(nos.length, i + 40); j++) { const k = nos[j].data.indexOf(B, j === i ? ia + A.length : 0); if (k >= 0) { ib = k; nb = nos[j]; break; } }
          if (!nb) { out.push({ erro: 'sentinela B não encontrada após A' }); return; }
          const runs = [];
          for (let q = i; q <= j; q++) { const nd = nos[q]; const from = q === i ? ia + A.length : 0, to = q === j ? ib : nd.data.length; const seg = nd.data.slice(from, to); const re = /_{3,}/g; let m; while ((m = re.exec(seg))) { const r = document.createRange(); r.setStart(nd, from + m.index); r.setEnd(nd, from + m.index + m[0].length); const rc = r.getBoundingClientRect(); runs.push({ n: m[0].length, w: Math.round(rc.width * 10) / 10, vis: L._vis(pt, nd.parentElement), cor: getComputedStyle(nd.parentElement).color, pai: (nd.parentElement.className || nd.parentElement.tagName).toString().slice(0, 28) }); } }
          const rA = document.createRange(); rA.setStart(na, ia); rA.setEnd(na, ia + A.length); const ra = rA.getBoundingClientRect();
          const rB = document.createRange(); rB.setStart(nb, ib); rB.setEnd(nb, ib + B.length); const rb = rB.getBoundingClientRect();
          const fs = parseFloat(getComputedStyle(na.parentElement).fontSize) || 12;
          out.push({ runs, dist: Math.round((rb.left - ra.right) * 10) / 10, fs, mesmaLinha: Math.abs(ra.top - rb.top) < fs * 0.8, pai: (na.parentElement.className || na.parentElement.tagName).toString().slice(0, 28) });
        });
        return out;
      },
      /* texto achatado do portal com mapa offset→nó: os fixos podem estar partidos em vários nós (ex.: "UF: " + <span>____</span>) */
      _flat(pt) { const w = document.createTreeWalker(pt, NodeFilter.SHOW_TEXT); let n, text = ''; const map = []; while ((n = w.nextNode())) { map.push({ node: n, start: text.length }); text += n.data; } return { text, map }; },
      _pos(f, off) { let m = f.map[0]; for (const e of f.map) { if (e.start <= off) m = e; else break; } return [m.node, off - m.start]; },
      _run(pt, f, a, b) { const [n1, o1] = L._pos(f, a), [n2, o2] = L._pos(f, b); const r = document.createRange(); r.setStart(n1, o1); r.setEnd(n2, o2); return { vis: L._vis(pt, n1.parentElement), w: Math.round(r.getBoundingClientRect().width) }; },
      fixos(portalSel) {
        const pt = document.querySelector(portalSel); if (!pt) return null;
        const f = L._flat(pt); const r = { uf: [], data: [], tiny: [], assin: [] }; let m;
        const reUF = /UF:\s*(_{3,})/g; while ((m = reUF.exec(f.text))) { const a = m.index + m[0].indexOf(m[1]); r.uf.push(L._run(pt, f, a, a + m[1].length)); }
        const reD = /_{3,}\/_{3,}\/_{3,}/g; while ((m = reD.exec(f.text))) r.data.push(L._run(pt, f, m.index, m.index + m[0].length));
        const reA = /ASSINATURA DO FARMAC/gi; while ((m = reA.exec(f.text))) r.assin.push({ vis: L._vis(pt, L._pos(f, m.index)[0].parentElement) });
        pt.querySelectorAll('.tiny-line').forEach(el => { const cs = getComputedStyle(el); r.tiny.push({ w: Math.round(el.getBoundingClientRect().width), borda: parseFloat(cs.borderBottomWidth) > 0 && cs.borderBottomStyle !== 'none', vis: L._vis(pt, el) }); });
        return r;
      }
    };
    window.__LAC = L; return true;
  });
  const LAC = new Proxy({}, { get: (_, nome) => (...args) => p.evaluate(([nome, args]) => window.__LAC[nome](...args), [nome, args]) });
  const invisivel = m => m.length > 0 && m.every(o => !o.erro && o.runs.every(r => !r.vis));
  const espaco = m => m.length > 0 && m.every(o => !o.erro && (o.runs.length ? o.runs.every(r => r.w > 0) : (o.mesmaLinha && o.dist >= 1.5 * o.fs)));
  const resumoMed = m => J(m.map(o => o.erro || { pai: o.pai, runs: o.runs.map(r => `${r.n}_ w${r.w} ${r.vis ? 'VISÍVEL' : 'oculto'}`), dist: o.dist }), 150);
  /* clipboard: escreve no motor certo; o controle abaixo prova que colar funciona antes de qualquer checagem de colar */
  const clipWrite = async (texto) => {
    if (MOTOR === 'chromium') { try { await p.evaluate(t => navigator.clipboard.writeText(t), texto); return true; } catch (_) { /* cai no execCommand */ } }
    return p.evaluate(t => { const ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;top:0;left:0;opacity:.01'; document.body.appendChild(ta); ta.focus(); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (_) { } ta.remove(); return ok; }, texto);
  };
  const colar = async () => { await p.keyboard.press(`${MOD}+v`); await wait(160); };
  let clipboardOK = false;
  const seColar = async (id, cat, fn) => { if (clipboardOK) return fn(); naoVerificavel(id, cat, 'área de transferência inoperante no headless (controle falhou)'); };
  const imprimirHub = async () => {
    await p.evaluate(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1; }; document.getElementById('printPortal').innerHTML = ''; document.getElementById('printBtn').click(); });
    await wait(150);
    const dlg = await p.evaluate(() => { const d = document.getElementById('qualityDialog'); if (d && d.open) { const titulo = (document.getElementById('dialogTitle') || {}).textContent || ''; if (/revisar/i.test(titulo)) { document.getElementById('dialogConfirm').click(); return 'aviso confirmado'; } const c = (document.getElementById('dialogContent') || {}).textContent || ''; d.close(); return 'BLOQUEADO: ' + c.trim().slice(0, 120); } return 'sem diálogo'; });
    await wait(150);
    const info = await p.evaluate(() => { const pt = document.getElementById('printPortal'); return { mode: pt.dataset.mode, len: pt.textContent.trim().length }; });
    return { ...info, dlg };
  };
  const limparImpressao = async () => { await p.emulateMedia({ media: 'screen' }); await p.evaluate(() => { document.getElementById('printPortal').innerHTML = ''; window.__printDelegado = false; }); };

  try {
    /* ───────── boot ───────── */
    await p.goto(`${ORIGEM}/index.html?test`, { waitUntil: 'networkidle', timeout: 45000 });
    if (await p.$('#f2xLoginCrm')) { await p.fill('#f2xLoginCrm', 'Orquestrator'); await p.fill('#f2xLoginSenha', 'Medicalhub1234'); await p.click('#f2xLoginEntrar'); }
    await p.waitForFunction(() => window.__HUB_TEST__ && window.__HUB_TEST__.catalog && window.__HUB_COMPOSE__ && window.OrqPWA && window.GuiasView && window.OrquestratorDocs && window.OrquestratorGuias, null, { timeout: 30000 });
    await instalar();
    check('S1 · app carregado (login, __HUB_TEST__, __HUB_COMPOSE__, OrqPWA, GuiasView, OrquestratorDocs/Guias)', 'C', true, '');
    /* controle de clipboard */
    await clipWrite('CLIPOK');
    await p.evaluate(() => { const ta = document.createElement('textarea'); ta.id = '__clip'; ta.style.cssText = 'position:fixed;top:0;left:0;z-index:99999'; document.body.appendChild(ta); ta.focus(); });
    await colar();
    const clipVal = await p.evaluate(() => { const ta = document.getElementById('__clip'); const v = ta.value; ta.remove(); return v; });
    clipboardOK = clipVal === 'CLIPOK';
    console.log(`  ${clipboardOK ? 'ℹ️' : '⚠️'} controle de área de transferência: ${clipboardOK ? 'operante' : 'INOPERANTE'} (colou ${J(clipVal)})`);

    /* ───────── fora dos documentos (1): busca do hub ───────── */
    await LAC.setV('#smartSearch', 'ab___cd'); await LAC.caretV('#smartSearch', 3); await p.keyboard.type('Z');
    check('F1 · fora dos documentos: #smartSearch escreve normal ("ab_Z__cd")', 'fora', (await LAC.val('#smartSearch')) === 'ab_Z__cd', J(await LAC.val('#smartSearch')));
    await LAC.setV('#smartSearch', '');

    /* ───────── receita: linha real ───────── */
    await p.evaluate(() => { const H = window.__HUB_TEST__; H.open(H.catalog.find(t => (t.regimens || []).length > 1).id); });
    await wait(800);
    const LINHA = 'Diazepam 5 mg, comprimido — ______.\nTomar ______, via oral, de ___ em ___ horas, por ___ dias.';
    await p.evaluate(l => { window.__HUB_COMPOSE__.adicionarLivre(l); window.__HUB_COMPOSE__.montar(); }, LINHA);
    await wait(500);
    await p.evaluate(() => { const s = document.getElementById('documentTypeSelect'); if (s && s.value !== 'control-special') { s.value = 'control-special'; s.dispatchEvent(new Event('change', { bubbles: true })); } });
    await wait(500);
    const RX = '#recipePrint .rx-copy .rx-body[data-field="prescription"]';
    const rx0 = await LAC.txt(RX);
    check('S2 · linha real montada na receita (controle especial, 2 vias)', 'C', !!rx0 && rx0.includes('Tomar ______, via oral') && (await p.evaluate(() => document.querySelectorAll('#recipePrint .rx-copy').length)) === 2, J((rx0 || '').slice(-70)));

    /* fora dos documentos (2): busca de paciente do workspace */
    await LAC.setV('#workspacePatientSearch', 'ab___cd'); await LAC.caretV('#workspacePatientSearch', 3); await p.keyboard.type('Z');
    check('F2 · fora dos documentos: #workspacePatientSearch (dentro do workspace) escreve normal', 'fora', (await LAC.val('#workspacePatientSearch')) === 'ab_Z__cd', J(await LAC.val('#workspacePatientSearch')));
    await LAC.setV('#workspacePatientSearch', '');

    /* ───────── A · receita, teclas reais na linha real ───────── */
    await LAC.caretMk(RX, 'Tomar ', 3); await p.keyboard.type('1 comprimido'); let t = await LAC.txt(RX);
    check('A01 · RX meio da lacuna, teclas reais: "Tomar 1 comprimido, via oral" e o resto intacto (A)', 'A-fill', t.includes('Tomar 1 comprimido, via oral, de ___ em ___ horas, por ___ dias.') && !/_1 comprimido|1 comprimido_/.test(t), J(t.slice(-75)));
    await LAC.caretMk(RX, 'via oral, de ', 3); await p.keyboard.type('8'); t = await LAC.txt(RX);
    check('A02 · RX encostado no FIM da lacuna: "de 8 em" (A)', 'A-fill', t.includes('de 8 em ___ horas'), J(t.slice(-60)));
    await LAC.caretMk(RX, ' em ', 0); await p.keyboard.type('8'); t = await LAC.txt(RX);
    check('A03 · RX encostado no COMEÇO da lacuna: "em 8 horas" (A)', 'A-fill', t.includes('em 8 horas, por ___ dias.'), J(t.slice(-45)));
    await LAC.caretMk(RX, 'por ', 1); await p.keyboard.type('7'); const comSete = await LAC.txt(RX); await undo(); t = await LAC.txt(RX);
    check('A04 · RX desfazer (Cmd/Ctrl+Z) devolve "por ___ dias" (A)', 'A-fill', comSete.includes('por 7 dias') && t.includes('por ___ dias') && !t.includes('por 7 dias'), J({ digitado: comSete.slice(-16), desfeito: t.slice(-16) }));
    await LAC.caretMk(RX, 'comprimido — ', 2); await p.keyboard.type('20 comprimidos'); t = await LAC.txt(RX);
    check('A05 · RX lacuna colada em pontuação ("— ______.") vira "— 20 comprimidos." (A)', 'A-fill', t.includes('comprimido — 20 comprimidos.\n') && !/_20 comprimidos|20 comprimidos_/.test(t), J(t.slice(0, 60)));
    check('A06 · RX 2ª via idêntica após preencher (syncCheck)', 'C', await p.evaluate(() => window.__HUB_TEST__.syncCheck()), '');
    await LAC.caretMk(RX, 'via', 0); await p.keyboard.type('X'); t = await LAC.txt(RX);
    check('A07 · RX fora de lacuna a escrita é normal ("viaX oral") (A)', 'A-nativo', t.includes('viaX oral'), J((t.match(/via.{0,8}/) || [''])[0]));
    await p.keyboard.press('Backspace');

    /* ───────── A · receita, cenários dos achados (conteúdo controlado) ───────── */
    await LAC.set(RX, 'Assinatura: '); await LAC.caret(RX, 12); await p.keyboard.type('____'); t = await LAC.txt(RX);
    check('A08 · RX digitar "____" não colapsa (cria lacuna nova) (A · #2 #20a)', 'A-nativo', t === 'Assinatura: ____', J(t));
    await LAC.set(RX, 'Tomar ___ cp.'); await LAC.caret(RX, 9); await p.keyboard.type('_'); t = await LAC.txt(RX);
    check('A09 · RX "_" encostado no fim da lacuna vira 4º traço, não troca (A · #2)', 'A-nativo', t === 'Tomar ____ cp.', J(t));
    await LAC.set(RX, 'Tomar 1 cp, por ___'); await LAC.caret(RX, 19); await p.keyboard.insertText('___'); t = await LAC.txt(RX);
    check('A09b · RX insertText("___") encostado numa lacuna existente alonga para 6 traços, não colapsa (A · #2 #20a)', 'A-nativo', t === 'Tomar 1 cp, por ______', J(t));
    await LAC.set(RX, 'Tomar ___ cp.'); await LAC.caret(RX, 6); await p.keyboard.insertText('2'); t = await LAC.txt(RX);
    check('A10 · RX inserção sem keydown (insertText≈IME) no COMEÇO da lacuna: "Tomar 2 cp." (A · #10 #20b)', 'A-fill', t === 'Tomar 2 cp.', J(t));
    await LAC.set(RX, 'Tomar ______ via oral'); await LAC.caret(RX, 9); await p.keyboard.insertText('2 cp'); t = await LAC.txt(RX);
    check('A11 · RX insertText no MEIO: "Tomar 2 cp via oral", sem duplicar (A · #10 #20b)', 'A-fill', t === 'Tomar 2 cp via oral', J(t));
    await LAC.set(RX, 'Tomar ___ cp.'); await LAC.caret(RX, 9); await p.keyboard.insertText('2'); t = await LAC.txt(RX);
    check('A12 · RX insertText no FIM: "Tomar 2 cp." (A · #10)', 'A-fill', t === 'Tomar 2 cp.', J(t));
    await seColar('A13 · RX colar no MEIO da lacuna: "Tomar XYZ mg" (A · #1 #11 #24)', 'A-fill', async () => { await clipWrite('XYZ'); await LAC.set(RX, 'Tomar ______ mg'); await LAC.caret(RX, 9); await colar(); t = await LAC.txt(RX); check('A13 · RX colar no MEIO da lacuna: "Tomar XYZ mg" (A · #1 #11 #24)', 'A-fill', t === 'Tomar XYZ mg', J(t)); });
    await seColar('A14 · RX colar encostado no COMEÇO: "Tomar XYZ mg" (A · #11)', 'A-fill', async () => { await clipWrite('XYZ'); await LAC.set(RX, 'Tomar ______ mg'); await LAC.caret(RX, 6); await colar(); t = await LAC.txt(RX); check('A14 · RX colar encostado no COMEÇO: "Tomar XYZ mg" (A · #11)', 'A-fill', t === 'Tomar XYZ mg', J(t)); });
    await seColar('A15 · RX colar multilinha na lacuna: "por linha A⏎linha B dias." (A · #24)', 'A-fill', async () => { await clipWrite('linha A\nlinha B'); await LAC.set(RX, 'Tomar 1 cp, por ___ dias.'); await LAC.caret(RX, 17); await colar(); t = await LAC.inner(RX); check('A15 · RX colar multilinha na lacuna: "por linha A⏎linha B dias." (A · #24)', 'A-fill', /Tomar 1 cp, por linha A\nlinha B dias\./.test(t) && !t.includes('_'), J(t)); });
    await LAC.set(RX, 'Tomar 1 ______ mg'); await LAC.caret(RX, 8); await p.keyboard.press('Backspace'); t = await LAC.txt(RX);
    check('A16 · RX Backspace encostado ANTES da lacuna apaga só o espaço (A · #3 #17 #25)', 'A-nativo', t === 'Tomar 1______ mg', J(t));
    await LAC.set(RX, 'Tomar 1 ______ mg'); await LAC.caret(RX, 14); await p.keyboard.press('Delete'); t = await LAC.txt(RX);
    check('A17 · RX Delete encostado DEPOIS da lacuna apaga só o espaço (A · #3 #17 #25)', 'A-nativo', t === 'Tomar 1 ______mg', J(t));
    await LAC.set(RX, 'Tomar 1 ______ mg'); await LAC.caret(RX, 11); await p.keyboard.press('Backspace'); t = await LAC.txt(RX);
    check('A18 · RX Backspace DENTRO da lacuna apaga um traço (nativo) (A · #3)', 'A-nativo', t === 'Tomar 1 _____ mg', J(t));
    await LAC.set(RX, 'Tomar 1 ______ mg'); await LAC.caret(RX, 11); await p.keyboard.press('Delete'); t = await LAC.txt(RX);
    check('A19 · RX Delete DENTRO da lacuna apaga um traço (nativo) (A · #3)', 'A-nativo', t === 'Tomar 1 _____ mg', J(t));
    await LAC.set(RX, 'de ___ em ___ horas, por ___ dias.'); const selRX = await LAC.selecionar(RX, 3, 19); await p.keyboard.type('X'); t = await LAC.txt(RX);
    check('A20 · RX seleção não colapsada que começa na lacuna: nativo substitui tudo → "de X, por ___ dias." (A · #16 #26)', 'A-nativo', selRX === '___ em ___ horas' && t === 'de X, por ___ dias.', J({ sel: selRX, t }));
    await LAC.set(RX, 'Tomar ___ cp.'); await LAC.caret(RX, 7); await LAC.contar(RX); await p.keyboard.press('1'); const nInp = await LAC.contado(); t = await LAC.txt(RX);
    check('A21 · RX um único evento `input` por tecla dentro da lacuna (C · #18 #28)', 'C', nInp === 1 && t !== 'Tomar ___ cp.', J({ eventos: nInp, t }));
    const e0 = erros.length; await LAC.set(RX, 'Tomar 1 cp, por '); await LAC.caret(RX, 16); await p.keyboard.insertText('___'); await wait(250); t = await LAC.txt(RX);
    check('A22 · RX insertText("___") no fim: sem reentrância, sem duplicação, sem erro (C · #20c RangeError WebKit)', 'C', t === 'Tomar 1 cp, por ___' && erros.length === e0, J({ t: t.slice(0, 60), errosNovos: erros.slice(e0) }));
    /* cabeçalho da via (campo do paciente) */
    const HDR = '#recipePrint .rx-copy [data-field="address"][contenteditable]';
    const temHdr = await p.evaluate(s => !!document.querySelector(s), HDR);
    await LAC.set(HDR, 'Rua ______, nº 10'); await LAC.caret(HDR, 7); await p.keyboard.type('Central'); t = await LAC.txt(HDR);
    const hdr2 = await p.evaluate(() => { const c = document.querySelectorAll('#recipePrint .rx-copy'); return c[1] ? (c[1].querySelector('[data-sync="address"]') || {}).textContent : null; });
    check('A23 · cabeçalho do paciente (ENDEREÇO) preenche a lacuna e espelha na 2ª via (A)', 'A-fill', temHdr && t === 'Rua Central, nº 10' && hdr2 === t, J({ via1: t, via2: hdr2 }));

    /* ───────── B · impressão da receita (controle especial) ───────── */
    await LAC.set(RX, 'Diazepam 5 mg — ZQA ______ ZQB.\nTomar ZQC ______ ZQD, via oral.');
    for (const [k, v] of [['name', 'Paciente Teste'], ['date', '26/09/2026'], ['cpf', '000.000.000-00'], ['address', 'Rua ZQH ______ ZQI nº 10']]) await LAC.set(`#recipePrint .rx-copy [data-field="${k}"][contenteditable]`, v);
    await wait(200);
    const fotoRX = await LAC.foto(RX);
    const impRX = await imprimirHub();
    check('B01 · impressão da receita: portal montado (modo recipe, 2 vias com o corpo)', 'C', impRX.mode === 'recipe' && impRX.len > 0 && (await p.evaluate(() => (document.getElementById('printPortal').textContent.match(/ZQA/g) || []).length)) === 2, J(impRX));
    await p.emulateMedia({ media: 'print' });
    const mRX1 = await LAC.medir('#printPortal', 'ZQA', 'ZQB'), mRX2 = await LAC.medir('#printPortal', 'ZQC', 'ZQD'), mHDR = await LAC.medir('#printPortal', 'ZQH', 'ZQI'), fx = await LAC.fixos('#printPortal');
    check('B02 · impressão receita: lacunas do corpo INVISÍVEIS nas 2 vias (B)', 'B-oculta', invisivel(mRX1) && invisivel(mRX2), resumoMed(mRX1.concat(mRX2)));
    check('B03 · impressão receita: lacunas do corpo mantêm o ESPAÇO (B)', 'B-espaco', espaco(mRX1) && espaco(mRX2), resumoMed(mRX1.concat(mRX2)));
    check('B04 · impressão receita: lacuna no cabeçalho (ENDEREÇO) invisível na 1ª E na 2ª via (B · #7)', 'B-oculta', mHDR.length === 2 && invisivel(mHDR) && espaco(mHDR), resumoMed(mHDR));
    check('B05 · impressão receita: campos FIXOS continuam ("UF: ____", "____/____/____", linha NOME, assinatura) (B)', 'B-fixo', !!fx && fx.uf.length > 0 && fx.uf.every(x => x.vis && x.w > 0) && fx.data.length > 0 && fx.data.every(x => x.vis && x.w > 0) && fx.tiny.length > 0 && fx.tiny.every(x => x.vis && x.w > 0 && x.borda) && fx.assin.length > 0 && fx.assin.every(x => x.vis), J({ uf: fx && fx.uf.length, data: fx && fx.data.length, tiny: fx && fx.tiny.length, assin: fx && fx.assin.length, ufVis: fx && fx.uf.every(x => x.vis), dataVis: fx && fx.data.every(x => x.vis) }));
    await limparImpressao();
    const fotoRX2 = await LAC.foto(RX);
    check('B06 · impressão não altera a folha viva da receita (texto e nós iguais) (C · #8 #19 #29)', 'C', JSON.stringify(fotoRX) === JSON.stringify(fotoRX2), J({ antes: fotoRX && fotoRX.n, depois: fotoRX2 && fotoRX2.n }));

    /* ───────── A/B · orientação ───────── */
    await p.evaluate(() => document.querySelector('.tab-btn[data-tab="orientation"]').click()); await wait(400);
    const ORI = '#orientationPrint [data-field="orientation"][contenteditable]';
    check('S3 · aba Orientações aberta com corpo editável', 'C', await p.evaluate(s => !!document.querySelector(s), ORI), '');
    await LAC.set(ORI, 'Retornar em ___ dias.'); await LAC.caret(ORI, 13); await p.keyboard.type('7'); t = await LAC.txt(ORI);
    const o1 = t; check('O01 · ORI digitar dentro da lacuna: "Retornar em 7 dias." (A)', 'A-fill', t === 'Retornar em 7 dias.', J(t));
    await undo(); t = await LAC.txt(ORI);
    check('O02 · ORI desfazer (após troca real) devolve a lacuna (A)', 'A-fill', o1 === 'Retornar em 7 dias.' && t === 'Retornar em ___ dias.', J({ digitado: o1, desfeito: t }));
    await LAC.set(ORI, 'Beber ______ de água.'); await LAC.caret(ORI, 8); await p.keyboard.insertText('2 litros'); t = await LAC.txt(ORI);
    check('O03 · ORI insertText (IME) na lacuna: "Beber 2 litros de água." (A · #10)', 'A-fill', t === 'Beber 2 litros de água.', J(t));
    await seColar('O04 · ORI colar na lacuna: "Tomar 3 vezes ao dia." (A · #24)', 'A-fill', async () => { await clipWrite('3 vezes'); await LAC.set(ORI, 'Tomar ___ ao dia.'); await LAC.caret(ORI, 7); await colar(); t = await LAC.txt(ORI); check('O04 · ORI colar na lacuna: "Tomar 3 vezes ao dia." (A · #24)', 'A-fill', t === 'Tomar 3 vezes ao dia.', J(t)); });
    await LAC.set(ORI, 'Obs: '); await LAC.caret(ORI, 5); await p.keyboard.type('____'); t = await LAC.txt(ORI);
    check('O05 · ORI "____" digitado fica "____" (A · #2)', 'A-nativo', t === 'Obs: ____', J(t));
    await LAC.set(ORI, 'Retornar ZQA ______ ZQB dias.'); await wait(150);
    const fotoORI = await LAC.foto(ORI);
    const impORI = await imprimirHub();
    check('O06 · impressão da orientação: portal montado (modo orientation)', 'C', impORI.mode === 'orientation' && impORI.len > 0 && (await p.evaluate(() => document.getElementById('printPortal').textContent.includes('ZQA'))), J(impORI));
    await p.emulateMedia({ media: 'print' });
    const mORI = await LAC.medir('#printPortal', 'ZQA', 'ZQB');
    check('O07 · impressão orientação: lacuna editável INVISÍVEL (B)', 'B-oculta', invisivel(mORI), resumoMed(mORI));
    check('O08 · impressão orientação: lacuna mantém o ESPAÇO (B)', 'B-espaco', espaco(mORI), resumoMed(mORI));
    await limparImpressao();
    check('O09 · impressão não altera a folha viva da orientação (C · #8 #19 #29)', 'C', JSON.stringify(fotoORI) === JSON.stringify(await LAC.foto(ORI)), '');
    await p.evaluate(() => document.querySelector('.tab-btn[data-tab="recipe"]').click()); await wait(300);

    /* ───────── A · item livre (textarea) ───────── */
    await p.evaluate(() => document.querySelector('[data-compose="livre"]').click()); await wait(200);
    const TA = '#composeTray .compose-livre-editor textarea';
    check('S4 · editor do item livre aberto (textarea)', 'C', await p.evaluate(s => !!document.querySelector(s), TA), '');
    await LAC.setV(TA, 'Tomar ___ via oral'); await LAC.caretV(TA, 7); await p.keyboard.press('1'); t = await LAC.val(TA);
    const t1 = t; check('T01 · item livre: digitar dentro da lacuna → "Tomar 1 via oral" (A)', 'A-fill', t === 'Tomar 1 via oral', J(t));
    await undo(); t = await LAC.val(TA);
    check('T02 · item livre: desfazer (após troca real) devolve "Tomar ___ via oral" (A · #4 #14 #22)', 'A-fill', t1 === 'Tomar 1 via oral' && t === 'Tomar ___ via oral', J({ digitado: t1, desfeito: t }));
    await LAC.setV(TA, 'Tomar ___ via oral'); await LAC.caretV(TA, 6); await p.keyboard.insertText('2'); t = await LAC.val(TA);
    check('T03 · item livre: insertText (IME) no começo da lacuna → "Tomar 2 via oral", sem "22" (A · #10 #20b)', 'A-fill', t === 'Tomar 2 via oral', J(t));
    await seColar('T04 · item livre: colar na lacuna → "Tomar 3 cp via oral" (A · #1 #24)', 'A-fill', async () => { await clipWrite('3 cp'); await LAC.setV(TA, 'Tomar ______ via oral'); await LAC.caretV(TA, 9); await colar(); t = await LAC.val(TA); check('T04 · item livre: colar na lacuna → "Tomar 3 cp via oral" (A · #1 #24)', 'A-fill', t === 'Tomar 3 cp via oral', J(t)); });
    await LAC.setV(TA, 'Tomar '); await LAC.caretV(TA, 6); await p.keyboard.type('____ cp, por ___ dias.'); t = await LAC.val(TA);
    check('T05 · item livre: digitar "____ cp, por ___ dias." fica íntegro (A · #2 #20a)', 'A-nativo', t === 'Tomar ____ cp, por ___ dias.', J(t));
    await LAC.setV(TA, 'Tomar ______, via oral'); await LAC.caretV(TA, 6); await p.keyboard.press('Backspace'); t = await LAC.val(TA);
    check('T06 · item livre: Backspace encostado ANTES apaga só o espaço (A · #3 #25)', 'A-nativo', t === 'Tomar______, via oral', J(t));
    await LAC.setV(TA, 'Tomar ______, via oral'); await LAC.caretV(TA, 12); await p.keyboard.press('Delete'); t = await LAC.val(TA);
    check('T07 · item livre: Delete encostado DEPOIS apaga só a vírgula (A · #3 #25)', 'A-nativo', t === 'Tomar ______ via oral', J(t));
    await LAC.setV(TA, 'de ___ em ___ horas'); await LAC.caretV(TA, 3, 13); await p.keyboard.type('X'); t = await LAC.val(TA);
    check('T08 · item livre: seleção não colapsada segue o nativo → "de X horas" (A · #16 #26)', 'A-nativo', t === 'de X horas', J(t));
    await LAC.setV(TA, 'Tomar ___ cp.'); await LAC.caretV(TA, 7); await LAC.contar(TA); await p.keyboard.press('1'); const nInpTA = await LAC.contado(); t = await LAC.val(TA);
    check('T09 · item livre: um único `input` por tecla na lacuna (C · #18 #28)', 'C', nInpTA === 1 && t !== 'Tomar ___ cp.', J({ eventos: nInpTA, t }));
    await p.evaluate(() => { const b = document.querySelector('[data-compose="livre-cancelar"]'); if (b) b.click(); });

    /* ───────── A/B · institucionais (encaminhamento-geral no palco) ───────── */
    const instOk = await p.evaluate(() => { try { return window.OrquestratorDocs.abrirNoStage('encaminhamento-geral'); } catch (e) { return 'ERRO ' + e; } }); await wait(500);
    const MT = '[data-campo="motivo-encaminhamento"]';
    const esp = () => p.evaluate(() => { const e = document.querySelector('[data-espelho="motivo-encaminhamento"]'); return e ? e.textContent : null; });
    check('S5 · institucional "encaminhamento-geral" aberto no palco com textarea motivo-encaminhamento', 'C', instOk === true && (await p.evaluate(s => { const e = document.querySelector(s); return !!e && e.tagName === 'TEXTAREA' && e.getBoundingClientRect().width > 0; }, MT)), J(instOk));
    await LAC.setV(MT, 'Tomar ___ via oral'); await LAC.caretV(MT, 7); await p.keyboard.press('1'); t = await LAC.val(MT); let e2 = await esp();
    const i1 = t; check('I01 · institucional: digitar dentro da lacuna → "Tomar 1 via oral" e espelho da 2ª via igual (A)', 'A-fill', t === 'Tomar 1 via oral' && e2 === t, J({ t, espelho: e2 }));
    await undo(); t = await LAC.val(MT); e2 = await esp();
    check('I02 · institucional: desfazer (após troca real) devolve a lacuna sem lixo, espelho igual (A · #4 #14 #22)', 'A-fill', i1 === 'Tomar 1 via oral' && t === 'Tomar ___ via oral' && e2 === t, J({ digitado: i1, desfeito: t, espelho: e2 }));
    await LAC.setV(MT, 'abc ___ def'); await LAC.caretV(MT, 4); await p.keyboard.insertText('Z'); t = await LAC.val(MT);
    check('I03 · institucional: insertText (IME) na lacuna → "abc Z def", sem "ZZ" (A · #10)', 'A-fill', t === 'abc Z def', J(t));
    await seColar('I04 · institucional: colar na lacuna → "Tomar 3 cp via oral" (A · #1 #24)', 'A-fill', async () => { await clipWrite('3 cp'); await LAC.setV(MT, 'Tomar ______ via oral'); await LAC.caretV(MT, 9); await colar(); t = await LAC.val(MT); check('I04 · institucional: colar na lacuna → "Tomar 3 cp via oral" (A · #1 #24)', 'A-fill', t === 'Tomar 3 cp via oral', J(t)); });
    await LAC.setV(MT, 'Assinatura '); await LAC.caretV(MT, 11); await p.keyboard.type('___'); t = await LAC.val(MT);
    check('I05 · institucional: digitar "___" fica "___" (A · #2)', 'A-nativo', t === 'Assinatura ___', J(t));
    await LAC.setV(MT, 'por ___ dias'); await LAC.caretV(MT, 4); await p.keyboard.press('Backspace'); t = await LAC.val(MT);
    check('I06 · institucional: Backspace encostado ANTES apaga só o espaço (A · #25)', 'A-nativo', t === 'por___ dias', J(t));
    const INP = await p.evaluate(() => { const c = [...document.querySelectorAll('#f1-formulario input[type="text"][data-campo]')].find(i => i.getBoundingClientRect().width > 0 && (!i.maxLength || i.maxLength < 0 || i.maxLength >= 12)); if (!c) return null; c.setAttribute('data-lac', '1'); return c.dataset.campo; });
    if (INP) { await LAC.setV('[data-lac="1"]', 'abc ___ def'); await LAC.caretV('[data-lac="1"]', 4); await p.keyboard.type('Z'); t = await LAC.val('[data-lac="1"]'); check(`I07 · institucional <input data-campo="${INP}">: digitar na lacuna → "abc Z def" (A · #10 #14)`, 'A-fill', t === 'abc Z def', J(t)); }
    await p.evaluate(() => { window.F1VTeste.preencherSintetico(); }); await LAC.setV(MT, 'Obs ZQA ______ ZQB fim'); await wait(200);
    const impINST = await p.evaluate(async () => { window.print = () => { window.__printed = (window.__printed || 0) + 1; }; document.getElementById('printPortal').innerHTML = ''; window.__printed = 0; document.getElementById('f1-imprimir').click(); await new Promise(r => setTimeout(r, 250)); const pt = document.getElementById('printPortal'); return { printed: window.__printed, tem: pt.textContent.includes('ZQA'), alerta: ((document.getElementById('f1-alerta') || {}).textContent || '').trim().slice(0, 100) }; });
    check('I08 · impressão institucional: portal montado com o valor do campo', 'C', impINST.printed === 1 && impINST.tem, J(impINST));
    await p.emulateMedia({ media: 'print' });
    const mINST = await LAC.medir('#printPortal', 'ZQA', 'ZQB');
    check('I09 · impressão institucional: lacuna editável INVISÍVEL (B · #6 #15 #23)', 'B-oculta', invisivel(mINST), resumoMed(mINST));
    check('I10 · impressão institucional: lacuna mantém o ESPAÇO (B · #6 #23)', 'B-espaco', espaco(mINST), resumoMed(mINST));
    await limparImpressao();
    check('I11 · impressão não altera o campo vivo institucional (C · #8 #19 #29)', 'C', (await LAC.val(MT)) === 'Obs ZQA ______ ZQB fim', J(await LAC.val(MT)));
    await p.evaluate(() => window.OrquestratorDocs.restaurar());

    /* ───────── A/B · guias do paciente (documentsView) ───────── */
    const gOk = await p.evaluate(() => { try { document.querySelector('#documentsView').hidden = false; document.querySelector('#hubView').hidden = true; document.querySelector('#workspaceView').hidden = true; const r1 = window.GuiasView.boot(); const r2 = window.GuiasView.open(null, 'guides'); return r1 && r2; } catch (e) { return 'ERRO ' + e; } }); await wait(500);
    const GN = '#preview [contenteditable="plaintext-only"][data-bind="patient.name"]';
    check('S6 · guias abertos (catálogo guides) com campo editável patient.name', 'C', gOk === true && (await p.evaluate(s => !!document.querySelector(s), GN)), J(gOk));
    const setG = async v => { await LAC.set(GN, v); await wait(150); };
    await setG('Obs: ______ fim, de ___ em ___ h'); await LAC.caret(GN, 8); await p.keyboard.type('1'); t = await LAC.txt(GN);
    check('G01 · guia: lacuna precedida de texto é substituída inteira → "Obs: 1 fim, …" (A · #5 #12 #21)', 'A-fill', t === 'Obs: 1 fim, de ___ em ___ h', J(t));
    await p.keyboard.type('0'); t = await LAC.txt(GN);
    check('G02 · guia: 2ª tecla continua no mesmo ponto → "Obs: 10 fim, …", não pula para a última lacuna (A · #13)', 'A-fill', t === 'Obs: 10 fim, de ___ em ___ h', J(t));
    await LAC.caretMk(GN, 'de ', 1); await p.keyboard.type('8'); t = await LAC.txt(GN);
    check('G03 · guia: lacuna do meio ("de ___") → "de 8 em", sem corromper o começo (A · #21)', 'A-fill', t === 'Obs: 10 fim, de 8 em ___ h', J(t));
    await setG('Obs: ______ fim'); await LAC.caret(GN, 8); await p.keyboard.type('1'); const g4 = await LAC.txt(GN); await undo(); t = await LAC.txt(GN);
    check('G04 · guia: desfazer devolve "Obs: ______ fim" (A · #4 #14 #21)', 'A-fill', g4 === 'Obs: 1 fim' && t === 'Obs: ______ fim', J({ digitado: g4, desfeito: t }));
    await seColar('G05 · guia: colar na lacuna → "Nome XYZ ok" (A · #1 #24)', 'A-fill', async () => { await clipWrite('XYZ'); await setG('Nome ______ ok'); await LAC.caret(GN, 8); await colar(); t = await LAC.txt(GN); check('G05 · guia: colar na lacuna → "Nome XYZ ok" (A · #1 #24)', 'A-fill', t === 'Nome XYZ ok', J(t)); });
    await setG('de ___ em ___ h'); await LAC.caret(GN, 11); await p.keyboard.press('Backspace'); t = await LAC.txt(GN);
    check('G06 · guia: Backspace DENTRO da lacuna apaga um traço (nativo, não "nada") (A · #21)', 'A-nativo', t === 'de ___ em __ h', J(t));
    await setG('A ___ B'); await LAC.caret(GN, 3); await p.keyboard.insertText('7'); t = await LAC.txt(GN);
    check('G07 · guia: insertText (IME) na lacuna → "A 7 B", sem "77" (A · #10)', 'A-fill', t === 'A 7 B', J(t));
    await p.evaluate(() => { const b = document.querySelector('.copies button[data-copies="2"]'); if (b) b.click(); }); await wait(400);
    await setG('Maria ___ Silva'); await LAC.caret(GN, 7); await p.keyboard.type('X'); t = await LAC.txt(GN);
    const mir = await p.evaluate(() => { const m = document.querySelector('#preview [data-mirror="patient.name"]'); return m ? m.textContent : null; });
    check('G08 · guia com 2 vias: preencher lacuna espelha na 2ª via ("Maria X Silva") (A)', 'A-fill', t === 'Maria X Silva' && mir === t, J({ t, espelho: mir }));
    await setG('Paciente ZQA ______ ZQB'); await p.evaluate(() => { const d = document.querySelector('#patientDate'); d.value = '2026-09-26'; d.dispatchEvent(new Event('input', { bubbles: true })); }); await wait(300);
    const fotoG = await LAC.foto(GN);
    const impG = await p.evaluate(async () => { window.print = () => { window.__printed = (window.__printed || 0) + 1; }; document.getElementById('printPortal').innerHTML = ''; window.__printed = 0; const btn = document.querySelector('#documentsView [data-print="conventional"]') || document.querySelector('#documentsView [data-print]'); btn.click(); await new Promise(r => setTimeout(r, 250)); const pt = document.getElementById('printPortal'); const n = (pt.textContent.match(/ZQA/g) || []).length; return { printed: window.__printed, n, toast: n ? undefined : ((document.querySelector('#toast') || {}).textContent || '').trim().slice(0, 80) }; });
    check('G09 · impressão do guia: portal montado (2 vias com o nome)', 'C', impG.printed === 1 && impG.n === 2, J(impG));
    await p.emulateMedia({ media: 'print' });
    const mG = await LAC.medir('#printPortal', 'ZQA', 'ZQB');
    check('G10 · impressão do guia: lacuna editável INVISÍVEL nas 2 vias (B · #6 #15 #23)', 'B-oculta', mG.length === 2 && invisivel(mG), resumoMed(mG));
    check('G11 · impressão do guia: lacuna mantém o ESPAÇO (B · #6 #23)', 'B-espaco', mG.length === 2 && espaco(mG), resumoMed(mG));
    await limparImpressao();
    check('G12 · impressão não altera o campo vivo do guia (C · #8 #19 #29)', 'C', JSON.stringify(fotoG) === JSON.stringify(await LAC.foto(GN)), '');
    /* guia no palco: colar não duplica (#30) */
    await p.evaluate(() => { document.querySelector('#documentsView').hidden = true; document.querySelector('#workspaceView').hidden = false; });
    const stOk = await p.evaluate(() => { try { return window.OrquestratorGuias.abrirNoStage(null, 'guides'); } catch (e) { return 'ERRO ' + e; } }); await wait(400);
    await seColar('G13 · guia no PALCO: colar "1 cp" uma vez → "ABC 1 cp" (não "1 cp1 cp") (A · #30)', 'A-fill', async () => { await clipWrite('1 cp'); await setG('ABC '); await LAC.caret(GN, 4); await colar(); t = await LAC.txt(GN); check('G13 · guia no PALCO: colar "1 cp" uma vez → "ABC 1 cp" (não "1 cp1 cp") (A · #30)', 'A-fill', stOk === true && t === 'ABC 1 cp', J({ palco: stOk, t })); });
    await p.evaluate(() => window.OrquestratorGuias.restaurar());

    /* ───────── C · estabilidade ───────── */
    const guards = await p.evaluate(() => window.OrqPWA.status().guards);
    check('C01 · 6/6 guardas registradas (OrqPWA.status().guards)', 'C', Array.isArray(guards) && guards.length === 6 && ['receita', 'soap', 'institucionais', 'guias', 'pacientes', 'atendimento'].every(g => guards.includes(g)), J(guards));
    check('C02 · 0 erros de página em toda a prova', 'C', erros.length === 0, erros.length ? J(erros, 200) : 'nenhum');
    naoVerificavel('A · composição IME real / tecla morta (á, ã, ç) preenchendo a lacuna (#27)', 'A-fill', 'Playwright não simula composição; insertText cobre o pós-composição, não o keydown durante ela — validar em teclado físico (Mac ABNT2) e iPhone/WKWebView');
  } catch (e) {
    check('X · execução do instrumento sem exceção', 'C', false, String(e).split('\n')[0].slice(0, 220));
  }
  await b.close(); srv.close();
  const total = res.length, falhas = res.filter(r => !r.ok).length;
  const cats = {}; for (const r of res) { cats[r.cat] = cats[r.cat] || [0, 0]; cats[r.cat][1]++; if (r.ok) cats[r.cat][0]++; }
  console.log('  por categoria: ' + Object.entries(cats).map(([c, [a, n]]) => `${c} ${a}/${n}`).join(' · '));
  if (nv.length) console.log(`  ⚠️ não verificáveis neste motor (à parte, não aprovadas): ${nv.length} — ${nv.map(x => x.id).join(' ; ')}`);
  console.log(falhas === 0 ? `PASSOU ${total}/${total}` : `FALHOU ${falhas}/${total}`);
  process.exit(falhas === 0 ? 0 : 1);
})().catch(e => { console.error('FALHA do instrumento:', e); process.exit(2); });
