/* js/lacunas.js — LACUNAS ("___" com 3+ traços) nos documentos do hub · correção global 26/09/2026.

   O QUE É UMA LACUNA: uma sequência de 3 ou mais "_" dentro do TEXTO EDITÁVEL de um
   documento entregue ao paciente (receita, orientação, item livre, guias do paciente,
   documentos da unidade). Defeito relatado pelo dono: digitar com o cursor entre os
   traços escrevia ENTRE eles e a lacuna sobrevivia quebrada ("___oi___").

   A · ESCREVER PREENCHE A LACUNA — um único ouvinte de `beforeinput` na fase de
   captura do document (cancelável, dispara ANTES da mutação, existe desde Chrome 60 /
   Safari 10.1 → cobre o WKWebView alvo). Se a inserção é texto (tecla, paste, drop,
   substituição), a seleção está COLAPSADA dentro de uma lacuna ou encostada nela e o
   texto não é só "_", este módulo apenas SELECIONA a lacuna e não previne nada:
   o navegador substitui a seleção sozinho. Consequências medidas:
     · desfazer (Cmd/Ctrl+Z) em Chromium e WebKit (inserção por comando de edição = entra no histórico);
     · exatamente UM evento `input` por tecla (sem dispatch sintético);
     · sem reentrância (nenhum script insere texto — só move a seleção);
     · IME/tecla morta/ditado: em `compositionstart` dentro da lacuna, ela é
       selecionada antes da composição; no mobile o commit chega como
       insertReplacementText/insertFromPaste/insertCompositionText — todos cobertos.
   Regras fixas (testadas pelos dois lados):
     · digitar "_" nunca dispara a troca (dá para criar lacuna nova à mão);
     · Backspace/Delete nunca passam por aqui (comportamento nativo em qualquer borda);
     · seleção não colapsada (gesto da médica) manda, lacuna nenhuma atrapalha;
     · inserção sem lacuna sob o cursor não é tocada.

   B · NO PAPEL A LACUNA É ESPAÇO VIRTUAL — `transformarParaImpressao(portal)` envolve
   cada lacuna DENTRO de contêiner de valor editável (ou do espelho dele na 2ª via) em
   <span class="lacuna-pendente"> na CÓPIA que vive no #printPortal; a folha que a
   médica edita nunca é tocada. A regra `@media print` em index.html torna o span
   invisível mantendo o espaço (color: transparent — os traços continuam lá, ocupando
   o lugar, só não levam tinta). Campos FIXOS do modelo (quadro do comprador e do
   fornecedor, data ___/___/___, linha de assinatura) não estão em contêiner de
   valor editável e seguem impressos como hoje — verificação B05 da prova de aceite.

   C · ESTABILIDADE — o módulo inteiro é protegido por try/catch: qualquer incompatível
   (navegador velho, estrutura inesperada) desliga o recurso sem erro no carregamento;
   as 6 guardas da PWA registram sempre. Trabalho por tecla: um regex sobre o texto
   do próprio campo + um TreeWalker do próprio campo, nada mais.

   Escopo FECHADO por predicado estrutural (campo editável de DOCUMENTO):
     contenteditable [data-field]   — vias do receituário e orientações (index.html:1031,1049,1054)
     contenteditable [data-bind]    — folha dos guias no preview (guias-view.js:241)
     [data-campo] input/textarea    — documentos da unidade, 1ª via (institucionais-view.js:63-154)
     #composeTray textarea          — editor do item livre (index.html:1152)
   Nada fora disso é tocado: busca do hub (#smartSearch), busca do painel (#orqAssist),
   busca do catálogo de guias (#catalogSearch), notas, SOAP (#txS/#txO/#txA/#txP),
   login e campos de ficha de paciente seguem 100% nativos (prova: F1/F2 do aceite).

   Contêineres de VALOR na cópia impressa (decisão editável-vs-fixo feita no
   transform, nunca no CSS global):
     [data-sync]     1ª via da receita/orientação · [data-field] espelhado na 2ª via
     [data-bind]     valores vivos na 1ª via do guia quando a cópia mantém o marcação
     .static-value   valores do guia renderizados para impressão (editable:false)
     [data-mirror], .mirror-value   espelhos da 2ª via do guia
     .f1v-mirror, .table-mirror, .choice-mirror   espelhos dos documentos da unidade
   Código da casa — MIT. */
