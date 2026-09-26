/* fichas-painel.js — a FICHA do medicamento no painel do Orquestrator (25/09/2026).
   Dados: js/fichas/_indice.js (sempre carregado, poucos KB) + js/fichas/<lote>.js (sob demanda, 1× por sessão;
   todos entram no precache do PWA, então abrem offline).
   Fonte: banco-medicamentos — transcrição de fonte oficial (PCDT, bula aprovada, RENAME, diretriz) com citação
   literal, feita por dois braços independentes e auditada; NÃO conferida pelo médico — o selo diz isso.
   O hub OFERECE e OBEDECE: nada aqui decide conduta nem tipo de receita.
   Nunca lança no carregamento: um erro antes dos guardas registrarem travaria a atualização da PWA
   (js/pwa-update.js). Código da casa — MIT. */
(function (global, doc) {
  'use strict';
  try {
    const esc = v => String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
    const fold = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
    const cache = Object.create(null);     /* lote → [fichas]  (memoizado: cada pedaço carrega uma vez) */
    const voo = Object.create(null);       /* lote → Promise em curso */
    const vistas = Object.create(null);    /* chave → ficha, para os botões acharem a linha pelo id */

    global.ORQ_FICHAS_PUT = function (lote, arr) { if (typeof lote === 'string' && Array.isArray(arr)) cache[lote] = arr; };

    function raiz() {
      const s = doc.querySelector('script[src*="fichas-painel.js"]');
      return s ? s.src.replace(/fichas-painel\.js.*$/, '') : 'js/';
    }
    function entrada(nome) {
      const I = global.ORQ_FICHAS_INDICE;
      return I && I.m ? (I.m[fold(nome)] || null) : null;
    }
    function tem(nome) { return !!entrada(nome); }

    function carregarLote(lote) {
      if (cache[lote]) return Promise.resolve(cache[lote]);
      if (voo[lote]) return voo[lote];
      voo[lote] = new Promise((ok, falha) => {
        const s = doc.createElement('script');
        s.src = raiz() + 'fichas/' + encodeURIComponent(lote) + '.js';
        s.async = true;
        s.onload = () => { delete voo[lote]; cache[lote] ? ok(cache[lote]) : falha(new Error('pedaço vazio: ' + lote)); };
        s.onerror = () => { delete voo[lote]; s.remove(); falha(new Error('pedaço não carregou: ' + lote)); };
        doc.head.appendChild(s);
      });
      return voo[lote];
    }

    /* todas as variantes (sal / liberação / denominação) de um nome da busca; as com linha pronta primeiro */
    function fichasDe(nome) {
      const e = entrada(nome);
      if (!e) return Promise.resolve([]);
      return carregarLote(e[0]).then(arr => e[1].map(k => arr.find(f => f.k === k)).filter(Boolean)
        .sort((a, b) => (b.rx.length > 0) - (a.rx.length > 0) || (!!b.d) - (!!a.d)));
    }

    /* linha pela POSIÇÃO na ficha (imune a id repetido entre braços) → {texto, tipo} */
    function rx(chave, i) {
      const f = vistas[chave];
      const r = f && f.rx[Number(i)];
      return r ? { texto: r.p, tipo: r.dt === 'receita_controle_especial' ? 'control-special' : 'simple' } : null;
    }

    const FORMA = f => String(f || '').replace(/comprimido revestido/i, 'comp. rev.').replace(/comprimido/i, 'comp.').replace(/cápsula/i, 'cáps.').replace(/solução injetável/i, 'sol. inj.');
    function linha(rotulo, v, cls) {
      if (!v || !v.t) return '';
      return `<div class="orqa-fi-lin${cls ? ' ' + cls : ''}"><span class="orqa-fi-rot">${esc(rotulo)}</span>`
           + `<span class="orqa-fi-val">${esc(v.t)}${v.fo ? `<small>${esc(v.fo)}</small>` : ''}</span></div>`;
    }
    function dose(d) {
      if (!d) return '';
      const partes = [d.u && ('habitual ' + d.u), d.m && ('máx. ' + d.m), d.fr, d.i && ('inicial ' + d.i)].filter(Boolean);
      return partes.length ? linha('Dose adulto', { t: partes.join(' · '), fo: d.fo }, 'orqa-fi-dose') : '';
    }

    function umaFicha(f) {
      vistas[f.k] = f;
      const ap = (f.ap || []).map(a => `<span class="orqa-fi-chip${a.r ? ' orqa-fi-rename' : ''}" title="${a.r ? 'na RENAME' : ''}">`
        + `${esc(a.c)} ${esc(FORMA(a.f))}${a.l ? ' · ' + esc(a.l) : ''}</span>`).join('');
      /* alertas: os de gravidade alta sempre à vista + 2 comuns; o resto num toque (a linha pronta não fica soterrada) */
      const altos = (f.al || []).filter(a => a.g === 'alta'), comuns = (f.al || []).filter(a => a.g !== 'alta');
      const li = a => `<li class="${a.g === 'alta' ? 'orqa-fi-alta' : ''}">${esc(a.t)}</li>`;
      const vis = altos.concat(comuns.slice(0, 2)), extra = comuns.slice(2);
      const alertasHtml = (vis.length ? `<ul class="orqa-fi-al">${vis.map(li).join('')}</ul>` : '')
        + (extra.length ? `<details class="orqa-fi-mais"><summary>mais ${extra.length} aviso${extra.length > 1 ? 's' : ''}</summary><ul class="orqa-fi-al">${extra.map(li).join('')}</ul></details>` : '');
      const linhas = (f.rx || []).map((r, i) => {
        const [cab, ...resto] = String(r.p || '').split('\n');
        const alvo = esc(f.k) + '|' + i;
        return `<div class="orqa-fi-rx"><div class="orqa-fi-rx-t"><b>${esc(cab)}</b>${resto.length ? `<span>${esc(resto.join(' '))}</span>` : ''}</div>`
          + `<div class="orqa-fi-rx-acoes"><button type="button" class="orqa-inserir" data-orqa-rx-somar="${alvo}" title="Soma esta linha à receita do atendimento (1 folha, itens numerados)">`
          + `<span class="orqa-mini-logo" aria-hidden="true"></span>Somar à receita</button>`
          + `<button type="button" class="orqa-fi-cursor" data-orqa-rx-cursor="${alvo}" title="Insere no ponto do cursor — só funciona dentro da receita">no cursor</button></div></div>`;
      }).join('');
      return `<article class="orqa-fi" data-orqa-ficha="${esc(f.k)}">
        <header class="orqa-fi-cab"><strong>${esc(f.n)}</strong>${f.atc ? `<span class="orqa-conferir">${esc(f.atc)}</span>` : ''}
          <span class="orqa-conferir orqa-fi-selo" title="Transcrito de fonte oficial e auditado; ainda não conferido pelo médico">não conferido pelo médico</span></header>
        ${ap ? `<div class="orqa-fi-aps">${ap}</div>` : ''}
        ${dose(f.d)}${linha('Ajuste renal', f.rn)}${linha('Ajuste hepático', f.hp)}${linha('Gestação', f.ge, 'orqa-fi-gest')}${linha('Amamentação', f.am)}${linha('Pediatria', f.pe)}
        ${alertasHtml}
        ${linhas ? `<div class="orqa-fi-rxs">${linhas}</div>`
                 : '<div class="orqa-vazio">Sem linha de receita pronta — a fonte oficial não cobre esta forma. Escreva à mão na receita.</div>'}
      </article>`;
    }

    function render(fichas) {
      if (!fichas || !fichas.length) return '';
      return fichas.map(umaFicha).join('')
        + '<div class="orqa-fi-pe">Transcrição de fonte oficial, conferida por dois braços e auditada. <b>A decisão é sempre da médica.</b></div>';
    }

    /* APRESENTAÇÕES (tabela CMED) para o remédio que ainda não tem ficha: concentração + forma, e a linha no formato do
       app com a posologia EM BRANCO (js/apresentacoes/<letra>.js, gerado por build-apresentacoes.py). Pedaço por letra
       inicial, carregado 1× e memoizado, no mesmo molde das fichas; entra no precache do PWA e abre offline. */
    const apCache = Object.create(null), apVoo = Object.create(null), apVistas = Object.create(null);
    global.ORQ_APRES_PUT = function (letra, mapa) { if (typeof letra === 'string' && mapa && typeof mapa === 'object') apCache[letra] = mapa; };
    function carregarAp(letra) {
      if (apCache[letra]) return Promise.resolve(apCache[letra]);
      if (apVoo[letra]) return apVoo[letra];
      apVoo[letra] = new Promise((ok, falha) => {
        const s = doc.createElement('script');
        s.src = raiz() + 'apresentacoes/' + encodeURIComponent(letra) + '.js';
        s.async = true;
        s.onload = () => { delete apVoo[letra]; apCache[letra] ? ok(apCache[letra]) : falha(new Error('pedaço vazio: ' + letra)); };
        s.onerror = () => { delete apVoo[letra]; s.remove(); falha(new Error('pedaço não carregou: ' + letra)); };
        doc.head.appendChild(s);
      });
      return apVoo[letra];
    }
    function apresentacoesDe(nome) {
      const k = fold(nome), letra = /^[a-z]/.test(k) ? k[0] : '_';
      return carregarAp(letra).then(m => m[k] || []).catch(() => []);
    }
    function apRender(nome, lista) {
      if (!lista || !lista.length) return '';
      const k = fold(nome); apVistas[k] = lista;
      const chip = (a, i) => `<button type="button" class="orqa-fi-chip orqa-ap" data-orqa-ap-somar="${esc(k)}|${i}" `
        + `title="Soma à receita no formato; a posologia fica em branco para a médica">${esc(a[0])}</button>`;
      const vis = lista.slice(0, 8), extra = lista.slice(8);
      return '<div class="orqa-ap-cab">Apresentações (CMED) — toque para somar à receita no formato, com a posologia em branco</div>'
        + `<div class="orqa-fi-aps">${vis.map(chip).join('')}</div>`
        + (extra.length ? `<details class="orqa-fi-mais"><summary>mais ${extra.length} apresentações</summary>`
          + `<div class="orqa-fi-aps">${extra.map((a, i) => chip(a, i + 8)).join('')}</div></details>` : '');
    }
    /* linha de apresentação pela POSIÇÃO → {texto, tipo}; o tipo de receita é decisão da médica (o app avisa controlado) */
    function ap(alvo) {
      const j = String(alvo).lastIndexOf('|'); const l = apVistas[String(alvo).slice(0, j)];
      const a = l && l[Number(String(alvo).slice(j + 1))];
      return a ? { texto: a[1], tipo: 'simple' } : null;
    }

    global.OrqFichas = Object.freeze({ tem, fichasDe, render, rx, carregarLote, fold, apresentacoesDe, apRender, ap,
      versao: () => (global.ORQ_FICHAS_INDICE && global.ORQ_FICHAS_INDICE.v) || null });
  } catch (e) { /* nunca derrubar o carregamento da página */ }
})(window, document);
