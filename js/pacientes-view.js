/* pacientes-view.js — Pacientes e atendimentos como VIEW INTERNA do hub (1 página, 1 identidade).
   LINHAGEM: transplante do <script> inline de pacientes.html (autor original: codex, casa Orquestrador),
   adaptado por kimi em 30/08/2026 (contrato F4' — pacientes/atendimento como views):
   - raiz escopada em #patientsView (const $ = s => VIEW.querySelector(s)), padrão js/guias-view.js;
   - boot preguiçoso e fail-closed NA VIEW (erro trava só a view, jamais o hub);
   - navegação SAI por callback window.HubNav (nunca por URL): openTopic / openPatients / openEncounter;
   - tópicos lidos do catálogo soberano do hub (#catalogData) — js/topicos.js NÃO é carregado aqui;
   - aba "Dossiê do Orquestrador" removida (o dossiê já vive no hub — index-f2.html:258);
   - "Repetir esta receita" (data-f2x="repetir") NÃO é wireado aqui: quem trata é o listener
     document-level de js/Orquestrador-extra.js:675-690, já carregado pelo hub — igual ao doador;
   - listeners globais (document/window): NENHUM — todos os listeners são em elementos da view.
   Código da casa — MIT. */
(() => {
  'use strict';

  const VIEW = document.getElementById('patientsView');
  if (!VIEW) { console.warn('PacientesView: <main id="patientsView"> não encontrada — módulo não registrado (o hub segue normal).'); return; }
  const $ = s => VIEW.querySelector(s);

  const DB = window.F2DB;
  let aberto = null;  // id do paciente com ficha aberta
  let booted = false;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function avisar(msg) {
    let t = document.querySelector('#f2Toast');
    if (!t) { t = document.createElement('div'); t.id = 'f2Toast'; t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#172033;color:#fff;padding:12px 20px;border-radius:12px;font-size:1rem;z-index:99;max-width:90vw;text-align:center;'; document.body.appendChild(t); }
    t.textContent = msg; t.style.display = 'block'; clearTimeout(t._timer); t._timer = setTimeout(() => { t.style.display = 'none'; }, 2800);
  }
  function confirmar(titulo, texto, rotulo, aoConfirmar) {
    const fundo = document.createElement('div'); fundo.className = 'f2-modal-fundo';
    fundo.innerHTML = '<div class="f2-modal" role="dialog" aria-modal="true"><h2>' + esc(titulo) + '</h2><p>' + esc(texto) + '</p><div class="f2-form-acoes"><button type="button" class="f2-btn f2-btn-secundario" data-a="v">Voltar</button><button type="button" class="f2-btn f2-btn-perigo" data-a="c">' + esc(rotulo) + '</button></div></div>';
    fundo.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b || b.dataset.a === 'v' || e.target === fundo) { fundo.remove(); return; } fundo.remove(); aoConfirmar(); });
    document.body.appendChild(fundo);
  }

  /* Tópicos (doenças): lidos do catálogo soberano do hub. O js/topicos.js do doador
     NÃO é carregado no hub — no hub a verdade é o JSON inline #catalogData
     (index-f2.html:372). Mapeamos só id/titulo/categoria (contrato F4'). */
  function topicos() {
    try {
      const el = document.querySelector('#catalogData');
      if (!el) return [];
      const bruto = JSON.parse(el.textContent);
      return (Array.isArray(bruto) ? bruto : []).map(t => ({ id: t.id, titulo: t.titulo, categoria: t.categoria }));
    } catch (e) { console.error('PacientesView: catálogo #catalogData ilegível', e); return []; }
  }

  /* Navegação SAI por callback, nunca por URL (o HubNav é fornecido na costura).
     Se ausente: no-op com console.warn — a view continua íntegra. */
  function nav(acao, arg) {
    const h = window.HubNav;
    if (h && typeof h[acao] === 'function') { h[acao](arg); return true; }
    console.warn('PacientesView: window.HubNav.' + acao + ' indisponível — navegação ignorada.');
    return false;
  }

  // ---------------- Lista ----------------
  function renderLista() {
    const q = $('#inpBusca').value;
    const lista = DB.patients.procurar(q).slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const alvo = $('#listaPacientes');
    if (lista.length === 0) {
      alvo.innerHTML = '<div class="f2-vazio">' + (q ? 'Nenhum paciente encontrado com esse nome.' :
        'Nenhum paciente cadastrado ainda.<br>Toque em <strong>＋ Novo paciente</strong> para começar — basta o nome.') + '</div>';
    } else {
      alvo.innerHTML = lista.map(p => {
        const n = DB.consults.doPaciente(p.id).length;
        return '<div class="f2-linha-pac"><span class="f2-nome">' + esc(p.nome) + '</span>' +
          '<span class="f2-detalhe">' + DB.plural(n, 'atendimento') + (p.nascimento ? ' · Nasc.: ' + esc(DB.dataBR(p.nascimento)) : '') + '</span>' +
          '<button type="button" class="f2-btn f2-btn-secundario" data-abrir="' + esc(p.id) + '">Abrir ficha</button></div>';
      }).join('');
    }
    const ultima = DB.meta.ultimaExportacao();
    $('#infoStorage').innerHTML = 'Guardado <strong>neste computador, neste navegador</strong>. Nada vai para a internet' +
      (ultima ? ' · última cópia exportada em ' + esc(new Date(ultima).toLocaleDateString('pt-BR')) : ' · nenhuma cópia exportada ainda');
  }

  // ---------------- Ficha + linha do tempo ----------------
  function abrirFicha(id) {
    const p = DB.patients.buscar(id);
    if (!p) return;
    aberto = id;
    $('#cardLista').hidden = true; $('#ficha').hidden = false;
    $('#fichaNome').textContent = p.nome;
    $('#fichaDetalhe').textContent = [p.nascimento ? 'Nasc.: ' + p.nascimento : '', p.cns ? 'CNS: ' + p.cns : ''].filter(Boolean).join(' · ') || 'Sem dados complementares';
    // Doador montava href="atendimento.html?p=<id>" (pacientes.html:182) — aqui a
    // navegação sai por HubNav no clique (ver wire()).
    renderTimeline();
    window.scrollTo(0, 0);
  }
  function renderTimeline() {
    const lista = DB.consults.doPaciente(aberto);
    const alvo = $('#timeline');
    if (lista.length === 0) {
      alvo.innerHTML = '<div class="f2-vazio">Nenhum atendimento registrado para este paciente ainda.</div>';
      return;
    }
    const T = topicos();
    alvo.innerHTML = lista.map(c => {
      const data = new Date(c.datetime).toLocaleString('pt-BR');
      // F-G: idade visível em cada entrada ("há 2 meses").
      const idade = DB.idadeTexto ? DB.idadeTexto(c.datetime) : '';
      const carimboIdade = idade ? ' <span class="f2-atd-idade">(' + esc(idade) + ')</span>' : '';
      const chips = (c.topicIds || []).map(id => {
        const t = T.find(x => x.id === id);
        // O chip abre o hub já na doença. Doador: <a href="index-f2.html#id"> (pacientes.html:201).
        // Aqui: botão — o clique sai por HubNav.openTopic (ver wire()).
        return '<button type="button" class="f2-chip" data-topico="' + esc(id) + '">' + esc(t ? t.titulo : id) + '</button>';
      }).join('');
      if (c.kind === 'receita' && c.receita) {
        // F-G: entrada de RECEITA — selo, trecho e "Repetir esta receita".
        // O clique NÃO é wireado nesta view: quem trata é a delegação document-level
        // de js/Orquestrador-extra.js:675-690 (mesmo arranjo do doador).
        const trechoRec = (c.receita.titulo || c.receita.corpo || '').slice(0, 140);
        return '<div class="f2-tl-item f2-tl-receita"><div class="f2-tl-data">' + esc(data) + carimboIdade + '</div>' +
          '<div style="margin:6px 0"><span class="f2-selo-receita">Receita · ' + esc(rotuloTipoDoc(c.receita.tipo)) + '</span></div>' +
          (trechoRec ? '<div class="f2-tl-trecho">' + esc(trechoRec) + (trechoRec.length >= 140 ? '…' : '') + '</div>' : '') +
          (chips ? '<div class="f2-chips">' + chips + '</div>' : '') +
          '<div class="f2-form-acoes" style="margin-top:8px"><button type="button" class="f2-btn f2-btn-primario" data-f2x="repetir" data-id="' + esc(c.id) + '">Repetir esta receita</button></div></div>';
      }
      const trecho = (c.s || c.p || '').slice(0, 140);
      return '<div class="f2-tl-item"><div class="f2-tl-data">' + esc(data) + carimboIdade + '</div>' +
        (trecho ? '<div class="f2-tl-trecho">' + esc(trecho) + '…</div>' : '') +
        (chips ? '<div class="f2-chips">' + chips + '</div>' : '') +
        // Doador: <a href="atendimento.html#c=<id>"> (pacientes.html:217) — aqui: botão,
        // o clique sai por HubNav.openEncounter({consultId}) (ver wire()).
        '<div class="f2-form-acoes" style="margin-top:8px"><button type="button" class="f2-btn f2-btn-secundario" data-consult="' + esc(c.id) + '">Ver / editar</button></div></div>';
    }).join('');
  }
  function rotuloTipoDoc(tipo) {
    return { simples: 'Receituário simples', especial: 'Controle especial', orientacao: 'Orientação', livre: 'Livre' }[tipo] || 'Receituário simples';
  }

  // ---------------- Exportar / Importar / Apagar tudo ----------------
  function baixar(nome, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    DB.meta.marcar('lastExportAt', new Date().toISOString());
  }

  // ---------------- Wiring (todos os listeners em elementos DA VIEW) ----------------
  function wire() {
    $('#inpBusca').addEventListener('input', renderLista);
    $('#listaPacientes').addEventListener('click', e => {
      const b = e.target.closest('[data-abrir]');
      if (b) abrirFicha(b.dataset.abrir);
    });

    // ---------------- Novo paciente ----------------
    $('#btnNovo').onclick = () => { $('#formNovo').hidden = false; $('#novoNome').focus(); };
    $('#btnCancelarNovo').onclick = () => { $('#formNovo').hidden = true; };
    $('#btnSalvarNovo').onclick = () => {
      try {
        const p = DB.patients.criar({ nome: $('#novoNome').value, nascimento: $('#novoNasc').value, cns: $('#novoCns').value });
        $('#formNovo').hidden = true; $('#novoNome').value = ''; $('#novoNasc').value = ''; $('#novoCns').value = '';
        avisar('Paciente cadastrado.'); renderLista(); abrirFicha(p.id);
      } catch (e) { $('#erroNovo').textContent = e.message; }
    };

    // Timeline: chips de doença e "Ver / editar" saem por HubNav.
    // ("Repetir esta receita" — data-f2x="repetir" — fica com js/Orquestrador-extra.js.)
    $('#timeline').addEventListener('click', e => {
      const t = e.target.closest('[data-topico]');
      if (t) { nav('openTopic', t.dataset.topico); return; }
      const c = e.target.closest('[data-consult]');
      if (c) { nav('openEncounter', { consultId: c.dataset.consult }); }
    });

    // Novo atendimento DESTE paciente (doador montava href p/ atendimento.html?p=<id>).
    $('#btnNovoAtendimento').addEventListener('click', () => {
      if (aberto) nav('openEncounter', { patientId: aberto });
    });

    $('#btnVoltarLista').onclick = () => { aberto = null; $('#ficha').hidden = true; $('#cardLista').hidden = false; renderLista(); };

    $('#btnEditarPac').onclick = () => {
      const p = DB.patients.buscar(aberto); if (!p) return;
      $('#edNome').value = p.nome; $('#edNasc').value = p.nascimento || ''; $('#edCns').value = p.cns || '';
      $('#formEditar').hidden = false; $('#edNome').focus();
    };
    $('#btnCancelarEdicao').onclick = () => { $('#formEditar').hidden = true; };
    $('#btnSalvarEdicao').onclick = () => {
      const nome = $('#edNome').value.trim();
      if (!nome) { $('#erroEditar').textContent = 'O nome do paciente é obrigatório.'; return; }
      DB.patients.atualizar(aberto, { nome, nascimento: $('#edNasc').value, cns: $('#edCns').value });
      $('#formEditar').hidden = true; avisar('Dados atualizados.'); abrirFicha(aberto);
    };

    // Apagar paciente: 2 gestos, cascata declarada (leva os atendimentos junto).
    $('#btnApagarPac').onclick = () => {
      const p = DB.patients.buscar(aberto); if (!p) return;
      const n = DB.consults.doPaciente(aberto).length;
      confirmar('Apagar este paciente?',
        '"' + p.nome + '" e ' + DB.plural(n, 'atendimento') + ' dele serão apagados deste computador. Esta ação não pode ser desfeita.',
        'Apagar paciente e atendimentos', () => {
          DB.patients.apagar(aberto); aberto = null; avisar('Paciente apagado.');
          $('#ficha').hidden = true; $('#cardLista').hidden = false; renderLista();
        });
    };

    $('#btnExportar').onclick = () => {
      baixar(DB.nomeArquivoPacientes(), DB.exportarPacientes());
      avisar('Cópia baixada. Guarde com cuidado: contém dados de pacientes.');
      renderLista();
    };
    $('#btnImportar').onclick = () => $('#inpArquivo').click();
    $('#inpArquivo').addEventListener('change', e => {
      const arq = e.target.files && e.target.files[0];
      if (!arq) return;
      const leitor = new FileReader();
      leitor.onload = () => {
        try {
          const obj = JSON.parse(String(leitor.result));
          const r = DB.importarPacientes(obj); // valida ANTES de gravar
          avisar(DB.plural(r.pacientes, 'paciente') + ' e ' + DB.plural(r.atendimentos, 'atendimento') + ' importados.');
          aberto = null; $('#ficha').hidden = true; $('#cardLista').hidden = false; renderLista();
        } catch (err) { avisar(err.message || 'Arquivo inválido. Nada foi alterado.'); }
        e.target.value = '';
      };
      leitor.onerror = () => avisar('Não consegui ler o arquivo. Nada foi alterado.');
      leitor.readAsText(arq);
    });
    $('#btnApagarTudo').onclick = () => {
      confirmar('Apagar TUDO?', 'Todos os pacientes e atendimentos deste navegador serão apagados. Exporte uma cópia antes, se precisar. Esta ação não pode ser desfeita.',
        'Apagar tudo', () => {
          DB.apagarTudo(); aberto = null; avisar('Tudo apagado deste navegador.');
          $('#ficha').hidden = true; $('#cardLista').hidden = false; renderLista();
        });
    };

    // Aviso de primeira abertura (fica marcado; não volta a incomodar)
    if (!DB.meta.ler().avisoPrivacidadeVisto) $('#avisoPrivacidade').hidden = false;
    $('#btnAvisoOk').onclick = () => { DB.meta.marcar('avisoPrivacidadeVisto', true); $('#avisoPrivacidade').hidden = true; };
  }

  /* boot preguiçoso e fail-closed NA VIEW: erro trava só a view Pacientes, jamais o hub */
  function boot() {
    if (booted) return true;
    if (!DB) {
      VIEW.innerHTML = '<div class="empty-state" role="alert" style="padding:60px 20px"><h2>Pacientes indisponível</h2><p>A camada de dados (js/dados.js) não carregou — não use este módulo neste atendimento. O restante do hub segue normal.</p></div>';
      return false;
    }
    try {
      wire();
      renderLista();
      // F-G: se o boot do módulo extra removeu entradas com mais de 3 meses, avisa (honesto).
      if (window.F2X && F2X.ultimoExpurgo && F2X.ultimoExpurgo() > 0) {
        avisar('Limpeza automática: ' + DB.plural(F2X.ultimoExpurgo(), 'registro') + ' com mais de 3 meses ' + (F2X.ultimoExpurgo() === 1 ? 'foi removido' : 'foram removidos') + ' do histórico.');
      }
      booted = true; return true;
    } catch (error) {
      VIEW.innerHTML = '<div class="empty-state" role="alert" style="padding:60px 20px"><h2>Pacientes indisponível</h2><p>Falha de integridade — não use este módulo neste atendimento. O restante do hub segue normal.</p><pre style="text-align:left;white-space:pre-wrap">' + esc(error.message) + '</pre></div>';
      return false;
    }
  }

  window.PacientesView = Object.freeze({
    boot,
    // Abre a view; com patientId, já abre na ficha dele (substitui o deep-link
    // pacientes.html#p=<id> do doador — pacientes.html:316-320).
    open(patientId) {
      if (!boot()) return false;
      if (patientId && DB.patients.buscar(patientId)) { abrirFicha(patientId); }
      else { aberto = null; $('#ficha').hidden = true; $('#cardLista').hidden = false; renderLista(); window.scrollTo(0, 0); }
      return true;
    },
  });
})();
