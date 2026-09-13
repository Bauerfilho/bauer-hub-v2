/* ============================================================================
 * esquemas-dra-Orquestrador.js — Seção "Esquemas da Orquestrador" (frente F2b)
 * ----------------------------------------------------------------------------
 * O QUE FAZ (contrato da frente):
 *   Injeta, no topo de CADA página de doença do HUB de Receituários UBS 2026,
 *   uma seção chamada "Esquemas da Orquestrador" com:
 *     (1) a lista dos esquemas que ela mesma salvou naquela doença;
 *     (2) o botão "+ Adicionar meu esquema", que abre um formulário de
 *         2 campos — Nome do esquema (OBRIGATÓRIO) + texto livre da
 *         prescrição (opcional);
 *     (3) quando vazia, o convite curto "Adicione aqui o seu esquema
 *         para esta doença";
 *     (4) uma estrela (☆/⭐) ao lado do seletor de esquemas do guia, que
 *         favorita o esquema selecionado e o espelha no topo da seção.
 *   Mais dois botões no rodapé da seção: Exportar (baixa um .json) e
 *   Importar (lê um .json e mescla).
 *
 * ONDE GRAVA (declaração exigida pelo contrato):
 *   Tudo fica no localStorage DESTE navegador, NESTE computador, na chave:
 *       ubs2026.v1.Orquestrador
 *   Formato gravado:
 *     { v:1, topics: { "<idDoTopico>": { own:[{id,nome,texto,imagem,createdAt,
 *       updatedAt}], favs:[{id,titulo,markedAt}] } },
 *       meta:{ createdAt, lastExportAt } }
 *   Nada vai para a internet: este arquivo não faz fetch, não chama rede,
 *   não carrega nada de fora. O Exportar gera um arquivo .json na pasta de
 *   downloads dela; o Importar lê um .json que ela escolhe. É assim que ela
 *   troca de computador sem perder nada.
 *
 * COMO LIGAR NO HUB (1 linha — NÃO aplicada nesta entrega por ordem do
 * contrato, que proibiu tocar em index.html e index-correcoes-piloto.html):
 *   <script src="esquemas-dra-Orquestrador.js"></script>   (antes de </body>)
 * Enquanto essa linha não existir no HTML, este arquivo simplesmente não é
 * carregado — ele não modifica nada sozinho.
 *
 * COMO ELE SE ENCAIXA SEM TOCAR NO CÓDIGO DO HUB:
 *   O HUB abre uma doença com openTopic() (index.html), que mostra
 *   #workspaceView, preenche #workspaceTopic/#regimenSelect e grava #<id> na
 *   URL. Este módulo observa esses 3 sinais (MutationObserver + hashchange) e
 *   se renderiza no topo do workspace, entre a barra de ferramentas e a folha.
 *   Se o HUB mudar e os sinais sumirem, o módulo fica oculto — nunca quebra
 *   a página (fail-closed).
 *
 * USUÁRIA "bem rudimentar" (ordem do contrato): poucos campos, botões
 * grandes, texto grande, nada obrigatório além do nome, apagar em 2 gestos,
 * erros falados em linguagem simples (alert), zero jargão.
 *
 * Vanilla JS, sem framework, offline. PT-BR. Sem dependências.
 * ========================================================================== */

