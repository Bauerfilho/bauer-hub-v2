/* Atualizador autoral: nunca grava rascunho, formulário ou identidade clínica. */
(() => {
  'use strict';
  const versao = document.querySelector('meta[name="orq-release"]')?.content || '';
  const base = new URL('../', document.currentScript.src);
  const guardas = new Map();
  let registro = null;
  let carregado = false;
  let imprimindo = false;
  let recarregando = false;
  let consultando = false;
  let intervalo = 60000;
  let proxima = 0;
  let ultimaAtividade = Date.now();
  let estado = 'iniciando';
  let novaVersao = null;
  let iniciando = false;
  const obrigatorias = ['receita', 'atendimento', 'soap', 'guias', 'institucionais', 'pacientes'];

  function visivel(elemento) {
    return !!elemento && !elemento.closest('[hidden]') && !!elemento.getClientRects().length;
  }

  function seguro() {
    if (!carregado || imprimindo || recarregando || Date.now() - ultimaAtividade < 1800) return false;
    if (obrigatorias.some(nome => !guardas.has(nome))) return false;
    // A navegação pode ocultar o hub sem encerrar os editores de identidade da unidade.
    if (document.querySelector('.f2x-uni-editor,#f2xCidadeInp')) return false;
    // Editores auxiliares fecham após Salvar/Cancelar; notas do assistente terminam de gravar ao fechar.
    if ([...document.querySelectorAll('[role="dialog"],dialog[open],.f2-modal-fundo,.compose-livre-editor,.f2x-uni-editor,#f2xCidadeInp,#orqAssist')].some(visivel)) return false;
    const foco = document.activeElement;
    if (visivel(foco) && (foco.matches('input,textarea,select') || foco.isContentEditable)) return false;
    try { return [...guardas.values()].every(guarda => guarda() === true); }
    catch (_) { return false; }
  }

  function avisarStatus(valor) {
    estado = valor;
    document.documentElement.dataset.pwaUpdate = valor;
    window.dispatchEvent(new CustomEvent('orq:pwa-status', {detail: {state: valor, version: versao}}));
  }

  function recheck() {
    if (novaVersao && novaVersao !== versao && seguro()) {
      recarregando = true;
      avisarStatus('aplicando');
      // Marcador só de versão impede repetição caso algum intermediário devolva HTML velho.
      const chave = 'orq:pwa:reload';
      try {
        if (sessionStorage.getItem(chave) === novaVersao) { recarregando = false; avisarStatus('aguardando-navegacao'); return; }
        sessionStorage.setItem(chave, novaVersao);
      } catch (_) { recarregando = false; avisarStatus('aguardando-navegacao'); return; }
      location.reload();
      return;
    }
    if (registro?.waiting) {
      avisarStatus(seguro() ? 'preparada' : 'aguardando-edicao');
      if (seguro()) registro.waiting.postMessage({type: 'ORQ_PWA_ACTIVATE'});
    }
  }

  function perguntarVersao(worker) {
    if (!worker) return;
    const canal = new MessageChannel();
    const limite = setTimeout(() => canal.port1.close(), 5000);
    canal.port1.onmessage = evento => {
      clearTimeout(limite); canal.port1.close();
      const recebida = evento.data?.version;
      if (typeof recebida !== 'string') return;
      novaVersao = recebida;
      if (novaVersao === versao) {
        try { sessionStorage.removeItem('orq:pwa:reload'); } catch (_) { /* Falha de storage não afeta os dados locais. */ }
        avisarStatus('atual');
      }
      recheck();
    };
    worker.postMessage({type: 'ORQ_PWA_VERSION'}, [canal.port2]);
  }

  async function verificar(forcar = false) {
    if (consultando || !navigator.onLine || (!forcar && Date.now() < proxima)) return;
    if (!registro || (!registro.active && !registro.installing && !registro.waiting)) {
      // Uma primeira instalação recusada pode deixar um objeto sem nenhum worker.
      registro = null;
      await iniciar();
      return;
    }
    consultando = true;
    try {
      await registro.update();
      if (!registro.installing) intervalo = 60000;
      recheck();
    } catch (_) { intervalo = Math.min(intervalo * 2, 15 * 60000); avisarStatus('aguardando-rede'); }
    finally { consultando = false; proxima = Date.now() + intervalo; }
  }

  window.OrqPWA = Object.freeze({
    registerGuard(nome, verificarEstado) { guardas.set(nome, verificarEstado); },
    recheck,
    check: () => verificar(true),
    status: () => ({version: versao, state: estado, safe: seguro(), guards: [...guardas.keys()]}),
  });
  // Leitura de segurança responde ao SW sem transferir conteúdo de nenhum campo.
  if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', evento => {
    if (evento.data?.type === 'ORQ_PWA_STATUS') evento.ports[0]?.postMessage({version: versao, safe: seguro()});
  });
  ['pointerdown', 'keydown', 'input', 'change'].forEach(tipo => document.addEventListener(tipo, () => { ultimaAtividade = Date.now(); }, true));
  window.addEventListener('beforeprint', () => { imprimindo = true; });
  window.addEventListener('afterprint', () => { imprimindo = false; ultimaAtividade = Date.now(); });
  function ligado() {
    navigator.serviceWorker.controller?.postMessage({type: 'ORQ_PWA_HELLO', version: versao});
    perguntarVersao(navigator.serviceWorker.controller);
  }
  async function iniciar() {
    if (registro || iniciando) return;
    iniciando = true;
    if (!('serviceWorker' in navigator) || !isSecureContext || versao === '__PWA_RELEASE__' || !versao) {
      iniciando = false; avisarStatus('sem-publicacao'); return;
    }
    try {
      registro = await navigator.serviceWorker.register(new URL('sw.js', base), {scope: base.pathname, updateViaCache: 'none'});
      registro.addEventListener('updatefound', () => {
        avisarStatus('baixando');
        const instalando = registro.installing;
        instalando?.addEventListener('statechange', () => {
          if (instalando.state === 'redundant') {
            // update() pode resolver antes de o download de um ativo falhar.
            intervalo = Math.min(intervalo * 2, 15 * 60000);
            proxima = Date.now() + intervalo;
            avisarStatus('aguardando-rede');
          }
          if (instalando.state === 'installed') intervalo = 60000;
          recheck();
        });
      });
      ligado();
      recheck();
      proxima = Date.now() + intervalo;
    } catch (_) {
      avisarStatus('aguardando-rede');
      intervalo = Math.min(intervalo * 2, 15 * 60000);
      proxima = Date.now() + intervalo;
    } finally { iniciando = false; }
  }
  window.addEventListener('load', () => {
    carregado = true;
    if (!('serviceWorker' in navigator) || !isSecureContext || versao === '__PWA_RELEASE__' || !versao) {
      avisarStatus('sem-publicacao'); return;
    }
    // Os ouvintes são únicos, inclusive quando a primeira instalação precisa ser refeita.
    navigator.serviceWorker.addEventListener('controllerchange', ligado);
    window.addEventListener('focus', () => { recheck(); verificar(true); });
    window.addEventListener('online', () => verificar(true));
    window.addEventListener('pageshow', () => { ligado(); verificar(true); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { recheck(); verificar(true); } });
    setInterval(() => { recheck(); verificar(); }, 2000);
    iniciar();
  });
})();
