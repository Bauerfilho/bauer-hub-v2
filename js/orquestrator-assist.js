/* orquestrator-assist.js — O ASSISTENTE UNIVERSAL ORQUESTRATOR (feature-coroa, ordem do dono 30/08 ~02h45).
   O selo ORQUESTRATOR da appbar vira botão: abre a gaveta universal de apoio à escrita clínica, adaptável
   ao contexto ativo (guia · documento institucional · doença · qualquer área de escrita):
   - Busca de CID (js/cids.js + catálogo) e de paciente por CPF/nome (F2DB) — resultados sempre "conferir";
   - NOTAS persistentes; FRASES FAVORITAS: "☆ Favoritar frase" DOURADO (captura seleção ou campo focado)
     e "Inserir" PRETO com a logo — insere no último campo de escrita focado.
   O hub NÃO decide conduta. Persistência aditiva: ubs2026.v1.meta.orqAssist (export/import intactos).
   Aqui começa a segunda parte da vida do dono: IA servindo a prática médica, sem cara de IA.
   Código da casa — MIT. */
(function (global, doc) {
  'use strict';

  const K = 'orqAssist';
  const db = () => global.F2DB || null;
  const esc = v => String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const fold = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  function estado() {
    const meta = db() && db().meta && db().meta.ler ? (db().meta.ler() || {}) : {};
    const e = meta[K] || {};
    return { notas: typeof e.notas === 'string' ? e.notas : '', frases: Array.isArray(e.frases) ? e.frases : [] };
  }
  function salvar(e) { if (db() && db().meta && typeof db().meta.marcar === 'function') db().meta.marcar(K, e); }

  /* último campo de escrita focado na página — é onde "Inserir" age */
  let alvo = null;
  doc.addEventListener('focusin', ev => {
    const el = ev.target;
    if (el.closest && el.closest('#orqAssist')) return;
    if (el.matches && el.matches('input[type="text"],input[type="search"],input:not([type]),textarea,[contenteditable]')) alvo = el;
  });

  function inserir(texto) {
    if (!alvo || !doc.contains(alvo)) { aviso('Toque antes no campo onde quer inserir.'); return; }
    alvo.focus();
    if (alvo.isContentEditable) {
      doc.execCommand('insertText', false, texto);
    } else {
      const i = alvo.selectionStart ?? alvo.value.length, f = alvo.selectionEnd ?? i;
      alvo.value = alvo.value.slice(0, i) + texto + alvo.value.slice(f);
      alvo.selectionStart = alvo.selectionEnd = i + texto.length;
      alvo.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
  function textoSelecionadoOuCampo() {
    const sel = String(doc.getSelection() || '').trim();
    if (sel) return sel;
    /* as notas do próprio assistente são fonte válida: escreveu a frase ali → favorita dali */
    const notas = painel && painel.querySelector('[data-orqa-notas]');
    if (notas && notas.value.trim() && (doc.activeElement === notas || !alvo)) {
      const i = notas.selectionStart, f = notas.selectionEnd;
      return (i !== f ? notas.value.slice(i, f) : notas.value).trim();
    }
    if (alvo && doc.contains(alvo)) return (alvo.isContentEditable ? alvo.textContent : alvo.value || '').trim();
    return '';
  }

  function contexto() {
    const vis = id => { const el = doc.getElementById(id); return el && !el.hidden; };
    if (doc.getElementById('orqGuiaHost')) return 'guia';           /* guia adotado no leitor da doença */
    if (doc.getElementById('orqDocHost')) return 'institucional';   /* documento da unidade no leitor */
    if (vis('documentsView')) return doc.getElementById('f1Host') && !doc.getElementById('f1Host').hidden ? 'institucional' : 'guia';
    if (vis('workspaceView')) return 'doenca';
    if (vis('patientsView')) return 'pacientes';
    if (vis('encounterView')) return 'atendimento';
    return 'hub';
  }
  const RÓTULO = { guia: 'Guia do paciente', institucional: 'Documento da unidade', doenca: 'Receita da doença', pacientes: 'Fichas de pacientes', atendimento: 'Atendimento SOAP', hub: 'Início' };

  function cidsTodos() {
    const por = (global.CIDS_COMPATIVEIS && global.CIDS_COMPATIVEIS.porTopico) || {};
    const mapa = new Map();
    for (const lista of Object.values(por)) for (const par of lista) if (!mapa.has(par[0])) mapa.set(par[0], par[1]);
    return [...mapa.entries()];
  }

  /* ═══ TODOS OS DOCUMENTOS — catálogo em gavetas (ordem do dono, 30/08: documentos SÓ no Orquestrator) ═══
     Unidade: derivada em runtime de F1Registro.todos() — nada hardcoded, doc novo entra sozinho ("Outros" se sem grupo).
     Guias/registros: espelho 1:1 do catálogo do js/guias-view.js (a fonte é lá; toda ação tem guard runtime). */
  const GAV_CORES = { gerais:'#2F6E62', cronicas:'#2B5BA8', alto:'#A93636', mental:'#6B4FA3', dispositivo:'#B08A3E', sintomas:'#D19A1F', ciclos:'#B04A6E' };
  const CAT_ROTULO = { gerais:'Gerais', cronicas:'Condições crônicas', alto:'Alto risco', mental:'Saúde mental e neurológica', dispositivo:'Uso por dispositivo', sintomas:'Sintomas e suporte', ciclos:'Ciclos de vida' };
  const REG_ROTULO = { alto:'Pressão arterial', cronicas:'Glicemia', gerais:'Organização' };
  const GUIAS = [
    ['routine','Rotina diária sem diagnóstico','gerais'],['temporary','Tratamento temporário','gerais'],['rescue','Medicamentos de resgate','gerais'],
    ['hypertension','Hipertensão arterial','cronicas'],['diabetes-no-insulin','Diabetes sem insulina','cronicas'],['dyslipidemia','Dislipidemia','cronicas'],['triple-care','Pressão + diabetes + colesterol','cronicas'],['kidney','Rins e doença renal','cronicas'],['heart','Coração','cronicas'],['thyroid','Tireoide','cronicas'],
    ['insulin','Esquema de insulinas','alto'],['anticoagulants','Anticoagulantes e antiagregantes','alto'],
    ['psychotropics','Psicotrópicos','mental'],['neurology','Medicamentos neurológicos','mental'],
    ['respiratory','Asma, DPOC e inaladores','dispositivo'],['local-use','Pele, olhos, ouvidos e nariz','dispositivo'],
    ['pain','Dor aguda ou crônica','sintomas'],['gastro','Estômago e intestino','sintomas'],
    ['pregnancy','Gestante e puérpera','ciclos'],['pediatric','Pediátrico e cuidador','ciclos']];
  const REGISTROS = [
    ['mrpa-7','MRPA · protocolo de 7 dias','alto'],['pressure-diary','Diário simplificado de pressão','alto'],
    ['glucose-basic','Diário glicêmico essencial','cronicas'],['glucose-intensive','Diário glicêmico intensivo','cronicas'],['hypoglycemia-card','Cartão visual de glicemia baixa','cronicas'],
    ['non-daily','Calendário de medicamentos não diários','gerais'],['reconciliation','O que mudou hoje','gerais']];
  const GRUPO_UNIDADE = {
    'atestado-medico':'Atestado e encaminhamentos','encaminhamento-geral':'Atestado e encaminhamentos','encaminhamento-planejamento-familiar':'Atestado e encaminhamentos',
    'exames-labs-pre-natal':'Exames','exames-labs-rotina':'Exames','exames-simples':'Exames',
    'receituario-gestante':'Receituários prontos','receituario-rn':'Receituários prontos','receituario-puerpera':'Receituários prontos','receituario-controle-especial':'Receituários prontos',
    'formula-lactea':'Solicitações à rede','fraldas-pediatricas':'Solicitações à rede','insumos-diabetes':'Solicitações à rede',
    'mrpa':'Acompanhamento em casa','tabela-pa-residencial':'Acompanhamento em casa','controle-glicemico':'Acompanhamento em casa','esquema-insulina-nph-regular':'Acompanhamento em casa','plano-visual-medicamentos':'Acompanhamento em casa' };
  const COR_GRUPO_UNIDADE = { 'Atestado e encaminhamentos':'#2B5BA8','Exames':'#2F6E62','Receituários prontos':'#B08A3E','Solicitações à rede':'#B04A6E','Acompanhamento em casa':'#A93636','Outros':'#4A5568' };
  function unidadeTodos() { try { return (global.F1Registro && global.F1Registro.todos && global.F1Registro.todos()) || []; } catch (_) { return []; } }
  function gavItem(tipo, id, titulo, cor) { return `<button type="button" class="orqa-doc-item" data-orqa-doc="${esc(tipo)}:${esc(id)}"><i style="background:${cor}"></i>${esc(titulo)}</button>`; }
  function gavetasHtml() {
    const un = unidadeTodos();
    const grupos = {};
    for (const d of un) { const g = GRUPO_UNIDADE[d.id] || 'Outros'; (grupos[g] = grupos[g] || []).push(d); }
    const ordem = ['Atestado e encaminhamentos','Exames','Receituários prontos','Solicitações à rede','Acompanhamento em casa','Outros'];
    const unHtml = ordem.filter(g => grupos[g] && grupos[g].length)
      .map(g => `<div class="orqa-doc-sub">${esc(g)}</div>` + grupos[g].map(d => gavItem('unidade', d.id, d.titulo, COR_GRUPO_UNIDADE[g] || '#4A5568')).join('')).join('');
    const porCat = (lista, tipo, rotulos) => { const vistos = []; let html = '';
      for (const [id, t, c] of lista) { if (!vistos.includes(c)) { vistos.push(c); html += `<div class="orqa-doc-sub">${esc(rotulos[c] || c)}</div>`; } html += gavItem(tipo, id, t, GAV_CORES[c] || '#4A5568'); }
      return html; };
    const total = 3 + GUIAS.length + REGISTROS.length + un.length;
    return `<section class="orqa-sec"><h4>Todos os documentos <span class="orqa-conferir">${total}</span></h4>
      <input type="search" class="orqa-busca" data-orqa-doc-filtro placeholder="Buscar por tema…" autocomplete="off">
      <div class="orqa-gavetas">
        <details class="orqa-gav" open><summary><i style="background:#B08A3E"></i>Essenciais<b>3</b></summary><div class="orqa-gav-c">
          ${gavItem('essencial','receita','Receituário simples SUS','#2F6E62')}
          ${gavItem('essencial','especial','Receituário de controle especial','#A93636')}
          ${gavItem('essencial','orientacoes','Orientações ao paciente','#2B5BA8')}
        </div></details>
        <details class="orqa-gav"><summary><i style="background:#2F6E62"></i>Guias do paciente<b>${GUIAS.length}</b></summary><div class="orqa-gav-c orqa-rolinterno">${porCat(GUIAS,'guia',CAT_ROTULO)}</div></details>
        <details class="orqa-gav"><summary><i style="background:#4A5568"></i>Registros<b>${REGISTROS.length}</b></summary><div class="orqa-gav-c">${porCat(REGISTROS,'registro',REG_ROTULO)}</div></details>
        <details class="orqa-gav"><summary><i style="background:#B08A3E"></i>Documentos da unidade<b>${un.length}</b></summary><div class="orqa-gav-c orqa-rolinterno">${unHtml || '<div class="orqa-vazio">Catálogo da unidade ainda não carregou.</div>'}</div></details>
      </div></section>`;
  }
  /* ═══ GUIA DE PREENCHIMENTO INTELIGENTE (F4): campos derivados da FOLHA VIVA no stage —
     escrever no painel escreve na folha (e o espelho da 2ª via acompanha); e vice-versa.
     Guias e registros já têm o painel próprio na view deles (reusado como está). ═══ */
  function formStageHtml() {
    if (!(global.OrquestratorDocs && OrquestratorDocs.ativo())) return '';
    const raiz = doc.querySelector('#orqDocHost #f1-formulario');
    if (!raiz) return '';
    const els = [...raiz.querySelectorAll('input[data-campo],textarea[data-campo],select[data-campo]')];
    if (!els.length) return '';
    const MAX = 16;
    const linhas = els.slice(0, MAX).map(el => {
      const chave = el.getAttribute('data-campo'), rot = el.getAttribute('aria-label') || chave;
      if (el.tagName === 'SELECT') {
        const ops = [...el.options].map(o => `<option value="${esc(o.value)}"${o.value === el.value ? ' selected' : ''}>${esc(o.text)}</option>`).join('');
        return `<label class="orqa-campo"><span>${esc(rot)}</span><select data-orqa-campo="${esc(chave)}">${ops}</select></label>`;
      }
      if (el.tagName === 'TEXTAREA') return `<label class="orqa-campo"><span>${esc(rot)}</span><textarea data-orqa-campo="${esc(chave)}" rows="3">${esc(el.value)}</textarea></label>`;
      const tipo = (el.type === 'date' || el.type === 'time' || el.type === 'number') ? el.type : 'text';
      return `<label class="orqa-campo"><span>${esc(rot)}</span><input type="${tipo}" data-orqa-campo="${esc(chave)}" value="${esc(el.value)}"></label>`;
    }).join('');
    const resto = els.length > MAX ? `<div class="orqa-vazio">+ ${els.length - MAX} campos de tabela — preenchem-se direto na folha.</div>` : '';
    return `<section class="orqa-sec"><h4>Preencher este documento <span class="orqa-conferir">a folha acompanha</span></h4>${linhas}${resto}</section>`;
  }
  /* ═══ G4: o EDITOR do guia ("Preencher") vive ADOTADO no painel enquanto o guia está no leitor.
     Nó vivo do #editorPanel — mesmos handlers, mesmo estado; devolvido ANTES de qualquer wipe. ═══ */
  let editorMarcador = null;
  function devolveEditor() {
    const ep = doc.getElementById('editorPanel');
    if (ep && editorMarcador && editorMarcador.parentNode) {
      editorMarcador.parentNode.insertBefore(ep, editorMarcador);
      editorMarcador.remove();
    }
    editorMarcador = null;
  }
  function adotaEditor() {
    if (!painel || !(global.OrquestratorGuias && OrquestratorGuias.ativo())) return;
    const slot = painel.querySelector('[data-orqa-editor-slot]');
    const ep = doc.getElementById('editorPanel');
    if (!slot || !ep || painel.contains(ep)) return;
    editorMarcador = doc.createComment('editorPanel — adotado pelo Orquestrator; devolvido ao sair');
    ep.parentNode.insertBefore(editorMarcador, ep);
    slot.appendChild(ep);
  }
  function guiaSlotHtml() {
    return (global.OrquestratorGuias && OrquestratorGuias.ativo())
      ? `<section class="orqa-sec" data-orqa-editor-slot><h4>Preencher este documento <span class="orqa-conferir">a folha acompanha</span></h4></section>`
      : '';
  }
  function reRenderPainel() {
    if (!painel) return;
    devolveEditor(); /* SEMPRE antes do wipe — o nó é vivo */
    const ta = painel.querySelector('[data-orqa-notas]'); const notas = ta ? ta.value : null;
    const abertas = [...painel.querySelectorAll('.orqa-gav')].map(d => d.open);
    painel.innerHTML = render();
    const ta2 = painel.querySelector('[data-orqa-notas]'); if (ta2 && notas !== null) ta2.value = notas;
    [...painel.querySelectorAll('.orqa-gav')].forEach((d, i) => { if (abertas[i] !== undefined) d.open = abertas[i]; });
    adotaEditor();
  }
  /* documento/guia entrou ou saiu do leitor → painel se re-desenha preservando notas e gavetas */
  doc.addEventListener('orq:doc-stage', reRenderPainel);
  doc.addEventListener('orq:guia-stage', reRenderPainel);
  /* folha → painel (a mão que escreve na folha ecoa no guia lateral) */
  doc.addEventListener('input', ev => {
    if (!painel || !ev.target.getAttribute) return;
    const chave = ev.target.getAttribute('data-campo');
    if (!chave || !ev.target.closest('#orqDocHost')) return;
    const esp = painel.querySelector('[data-orqa-campo="' + chave + '"]');
    if (esp && esp.value !== ev.target.value) esp.value = ev.target.value;
  });

  /* ação de cada item — sempre pelo que JÁ EXISTE no app; nada de documento inventado */
  function docAcao(tipo, id) {
    const ctx = contexto();
    const noWorkspace = (ctx === 'doenca' || ctx === 'guia' || ctx === 'institucional');
    if (tipo === 'essencial') {
      if (!noWorkspace) { aviso('Abre uma doença para usar a receita do atendimento.'); return; }
      if (id === 'receita' || id === 'especial') {
        const t = doc.querySelector('.tab-btn[data-tab="recipe"]'); if (t) t.click();
        const s = doc.getElementById('documentTypeSelect');
        if (!s || s.disabled) { aviso('Escolhe um esquema da doença para tipar a receita.'); return; }
        s.value = (id === 'especial' ? 'control-special' : 'simple');
        s.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (id === 'orientacoes') {
        const t = doc.querySelector('.tab-btn[data-tab="orientation"]'); if (t) t.click();
      }
      return;
    }
    if (tipo === 'guia' || tipo === 'registro') {
      /* LEI DO DONO: nunca rotear — o guia pinta no leitor da PRÓPRIA página da doença */
      if (!noWorkspace) { aviso('Abre uma doença — o documento pinta no leitor da própria página.'); return; }
      const catalogo = tipo === 'guia' ? 'guides' : 'extras';
      if (!(global.OrquestratorGuias && OrquestratorGuias.abrirNoStage(id, catalogo))) aviso((tipo === 'guia' ? 'Guia' : 'Registro') + ' indisponível.');
      return; /* painel fica aberto — o preenchimento vive nele */
    }
    if (tipo === 'unidade') {
      /* LEI DO DONO: nunca rotear — o documento pinta no leitor da PRÓPRIA página */
      if (noWorkspace && global.OrquestratorDocs && OrquestratorDocs.abrirNoStage(id)) return;
      aviso('Abre uma doença — o documento pinta no leitor da própria página.');
      return;
    }
  }

  let painel = null;
  function render() {
    const e = estado();
    const ctx = contexto();
    return `
      <div class="orqa-top"><span class="orqa-simbolo" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="#C9A227" stroke-width="2.2"/><rect x="8.4" y="8.4" width="7.2" height="7.2" rx="1" fill="#C9A227" transform="rotate(45 12 12)"/></svg></span>
        <div><strong>Orquestrator</strong><span class="orqa-ctx">${esc(RÓTULO[ctx])}</span></div>
        <button type="button" class="orqa-fechar" data-orqa-fechar aria-label="Fechar">×</button></div>
      <div class="orqa-rolagem">
        ${formStageHtml()}
        ${guiaSlotHtml()}
        ${gavetasHtml()}
        <section class="orqa-sec"><h4>Buscar CID <span class="orqa-conferir">sugestões — conferir</span></h4>
          <input type="search" class="orqa-busca" data-orqa-cid placeholder="Código ou descrição…" autocomplete="off">
          <div class="orqa-res" data-orqa-cid-res></div></section>
        <section class="orqa-sec"><h4>Buscar paciente <span class="orqa-conferir">CPF ou nome</span></h4>
          <input type="search" class="orqa-busca" data-orqa-pac placeholder="CPF ou nome…" autocomplete="off">
          <div class="orqa-res" data-orqa-pac-res></div></section>
        <section class="orqa-sec"><h4>Notas</h4>
          <textarea class="orqa-notas" data-orqa-notas placeholder="Rascunhos, lembretes da consulta…">${esc(e.notas)}</textarea></section>
        <section class="orqa-sec"><h4>Frases favoritas</h4>
          <button type="button" class="orqa-fav" data-orqa-favoritar><span aria-hidden="true">☆</span> Favoritar frase</button>
          <div class="orqa-frases">${e.frases.map((f, i) => `
            <div class="orqa-frase"><span class="orqa-frase-t">${esc(f)}</span>
              <button type="button" class="orqa-inserir" data-orqa-inserir="${i}" title="Inserir no campo ativo"><span class="orqa-mini-logo" aria-hidden="true"></span>Inserir</button>
              <button type="button" class="orqa-x" data-orqa-remover="${i}" aria-label="Remover">×</button></div>`).join('') ||
            '<div class="orqa-vazio">Selecione um texto em qualquer folha e toque em ☆ para guardar.</div>'}</div></section>
      </div>
      <div class="orqa-pe">O Orquestrator sugere e organiza — <strong>a decisão é sempre da médica</strong>.</div>`;
  }

  function aviso(msg) {
    const t = doc.querySelector('#toast');
    if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(aviso.t); aviso.t = setTimeout(() => t.classList.remove('show'), 3000);
  }

  function abrir() {
    if (painel) { fechar(); return; }
    painel = doc.createElement('aside');
    painel.id = 'orqAssist';
    painel.setAttribute('role', 'complementary');
    painel.setAttribute('aria-label', 'Assistente Orquestrator');
    painel.innerHTML = render();
    doc.body.appendChild(painel);
    adotaEditor();
    doc.body.classList.add('orqa-comprime');
    requestAnimationFrame(() => painel.classList.add('aberta'));
    painel.addEventListener('click', aoClicar);
    painel.addEventListener('input', aoDigitar);
    doc.addEventListener('keydown', aoEsc);
  }
  function fechar() {
    if (!painel) return;
    devolveEditor(); /* o nó do editor NUNCA morre com o painel */
    const e = estado(); const ta = painel.querySelector('[data-orqa-notas]');
    if (ta) { e.notas = ta.value; salvar(e); }
    painel.remove(); painel = null;
    doc.body.classList.remove('orqa-comprime');
    doc.removeEventListener('keydown', aoEsc);
  }
  function aoEsc(ev) { if (ev.key === 'Escape') fechar(); }

  let tNotas = null, tCid = null, tPac = null;
  function aoDigitar(ev) {
    const el = ev.target;
    if (el.hasAttribute && el.hasAttribute('data-orqa-campo')) {
      const chave = el.getAttribute('data-orqa-campo');
      const alvoF = doc.querySelector('#orqDocHost #f1-formulario [data-campo="' + chave + '"]');
      if (alvoF && alvoF.value !== el.value) { alvoF.value = el.value; alvoF.dispatchEvent(new Event('input', { bubbles: true })); }
      return;
    }
    if (el.matches('[data-orqa-doc-filtro]')) {
      const q = el.value.trim().toLowerCase();
      painel.querySelectorAll('.orqa-doc-item').forEach(b => b.classList.toggle('orqa-oculto', !!q && !b.textContent.toLowerCase().includes(q)));
      if (q) painel.querySelectorAll('.orqa-gav').forEach(d => { d.open = true; });
      return;
    }
    if (el.matches('[data-orqa-notas]')) {
      clearTimeout(tNotas);
      tNotas = setTimeout(() => { const e = estado(); e.notas = el.value; salvar(e); }, 600);
    } else if (el.matches('[data-orqa-cid]')) {
      clearTimeout(tCid);
      tCid = setTimeout(() => {
        const q = fold(el.value.trim());
        const res = painel.querySelector('[data-orqa-cid-res]');
        if (!q) { res.innerHTML = ''; return; }
        /* sugestões da doença primeiro (seladas), depois o CID-10 COMPLETO oficial (DATASUS, offline) */
        const sug = cidsTodos().filter(([c, d]) => fold(c + ' ' + d).includes(q)).slice(0, 4);
        const vistos = new Set(sug.map(([c]) => c));
        const geral = q.length >= 2 ? (global.CID10 || []).filter(([c, d]) => !vistos.has(c) && fold(c + ' ' + d).includes(q)).slice(0, 8) : [];
        const linha = (par, selo) => `<button type="button" class="orqa-item" data-orqa-cid-pick="${esc(par[0])} — ${esc(par[1])}"><strong>${esc(par[0])}</strong> ${esc(par[1])}${selo ? ' <span class="orqa-conferir">sugerido</span>' : ''}</button>`;
        res.innerHTML = (sug.map(x => linha(x, true)).join('') + geral.map(x => linha(x, false)).join('')) || '<div class="orqa-vazio">Nada encontrado no CID-10.</div>';
      }, 250);
    } else if (el.matches('[data-orqa-pac]')) {
      clearTimeout(tPac);
      tPac = setTimeout(() => {
        const q = el.value.trim();
        const res = painel.querySelector('[data-orqa-pac-res]');
        if (q.length < 3 || !(db() && db().patients)) { res.innerHTML = ''; return; }
        const achados = (db().patients.procurar ? db().patients.procurar(q) : []).slice(0, 6);
        res.innerHTML = achados.map(p => `<button type="button" class="orqa-item" data-orqa-pac-pick="${esc(p.id)}"><strong>${esc(p.nome)}</strong>${p.cpf ? ' · CPF ' + esc(p.cpf) : ''}${p.cns ? ' · CNS ' + esc(p.cns) : ''}</button>`).join('') || '<div class="orqa-vazio">Nenhuma ficha local.</div>';
      }, 250);
    }
  }

  function usarPaciente(pid) {
    const ctx = contexto();
    if (ctx === 'guia' && global.GuiasView) { GuiasView.setPatient(pid); aviso('Paciente vinculado à folha do guia.'); return; }
    if (ctx === 'doenca' && global.F2Handoff) { F2Handoff.setPatientId(pid); F2Handoff.usePatient && F2Handoff.usePatient('' + pid); aviso('Paciente ativo na doença.'); return; }
    if (global.HubNav) { HubNav.openPatients(pid); fechar(); return; }
  }

  function aoClicar(ev) {
    if (ev.target.closest('[data-orqa-fechar]')) { fechar(); return; }
    const docItem = ev.target.closest('[data-orqa-doc]');
    if (docItem) { const i = docItem.dataset.orqaDoc.indexOf(':'); docAcao(docItem.dataset.orqaDoc.slice(0, i), docItem.dataset.orqaDoc.slice(i + 1)); return; }
    const cid = ev.target.closest('[data-orqa-cid-pick]');
    if (cid) { inserir(cid.dataset.orqaCidPick); return; }
    const pac = ev.target.closest('[data-orqa-pac-pick]');
    if (pac) { usarPaciente(pac.dataset.orqaPacPick); return; }
    const fav = ev.target.closest('[data-orqa-favoritar]');
    if (fav) {
      const t = textoSelecionadoOuCampo();
      if (!t) { aviso('Selecione um texto (ou foque um campo preenchido) e toque em ☆.'); return; }
      const e = estado();
      if (!e.frases.includes(t)) { e.frases.unshift(t.slice(0, 400)); salvar(e); }
      const ta = painel.querySelector('[data-orqa-notas]'); const notas = ta ? ta.value : null;
      painel.innerHTML = render(); if (notas !== null) painel.querySelector('[data-orqa-notas]').value = notas;
      return;
    }
    const ins = ev.target.closest('[data-orqa-inserir]');
    if (ins) { inserir(estado().frases[+ins.dataset.orqaInserir] || ''); return; }
    const rem = ev.target.closest('[data-orqa-remover]');
    if (rem) { const e = estado(); e.frases.splice(+rem.dataset.orqaRemover, 1); salvar(e); const ta = painel.querySelector('[data-orqa-notas]'); const notas = ta ? ta.value : null; painel.innerHTML = render(); if (notas !== null) painel.querySelector('[data-orqa-notas]').value = notas; }
  }

  function ligarSelo() {
    const selo = doc.querySelector('.orq-marca');
    if (!selo || selo.dataset.orqaLigado) return false;
    selo.dataset.orqaLigado = '1';
    selo.setAttribute('role', 'button'); selo.setAttribute('tabindex', '0');
    selo.setAttribute('title', 'Assistente Orquestrator');
    selo.addEventListener('click', abrir);
    selo.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); abrir(); } });
    return true;
  }
  /* o selo é injetado pelo tema-orquestrator.js no load — tenta já, senão observa */
  if (!ligarSelo()) {
    const mo = new MutationObserver(() => { if (ligarSelo()) mo.disconnect(); });
    mo.observe(doc.body, { childList: true, subtree: true });
    setTimeout(() => mo.disconnect(), 8000);
  }

  /* mostrar(gaveta?): garante o painel ABERTO (nunca fecha) e opcionalmente abre uma gaveta:
     'guides' | 'extras' | 'unit' — é o destino único dos antigos redirecionamentos (G5). */
  const GAVETA_INDICE = { guides: 1, extras: 2, unit: 3 };
  function mostrar(gaveta) {
    if (!painel) abrir();
    if (painel && gaveta in GAVETA_INDICE) {
      const d = painel.querySelectorAll('.orqa-gav')[GAVETA_INDICE[gaveta]];
      if (d) d.open = true;
    }
  }
  global.OrqAssist = Object.freeze({ abrir, fechar, mostrar, inserir, contexto });
})(window, document);
