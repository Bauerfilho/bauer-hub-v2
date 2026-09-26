/* fichas-no-ar.cjs — prova no SITE PUBLICADO (não no local): login, painel, ficha da losartana com linhas prontas,
   nenhum caminho local da máquina, 6/6 guardas, 0 erros; Chromium E WebKit. ESPERADA=<sha7> exige a versão. */
const pw = require('playwright');
(async () => {
  let falhou = 0;
  for (const motor of ['chromium', 'webkit']) {
    const b = motor === 'webkit' ? await pw.webkit.launch({ headless: true }) : await pw.chromium.launch({ channel: 'chrome', headless: true });
    const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const erros = [];
    p.on('pageerror', e => erros.push(String(e).slice(0, 120)));
    try {
      await p.goto('https://bauerfilho.github.io/bauer-hub-v2/?test&nc=' + Date.now(), { waitUntil: 'networkidle', timeout: 90000 });
      if (await p.$('#f2xLoginCrm')) {
        await p.fill('#f2xLoginCrm', 'Orquestrator'); await p.fill('#f2xLoginSenha', 'Medicalhub1234'); await p.click('#f2xLoginEntrar');
      }
      await p.waitForFunction(() => window.__HUB_TEST__ && window.__HUB_TEST__.catalog, null, { timeout: 30000 });
      await p.evaluate(() => { const H = window.__HUB_TEST__; H.open(H.catalog.find(t => (t.regimens || []).length > 1).id); });
      await p.waitForTimeout(500);
      await p.evaluate(() => { const s = document.querySelector('.orq-marca') || [...document.querySelectorAll('button,[role=button]')].find(e => /orquestrator/i.test(e.textContent || '') && e.offsetParent); s && s.click(); });
      await p.waitForSelector('[data-orqa-med]', { timeout: 15000 });
      const ficha = async (termo, re) => {
        await p.fill('[data-orqa-med]', termo);
        await p.waitForFunction(r => [...document.querySelectorAll('[data-orqa-med-pick]')].some(x => new RegExp(r, 'i').test(x.dataset.orqaMedPick)), re, { timeout: 10000 });
        await p.evaluate(r => [...document.querySelectorAll('[data-orqa-med-pick]')].find(x => new RegExp(r, 'i').test(x.dataset.orqaMedPick)).click(), re);
        await p.waitForSelector('.orqa-fi', { timeout: 15000 });
        return p.evaluate(() => { const a = document.querySelector('.orqa-fi'); return { nome: a.querySelector('strong')?.textContent, dose: !!a.querySelector('.orqa-fi-dose'),
          linhas: a.querySelectorAll('[data-orqa-rx-somar]').length, caminho: /\/Users\/|_brutos/.test(document.body.innerHTML) }; });
      };
      const lo = await ficha('losar', 'losartana pot');
      /* remédio sem ficha: as apresentações CMED têm de aparecer sob o aviso */
      await p.fill('[data-orqa-med]', 'diazep');
      await p.waitForFunction(() => [...document.querySelectorAll('[data-orqa-med-pick]')].some(x => /^diazepam$/i.test(x.dataset.orqaMedPick)), null, { timeout: 10000 });
      await p.evaluate(() => [...document.querySelectorAll('[data-orqa-med-pick]')].find(x => /^diazepam$/i.test(x.dataset.orqaMedPick)).click());
      await p.waitForSelector('[data-orqa-ap-somar]', { timeout: 15000 });
      const apN = await p.evaluate(() => document.querySelectorAll('[data-orqa-ap-somar]').length);
      const r = await p.evaluate(() => ({ versao: document.querySelector('meta[name="orq-release"]')?.content?.slice(0, 7), guardas: window.OrqPWA ? window.OrqPWA.status().guards.length : 0 }));
      const ok = lo.linhas > 0 && apN > 0 && !lo.caminho && r.guardas === 6 && !erros.length && r.versao === (process.env.ESPERADA || r.versao);
      if (!ok) falhou++;
      console.log(`  ${ok ? '✅' : '🔴'} ${motor.padEnd(8)} versão ${r.versao} · losartana ${lo.linhas} linhas · diazepam ${apN} apresentações · caminho local ${lo.caminho ? 'VAZOU' : 'nenhum'} · ${r.guardas}/6 guardas · erros: ${erros.length ? erros.join(' | ') : 'nenhum'}`);
    } catch (e) { falhou++; console.log(`  🔴 ${motor} ${String(e).split('\n')[0].slice(0, 160)}`); await p.screenshot({ path: `/tmp/fichas-no-ar-${motor}.png` }); }
    await b.close();
  }
  process.exit(falhou ? 1 : 0);
})();
