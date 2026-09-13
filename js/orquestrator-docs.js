/* orquestrator-docs.js — VISUALIZADOR UNIVERSAL no stage da doença (F3 orquestrator-no-app, 30/08/2026).
   Ordem do dono: todo documento pinta NA PÁGINA DA PACIENTE, só a folha (zero chrome de navegação),
   escrita direta + espelho nativos do motor. Técnica: ADOÇÃO do nó vivo #f1Host (render do
   institucionais-view — porte do motor F1 selado) para dentro do #stageCard, com devolução íntegra
   ao sair. Nada duplicado: o mesmo motor, o mesmo nó, o mesmo estado. Código da casa — MIT. */
(function (global, doc) {
  'use strict';
  let marcador = null;    /* comment node no lugar original do f1Host */
  let escondidos = null;  /* [[el, hiddenAntes]] das camadas da receita */
  let hostStage = null;   /* wrapper #orqDocHost dentro do stage */
  let ro = null;

  const $ = s => doc.querySelector(s);

  /* enquadramento ADAPTATIVO: retrato e paisagem 2-up sempre cabem; impressão sai em tamanho real
     (o institucionais-view imprime pelo portal, que ignora o transform daqui) */
  function ajusta() {
    const folha = doc.getElementById('f1-formulario');
    const vp = hostStage && hostStage.querySelector('.paper-viewport');
    if (!folha || !vp) return;
    folha.style.transform = '';
    folha.style.transformOrigin = 'top left';
    const disp = vp.clientWidth - 8, larg = folha.scrollWidth;
    if (larg > disp && larg > 0) {
      const s = disp / larg;
      folha.style.transform = 'scale(' + s + ')';
      vp.style.height = (folha.scrollHeight * s + 24) + 'px';
    } else { vp.style.height = ''; }
  }

  function abrirNoStage(id) {
    const stage = doc.getElementById('stageCard');
    const f1Host = doc.getElementById('f1Host');
    if (!stage || !f1Host || !global.InstitucionaisView) return false;
    if (global.OrquestratorGuias) OrquestratorGuias.restaurar(); /* um palco, um ocupante */
    if (!InstitucionaisView.abrir(id)) return false; /* renderiza no motor vivo, sem navegar de view */
    if (!hostStage) {
      escondidos = ['#recipeScaler', '#orientationScaler', '#topicNotes'].map(s => {
        const el = $(s); if (el) { const h = el.hidden; el.hidden = true; return [el, h]; } return null;
      }).filter(Boolean);
      hostStage = doc.createElement('div');
      hostStage.id = 'orqDocHost';
      marcador = doc.createComment('f1Host — adotado pelo visualizador da doença; devolvido ao sair');
      f1Host.parentNode.insertBefore(marcador, f1Host);
      hostStage.appendChild(f1Host);
      stage.appendChild(hostStage);
      ro = new ResizeObserver(() => requestAnimationFrame(ajusta));
      ro.observe(hostStage);
      const formulario = doc.getElementById('f1-formulario');
      if (formulario) new MutationObserver(() => requestAnimationFrame(ajusta)).observe(formulario, { childList: true });
    }
    f1Host.hidden = false;
    requestAnimationFrame(ajusta);
    doc.dispatchEvent(new CustomEvent('orq:doc-stage', { detail: { id } }));
    return true;
  }

  function restaurar() {
    if (!hostStage) return;
    const f1Host = doc.getElementById('f1Host');
    if (ro) { ro.disconnect(); ro = null; }
    if (f1Host && marcador && marcador.parentNode) {
      f1Host.hidden = true;
      const folha = doc.getElementById('f1-formulario');
      if (folha) folha.style.transform = '';
      marcador.parentNode.insertBefore(f1Host, marcador);
      marcador.remove(); marcador = null;
    }
    (escondidos || []).forEach(p => { p[0].hidden = p[1]; });
    escondidos = null;
    hostStage.remove(); hostStage = null;
    doc.dispatchEvent(new CustomEvent('orq:doc-stage', { detail: null }));
  }

  /* trocar aba/esquema/tipo na doença devolve a folha da receita — em CAPTURA, para o app
     assumir o stage já restaurado */
  doc.addEventListener('click', ev => {
    if (hostStage && ev.target.closest && ev.target.closest('#workspaceView .tab-btn')) restaurar();
  }, true);
  doc.addEventListener('change', ev => {
    if (hostStage && (ev.target.id === 'regimenSelect' || ev.target.id === 'documentTypeSelect')) restaurar();
  }, true);

  global.OrquestratorDocs = Object.freeze({ abrirNoStage, restaurar, ativo: () => !!hostStage });
})(window, document);
