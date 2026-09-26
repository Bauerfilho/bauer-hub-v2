/* tests/fichas-painel.cjs — prova no DOM vivo da FICHA no painel do Orquestrator (25/09/2026).
   Rodar (da raiz do repo): NODE_PATH=~/Projetos/Tangent/node_modules node tests/fichas-painel.cjs [index-f2.html]
   Sobe servidor local próprio (127.0.0.1), Chromium headless em janela própria, service worker bloqueado
   (o PWA/offline tem prova própria em tests/pwa-update.cjs). Critério binário por item; exit 0/1. */
const pw = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const RAIZ = path.resolve(__dirname, '..');
const PAGINA = process.argv[2] || 'index-f2.html';
const MOTOR = process.argv[3] || 'chromium';   /* chromium | webkit (o Safari do iPhone/iPad) */
const PORTA = 8960 + Math.floor(Math.random() * 30);
const PROVAS = path.join(RAIZ, 'provas-meds');
const res = [];
const passa = (nome, ok, det = '') => { res.push({ nome, ok: !!ok }); console.log(`  ${ok ? '✅' : '🔴'} ${nome}${det ? ' — ' + det : ''}`); };

(async () => {
  const srv = spawn('/usr/bin/python3', ['-m', 'http.server', String(PORTA), '--bind', '127.0.0.1'], { cwd: RAIZ, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 900));
  const b = MOTOR === 'webkit' ? await pw.webkit.launch({ headless: true }) : await pw.chromium.launch({ channel: 'chrome', headless: true });
  console.log(`  motor: ${MOTOR}`);
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
    const linha = await p.evaluate(() => { const b = document.querySelector('[data-orqa-rx-somar]'); const [k, i] = b.dataset.orqaRxSomar.split('|'); b.click(); return window.OrqFichas.rx(k, i).texto; });
    const depois = await p.evaluate(() => window.__HUB_COMPOSE__.itens());
    passa('Somar à receita põe a linha na bandeja do atendimento', depois === antes + 1, `${antes}→${depois}`);
    await p.evaluate(() => window.__HUB_COMPOSE__.montar()); await p.waitForTimeout(700);
    const folha = await p.evaluate(l => { const cps = [...document.querySelectorAll('#recipePrint .rx-copy .rx-body[data-field="prescription"]')].map(e => e.textContent);
      const H = window.__HUB_TEST__; return { n: cps.length, iguais: cps.length === 2 && cps[0] === cps[1] && H.syncCheck(), tem: cps[0] && cps[0].includes(l.split('\n')[0].slice(0, 25)), cabe1folha: !H.overflow() }; }, linha);
    passa('receita montada contém a linha, 2 vias idênticas, cabe em 1 folha', folha.n === 2 && folha.iguais && folha.tem && folha.cabe1folha, JSON.stringify(folha));
    const dup = await p.evaluate(() => { const b = document.querySelector('[data-orqa-rx-somar]'); const n = window.__HUB_COMPOSE__.itens(); b.click(); return window.__HUB_COMPOSE__.itens() === n; });
    passa('a mesma linha não entra duas vezes', dup);

    /* 2b. SEM FICHA → apresentações da CMED (formatador determinístico) → soma NO FORMATO, posologia em branco */
    await buscar('diazep');
    const semf = await p.evaluate(() => new Promise(ok => {
      const btn = [...document.querySelectorAll('[data-orqa-med-pick]')].find(b => /^diazepam$/i.test(b.dataset.orqaMedPick));
      if (!btn) return ok({ erro: 'diazepam fora da busca' });
      if (btn.nextElementSibling && btn.nextElementSibling.classList.contains('orqa-fi-caixa')) btn.click();
      const t0 = performance.now(); btn.click();
      const esp = () => { const c = btn.nextElementSibling; const chips = c ? c.querySelectorAll('[data-orqa-ap-somar]') : [];
        if (chips.length) return ok({ ms: performance.now() - t0, chips: chips.length, aviso: /Ficha em preparo/.test(c.textContent), nome: !!c.querySelector('[data-orqa-nome-cursor]') });
        if (performance.now() - t0 > 3000) return ok({ erro: 'sem apresentações em 3 s' }); setTimeout(esp, 5); };
      esp();
    }));
    passa('sem ficha: apresentações da CMED sob o aviso, com o "só o nome" de reserva', semf.chips > 0 && semf.aviso && semf.nome, JSON.stringify(semf));
    passa('apresentações frias < 150 ms (inclui carregar o pedaço)', semf.ms >= 0 && semf.ms < 150, (semf.ms || -1).toFixed(1) + ' ms');
    /* o caso "posologia em branco" precisa de um chip SEM esboço aprovado; quando o diazepam real já ganhou esboço (E005,
       26/09), usa um pedaço sintético só de esqueleto — o molde da seção 2d — e reabre a ficha */
    const semEsqueleto = await p.evaluate(() => !document.querySelector('[data-orqa-ap-somar]:not(.orqa-ap-pronta)'));
    if (semEsqueleto) {
      await p.evaluate(() => {
        window.ORQ_APRES_PUT('d', { diazepam: [['5 mg · comprimido', 'Diazepam 5 mg, comprimido — ______.\nTomar ______, via oral, de ___ em ___ horas, por ___ dias.', []]] });
        const btn = [...document.querySelectorAll('[data-orqa-med-pick]')].find(b => /^diazepam$/i.test(b.dataset.orqaMedPick));
        btn.click(); btn.click(); });
      await p.waitForFunction(() => !!document.querySelector('[data-orqa-ap-somar]:not(.orqa-ap-pronta)'), null, { timeout: 3000 });
    }
    const antesAp = await p.evaluate(() => window.__HUB_COMPOSE__.itens());
    const linhaAp = await p.evaluate(() => { const b = document.querySelector('[data-orqa-ap-somar]:not(.orqa-ap-pronta)'); b.click(); return window.OrqFichas.ap(b.dataset.orqaApSomar).texto; });
    if (semEsqueleto) await p.evaluate(async () => { (0, eval)(await (await fetch('js/apresentacoes/d.js')).text()); });   /* devolve o índice REAL da letra d aos testes seguintes */
    const depoisAp = await p.evaluate(() => window.__HUB_COMPOSE__.itens());
    const [cabAp, posAp] = String(linhaAp).split('\n');
    passa('apresentação entra pela bandeja no formato, sem número de dose', depoisAp === antesAp + 1 && /^Diazepam \d/.test(cabAp) && / — ______\.$/.test(cabAp) && /___/.test(posAp) && !/\d/.test(posAp), JSON.stringify(linhaAp));
    await p.evaluate(() => window.__HUB_COMPOSE__.montar()); await p.waitForTimeout(700);
    const folhaAp = await p.evaluate(l => { const cps = [...document.querySelectorAll('#recipePrint .rx-copy .rx-body[data-field="prescription"]')].map(e => e.textContent);
      const H = window.__HUB_TEST__; return { iguais: cps.length === 2 && cps[0] === cps[1] && H.syncCheck(), tem: !!cps[0] && cps[0].includes(l.split('\n')[0]), cabe1folha: !H.overflow() }; }, linhaAp);
    passa('receita montada traz a apresentação nas 2 vias idênticas, em 1 folha', folhaAp.iguais && folhaAp.tem && folhaAp.cabe1folha, JSON.stringify(folhaAp));
    /* 2b'. letra grande vira ÍNDICE + partes por faixa (build-apresentacoes.py, 26/09): a 1ª e a última chave de TODA parte
       têm de chegar pelo índice — prova as duas bordas de cada faixa, em todas as letras divididas */
    const partes = await p.evaluate(async () => {
      const corpo = t => JSON.parse(t.slice(t.indexOf(',', t.indexOf('ORQ_APRES_PUT(')) + 1, t.lastIndexOf(')}catch')));
      const r = { letras: 0, partes: 0, chaves: 0, falhas: [] };
      for (const l of 'abcdefghijklmnopqrstuvwxyz') {
        const idx = corpo(await (await fetch('js/apresentacoes/' + l + '.js')).text());
        if (!Array.isArray(idx.__partes)) continue; r.letras++;
        for (const [, pid] of idx.__partes) {
          r.partes++; const ks = Object.keys(corpo(await (await fetch('js/apresentacoes/' + pid + '.js')).text()));
          for (const k of [ks[0], ks[ks.length - 1]]) { r.chaves++; const lst = await window.OrqFichas.apresentacoesDe(k); if (!lst.length) r.falhas.push(pid + ':' + k); }
        }
      }
      return r; });
    passa('letras divididas: 1ª e última chave de cada parte chegam pelo índice', partes.letras > 0 && partes.falhas.length === 0, JSON.stringify(partes).slice(0, 240));
    /* 2c. REORGANIZAÇÃO (26/09, erros vistos na captura): ficha nunca passa da largura do painel; remédio COM ficha
       também oferece as outras apresentações do mercado (recolhidas); a dose não repete a frequência */
    await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);   /* a captura que mostrou o corte era de celular */
    await buscar('diclof');
    const dic = await p.evaluate(() => new Promise(ok => {
      const btn = [...document.querySelectorAll('[data-orqa-med-pick]')].find(b => /^diclofenaco$/i.test(b.dataset.orqaMedPick));
      if (!btn) return ok({ erro: 'diclofenaco fora da busca' });
      if (btn.nextElementSibling && btn.nextElementSibling.classList.contains('orqa-fi-caixa')) btn.click();
      const t0 = performance.now(); btn.click();
      const esp = () => { const c = btn.nextElementSibling;
        const pronto = c && c.querySelector('.orqa-fi') && c.querySelector('.orqa-ap-outras');
        if (pronto || performance.now() - t0 > 3000) {
          /* borda direita de cada ficha/linha × a do painel, e rolagem horizontal do painel (a ficha cresce com o conteúdo: medir nela mesma não vê o corte) */
          const pn = document.getElementById('orqAssist'), dir = pn.getBoundingClientRect().right;
          const larg = [...pn.querySelectorAll('.orqa-fi-caixa, .orqa-fi, .orqa-fi-lin')].map(e => e.getBoundingClientRect().right - dir)
            .concat([...pn.querySelectorAll('*')].filter(e => getComputedStyle(e).overflowY !== 'visible').map(e => e.scrollWidth - e.clientWidth));
          /* texto VISÍVEL da dose em cada ficha: o resumo quando há "ler tudo" (o completo fica oculto), sem o rótulo da fonte */
          const visivel = v => { const d = v.cloneNode(true); d.querySelectorAll('small').forEach(x => x.remove());
            const det = d.querySelector('details'); return (det ? det.querySelector('summary').textContent.replace(/… ler tudo$/, '') : d.textContent).trim(); };
          const repete = [...(c ? c.querySelectorAll('.orqa-fi-dose .orqa-fi-val') : [])].map(visivel).some(dose => {
            const partes = dose.split(' · ').map(x => x.trim().toLowerCase().replace(/^(habitual|máx\.|inicial) /, '')).filter(x => x.length > 3);
            return partes.some((x, i) => partes.some((y, j) => i !== j && y.includes(x))); });
          return ok({ ficha: !!(c && c.querySelector('.orqa-fi')), fichas: c ? c.querySelectorAll('.orqa-fi').length : 0,
            outras: c ? c.querySelectorAll('.orqa-ap-outras [data-orqa-ap-somar]').length : 0, estouro: Math.max(0, ...larg), repete });
        }
        setTimeout(esp, 10); };
      esp();
    }));
    passa('diclofenaco: ficha + outras apresentações do mercado (CMED) recolhidas', dic.ficha && dic.outras > 0, JSON.stringify(dic));
    passa('nenhuma ficha passa da largura do painel (sem texto cortado)', dic.estouro <= 1, `estouro ${dic.estouro}px`);
    passa('diclofenaco reúne as fichas de todos os lotes (nada escondido no índice)', dic.fichas >= 2, `${dic.fichas} fichas`);
    passa('a dose não repete a frequência já dita no habitual', dic.repete === false, JSON.stringify(dic));
    await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(300);
    /* 2d. ESBOÇO DE POSOLOGIA por indicação (dados SINTÉTICOS de teste — não clínicos): casa com a doença aberta → direto;
       sem casamento → a médica escolhe; "sem posologia" → esqueleto. Substitui o mapa da letra 'd' (os passos seguintes não usam 'd'). */
    const esb = await p.evaluate(async () => {
      const t = window.__HUB_COMPOSE__.topico(); const itens = () => window.__HUB_TEST__.state.compose.items.map(i => i.text);
      const esq = n => `Diazepam ${n} mg, comprimido — ______.\nTomar ______, via oral, de ___ em ___ horas, por ___ dias.`;
      window.ORQ_APRES_PUT('d', { diazepam: [
        ['5 mg · comprimido', esq(5), [['INDICAÇÃO TESTE A', 'adulto', [t], 'Diazepam 5 mg, comprimido — 20 comprimidos.\nTomar TESTE-A.', 'fonte teste'],
                                        ['INDICAÇÃO TESTE B', 'adulto', [], 'Diazepam 5 mg, comprimido — 20 comprimidos.\nTomar TESTE-B.', 'fonte teste']]],
        ['10 mg · comprimido', esq(10), [['INDICAÇÃO TESTE C', 'adulto', [], 'Diazepam 10 mg, comprimido — 20 comprimidos.\nTomar TESTE-C.', 'fonte teste'],
                                         ['INDICAÇÃO TESTE D', 'pediatrico', [], 'Diazepam 10 mg, comprimido — 20 comprimidos.\nDar TESTE-D.', 'fonte teste']]]] });
      const el = document.querySelector('[data-orqa-med]'); el.value = 'diazep'; el.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 450));
      const btn = [...document.querySelectorAll('[data-orqa-med-pick]')].find(b => /^diazepam$/i.test(b.dataset.orqaMedPick));
      if (btn.nextElementSibling && btn.nextElementSibling.classList.contains('orqa-fi-caixa')) btn.click();
      btn.click(); await new Promise(r => setTimeout(r, 300));
      const chips = () => [...btn.nextElementSibling.querySelectorAll('[data-orqa-ap-somar]')];
      const r = { marca: chips().filter(c => c.classList.contains('orqa-ap-pronta')).length };
      chips()[0].click(); r.auto = itens().some(x => x.includes('TESTE-A')); r.semEscolha = !document.querySelector('.orqa-ap-escolha');
      chips()[1].click(); const box = document.querySelector('.orqa-ap-escolha');
      r.escolhas = box ? box.querySelectorAll('[data-orqa-ap-ind]').length : 0; r.pediatrico = !!box && /pediátrico/.test(box.textContent);
      box && box.querySelector('[data-orqa-ap-ind="0"]').click(); r.escolhida = itens().some(x => x.includes('TESTE-C')); r.fechou = !document.querySelector('.orqa-ap-escolha');
      chips()[1].click(); const box2 = document.querySelector('.orqa-ap-escolha'); box2 && box2.querySelector('[data-orqa-ap-ind="-1"]').click();
      r.branco = itens().some(x => x.startsWith('Diazepam 10 mg, comprimido — ______.'));
      return r;
    });
    passa('esboço: chips com posologia pronta ganham a marca', esb.marca === 2, JSON.stringify(esb));
    passa('esboço: indicação ligada à doença aberta entra direto, sem perguntar', esb.auto && esb.semEscolha, JSON.stringify(esb));
    passa('esboço: sem casamento, a médica escolhe (2 indicações + "em branco") e a escolhida entra', esb.escolhas === 3 && esb.pediatrico && esb.escolhida && esb.fechou, JSON.stringify(esb));
    passa('esboço: "sem posologia" entra o esqueleto em branco', esb.branco, JSON.stringify(esb));
    /* volta ao estado que os passos seguintes esperam: ficha da losartana aberta */
    await buscar('losar');
    await p.evaluate(() => { const b = [...document.querySelectorAll('[data-orqa-med-pick]')].find(x => /losartana pot/i.test(x.dataset.orqaMedPick)); if (b && !(b.nextElementSibling && b.nextElementSibling.classList.contains('orqa-fi-caixa'))) b.click(); });
    await p.waitForSelector('[data-orqa-rx-cursor]', { timeout: 5000 });

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
      const b = document.querySelector('[data-orqa-rx-cursor]'); const [k, i] = b.dataset.orqaRxCursor.split('|'); const t = window.OrqFichas.rx(k, i).texto;
      const n0 = rx.textContent.split(t.split('\n')[0]).length; b.click();
      return rx.textContent.split(t.split('\n')[0]).length > n0;
    });
    passa('"no cursor" com foco na receita escreve na receita', noCursor);
    const orfao = await p.evaluate(() => {
      const sel = document.querySelector('#regimenSelect'); if (!sel || sel.options.length < 2) return null;
      sel.value = sel.options[sel.options.length - 1].value; sel.dispatchEvent(new Event('change', { bubbles: true }));   /* renderRecipe → nó antigo órfão */
      const b = document.querySelector('[data-orqa-rx-cursor]'); const [k, i] = b.dataset.orqaRxCursor.split('|'); const t = window.OrqFichas.rx(k, i).texto;
      b.click(); const rx = document.querySelector('#recipePrint .rx-copy .rx-body[data-field="prescription"][contenteditable]');
      return !!rx && rx.textContent.includes(t.split('\n')[0].slice(0, 20));
    });
    passa('depois de trocar o esquema (folha recriada), "no cursor" reencontra a receita', orfao === true, orfao === null ? 'sem 2º esquema' : '');

    /* 4b. revisão (auditor ≠ autor): a ÚLTIMA linha escreve exatamente ela — antes, id repetido trocava o texto */
    await buscar('losar');
    await p.evaluate(() => { const b = [...document.querySelectorAll('[data-orqa-med-pick]')].find(x => /losartana pot/i.test(x.dataset.orqaMedPick)); if (!b.nextElementSibling || !b.nextElementSibling.classList.contains('orqa-fi-caixa')) b.click(); });
    await p.waitForTimeout(300);
    const ultima = await p.evaluate(() => {
      const bs = [...document.querySelectorAll('[data-orqa-rx-cursor]')]; const b = bs[bs.length - 1]; const [k, i] = b.dataset.orqaRxCursor.split('|');
      const esperado = window.OrqFichas.rx(k, i).texto, visto = b.closest('.orqa-fi-rx').querySelector('.orqa-fi-rx-t b').textContent;
      const rx = document.querySelector('#recipePrint .rx-copy .rx-body[data-field="prescription"][contenteditable]');
      rx.focus(); const s = getSelection(); s.selectAllChildren(rx); s.collapseToEnd(); const antes = rx.textContent; b.click();
      const entra = window.OrqAssist.abreviarLinha(esperado).split('\n')[0];   /* a linha certa, na forma que cabe na caixa (abreviação 26/09) */
      return { mesmo: esperado.split('\n')[0] === visto, entrou: rx.textContent.length > antes.length && rx.textContent.includes(entra), n: bs.length };
    });
    passa('a última linha pronta escreve exatamente o texto clicado', ultima.mesmo && ultima.entrou, JSON.stringify(ultima));

    /* 4c. cerca: foco no NOME do paciente (cabeçalho da receita) → nada escrito */
    const cab = await p.evaluate(() => { const f = document.querySelector('#recipePrint .rx-copy .field-value[data-field="name"][contenteditable]'); if (!f) return null;
      f.focus(); const v0 = f.textContent; document.querySelector('[data-orqa-rx-cursor]').click(); return f.textContent === v0; });
    passa('cerca: nome do paciente (cabeçalho) fica intocado', cab === true, cab === null ? 'campo nome ausente' : '');

    /* 4d. cenário do iPhone: receita escondida + foco preso na busca do painel + clique sem roubar foco → nada escrito */
    const ios = await p.evaluate(() => {
      const rx = document.querySelector('#recipePrint .rx-copy .rx-body[data-field="prescription"][contenteditable]'); rx.focus();
      const ws = document.querySelector('#workspaceView'); ws.hidden = true;
      const busca = document.querySelector('[data-orqa-med]'); busca.focus(); const v0 = busca.value, r0 = rx.textContent;
      document.querySelector('[data-orqa-rx-cursor]').click();          /* .click() de JS não move o foco (como o toque no Safari) */
      const ok = busca.value === v0 && rx.textContent === r0; ws.hidden = false; return ok;
    });
    passa('cerca: receita escondida + foco na busca do painel → nada é escrito (Safari/iOS)', ios === true);

    /* 4e. Somar sem doença aberta → recusado (antes: item invisível que travava a atualização da PWA) */
    const hub = await p.evaluate(() => { const ws = document.querySelector('#workspaceView'); ws.hidden = true; const n = window.__HUB_COMPOSE__.itens();
      const r = window.__HUB_COMPOSE__.adicionarLivre('Teste 1 mg/comprimido — 30 comprimidos/mês.\nTomar 1 comprimido, via oral, 1 vez ao dia.'); ws.hidden = false;
      return { ok: r.ok, igual: window.__HUB_COMPOSE__.itens() === n }; });
    passa('Somar sem receita aberta é recusado e nada entra na bandeja', hub.ok === false && hub.igual, JSON.stringify(hub));

    /* 4f. tipo de receita viaja com a linha (controle especial) */
    const tipo = await p.evaluate(() => { const r = window.__HUB_COMPOSE__.adicionarLivre('Fármaco controlado teste 10 mg/comprimido — 30 comprimidos/mês.\nTomar 1 comprimido, via oral, à noite.', { documentType: 'control-special' });
      const it = window.__HUB_TEST__.state.compose.items; return { ok: r.ok, tipo: it[it.length - 1].documentType, aviso: /controlada/.test(r.msg || '') }; });
    passa('controle especial: o tipo chega ao item e o aviso aparece', tipo.ok && tipo.tipo === 'control-special' && tipo.aviso, JSON.stringify(tipo));

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
      const painel = await p.$('#orqAssist'); if (painel) await painel.screenshot({ path: path.join(PROVAS, `ficha-painel-${MOTOR}-${nome}.png`) });
    }
    /* ABREVIAÇÃO DE CONSULTÓRIO (26/09): só quando a 1ª linha não cabe na caixa da receita; posologia intocada */
    const abrev = await p.evaluate(() => {
      const A = window.OrqAssist && window.OrqAssist.abreviarLinha; if (!A) return { erro: 'sem abreviarLinha' };
      const el = document.querySelector('#recipePrint .rx-copy .rx-body[data-field="prescription"]'); if (!el) return { erro: 'sem receita' };
      const longa = 'Ibuprofeno 600 mg, comprimido revestido de liberação prolongada — 60 comprimidos.\nTomar 600 mg (1 comprimido), via oral, de 12 em 12 horas.';
      const w0 = el.style.width, r = {};
      el.style.width = '120px'; const a = A(longa); r.estreita = a.split('\n')[0]; r.posIntacta = a.split('\n')[1] === longa.split('\n')[1];
      el.style.width = '2400px'; r.larga = A(longa) === longa;
      el.style.width = w0; return r; });
    passa('abreviação: não cabe → "Ibuprofeno 600 mg comp. rev. LP — 60 comp."; cabe → intacta; posologia intocada',
      abrev.estreita === 'Ibuprofeno 600 mg comp. rev. LP — 60 comp.' && abrev.posIntacta && abrev.larga, JSON.stringify(abrev));
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
