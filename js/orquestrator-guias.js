/* orquestrator-guias.js — GUIAS E REGISTROS no leitor da doença (G3 do plano aprovado, 30/08/2026).
   Lei do dono: NUNCA rotear documento — o leitor da página da doença é a casa única.
   Técnica: adoção do nó vivo [toolbar de modos Leitura/Visual/B&W + #previewWrap] num wrapper
   #orqGuiaHost dentro do #stageCard; o motor GuiasView renderiza SEM navegar (motor global
   desde G1). Um palco, um ocupante: arbitragem mútua com OrquestratorDocs. Devolução íntegra
   ao sair. Nada duplicado: mesmo motor, mesmos nós, mesmo estado. Código da casa — MIT. */
(function (global, doc) {
  'use strict';
  let marcadores = null;  /* [[nó, comment-marcador]] dos 2 nós adotados */
  let escondidos = null;  /* [[el, hiddenAntes]] das camadas da receita */
  let hostStage = null;   /* wrapper #orqGuiaHost */
  let ro = null;

  const $ = s => doc.querySelector(s);

  /* enquadramento ADAPTATIVO: retrato (794px) e registros paisagem sempre cabem;
     impressão não passa por aqui (portal neutro do hub re-gera do estado) */
  function ajusta() {
    const pv = doc.getElementById('preview');
    const wrap = doc.getElementById('previewWrap');
    if (!pv || !wrap || !hostStage) return;
    pv.style.transform = ''; pv.style.transformOrigin = 'top left';
    const disp = hostStage.clientWidth - 8, larg = pv.scrollWidth;
    if (larg > disp && larg > 0) {
      const s = disp / larg;
      pv.style.transform = 'scale(' + s + ')';
      wrap.style.height = (pv.scrollHeight * s + 20) + 'px';
    } else { wrap.style.height = ''; }
  }

  function abrirNoStage(id, catalog) {
    const stage = doc.getElementById('stageCard');
    const tb = doc.querySelector('#documentsView .workspace-toolbar') || (hostStage && hostStage.querySelector('.workspace-toolbar'));
    const pw = doc.getElementById('previewWrap');
    if (!stage || !pw || !global.GuiasView) return false;
    if (global.OrquestratorDocs) OrquestratorDocs.restaurar(); /* um palco, um ocupante */
    if (!GuiasView.boot()) return false;
    GuiasView.open(id || null, catalog || null); /* renderiza nos nós (globais desde G1), view segue hidden */
    if (!hostStage) {
      escondidos = ['#recipeScaler', '#orientationScaler', '#topicNotes'].map(s => {
        const el = $(s); if (el) { const h = el.hidden; el.hidden = true; return [el, h]; } return null;
      }).filter(Boolean);
      hostStage = doc.createElement('div');
      hostStage.id = 'orqGuiaHost';
      marcadores = [];
      [tb, pw].filter(Boolean).forEach(el => {
        const m = doc.createComment('nó do guia — adotado pelo leitor da doença; devolvido ao sair');
        el.parentNode.insertBefore(m, el);
        marcadores.push([el, m]);
        hostStage.appendChild(el);
      });
      stage.appendChild(hostStage);
      ro = new ResizeObserver(() => requestAnimationFrame(ajusta));
      ro.observe(hostStage);
      const pv = doc.getElementById('preview');
      if (pv) new MutationObserver(() => requestAnimationFrame(ajusta)).observe(pv, { childList: true });
    }
    requestAnimationFrame(ajusta);
    doc.dispatchEvent(new CustomEvent('orq:guia-stage', { detail: { id, catalog } }));
    return true;
  }

  function restaurar() {
    if (!hostStage) return;
    if (ro) { ro.disconnect(); ro = null; }
    const pv = doc.getElementById('preview');
    if (pv) pv.style.transform = '';
    const wrap = doc.getElementById('previewWrap');
    if (wrap) wrap.style.height = '';
    (marcadores || []).forEach(par => { if (par[1].parentNode) { par[1].parentNode.insertBefore(par[0], par[1]); par[1].remove(); } });
    marcadores = null;
    (escondidos || []).forEach(p => { p[0].hidden = p[1]; });
    escondidos = null;
    hostStage.remove(); hostStage = null;
    doc.dispatchEvent(new CustomEvent('orq:guia-stage', { detail: null }));
  }

  /* trocar aba/esquema/tipo na doença devolve a folha da receita — em CAPTURA (padrão provado) */
  doc.addEventListener('click', ev => {
    if (hostStage && ev.target.closest && ev.target.closest('#workspaceView .tab-btn')) restaurar();
  }, true);
  doc.addEventListener('change', ev => {
    if (hostStage && (ev.target.id === 'regimenSelect' || ev.target.id === 'documentTypeSelect')) restaurar();
  }, true);

  global.OrquestratorGuias = Object.freeze({ abrirNoStage, restaurar, ativo: () => !!hostStage });
})(window, document);
