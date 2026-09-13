/* dossie-orquestrator.js — CATEGORIAS DO ORQUESTRATOR (extra do dono, 30/08/2026).
   Dossiê de medicamentos favoritos por categoria: o DONO dita os itens de cada categoria (julgamento
   médico não se delega — a estrutura nasce pronta e VAZIA de conduta); a Dra. marca os dela e pode
   completar qualquer categoria com itens próprios. Tudo rotulado "referência — conferir": o hub não
   decide conduta. Persistência aditiva em ubs2026.v1.meta.orqDossie (export/import continuam válidos).
   UI: popover estilo menu-de-comandos — preto #15181D, rolagem, acentos dourados (tema Orquestrator).
   Código da casa — MIT. */
(function (global, doc) {
  'use strict';

  /* As 15 categorias cravadas pelo dono (29/08): foco de partida em puerpério, obstetrícia,
     neonatal na APS, HAS/DM/dislipidemia/obesidade, cardíacas e renais. Itens: o dono dita. */
  const CATEGORIAS = [
    { id: 'puerperio',      titulo: 'Puerpério',                    foco: true },
    { id: 'obstetricia',    titulo: 'Obstetrícia',                  foco: true },
    { id: 'neonatal-aps',   titulo: 'Período neonatal na APS',      foco: true },
    { id: 'has',            titulo: 'Hipertensão arterial',         foco: true },
    { id: 'dm',             titulo: 'Diabetes',                     foco: true },
    { id: 'dislipidemia',   titulo: 'Dislipidemia',                 foco: true },
    { id: 'obesidade',      titulo: 'Obesidade',                    foco: true },
    { id: 'cardiacas',      titulo: 'Doenças cardíacas',            foco: true },
    { id: 'renais',         titulo: 'Doenças renais',               foco: true },
    { id: 'antibioticos',   titulo: 'Antibióticos',                 foco: false },
    { id: 'anti-inflamatorios', titulo: 'Anti-inflamatórios',       foco: false },
    { id: 'corticoides',    titulo: 'Corticoides',                  foco: false },
    { id: 'dor-neuropatica', titulo: 'Dor neuropática',             foco: false },
    { id: 'suplementos',    titulo: 'Suplementos',                  foco: false },
    { id: 'comorbidades',   titulo: 'Comorbidades',                 foco: false },
  ];

  /* Itens do dono por categoria — ele dita e a casa preenche aqui ({t: nome, d: detalhe}). */
  const ITENS_DO_DONO = {};

  const K = 'orqDossie';
  function db() { return global.F2DB || null; }
  function estado() {
    const meta = db() && db().meta && db().meta.ler ? (db().meta.ler() || {}) : {};
    const e = meta[K] || {};
    return { marcados: Array.isArray(e.marcados) ? e.marcados : [], meus: e.meus && typeof e.meus === 'object' ? e.meus : {} };
  }
  function salvar(e) {
    if (!(db() && db().meta && typeof db().meta.marcar === 'function')) return false;
    db().meta.marcar(K, e);
    return true;
  }
  const esc = v => String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const chave = (cat, t) => cat + '::' + t;

  let pop = null;

  function itensDe(catId, e) {
    const dono = (ITENS_DO_DONO[catId] || []).map(i => ({ ...i, origem: 'dono' }));
    const meus = (e.meus[catId] || []).map(i => ({ ...i, origem: 'meu' }));
    return dono.concat(meus);
  }

  function render(filtro) {
    const e = estado();
    const q = (filtro || '').trim().toLowerCase();
    const grupos = CATEGORIAS.map(cat => {
      const itens = itensDe(cat.id, e).filter(i => !q || (i.t + ' ' + (i.d || '')).toLowerCase().includes(q));
      if (q && !itens.length && !cat.titulo.toLowerCase().includes(q)) return '';
      const linhas = itens.map(i => {
        const on = e.marcados.includes(chave(cat.id, i.t));
        return `<button type="button" class="orqd-item${on ? ' marcado' : ''}" data-orqd-marca="${esc(chave(cat.id, i.t))}">
          <span class="orqd-estrela" aria-hidden="true">${on ? '★' : '☆'}</span>
          <span class="orqd-copy"><strong>${esc(i.t)}</strong>${i.d ? `<span>${esc(i.d)}</span>` : ''}</span>
          ${i.origem === 'meu' ? '<span class="orqd-tag">meu</span>' : '<span class="orqd-tag ouro">dono</span>'}
        </button>`;
      }).join('');
      return `<div class="orqd-grupo" data-orqd-cat="${esc(cat.id)}">
        <div class="orqd-cat">${esc(cat.titulo)}${cat.foco ? '<span class="orqd-foco">foco</span>' : ''}
          <button type="button" class="orqd-add" data-orqd-add="${esc(cat.id)}" title="Adicionar meu item">+</button></div>
        ${linhas || '<div class="orqd-vazio">Aguardando os favoritos do dono — adicione os seus com o +.</div>'}
      </div>`;
    }).join('');
    return `
      <div class="orqd-top">
        <span class="orqd-simbolo" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="#C9A227" stroke-width="2.2"/><rect x="8.4" y="8.4" width="7.2" height="7.2" rx="1" fill="#C9A227" transform="rotate(45 12 12)"/></svg></span>
        <strong>Categorias do Orquestrator</strong>
        <button type="button" class="orqd-fechar" data-orqd-fechar aria-label="Fechar">×</button>
      </div>
      <input type="search" class="orqd-busca" placeholder="Buscar categoria ou medicamento…" data-orqd-busca autocomplete="off">
      <div class="orqd-rolagem">${grupos}</div>
      <div class="orqd-pe">Referência da casa — <strong>conferir sempre</strong>. O hub não decide conduta.</div>`;
  }

  function abrir(ancora) {
    fechar();
    pop = doc.createElement('div');
    pop.className = 'orqd-pop';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', 'Categorias do Orquestrator');
    pop.innerHTML = render('');
    doc.body.appendChild(pop);
    const r = ancora.getBoundingClientRect();
    const w = Math.min(400, innerWidth - 24);
    pop.style.width = w + 'px';
    pop.style.left = Math.max(12, Math.min(r.right - w, innerWidth - w - 12)) + 'px';
    pop.style.top = Math.min(r.bottom + 8, innerHeight - 80) + 'px';
    pop.addEventListener('click', aoClicar);
    pop.addEventListener('input', ev => { if (ev.target.matches('[data-orqd-busca]')) atualizar(ev.target.value); });
    setTimeout(() => doc.addEventListener('click', foraClique), 0);
    doc.addEventListener('keydown', aoEsc);
    const busca = pop.querySelector('[data-orqd-busca]');
    if (busca) busca.focus();
  }
  function atualizar(filtro) {
    if (!pop) return;
    const busca = pop.querySelector('[data-orqd-busca]');
    const foco = busca === doc.activeElement, v = busca ? busca.value : '';
    pop.innerHTML = render(filtro != null ? filtro : v);
    const b2 = pop.querySelector('[data-orqd-busca]');
    if (b2) { b2.value = v; if (foco) { b2.focus(); b2.setSelectionRange(v.length, v.length); } }
  }
  function fechar() {
    if (!pop) return;
    pop.remove(); pop = null;
    doc.removeEventListener('click', foraClique);
    doc.removeEventListener('keydown', aoEsc);
  }
  function foraClique(ev) { if (pop && !pop.contains(ev.target) && !ev.target.closest('[data-compose="categorias"]')) fechar(); }
  function aoEsc(ev) { if (ev.key === 'Escape') fechar(); }

  function aoClicar(ev) {
    const marca = ev.target.closest('[data-orqd-marca]');
    if (marca) {
      const e = estado(), k = marca.dataset.orqdMarca;
      const i = e.marcados.indexOf(k);
      if (i >= 0) e.marcados.splice(i, 1); else e.marcados.push(k);
      if (!salvar(e)) return;
      atualizar(null);
      return;
    }
    const add = ev.target.closest('[data-orqd-add]');
    if (add) {
      const t = (prompt('Nome do medicamento (como você escreve na receita):') || '').trim();
      if (!t) return;
      const d = (prompt('Detalhe opcional (dose/apresentação/observação):') || '').trim();
      const e = estado(), cat = add.dataset.orqdAdd;
      e.meus[cat] = e.meus[cat] || [];
      e.meus[cat].push(d ? { t, d } : { t });
      if (!salvar(e)) return;
      atualizar(null);
      return;
    }
    if (ev.target.closest('[data-orqd-fechar]')) fechar();
  }

  global.OrqCategorias = Object.freeze({ abrir, fechar, categorias: () => CATEGORIAS.map(c => ({ ...c })) });
})(window, document);
