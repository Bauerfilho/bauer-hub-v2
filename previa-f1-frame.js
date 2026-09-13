/* Enquadramento ADAPTATIVO: a folha (retrato ou paisagem 2-up) sempre cabe na moldura.
   Só na tela — impressão volta ao tamanho real. Não toca no motor F1 (selado). */
(function enquadramentoAdaptativo() {
  'use strict';
  var folha = document.getElementById('f1-formulario');
  var vp = document.querySelector('.paper-viewport');
  if (!folha || !vp) return;
  function ajusta() {
    folha.style.transform = '';
    folha.style.transformOrigin = 'top left';
    var disponivel = vp.clientWidth - 8;
    var largura = folha.scrollWidth;
    if (largura > disponivel && largura > 0) {
      var s = disponivel / largura;
      folha.style.transform = 'scale(' + s + ')';
      vp.style.height = (folha.scrollHeight * s + 28) + 'px';
    } else {
      vp.style.height = '';
    }
  }
  window.addEventListener('resize', ajusta);
  window.addEventListener('beforeprint', function () { folha.style.transform = ''; vp.style.height = ''; });
  window.addEventListener('afterprint', function () { requestAnimationFrame(ajusta); });
  new MutationObserver(function () { requestAnimationFrame(ajusta); })
    .observe(folha, { childList: true });
  requestAnimationFrame(ajusta);
})();

/* Pré-seleciona o documento pedido pela prévia via ?doc=<id>, sem tocar no motor F1 (selado). */
(function preSelecionaDocumento() {
  'use strict';
  var doc = new URLSearchParams(location.search).get('doc');
  if (!doc) return;
  var tentativas = 0;
  var timer = setInterval(function () {
    var sel = document.getElementById('f1-documento');
    if (sel && sel.options.length > 1) {
      clearInterval(timer);
      sel.value = doc;
      if (sel.value === doc) sel.dispatchEvent(new Event('change'));
    } else if (++tentativas > 50) {
      clearInterval(timer);
    }
  }, 60);
})();
