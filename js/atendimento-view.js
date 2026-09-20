/* atendimento-view.js — Atendimento (nota SOAP) como VIEW INTERNA do hub (1 página, 1 identidade).
   LINHAGEM: transplante do <script> inline de atendimento.html (autor original: codex, casa Orquestrador),
   adaptado por kimi em 30/08/2026 (contrato F4' — pacientes/atendimento como views):
   - raiz escopada em #encounterView (const $ = s => VIEW.querySelector(s)), padrão js/guias-view.js;
   - boot preguiçoso e fail-closed NA VIEW (erro trava só a view, jamais o hub);
   - navegação SAI por callback window.HubNav (nunca por URL);
   - tópicos lidos do catálogo soberano do hub (#catalogData) — js/topicos.js NÃO é carregado aqui;
   - impressão roteada ao #printPortal do hub (f2.css:251) com a bandeira window.__printDelegado
     para o hub ceder o beforeprint/afterprint (index-f2.html:618) — a folha NÃO pode ficar solta
     na view, porque o CSS de impressão do hub esconde todo body>* menos o portal (index-f2.html:190-191);
   - listeners globais (document/window) SÓ com guarda if(VIEW.hidden)return;
   - peso decimal pt-BR preservado: #triPeso segue type="text" inputmode="decimal" e o IMC aceita
     vírgula (atendimento.html:85 e :171);
   - reabertura da view: carregarNovo() limpa SOAP/CPF/chips — no doador cada abertura era uma
     página nova; na view reutilizada isso vira limpeza explícita.
   Código da casa — MIT. */