(function Lacunas(window, document) {
  'use strict';
  try {
    const RE = /_{3,}/g;
    const MINIMO = 3;

    /* ── predicado de ESCOPO: campo editável de documento ─────────────────── */
    function campoDocumento(alvo) {
      if (!alvo || alvo.nodeType !== 1) return null;
      let el = null;
      if (alvo.isContentEditable) {
        const ce = alvo.closest('[contenteditable]');
        if (!ce) return null;
        el = ce.dataset && (ce.dataset.field !== undefined || ce.dataset.bind !== undefined) ? ce : null;
      } else if (alvo.tagName === 'TEXTAREA' || alvo.tagName === 'INPUT') {
        if (alvo.dataset && alvo.dataset.campo !== undefined) el = alvo;
        else if (alvo.closest('#composeTray textarea')) el = alvo;
      }
      return el && !el.closest('#printPortal') ? el : null;
    }

    /* ── lacuna sob um offset (inclusiva nas duas bordas = "encostado") ─────
       Varredura única por /_{3,}/g: cobre o run que CONTÉM off, depois o run
       que COMEÇA em off, depois o run que TERMINA em off. Sem lastIndex de
       estado compartilhado: cada chamada usa RegExp local (sem reentrância). */
    function lacunaEm(texto, off) {
      if (texto == null || off == null || off < 0 || off > texto.length) return null;
      const re = /_{3,}/g;
      let m, fimAnt = -1, iniAnt = -1;
      while ((m = re.exec(texto)) !== null) {
        const ini = m.index, fim = ini + m[0].length;
        if (off >= ini && off <= fim) return { inicio: ini, fim };
        if (fim <= off) { iniAnt = ini; fimAnt = fim; }
        if (ini >= off) break;
      }
      if (fimAnt === off) return { inicio: iniAnt, fim: fimAnt };
      return null;
    }

    /* ── contenteditable: offset do caret no texto do campo + seleção da lacuna ── */
    function offsetNoCampo(el) {
      const s = window.getSelection();
      if (!s || !s.rangeCount) return null;
      const r = s.getRangeAt(0);
      if (!r.collapsed || !el.contains(r.startContainer)) return null;
      const pre = document.createRange();
      pre.selectNodeContents(el);
      try { pre.setEnd(r.startContainer, r.startOffset); } catch (_) { return null; }
      return pre.toString().length;
    }

    function ranger(el, inicio, fim) {
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const r = document.createRange();
      let acc = 0, n, iniOk = false, ultimo = null;
      while ((n = w.nextNode())) {
        ultimo = n;
        const len = n.data.length;
        if (!iniOk && inicio <= acc + len) { r.setStart(n, inicio - acc); iniOk = true; }
        if (iniOk && fim <= acc + len) { r.setEnd(n, fim - acc); return r; }
        acc += len;
      }
      if (!iniOk && ultimo) r.setStart(ultimo, ultimo.data.length);
      if (iniOk) { r.collapse(true); return r; }
      return null;
    }

    function selecionarLacuna(el, lac) {
      if (el.setSelectionRange && typeof el.selectionStart === 'number') {
        try { el.focus(); } catch (_) { /* foco já estava lá */ }
        el.setSelectionRange(lac.inicio, lac.fim);
        return true;
      }
      const r = ranger(el, lac.inicio, lac.fim);
      if (!r) return false;
      const s = window.getSelection();
      s.removeAllRanges();
      s.addRange(r);
      return true;
    }

    /* seleção não colapsada é da médica — jamais disputar com ela */
    function selecaoAberta(el) {
      if (el.selectionStart !== undefined) return el.selectionStart !== el.selectionEnd;
      const s = window.getSelection();
      if (!s || !s.rangeCount) return false;
      const r = s.getRangeAt(0);
      return !r.collapsed && el.contains(r.startContainer);
    }

    function textoDoEvento(e) {
      if (e.data != null) return e.data;
      const dt = e.dataTransfer;
      if (dt) { try { return dt.getData('text/plain') || ''; } catch (_) { return ''; } }
      return '';
    }

    /* na BORDA da lacuna, espaço/pontuação é continuação da frase, não preenchimento:
       "____" + " cp" digitado à mão fica "____ cp"; "de ___" + "8" vira "de 8" */
    const SO_PONTUACAO = /^[\s.,;:!?)\]}\-–—\/%º°ª]+$/;   /* % º ° ª na borda também não preenchem ("soro a ___%") */
    function deveTrocar(lac, off, texto) {
      if (off > lac.inicio && off < lac.fim) return true;
      return !SO_PONTUACAO.test(texto);
    }

    /* ── o único motor da escrita: beforeinput, captura, document ─────────── */

    let emInsercao = false;   /* trava de reentrância do comando de edição */
    function aoDigitar(e) {
      try {
        if (e.defaultPrevented || e.isComposing || emInsercao) return;
        const t = e.inputType || '';
        if (t !== 'insertText' && t !== 'insertFromPaste' && t !== 'insertReplacementText'
          && t !== 'insertFromDrop' && t !== 'insertCompositionText' && t !== 'insertFromComposition') return;
        /* corretor ortográfico mira uma PALAVRA (faixa não colapsada), não o caret: não é escrita na lacuna */
        if (t === 'insertReplacementText' && e.getTargetRanges && e.getTargetRanges().some(r => !r.collapsed)) return;
        const el = campoDocumento(e.target);
        if (!el || selecaoAberta(el)) return;
        const texto = textoDoEvento(e);
        if (!texto || /^_+$/.test(texto)) return; /* "_" puro cria/alongue lacuna à mão */
        const controle = el.selectionStart !== undefined && typeof el.value === 'string';
        const valor = controle ? el.value : el.textContent;
        const off = controle ? el.selectionStart : offsetNoCampo(el);
        const lac = lacunaEm(valor, off);
        if (!lac || !deveTrocar(lac, off, texto)) return;
        if (!selecionarLacuna(el, lac)) return;
        /* O WebKit (WKWebView do app, Safari do iPhone) fixa o ponto de inserção ANTES do beforeinput: mudar a
           seleção aqui não muda o destino. Então, se o evento é cancelável, cancelo a inserção nativa e insiro
           por comando de edição sobre a lacuna selecionada — entra no desfazer, dispara 1 input, e o comando não
           no WebKit GERA beforeinput aninhado (medido: 3 eventos para 2 teclas) — a trava emInsercao abaixo é a proteção real, não enfeite. Não cancelável (commit de IME): vale a
           seleção feita no compositionstart. */
        if (e.cancelable && !emInsercao) {
          e.preventDefault();
          emInsercao = true;
          try { document.execCommand('insertText', false, texto); } finally { emInsercao = false; }
        }
      } catch (_) { /* falha aqui dentro devolve o comportamento nativo — nunca quebra a digitação */ }
    }

    /* ── colar: o app cancela o paste nativo e insere por comando próprio (insertPlainText), que NÃO dispara
       beforeinput — então o módulo ouve o paste ANTES (captura no document) e só seleciona a lacuna; o
       inserto do app substitui a seleção. Em textarea/input o paste nativo substitui a seleção sozinho. */
    function aoColar(e) {
      try {
        const el = campoDocumento(e.target);
        if (!el || selecaoAberta(el)) return;
        const cd = e.clipboardData || window.clipboardData;
        const texto = cd ? cd.getData('text/plain') : '';
        if (!texto || /^_+$/.test(texto)) return;
        const controle = el.selectionStart !== undefined && typeof el.value === 'string';
        const off = controle ? el.selectionStart : offsetNoCampo(el);
        const lac = lacunaEm(controle ? el.value : el.textContent, off);
        if (lac && deveTrocar(lac, off, texto)) selecionarLacuna(el, lac);
      } catch (_) { /* idem: colar segue nativo */ }
    }

    function aoCompor(e) {
      try {
        const el = campoDocumento(e.target);
        if (!el || selecaoAberta(el)) return;
        const controle = el.selectionStart !== undefined && typeof el.value === 'string';
        const off = controle ? el.selectionStart : offsetNoCampo(el);
        const lac = lacunaEm(controle ? el.value : el.textContent, off);
        if (lac) selecionarLacuna(el, lac);
      } catch (_) { /* idem */ }
    }

    /* rede de segurança do ACENTO (tecla morta ´+a no WebKit, que o teste automático não simula): se o texto
       composto caiu encostado em traços de uma lacuna ("__á_" ou "á___"), os traços somem e fica só o composto —
       mesma regra de borda da digitação. Se o compositionstart já selecionou a lacuna, não há traço em volta e
       nada acontece. Troca por comando de edição: entra no desfazer e dispara o input (2ª via espelha). */
    function aoComporFim(e) {
      try {
        const dado = e.data || '';
        if (!dado || /[_\s]/.test(dado)) return;
        const el = campoDocumento(e.target);
        if (el) setTimeout(() => repararAcento(el, dado), 0);
      } catch (_) { /* idem */ }
    }
    function repararAcento(el, dado) {
      try {
        const controle = el.selectionStart !== undefined && typeof el.value === 'string';
        const texto = controle ? el.value : el.textContent;
        const off = controle ? el.selectionStart : offsetNoCampo(el);
        if (off == null) return;
        const ini = off - dado.length;
        if (ini < 0 || texto.slice(ini, off) !== dado) return;
        let a = ini, b = off;
        while (a > 0 && texto[a - 1] === '_') a--;
        while (b < texto.length && texto[b] === '_') b++;
        if ((ini - a) + (b - off) < 3) return;          /* só traço de LACUNA (3+), nunca um "_" solto */
        if (controle) el.setSelectionRange(a, b);
        else { const r = ranger(el, a, b); if (!r) return; const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
        emInsercao = true;
        try { document.execCommand('insertText', false, dado); } finally { emInsercao = false; }
      } catch (_) { /* idem */ }
    }

    /* ── impressão: envolver lacunas da CÓPIA em span.lacuna-pendente ─────── */
    const CONTAINER_VALOR = '[data-sync],[data-field],[data-bind],[data-mirror],.static-value,.mirror-value,.f1v-mirror,.table-mirror,.choice-mirror';

    function marcarNoContainer(container) {
      const w = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
      const nos = [];
      let n;
      while ((n = w.nextNode())) { RE.lastIndex = 0; if (RE.test(n.data)) nos.push(n); }
      nos.forEach((no) => {
        const texto = no.data;
        RE.lastIndex = 0;
        const frag = no.ownerDocument.createDocumentFragment();
        let pos = 0, m;
        while ((m = RE.exec(texto)) !== null) {
          if (m.index > pos) frag.appendChild(no.ownerDocument.createTextNode(texto.slice(pos, m.index)));
          const span = no.ownerDocument.createElement('span');
          span.className = 'lacuna-pendente';
          span.textContent = m[0];
          frag.appendChild(span);
          pos = m.index + m[0].length;
        }
        if (pos < texto.length) frag.appendChild(no.ownerDocument.createTextNode(texto.slice(pos)));
        no.parentNode.replaceChild(frag, no);
        /* um mesmo acento de nó (ex.: lacuna repetida na linha) sai em spans separados:
           o medição da prova lê runs por nó — cada run de "_" é seu próprio span */
      });
    }

    function transformarParaImpressao(portal) {
      if (!portal || !portal.querySelectorAll) return;
      try {
        portal.querySelectorAll(CONTAINER_VALOR).forEach(marcarNoContainer);
      } catch (_) { /* impressão segue como sempre foi — sem derrubar a folha */ }
    }

    document.addEventListener('beforeinput', aoDigitar, true);
    document.addEventListener('compositionstart', aoCompor, true);
    document.addEventListener('compositionend', aoComporFim, true);
    document.addEventListener('paste', aoColar, true);

    window.OrqLacunas = Object.freeze({
      transformarParaImpressao,
      conteineresValor: CONTAINER_VALOR,
      lacunaEm: (texto, off) => lacunaEm(String(texto == null ? '' : texto), off),
    });
  } catch (_) {
    /* Requisito C acima de tudo: módulo incompatível NUNCA emite erro no carregamento.
       Sem OrqLacunas, os caminhos de impressão seguem com o papel de ontem. */
  }
})(window, document);