(() => {
  'use strict';

  /* ---------- constantes ---------- */

  const LS_KEY = 'ubs2026.v1.Orquestrador';   // chave única do localStorage (ver "ONDE GRAVA" acima)
  const SECTION_ID = 'dmSection';       // id da seção injetada
  const STAR_ID = 'dmStarBtn';          // id do botão de estrela injetado na barra do HUB

  /* ---------- utilitários pequenos ---------- */

  // Atalho de busca no DOM.
  const $ = (sel, raiz) => (raiz || document).querySelector(sel);

  // Cria elemento com classe e texto (texto via textContent — nunca innerHTML
  // com dado dela, para nenhum texto virar HTML por acidente).
  function el(tag, classe, texto) {
    const n = document.createElement(tag);
    if (classe) n.className = classe;
    if (texto != null) n.textContent = texto;
    return n;
  }

  // Id simples para esquema próprio: tempo + sorteio (suficiente para uso local).
  function novoId() {
    return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  // Data AAAA-MM-DD (para o nome do arquivo exportado).
  function hoje() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dia;
  }

  /* ---------- armazenamento (a única porta de leitura/gravação) ---------- */

  function storeVazio() {
    return { v: 1, topics: {}, meta: { createdAt: new Date().toISOString(), lastExportAt: null } };
  }

  // Lê o localStorage. Arquivo corrompido/ausente = começa do vazio (nunca quebra).
  function load() {
    let cru = null;
    try { cru = localStorage.getItem(LS_KEY); } catch (_) { cru = null; }
    if (!cru) return storeVazio();
    try {
      const data = JSON.parse(cru);
      if (!data || typeof data !== 'object' || !data.topics || typeof data.topics !== 'object') return storeVazio();
      if (!data.meta || typeof data.meta !== 'object') data.meta = { createdAt: new Date().toISOString(), lastExportAt: null };
      return data;
    } catch (_) {
      return storeVazio();
    }
  }

  // Grava. Se a quota do navegador estourar, avisa em linguagem simples e não perde o que já estava salvo.
  function save(store) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(store));
      return true;
    } catch (_) {
      window.alert('Não consegui salvar: o espaço do navegador está cheio.\nUse o botão Exportar para guardar uma cópia e peça ajuda para limpar espaço.');
      return false;
    }
  }

  // Pega (e se create=true, cria) a caixinha de um tópico: { own:[], favs:[] }.
  function caixaDoTopico(store, topicId, create) {
    if (!store.topics[topicId] && create) store.topics[topicId] = { own: [], favs: [] };
    const caixa = store.topics[topicId];
    if (!caixa) return null;
    if (!Array.isArray(caixa.own)) caixa.own = [];
    if (!Array.isArray(caixa.favs)) caixa.favs = [];
    return caixa;
  }

  /* ---------- CSS próprio, injetado pelo próprio arquivo ---------- */

  function injetarCss() {
    if (document.getElementById('dmCss')) return;
    const css = `
      .dm-section{width:min(1440px, calc(100% - 40px));margin:20px auto 0;background:var(--paper,#fff);border:1px solid var(--line,#d8dee9);border-radius:var(--radius,18px);padding:22px 24px;box-shadow:var(--shadow,none)}
      .dm-title{margin:0 0 6px;font-size:22px;letter-spacing:-.02em;color:var(--ink,#172033)}
      .dm-hint{margin:0 0 16px;font-size:13px;line-height:1.5;color:var(--muted,#667085)}
      .dm-list{display:grid;gap:12px;margin:0 0 16px}
      .dm-card{border:1px solid var(--line,#d8dee9);border-radius:14px;padding:14px 16px;background:#fff}
      .dm-card.dm-mirror{background:var(--warn-bg,#fff7d6);border-color:#eed98a}
      .dm-card-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px}
      .dm-selo{font-size:12px;font-weight:800;border-radius:999px;padding:4px 10px;background:var(--brand-soft,#e7f6f3);color:var(--brand-dark,#0b5d57)}
      .dm-card.dm-mirror .dm-selo{background:#ffeaa8;color:#7a5b00}
      .dm-nome{font-size:17px;font-weight:800;color:var(--ink,#172033)}
      .dm-texto{margin:4px 0 0;font-size:15px;line-height:1.55;white-space:pre-wrap;color:var(--ink,#172033)}
      .dm-acoes{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}
      .dm-btn{min-height:46px;padding:0 16px;border-radius:12px;border:1px solid var(--line,#d8dee9);background:#fff;font-weight:700;font-size:15px;color:var(--ink,#172033)}
      .dm-btn:hover{background:#f7fafc}
      .dm-btn.dm-perigo{color:var(--danger,#b42318);border-color:#f0c7c2}
      .dm-btn.dm-perigo.dm-armado{background:var(--danger,#b42318);border-color:var(--danger,#b42318);color:#fff}
      .dm-empty{margin:0 0 16px;font-size:16px;line-height:1.5;color:var(--muted,#667085)}
      .dm-add{display:block;width:100%;min-height:56px;border:0;border-radius:14px;background:var(--brand,#0f766e);color:#fff;font-size:18px;font-weight:800;margin:0 0 14px}
      .dm-add:hover{background:var(--brand-dark,#0b5d57)}
      .dm-form{border:1px solid var(--line,#d8dee9);border-radius:14px;background:#fbfcfe;padding:16px;margin:0 0 14px}
      .dm-form label{display:block;margin:0 0 14px;font-size:15px;font-weight:700;color:var(--ink,#172033)}
      .dm-form input,.dm-form textarea{display:block;width:100%;margin-top:6px;border:1px solid var(--line,#d8dee9);border-radius:11px;padding:12px;font:inherit;font-size:16px;background:#fff;color:var(--ink,#172033)}
      .dm-form textarea{min-height:140px;resize:vertical}
      .dm-form-err{margin:0 0 12px;font-size:14px;font-weight:700;color:var(--danger,#b42318)}
      .dm-form-acoes{display:flex;gap:12px;flex-wrap:wrap}
      .dm-salvar{min-height:52px;padding:0 24px;border:0;border-radius:12px;background:var(--brand,#0f766e);color:#fff;font-size:17px;font-weight:800}
      .dm-salvar:hover:not(:disabled){background:var(--brand-dark,#0b5d57)}
      .dm-salvar:disabled{opacity:.45;cursor:not-allowed}
      .dm-io{display:flex;gap:10px;flex-wrap:wrap;border-top:1px solid var(--line,#d8dee9);padding-top:14px}
      .dm-star{border:1px solid var(--line,#d8dee9);border-radius:12px;background:#fff;min-height:42px;padding:0 14px;font-weight:700;font-size:14px;color:var(--ink,#172033)}
      .dm-star:hover{background:#f7fafc}
      .dm-star.dm-on{background:var(--warn-bg,#fff7d6);border-color:var(--warn,#9a6700);color:var(--warn,#9a6700)}
      .dm-star:disabled{opacity:.45;cursor:not-allowed}
      @media(max-width:720px){.dm-section{width:calc(100% - 16px);margin-top:12px;padding:16px}.dm-star{order:3;width:100%}}
      @media print{.dm-section,.dm-star{display:none!important}}
    `;
    const style = el('style');
    style.id = 'dmCss';
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ---------- como o módulo descobre qual doença está aberta ---------- */

  // O HUB grava "#<idDoTopico>" na URL ao abrir uma doença. É daí que lemos o id.
  function topicoAtual() {
    try { return decodeURIComponent(location.hash.slice(1)) || ''; } catch (_) { return ''; }
  }

  // Só renderiza se estivermos numa doença de verdade: workspace visível,
  // hash com id e as abas do HUB presentes (nas visões globais — "Documentos
  // pendentes"/"Gate" — o HUB esconde #workspaceTabs; ali a seção não entra).
  function paginaEhDoenca() {
    const ws = $('#workspaceView');
    if (!ws || ws.hidden) return false;
    const tabs = $('#workspaceTabs');
    if (tabs && tabs.hidden) return false;
    return !!topicoAtual();
  }

  /* ---------- sincronização: observa os sinais do HUB sem tocar nele ---------- */

  function sync() {
    const sec = document.getElementById(SECTION_ID);
    const star = document.getElementById(STAR_ID);
    if (!sec) return;
    if (!paginaEhDoenca()) {
      sec.hidden = true;
      if (star) star.hidden = true;
      return;
    }
    sec.hidden = false;
    if (star) star.hidden = false;
    renderSecao(sec, topicoAtual());
    syncEstrela();
  }

  /* ---------- a seção ---------- */

  // Estado do formulário: null = fechado; {id:null} = novo; {id:"e..."} = editando.
  let formState = null;

  function renderSecao(sec, topicId) {
    const store = load();
    const caixa = caixaDoTopico(store, topicId, false) || { own: [], favs: [] };
    sec.innerHTML = '';

    // Título + aviso de onde grava (em linguagem dela).
    sec.appendChild(el('h2', 'dm-title', '⭐ Esquemas da Orquestrador'));
    sec.appendChild(el('p', 'dm-hint',
      'Guardado neste computador, neste navegador. Nada vai para a internet. ' +
      'Para trocar de computador: use Exportar, leve o arquivo e use Importar no outro.'));

    // Lista: primeiro os esquemas dela (selo "Meu esquema"), depois os favoritos do guia.
    const lista = el('div', 'dm-list');
    let temAlgo = false;

    for (const esq of caixa.own) {
      temAlgo = true;
      lista.appendChild(cardEsquemaProprio(topicId, esq));
    }
    for (const fav of caixa.favs) {
      temAlgo = true;
      lista.appendChild(cardFavorito(topicId, fav));
    }

    // (3) Convite quando vazio — vazio nunca fica mudo.
    if (!temAlgo) {
      sec.appendChild(el('p', 'dm-empty', 'Adicione aqui o seu esquema para esta doença.'));
    } else {
      sec.appendChild(lista);
    }

    // (2) Botão grande de adicionar.
    const btnAdd = el('button', 'dm-add', '+ Adicionar meu esquema');
    btnAdd.type = 'button';
    btnAdd.addEventListener('click', () => {
      formState = { id: null };
      renderSecao(sec, topicId);
      const campo = $('#dmNome', sec);
      if (campo) campo.focus();
    });
    sec.appendChild(btnAdd);

    // Formulário (aberto quando formState != null neste tópico).
    if (formState) {
      sec.appendChild(montarForm(sec, topicId, formState.id));
    }

    // Rodapé: Exportar / Importar (valem para TODAS as doenças, não só esta).
    const io = el('div', 'dm-io');
    const btnExp = el('button', 'dm-btn', 'Exportar meus esquemas (.json)');
    btnExp.type = 'button';
    btnExp.addEventListener('click', exportar);
    const btnImp = el('button', 'dm-btn', 'Importar de um arquivo (.json)');
    btnImp.type = 'button';
    const fileInput = el('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/json,.json';
    fileInput.hidden = true;
    btnImp.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) importar(fileInput.files[0]);
      fileInput.value = '';
    });
    io.appendChild(btnExp);
    io.appendChild(btnImp);
    io.appendChild(fileInput);
    sec.appendChild(io);
  }

  // Cartão de esquema próprio (selo "Meu esquema" + editar/apagar).
  function cardEsquemaProprio(topicId, esq) {
    const card = el('article', 'dm-card');
    const head = el('div', 'dm-card-head');
    head.appendChild(el('span', 'dm-selo', 'Meu esquema'));
    head.appendChild(el('strong', 'dm-nome', esq.nome));
    card.appendChild(head);
    if (esq.texto && esq.texto.trim()) card.appendChild(el('p', 'dm-texto', esq.texto));

    const acoes = el('div', 'dm-acoes');

    const btnEditar = el('button', 'dm-btn', 'Editar');
    btnEditar.type = 'button';
    btnEditar.addEventListener('click', () => {
      formState = { id: esq.id };
      const sec = document.getElementById(SECTION_ID);
      renderSecao(sec, topicId);
      const campo = $('#dmNome', sec);
      if (campo) campo.focus();
    });

    // Apagar em 2 gestos: 1º clique arma ("Confirmar apagar?"), 2º clique apaga.
    const btnApagar = el('button', 'dm-btn dm-perigo', 'Apagar');
    btnApagar.type = 'button';
    let armado = false, timer = null;
    btnApagar.addEventListener('click', () => {
      if (!armado) {
        armado = true;
        btnApagar.textContent = 'Confirmar apagar?';
        btnApagar.classList.add('dm-armado');
        timer = setTimeout(() => {
          armado = false;
          btnApagar.textContent = 'Apagar';
          btnApagar.classList.remove('dm-armado');
        }, 4000);
        return;
      }
      clearTimeout(timer);
      const store = load();
      const caixa = caixaDoTopico(store, topicId, false);
      if (caixa) {
        caixa.own = caixa.own.filter(e => e.id !== esq.id);
        save(store);
      }
      const sec = document.getElementById(SECTION_ID);
      renderSecao(sec, topicId);
    });

    acoes.appendChild(btnEditar);
    acoes.appendChild(btnApagar);
    card.appendChild(acoes);
    return card;
  }

  // Cartão-espelho de um esquema do guia marcado com estrela.
  function cardFavorito(topicId, fav) {
    const card = el('article', 'dm-card dm-mirror');
    const head = el('div', 'dm-card-head');
    head.appendChild(el('span', 'dm-selo', 'Do guia — favorito'));
    head.appendChild(el('strong', 'dm-nome', fav.titulo || fav.id));
    card.appendChild(head);

    const acoes = el('div', 'dm-acoes');

    // "Abrir" seleciona o esquema no seletor do HUB (dispara o mesmo evento
    // que o HUB já escuta) e rola até a folha.
    const btnAbrir = el('button', 'dm-btn', 'Abrir');
    btnAbrir.type = 'button';
    btnAbrir.addEventListener('click', () => {
      const sel = $('#regimenSelect');
      if (!sel) return;
      sel.value = fav.id;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      const palco = $('#stageCard');
      if (palco && palco.scrollIntoView) palco.scrollIntoView({ behavior: 'smooth', block: 'start' });
      syncEstrela();
    });

    const btnTirar = el('button', 'dm-btn', 'Tirar a estrela');
    btnTirar.type = 'button';
    btnTirar.addEventListener('click', () => {
      const store = load();
      const caixa = caixaDoTopico(store, topicId, false);
      if (caixa) {
        caixa.favs = caixa.favs.filter(f => f.id !== fav.id);
        save(store);
      }
      const sec = document.getElementById(SECTION_ID);
      renderSecao(sec, topicId);
      syncEstrela();
    });

    acoes.appendChild(btnAbrir);
    acoes.appendChild(btnTirar);
    card.appendChild(acoes);
    return card;
  }

  /* ---------- o formulário de 2 campos ---------- */

  function montarForm(sec, topicId, editId) {
    const store = load();
    const caixa = caixaDoTopico(store, topicId, false);
    const existente = editId && caixa ? caixa.own.find(e => e.id === editId) : null;

    const form = el('form', 'dm-form');

    // Campo 1 — Nome do esquema (ÚNICO obrigatório).
    const labNome = el('label', null, 'Nome do esquema (obrigatório)');
    const inpNome = el('input');
    inpNome.id = 'dmNome';
    inpNome.type = 'text';
    inpNome.maxLength = 120;
    inpNome.autocomplete = 'off';
    inpNome.value = existente ? existente.nome : '';
    labNome.appendChild(inpNome);

    // Campo 2 — Texto livre da prescrição (opcional; cabe o que ela quiser).
    const labTexto = el('label', null, 'Como eu faço (posologia, observações — opcional)');
    const taTexto = el('textarea');
    taTexto.maxLength = 8000;
    taTexto.value = existente && existente.texto ? existente.texto : '';
    labTexto.appendChild(taTexto);

    const erro = el('p', 'dm-form-err', 'Escreva um nome para o esquema.');
    erro.hidden = true;

    const acoes = el('div', 'dm-form-acoes');
    const btnSalvar = el('button', 'dm-salvar', existente ? 'Salvar alterações' : 'Salvar meu esquema');
    btnSalvar.type = 'submit';
    btnSalvar.disabled = !inpNome.value.trim();
    const btnCancelar = el('button', 'dm-btn', 'Cancelar');
    btnCancelar.type = 'button';
    btnCancelar.addEventListener('click', () => {
      formState = null;
      renderSecao(sec, topicId);
    });
    acoes.appendChild(btnSalvar);
    acoes.appendChild(btnCancelar);

    form.appendChild(labNome);
    form.appendChild(labTexto);
    form.appendChild(erro);
    form.appendChild(acoes);

    // Salvar só habilita quando há nome (fail-closed, sem susto).
    inpNome.addEventListener('input', () => {
      btnSalvar.disabled = !inpNome.value.trim();
      erro.hidden = true;
    });

    form.addEventListener('submit', ev => {
      ev.preventDefault();
      const nome = inpNome.value.trim();
      if (!nome) {
        erro.hidden = false;
        inpNome.focus();
        return;
      }
      const store2 = load();
      const caixa2 = caixaDoTopico(store2, topicId, true);
      const agora = new Date().toISOString();
      // Re-resolve o alvo DENTRO do store2 recém-lido: "existente" pertence ao
      // load() feito ao montar o form — gravar nele não grava nada (bug pego
      // na bancada: edição se perdia silenciosamente).
      const alvo = editId ? caixa2.own.find(e => e.id === editId) : null;
      if (alvo) {
        alvo.nome = nome;
        alvo.texto = taTexto.value;
        alvo.updatedAt = agora;
      } else {
        caixa2.own.push({
          id: novoId(),
          nome: nome,
          texto: taTexto.value,
          imagem: null,          // campo reservado desde o dia 1 (fotos futuras — frente B5)
          createdAt: agora,
          updatedAt: agora
        });
      }
      if (save(store2)) {
        formState = null;
        renderSecao(sec, topicId);
      }
    });

    return form;
  }

  /* ---------- a estrela (favorito de esquema do guia) ---------- */

  // Atualiza o botão conforme o esquema selecionado no seletor do HUB.
  function syncEstrela() {
    const star = document.getElementById(STAR_ID);
    const sel = $('#regimenSelect');
    if (!star || !sel || star.hidden) return;
    const rid = sel.value;
    const habilitado = !!rid && !sel.disabled;
    star.disabled = !habilitado;
    const store = load();
    const caixa = caixaDoTopico(store, topicoAtual(), false);
    const marcado = habilitado && caixa && caixa.favs.some(f => f.id === rid);
    star.textContent = marcado ? '⭐ Favorito — tirar a estrela' : '☆ Marcar este esquema';
    star.classList.toggle('dm-on', !!marcado);
    star.setAttribute('aria-pressed', marcado ? 'true' : 'false');
  }

  // Clique na estrela: marca/desmarca o esquema selecionado (1 clique).
  function onEstrelaClick() {
    const sel = $('#regimenSelect');
    if (!sel || sel.disabled || !sel.value) return;
    const rid = sel.value;
    const topicId = topicoAtual();
    if (!topicId) return;
    const opt = sel.querySelector('option[value="' + rid.replace(/"/g, '\\"') + '"]');
    const titulo = opt ? opt.textContent : rid;
    const store = load();
    const caixa = caixaDoTopico(store, topicId, true);
    const i = caixa.favs.findIndex(f => f.id === rid);
    if (i >= 0) {
      caixa.favs.splice(i, 1);
    } else {
      caixa.favs.push({ id: rid, titulo: titulo, markedAt: new Date().toISOString() });
    }
    if (save(store)) {
      syncEstrela();
      const sec = document.getElementById(SECTION_ID);
      if (sec && !sec.hidden) renderSecao(sec, topicId);
    }
  }

  /* ---------- exportar / importar ---------- */

  function exportar() {
    const store = load();
    const payload = {
      _arquivo: 'esquemas-dra-Orquestrador',
      _versao: 1,
      _aviso: 'Esquemas pessoais e favoritos da Orquestrador. Não contém dados de pacientes.',
      _exportadoEm: new Date().toISOString(),
      topics: store.topics
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = el('a');
    a.href = url;
    a.download = 'esquemas-dra-Orquestrador-' + hoje() + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    store.meta.lastExportAt = new Date().toISOString();
    save(store);
    window.alert('Pronto! O arquivo "' + a.download + '" foi baixado.\nGuarde-o com cuidado — ele é a sua cópia para trocar de computador.');
  }

  function importar(arquivo) {
    const reader = new FileReader();
    reader.onload = () => {
      let data = null;
      try { data = JSON.parse(reader.result); } catch (_) { data = null; }
      if (!data || typeof data !== 'object' || !data.topics || typeof data.topics !== 'object') {
        window.alert('Não consegui ler este arquivo.\nEle não parece um backup de esquemas. Nada foi alterado.');
        return;
      }
      const limpos = saneaTopics(data.topics);
      const store = load();
      const conta = mesclar(store, limpos);
      if (save(store)) {
        sync();
        window.alert('Pronto! ' + conta.own + ' esquema(s) e ' + conta.favs + ' favorito(s) importados.');
      }
    };
    reader.onerror = () => {
      window.alert('Não consegui ler este arquivo. Nada foi alterado.');
    };
    reader.readAsText(arquivo);
  }

  // Limpa o que veio do arquivo: só entra o que tem formato certo.
  // Assim, arquivo malformado nunca suja nem apaga o que já existe.
  function saneaTopics(topics) {
    const limpo = {};
    for (const tid of Object.keys(topics)) {
      if (typeof tid !== 'string' || !tid) continue;
      const t = topics[tid];
      if (!t || typeof t !== 'object') continue;
      const caixa = { own: [], favs: [] };
      if (Array.isArray(t.own)) {
        for (const e of t.own) {
          if (!e || typeof e !== 'object' || typeof e.id !== 'string' || typeof e.nome !== 'string' || !e.nome.trim()) continue;
          caixa.own.push({
            id: e.id,
            nome: e.nome,
            texto: typeof e.texto === 'string' ? e.texto : '',
            imagem: typeof e.imagem === 'string' ? e.imagem : null,
            createdAt: typeof e.createdAt === 'string' ? e.createdAt : new Date().toISOString(),
            updatedAt: typeof e.updatedAt === 'string' ? e.updatedAt : new Date().toISOString()
          });
        }
      }
      if (Array.isArray(t.favs)) {
        for (const f of t.favs) {
          if (!f || typeof f !== 'object' || typeof f.id !== 'string' || !f.id) continue;
          caixa.favs.push({
            id: f.id,
            titulo: typeof f.titulo === 'string' ? f.titulo : f.id,
            markedAt: typeof f.markedAt === 'string' ? f.markedAt : new Date().toISOString()
          });
        }
      }
      if (caixa.own.length || caixa.favs.length) limpo[tid] = caixa;
    }
    return limpo;
  }

  // Mescla no armazenamento atual: esquemas com mesmo id — o mais recente
  // vence; favoritos — união (nunca perde marcação).
  function mesclar(store, limpos) {
    const conta = { own: 0, favs: 0 };
    for (const tid of Object.keys(limpos)) {
      const caixa = caixaDoTopico(store, tid, true);
      const entrada = limpos[tid];
      for (const novo of entrada.own) {
        const i = caixa.own.findIndex(e => e.id === novo.id);
        if (i < 0) {
          caixa.own.push(novo);
          conta.own++;
        } else if ((novo.updatedAt || '') > (caixa.own[i].updatedAt || '')) {
          caixa.own[i] = novo;
          conta.own++;
        }
      }
      for (const fav of entrada.favs) {
        if (!caixa.favs.some(f => f.id === fav.id)) {
          caixa.favs.push(fav);
          conta.favs++;
        }
      }
    }
    return conta;
  }

  /* ---------- montagem inicial ---------- */

  function montar() {
    const ws = $('#workspaceView');
    if (!ws) return false;
    injetarCss();

    // Seção no TOPO do workspace: entre a barra de ferramentas e a folha.
    const shell = ws.querySelector('.workspace-shell');
    const sec = el('section', 'dm-section');
    sec.id = SECTION_ID;
    sec.hidden = true;
    sec.setAttribute('aria-label', 'Esquemas da Orquestrador');
    ws.insertBefore(sec, shell || null);

    // Estrela ao lado do seletor de esquemas do guia.
    const sel = $('#regimenSelect');
    if (sel && !document.getElementById(STAR_ID)) {
      const star = el('button', 'dm-star', '☆ Marcar este esquema');
      star.id = STAR_ID;
      star.type = 'button';
      star.hidden = true;
      star.setAttribute('aria-pressed', 'false');
      sel.insertAdjacentElement('afterend', star);
      star.addEventListener('click', onEstrelaClick);
      // Troca de esquema no seletor → atualiza a estrela (convive com o HUB).
      sel.addEventListener('change', syncEstrela);
    }

    // Observadores: o HUB usa history.replaceState (que NÃO dispara
    // "hashchange"), então os MutationObservers são o caminho principal:
    //   - #workspaceView[hidden]  → abriu/fechou uma página de doença;
    //   - #workspaceTopic (texto) → trocou de doença com o workspace aberto;
    //   - #regimenSelect (filhos) → opções reconstruídas ao abrir doença.
    const obs = new MutationObserver(sync);
    obs.observe(ws, { attributes: true, attributeFilter: ['hidden'] });
    const wt = $('#workspaceTopic');
    if (wt) obs.observe(wt, { childList: true, characterData: true, subtree: true });
    if (sel) obs.observe(sel, { childList: true });
    window.addEventListener('hashchange', sync);

    sync(); // cobre o boot com deep-link (#<id> já na URL)
    return true;
  }

  function iniciar() {
    if (montar()) return;
    // Defesa: se o HUB ainda não montou o DOM, tenta de novo no load.
    window.addEventListener('load', montar, { once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