(() => {
  'use strict';

  const VIEW = document.getElementById('encounterView');
  if (!VIEW) { console.warn('AtendimentoView: <main id="encounterView"> não encontrada — módulo não registrado (o hub segue normal).'); return; }
  const $ = s => VIEW.querySelector(s);

  const DB = window.F2DB;

  let atendimentoId = null;   // null = novo; preenchido = editando
  let doencasSel = [];        // ids dos tópicos vinculados
  let cidsSel = [];           // CIDs confirmados pela médica neste atendimento
  let sujo = false;           // guarda de rascunho
  // Mesmo oculta, a view conserva o rascunho em memória e bloqueia a atualização.
  window.OrqPWA?.registerGuard('atendimento', () => !sujo && (!booted || $('#novoPacForm').hidden));
  let booted = false;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function avisar(msg) {
    let t = document.querySelector('#f2Toast');
    if (!t) { t = document.createElement('div'); t.id = 'f2Toast'; t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#172033;color:#fff;padding:12px 20px;border-radius:12px;font-size:1rem;z-index:99;max-width:90vw;text-align:center;'; document.body.appendChild(t); }
    t.textContent = msg; t.style.display = 'block'; clearTimeout(t._timer); t._timer = setTimeout(() => { t.style.display = 'none'; }, 2600);
  }
  function confirmar(titulo, texto, rotulo, aoConfirmar) {
    const fundo = document.createElement('div'); fundo.className = 'f2-modal-fundo';
    fundo.innerHTML = '<div class="f2-modal" role="dialog" aria-modal="true"><h2>' + esc(titulo) + '</h2><p>' + esc(texto) + '</p><div class="f2-form-acoes"><button type="button" class="f2-btn f2-btn-secundario" data-a="v">Voltar</button><button type="button" class="f2-btn f2-btn-perigo" data-a="c">' + esc(rotulo) + '</button></div></div>';
    fundo.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b || b.dataset.a === 'v' || e.target === fundo) { fundo.remove(); return; } fundo.remove(); aoConfirmar(); });
    document.body.appendChild(fundo);
  }
  function marcarSujo() { sujo = true; }

  /* Tópicos (doenças): lidos do catálogo soberano do hub (#catalogData,
     index-f2.html:372) — js/topicos.js NÃO é carregado no hub. Só id/titulo/categoria. */
  function topicos() {
    try {
      const el = document.querySelector('#catalogData');
      if (!el) return [];
      const bruto = JSON.parse(el.textContent);
      return (Array.isArray(bruto) ? bruto : []).map(t => ({ id: t.id, titulo: t.titulo, categoria: t.categoria }));
    } catch (e) { console.error('AtendimentoView: catálogo #catalogData ilegível', e); return []; }
  }

  /* Navegação SAI por callback, nunca por URL (o HubNav é fornecido na costura).
     Se ausente: no-op com console.warn — a view continua íntegra. */
  function nav(acao, arg) {
    const h = window.HubNav;
    if (h && typeof h[acao] === 'function') { h[acao](arg); return true; }
    console.warn('AtendimentoView: window.HubNav.' + acao + ' indisponível — navegação ignorada.');
    return false;
  }

  // ---------------- Paciente ----------------
  function recarregarPacientes(selecionarId) {
    const sel = $('#selPaciente');
    sel.innerHTML = '<option value="">— Escolha o paciente —</option>' +
      DB.patients.listar().slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        .map(p => '<option value="' + esc(p.id) + '">' + esc(p.nome) + '</option>').join('');
    if (selecionarId) sel.value = selecionarId;
  }

  function chaveCid(cid) { return DB.norm((cid && cid.codigo) || '') || DB.norm((cid && cid.rotulo) || ''); }
  function unirCids() {
    const mapa = new Map();
    for (const cid of arguments) {
      for (const item of (Array.isArray(cid) ? cid : [])) {
        const normal = { codigo: String(item && item.codigo || '').trim(), rotulo: String(item && item.rotulo || '').trim() };
        const chave = chaveCid(normal); if (chave && !mapa.has(chave)) mapa.set(chave, normal);
      }
    }
    return [...mapa.values()];
  }
  function classificarImc(imc) { return imc < 18.5 ? 'baixo peso' : imc < 25 ? 'eutrofia' : imc < 30 ? 'sobrepeso' : 'obesidade'; }
  function recalcularImc() {
    const peso = parseFloat(String($('#triPeso').value).replace(',', '.'));
    const altura = parseFloat(String($('#triAltura').value).replace(',', '.'));
    if (isFinite(peso) && peso > 0 && isFinite(altura) && altura > 0) { const imc = peso / Math.pow(altura / 100, 2); $('#triImc').value = imc.toFixed(1).replace('.', ','); $('#triImcClasse').textContent = classificarImc(imc); }
    else { $('#triImc').value = ''; $('#triImcClasse').textContent = ''; }
  }
  function limparTriagem() {
    ['#triPeso', '#triAltura', '#triImc', '#triCirc', '#triGlic', '#triPA', '#triOxi'].forEach(id => { $(id).value = ''; });
    $('#triImcClasse').textContent = ''; $('#avisoTriagemAnterior').hidden = true;
  }
  function aplicarTriagem(triagem, anterior) {
    limparTriagem();
    if (!triagem) return;
    const mapa = { triPeso: 'peso', triAltura: 'altura', triImc: 'imc', triCirc: 'circAbdominal', triGlic: 'glicemia', triPA: 'pa', triOxi: 'oximetria' };
    Object.entries(mapa).forEach(([id, campo]) => { $('#' + id).value = triagem[campo] || ''; });
    if (!$('#triImc').value) recalcularImc();
    else { const imc = parseFloat(String($('#triImc').value).replace(',', '.')); $('#triImcClasse').textContent = isFinite(imc) ? classificarImc(imc) : ''; }
    $('#avisoTriagemAnterior').hidden = !anterior;
  }
  function ultimaTriagem(patientId) {
    return DB.consults.doPaciente(patientId).find(c => c && c.kind !== 'receita' && c.triagem && Object.values(c.triagem).some(v => String(v || '').trim())) || null;
  }
  function triagemDigitada() {
    return ['#triPeso', '#triAltura', '#triCirc', '#triGlic', '#triPA', '#triOxi'].some(id => String($(id).value || '').trim());
  }
  function cidsDosTopicos() {
    const por = (window.CIDS_COMPATIVEIS && window.CIDS_COMPATIVEIS.porTopico) || {};
    return doencasSel.flatMap(id => (por[id] || []).map(par => ({ codigo: par[0], rotulo: par[1] })));
  }
  function renderCidSugestoes() {
    const p = DB.patients.buscar($('#selPaciente').value);
    const salvos = p && Array.isArray(p.cids) ? p.cids : [];
    const todos = unirCids(salvos, cidsDosTopicos());
    const alvo = $('#cidSugestoes');
    if (!todos.length) { alvo.innerHTML = '<p class="f2-cids-nota">Nenhuma sugestão disponível. A avaliação continua livre para digitação.</p>'; return; }
    alvo.innerHTML = '<ul class="f2-cids-lista">' + todos.map(cid => {
      const chave = chaveCid(cid), on = cidsSel.some(x => chaveCid(x) === chave);
      return '<li><button type="button" class="f2-cid" data-cid-key="' + esc(chave) + '" data-codigo="' + esc(cid.codigo) + '" data-rotulo="' + esc(cid.rotulo) + '" aria-pressed="' + on + '"' + (on ? ' style="background:#FFF8E1;border-color:#F9A825"' : '') + '><strong>' + esc(cid.codigo) + '</strong> ' + esc(cid.rotulo) + '</button></li>';
    }).join('') + '</ul>';
  }
  function selecionarPaciente(id, opcoes) {
    const cfg = opcoes || {}; const p = DB.patients.buscar(id);
    $('#selPaciente').value = p ? p.id : ''; $('#fichaPaciente').hidden = !p;
    $('#buscaPaciente').value = p ? p.nome : ''; $('#inpCpf').value = p ? (p.cpf || '') : '';
    cidsSel = []; renderCidSugestoes();
    if (cfg.triagem) aplicarTriagem(cfg.triagem, false);
    else if (triagemDigitada()) { /* triagem digitada pela médica não se apaga na troca de paciente */ }
    else if (cfg.usarUltima && p) { const ultima = ultimaTriagem(p.id); aplicarTriagem(ultima && ultima.triagem, true); }
    else limparTriagem();
    $('#resPaciente').hidden = true; $('#buscaPaciente').setAttribute('aria-expanded', 'false');
    if (!cfg.silencioso) marcarSujo();
  }

  // ---------------- Doenças (chips + busca) ----------------
  function renderChips() {
    const T = topicos();
    $('#chipsDoenca').innerHTML = doencasSel.map(id => {
      const t = T.find(x => x.id === id);
      return '<span class="f2-chip">' + esc(t ? t.titulo : id) + ' <a href="#" class="f2-chip f2-chip-x" data-x="' + esc(id) + '" style="padding:2px 8px;margin-left:4px">×</a></span>';
    }).join('');
  }

  // ---------------- Data/hora: preenche com "agora" ----------------
  function agoraLocal() {
    const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }

  // ---------------- Abrir: NOVO (era o ramo ?p= do doador) ----------------
  function carregarNovo(opcoes) {
    const cfg = opcoes || {};
    atendimentoId = null; doencasSel = []; cidsSel = [];
    $('#tituloPagina').textContent = 'Novo atendimento';
    $('#btnApagar').hidden = true;
    // A view é reutilizada (não há reload entre atendimentos): limpa o que o
    // doador ganhava "de graça" numa página nova.
    ['#txS', '#txO', '#txA', '#txP'].forEach(id => { $(id).value = ''; });
    $('#inpCpf').value = ''; $('#buscaPaciente').value = '';
    $('#resPaciente').hidden = true; $('#resDoenca').hidden = true; $('#inpDoenca').value = '';
    recarregarPacientes(cfg.patientId || null);
    $('#inpData').value = agoraLocal();
    if (cfg.patientId) { selecionarPaciente(cfg.patientId, { usarUltima: true, silencioso: true }); }
    else { limparTriagem(); renderCidSugestoes(); }
    // topicIds: pré-vincula doenças (ex.: hub abre atendimento já na doença aberta).
    if (Array.isArray(cfg.topicIds) && cfg.topicIds.length) {
      const validos = topicos().map(t => t.id);
      doencasSel = cfg.topicIds.filter(id => validos.includes(id));
      renderChips(); renderCidSugestoes();
    }
    sujo = false;
  }

  // ---------------- Abrir para editar (era o ramo #c=<id> do doador) ----------------
  function carregarEdicao(consultId) {
    const c = DB.consults.buscar(consultId);
    if (!c) return false;
    atendimentoId = c.id;
    $('#tituloPagina').textContent = 'Atendimento de ' + ((DB.patients.buscar(c.patientId) || {}).nome || '');
    recarregarPacientes(c.patientId);
    $('#inpData').value = (c.datetime || '').slice(0, 16);
    doencasSel = Array.isArray(c.topicIds) ? c.topicIds.slice() : [];
    selecionarPaciente(c.patientId, { triagem: c.triagem, silencioso: true });
    $('#txS').value = c.s || ''; $('#txO').value = c.o || ''; $('#txA').value = c.a || ''; $('#txP').value = c.p || '';
    $('#btnApagar').hidden = false;
    renderChips(); sujo = false; return true;
  }

  // ---------------- Salvar (fail-closed: sem paciente, não salva) ----------------
  function salvar() {
    const pid = $('#selPaciente').value;
    if (!pid) { avisar('Escolha o paciente antes de salvar.'); $('#selPaciente').focus(); return; }
    const triagem = { peso: $('#triPeso').value, altura: $('#triAltura').value, imc: $('#triImc').value, circAbdominal: $('#triCirc').value, glicemia: $('#triGlic').value, pa: $('#triPA').value, oximetria: $('#triOxi').value };
    const dados = { patientId: pid, datetime: $('#inpData').value ? new Date($('#inpData').value).toISOString() : new Date().toISOString(),
      topicIds: doencasSel.slice(), s: $('#txS').value, o: $('#txO').value, a: $('#txA').value, p: $('#txP').value, triagem };
    try {
      if (atendimentoId) { DB.consults.atualizar(atendimentoId, dados); }
      else { atendimentoId = DB.consults.criar(dados).id; $('#btnApagar').hidden = false; }
      const paciente = DB.patients.buscar(pid);
      DB.patients.atualizar(pid, { cpf: $('#inpCpf').value, cids: unirCids(paciente && paciente.cids, cidsSel) });
      sujo = false; avisar('Atendimento salvo.');
    } catch (e) { avisar(e.message || 'Não consegui salvar.'); }
  }

  // ---------------- Imprimir: 1 folha A4, com aviso se exceder ----------------
  function montarFolha() {
    const pac = DB.patients.buscar($('#selPaciente').value);
    const data = $('#inpData').value ? new Date($('#inpData').value) : new Date();
    const T = topicos();
    const doencas = doencasSel.map(id => { const t = T.find(x => x.id === id); return t ? t.titulo : id; });
    const bloco = (cls, letra, nome, cor, texto) =>
      '<div class="f2-print-soap-bloco ' + cls + '" style="background:' + cor.bg + ';border-color:' + cor.fg + '">' +
      '<h2 style="color:' + cor.fg + '">' + letra + ' — ' + nome + '</h2>' +
      '<div class="f2-print-texto">' + esc(texto || '') + '</div></div>';
    $('#folha').innerHTML =
      '<div class="f2-print-head"><h1>Nota de atendimento (SOAP)</h1>' +
      '<p><strong>Paciente:</strong> ' + esc(pac ? pac.nome : '—') + (pac && pac.nascimento ? ' · Nasc.: ' + esc(pac.nascimento) : '') + (pac && pac.cns ? ' · CNS: ' + esc(pac.cns) : '') +
      ' · <strong>Data:</strong> ' + esc(data.toLocaleString('pt-BR')) + '</p>' +
      (doencas.length ? '<p><strong>Doenças:</strong> ' + esc(doencas.join(' · ')) + '</p>' : '') + '</div>' +
      bloco('f2-soap-s', 'S', 'Subjetivo', { bg: '#FCE4EC', fg: '#AD1457' }, $('#txS').value) +
      bloco('f2-soap-o', 'O', 'Objetivo', { bg: '#E3F2FD', fg: '#1565C0' }, $('#txO').value) +
      bloco('f2-soap-a', 'A', 'Avaliação', { bg: '#FFF8E1', fg: '#F9A825' }, $('#txA').value) +
      bloco('f2-soap-p', 'P', 'Plano', { bg: '#E8F5E9', fg: '#2E7D32' }, $('#txP').value) +
      '<div class="f2-print-assinatura"><div class="f2-linha-ass"></div>Assinatura e carimbo</div>' +
      '<div class="f2-print-rodape"><span>Hub de Receituários UBS 2026 — nota SOAP</span><span>Documento gerado neste computador</span></div>';
  }

  /* No hub, o print CSS esconde todo body>* exceto #printPortal (index-f2.html:190-191),
     e é o portal quem exibe a folha F2 (f2.css:251). A bandeira window.__printDelegado
     faz o hub ceder seus beforeprint/afterprint (index-f2.html:618) a este módulo. */
  function dispararImpressao() {
    const portal = document.querySelector('#printPortal');
    if (!portal) {
      console.warn('AtendimentoView: #printPortal não encontrado — impressão abortada para não vazar a interface do hub.');
      avisar('Impressão indisponível nesta tela.');
      return;
    }
    portal.innerHTML = $('#folha').outerHTML;
    portal.dataset.mode = 'orientation';
    const estiloPagina = document.querySelector('#dynamicPageStyle');
    if (estiloPagina) estiloPagina.textContent = '@media print{@page{size:A4 portrait;margin:0}}';
    window.__printDelegado = true;
    const limpar = () => { window.__printDelegado = false; portal.innerHTML = ''; window.removeEventListener('afterprint', limpar); };
    window.addEventListener('afterprint', limpar);
    setTimeout(() => window.print(), 30);
  }
  function imprimir() {
    montarFolha();
    // Mede o OVERFLOW de conteúdo (a folha tem min-height de 1 A4: medir a
    // folha em si mediria a régua, não o conteúdo).
    const folha = $('#folha');
    const estilo = folha.style.cssText;
    folha.style.cssText = 'display:block;position:absolute;left:-9999px;top:0;visibility:hidden;';
    const excedeu = folha.offsetHeight > Math.round(297 * 96 / 25.4) + 3; // 1 A4 em px + tolerância
    folha.style.cssText = estilo;
    if (excedeu) {
      confirmar('Este registro passa de 1 folha', 'Este registro vai usar mais de 1 folha A4. Resuma o texto ou confirme para imprimir assim mesmo.', 'Imprimir assim mesmo', dispararImpressao);
    } else { dispararImpressao(); }
  }

  // ---------------- Wiring (elementos da view; globais SÓ com guarda) ----------------
  function wire() {
    $('#buscaPaciente').addEventListener('input', e => {
      const q = e.target.value.trim(), res = $('#resPaciente');
      if (!q) { res.hidden = true; res.innerHTML = ''; e.target.setAttribute('aria-expanded', 'false'); return; }
      const achados = DB.patients.procurar(q).slice(0, 10);
      res.innerHTML = achados.map(p => '<button type="button" role="option" data-paciente="' + esc(p.id) + '"><strong>' + esc(p.nome) + '</strong>' + (p.cns ? ' <span class="f2-cat">· CNS ' + esc(p.cns) + '</span>' : '') + (p.cpf ? ' <span class="f2-cat">· CPF ' + esc(p.cpf) + '</span>' : '') + '</button>').join('') || '<button type="button" disabled>Nenhum paciente encontrado</button>';
      res.hidden = false; e.target.setAttribute('aria-expanded', 'true');
    });
    $('#resPaciente').addEventListener('click', e => { const b = e.target.closest('[data-paciente]'); if (b) selecionarPaciente(b.dataset.paciente, { usarUltima: true }); });
    $('#selPaciente').addEventListener('change', e => selecionarPaciente(e.target.value, { usarUltima: true }));
    // Fecha a busca de paciente ao clicar fora — GLOBAL, com guarda de view.
    document.addEventListener('click', e => {
      if (VIEW.hidden) return;
      if (!e.target.closest('#buscaPaciente') && !e.target.closest('#resPaciente')) { $('#resPaciente').hidden = true; $('#buscaPaciente').setAttribute('aria-expanded', 'false'); }
    });
    $('#triPeso').addEventListener('input', recalcularImc); $('#triAltura').addEventListener('input', recalcularImc);
    $('#cidSugestoes').addEventListener('click', e => {
      const b = e.target.closest('[data-cid-key]'); if (!b) return;
      const cid = { codigo: b.dataset.codigo, rotulo: b.dataset.rotulo }, chave = b.dataset.cidKey;
      const i = cidsSel.findIndex(x => chaveCid(x) === chave);
      if (i >= 0) cidsSel.splice(i, 1); else {
        cidsSel.push(cid);
        const linha = 'CID-10: ' + cid.codigo + ' — ' + cid.rotulo;
        if (!$('#txA').value.includes(linha)) $('#txA').value = $('#txA').value.trim() ? $('#txA').value.replace(/\s+$/, '') + '\n' + linha : linha;
      }
      renderCidSugestoes(); marcarSujo();
    });

    $('#btnNovoPac').onclick = () => { $('#novoPacForm').hidden = false; $('#npNome').focus(); };
    $('#npCancelar').onclick = () => { $('#novoPacForm').hidden = true; };
    $('#npSalvar').onclick = () => {
      try {
        const p = DB.patients.criar({ nome: $('#npNome').value, nascimento: $('#npNasc').value, cns: $('#npCns').value, cpf: $('#npCpf').value });
        $('#novoPacForm').hidden = true; $('#npNome').value = ''; $('#npNasc').value = ''; $('#npCns').value = ''; $('#npCpf').value = ''; $('#npErro').textContent = '';
        recarregarPacientes(p.id); selecionarPaciente(p.id, { usarUltima: true }); avisar('Paciente cadastrado.');
      } catch (e) { $('#npErro').textContent = e.message; }
    };

    $('#chipsDoenca').addEventListener('click', e => {
      const x = e.target.closest('[data-x]');
      if (!x) return;
      e.preventDefault();
      doencasSel = doencasSel.filter(id => id !== x.dataset.x);
      renderChips(); renderCidSugestoes(); marcarSujo();
    });
    $('#inpDoenca').addEventListener('input', e => {
      const q = DB.norm(e.target.value);
      const res = $('#resDoenca');
      if (!q) { res.hidden = true; res.innerHTML = ''; return; }
      const achados = topicos().filter(t => DB.norm(t.titulo).includes(q) || DB.norm(t.categoria).includes(q) || DB.norm(t.id).includes(q)).slice(0, 12);
      res.innerHTML = achados.map(t => '<button type="button" data-add="' + esc(t.id) + '">' + esc(t.titulo) + ' <span class="f2-cat">· ' + esc(t.categoria) + '</span></button>').join('') || '<button type="button" disabled>Nada encontrado</button>';
      res.hidden = false;
    });
    $('#resDoenca').addEventListener('click', e => {
      const b = e.target.closest('[data-add]');
      if (!b) return;
      if (!doencasSel.includes(b.dataset.add)) { doencasSel.push(b.dataset.add); marcarSujo(); }
      renderChips(); renderCidSugestoes(); $('#inpDoenca').value = ''; $('#resDoenca').hidden = true; $('#inpDoenca').focus();
    });
    // Fecha a busca de doença ao clicar fora — GLOBAL, com guarda de view.
    document.addEventListener('click', e => {
      if (VIEW.hidden) return;
      if (!e.target.closest('#inpDoenca') && !e.target.closest('#resDoenca')) $('#resDoenca').hidden = true;
    });

    $('#btnSalvar').onclick = salvar;
    $('#btnSalvar2').onclick = salvar;

    $('#btnApagar').onclick = () => {
      confirmar('Apagar este atendimento?', 'O registro será apagado deste computador. Esta ação não pode ser desfeita.', 'Apagar', () => {
        DB.consults.apagar(atendimentoId); sujo = false;
        // Doador navegava para pacientes.html (atendimento.html:341) — aqui sai por HubNav.
        nav('openPatients');
      });
    };

    $('#btnImprimir').onclick = imprimir;

    // Guarda de rascunho (mesmo padrão do hub: avisa ao sair com texto não salvo).
    // GLOBAL, com guarda de view — e só marca se o input foi DENTRO da view.
    document.addEventListener('input', e => {
      if (VIEW.hidden) return;
      if (e.target.closest('textarea,input,select') && VIEW.contains(e.target)) marcarSujo();
    });
    window.addEventListener('beforeunload', e => {
      if (VIEW.hidden) return;
      if (sujo) { e.preventDefault(); e.returnValue = ''; }
    });
  }

  /* boot preguiçoso e fail-closed NA VIEW: erro trava só a view Atendimento, jamais o hub */
  function boot() {
    if (booted) return true;
    if (!DB) {
      VIEW.innerHTML = '<div class="empty-state" role="alert" style="padding:60px 20px"><h2>Atendimento indisponível</h2><p>A camada de dados (js/dados.js) não carregou — não use este módulo neste atendimento. O restante do hub segue normal.</p></div>';
      return false;
    }
    try {
      wire();
      booted = true; return true;
    } catch (error) {
      VIEW.innerHTML = '<div class="empty-state" role="alert" style="padding:60px 20px"><h2>Atendimento indisponível</h2><p>Falha de integridade — não use este módulo neste atendimento. O restante do hub segue normal.</p><pre style="text-align:left;white-space:pre-wrap">' + esc(error.message) + '</pre></div>';
      return false;
    }
  }

  window.AtendimentoView = Object.freeze({
    boot,
    // Substitui os pontos de entrada do doador: atendimento.html#c=<id> (edição)
    // e atendimento.html?p=<id> (novo com paciente). topicIds pré-vincula doenças.
    open(opts) {
      if (!boot()) return false;
      const cfg = opts || {};
      if (cfg.consultId) {
        if (!carregarEdicao(cfg.consultId)) { avisar('Atendimento não encontrado.'); return false; }
      } else {
        carregarNovo(cfg);
      }
      window.scrollTo(0, 0);
      return true;
    },
  });
})();
