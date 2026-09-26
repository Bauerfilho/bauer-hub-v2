/* lacunas-ime.cjs — rede de segurança do ACENTO (tecla morta no WebKit) · baseado na prova independente das lacunas (auditor ≠ autor): teclas reais numa linha real, texto em volta intacto, desfazer,
   2ª via, impressão (lacuna editável invisível; campo fixo do comprador visível), campos fora dos documentos intocados.
   uso: node prova-lacunas-brain.cjs <raiz-do-worktree> <chromium|webkit> */
const pw = require('playwright'), http = require('http'), fs = require('fs'), path = require('path');
const RAIZ = process.argv[2], MOTOR = process.argv[3] || 'chromium';
const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { const f = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': tipos[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
const res = []; const passa = (n, ok, det = '') => { res.push(!!ok); console.log(`  ${ok ? '✅' : '🔴'} ${n}${det ? ' — ' + det : ''}`); };
(async () => {
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok)); const porta = srv.address().port;
  const b = MOTOR === 'webkit' ? await pw.webkit.launch({ headless: true }) : await pw.chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' }); const p = await ctx.newPage();
  const erros = []; p.on('pageerror', e => erros.push(String(e).slice(0, 140)));
  try {
    await p.goto(`http://127.0.0.1:${porta}/index.html?test`, { waitUntil: 'networkidle' });
    if (await p.$('#f2xLoginCrm')) { await p.fill('#f2xLoginCrm', 'Orquestrator'); await p.fill('#f2xLoginSenha', 'Medicalhub1234'); await p.click('#f2xLoginEntrar'); }
    await p.waitForFunction(() => window.__HUB_TEST__ && window.__HUB_TEST__.catalog && window.__HUB_COMPOSE__, null, { timeout: 30000 });
    await p.evaluate(() => { const H = window.__HUB_TEST__; H.open(H.catalog.find(t => (t.regimens || []).length > 1).id); });
    await p.waitForTimeout(800);
    const LINHA = 'Diazepam 5 mg, comprimido — ______.\nTomar ______, via oral, de ___ em ___ horas, por ___ dias.';
    await p.evaluate(l => { window.__HUB_COMPOSE__.adicionarLivre(l); window.__HUB_COMPOSE__.montar(); }, LINHA);
    await p.waitForTimeout(700);
    const corpo = '#recipePrint .rx-copy .rx-body[data-field="prescription"]';
    /* monta o estado que a tecla morta do WebKit deixaria (composto DENTRO da lacuna) e dispara o compositionend */
    const compor = (de, para, composto) => p.evaluate(([sel, de, para, c]) => {
      const el = document.querySelector(sel); el.focus();
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n;
      while ((n = w.nextNode())) { const i = n.data.indexOf(de); if (i >= 0) {
        n.data = n.data.slice(0, i) + para + n.data.slice(i + de.length);
        const pos = i + para.indexOf(c) + c.length; const r = document.createRange(); r.setStart(n, pos); r.collapse(true);
        const s = getSelection(); s.removeAllRanges(); s.addRange(r);
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText', data: c }));   /* a composição real dispara input */
        el.dispatchEvent(new CompositionEvent('compositionend', { data: c, bubbles: true })); return true; } }
      return false; }, [corpo, de, para, composto]);
    const txt = () => p.evaluate(s => document.querySelector(s).textContent, corpo);
    passa('linha real montada', (await txt()).includes('Tomar ______, via oral'), '');
    await compor('Tomar ______', 'Tomar __á____', 'á'); await p.waitForTimeout(150);
    let t = await txt(); passa('acento no MEIO da lacuna: "__á____" vira "á"', t.includes('Tomar á, via oral'), JSON.stringify(t.slice(-90)));
    await p.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z'); await p.waitForTimeout(150);
    t = await txt(); passa('desfazer devolve o estado anterior ao reparo', t.includes('Tomar __á____, via oral'), JSON.stringify(t.slice(-90)));
    await compor('Tomar __á____', 'Tomar é______', 'é'); await p.waitForTimeout(150);
    t = await txt(); passa('acento na BORDA da lacuna: "é______" vira "é"', t.includes('Tomar é, via oral'), JSON.stringify(t.slice(-90)));
    await compor('via oral', 'via orál', 'á'); await p.waitForTimeout(150);
    t = await txt(); passa('fora de lacuna nada muda ("orál")', t.includes('via orál'), '');
    await compor('via orál', 'via o_ŕ_al', 'ŕ'); await p.waitForTimeout(150);
    t = await txt(); passa('"_" solto (menos de 3) nada muda', t.includes('via o_ŕ_al'), '');
    await p.waitForTimeout(300);
    passa('2ª via idêntica', await p.evaluate(() => window.__HUB_TEST__.syncCheck()), '');
    passa('0 erros de página', erros.length === 0, erros.join(' | '));
  } catch (e) { passa('execução', false, String(e).split('\n')[0]); }
  await b.close(); srv.close();
  const ok = res.every(Boolean); console.log(`  ${ok ? '✅ PASSOU' : '🔴 FALHOU'} — ${res.filter(Boolean).length}/${res.length}`); process.exit(ok ? 0 : 1);
})();
