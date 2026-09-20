/* Cabeçalho comum às duas entradas, sem mover controles ou alterar conteúdo. */
(() => {
  'use strict'; // Restringe atribuições ao escopo deste controlador.
  const bar = document.querySelector('body > header.appbar'); // Cabeçalho global original.
  const workspace = document.getElementById('workspaceView'); // Vista que contém as doenças.
  const faixa = workspace?.querySelector(':scope > .workspace-toolbar'); // Exclui o preview de documentos.
  if (!bar || !workspace || !faixa) return; // Não interfere em páginas sem o par de faixas.
  const corpo = document.body; // Guarda variáveis compartilhadas sem criar wrappers.
  const PASSO = 6; // Preserva a histerese original contra pequenos tremores.
  let alturaConjunto = 0; // Soma apenas as faixas atualmente visíveis.
  let ultimaPosicao = 0; // Referência de direção entre os quadros de rolagem.
  let quadroPendente = false; // Evita processar vários eventos no mesmo quadro.
  let quadroTransicao = 0; // Cancela somente a restauração anterior deste módulo.
  let teclado = false; // Protege controles durante a navegação pelo teclado.

  function faixaVisivel() {
    return !workspace.hidden && faixa.getClientRects().length > 0; // Não mede a doença quando outra vista está aberta.
  }

  function posicaoAtual() {
    const limite = Math.max(0, document.documentElement.scrollHeight - window.innerHeight); // Fim real da página.
    return Math.max(0, Math.min(window.scrollY, limite)); // Descarta o rebote elástico das bordas.
  }

  function deslocar(recolhido) {
    corpo.dataset.headerRecolhido = String(recolhido); // Estado observável para inspeção do resultado.
    corpo.style.setProperty('--header-deslocamento', recolhido ? `${-alturaConjunto - 2}px` : '0px'); // Mesmo delta em ambas.
  }

  function medir() {
    const alturaBarra = bar.offsetHeight; // Usa a altura real, sem assumir o valor de 70px.
    alturaConjunto = alturaBarra + (faixaVisivel() ? faixa.offsetHeight : 0); // Considera a quebra de linhas da faixa.
    corpo.style.setProperty('--header-altura', `${alturaBarra}px`); // Alinha a faixa diretamente sob a barra.
    deslocar(corpo.dataset.headerRecolhido === 'true'); // Atualiza também o deslocamento de um conjunto recolhido.
  }

  function mostrar(imediato = false) {
    if (imediato) {
      cancelAnimationFrame(quadroTransicao); // Uma nova navegação substitui a restauração pendente.
      corpo.classList.add('header-sem-transicao'); // Foco e abertura não deixam parte do cabeçalho fora da tela.
    }
    deslocar(false); // Restaura as duas faixas no mesmo quadro.
    if (imediato) {
      bar.getBoundingClientRect(); // Confirma a posição antes de voltar a permitir animação.
      quadroTransicao = requestAnimationFrame(() => corpo.classList.remove('header-sem-transicao')); // Próxima interação anima.
    }
  }

  function atualizarRolagem() {
    quadroPendente = false; // Libera o processamento do próximo quadro.
    const y = posicaoAtual(); // Mede a posição válida da página.
    const delta = y - ultimaPosicao; // Subida negativa, descida positiva.
    const foco = document.activeElement; // O foco por teclado não pode desaparecer durante uso.
    const focoDentro = teclado && (bar.contains(foco) || (faixaVisivel() && faixa.contains(foco))); // Protege as duas faixas.
    bar.classList.toggle('appbar--raised', y > 4); // Preserva a condição original da sombra.
    if (y <= alturaConjunto + 2 || focoDentro || corpo.classList.contains('drawer-open')) {
      mostrar(); // Só esconde quando todo o espaço inicial do conjunto já passou pela janela.
      ultimaPosicao = y; // Não carrega a direção de uma interação protegida.
      return;
    }
    if (Math.abs(delta) < PASSO) return; // Acumula deslocamentos menores que a histerese original.
    deslocar(delta > 0); // As duas faixas compartilham a mesma decisão de direção.
    ultimaPosicao = y; // Atualiza a referência após um movimento suficiente.
  }

  function iniciarVista() {
    medir(); // Decide entre o conjunto da doença e a barra sozinha nas outras vistas.
    mostrar(true); // Toda abertura começa com o cabeçalho completo e visível.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); // Não herda a posição da doença anterior.
    ultimaPosicao = posicaoAtual(); // Neutraliza a direção anterior após a navegação.
    bar.classList.remove('appbar--raised'); // No início não há sombra de conteúdo rolado.
  }

  corpo.classList.add('header-unificado-pronto'); // Ativa as regras sem alterar o DOM ou suas dimensões.
  corpo.dataset.headerRecolhido = 'false'; // O primeiro desenho sempre mostra o conjunto.
  medir(); // Define alturas antes de qualquer abertura pela URL.
  ultimaPosicao = posicaoAtual(); // Parte da posição real da sessão.
  window.HeaderUnificado = Object.freeze({ iniciarVista }); // Integração única com as rotas existentes.

  window.addEventListener('scroll', () => {
    if (quadroPendente) return; // Não duplica leituras dentro do mesmo quadro.
    quadroPendente = true; // Marca a atualização já agendada.
    requestAnimationFrame(atualizarRolagem); // Mantém o cálculo alinhado à renderização.
  }, { passive: true }); // Não bloqueia roda, trackpad ou toque.
  window.addEventListener('resize', () => {
    medir(); // Recalcula a altura após mudança de largura ou orientação.
    mostrar(true); // Um resize não deixa uma fração da faixa exposta.
    ultimaPosicao = posicaoAtual(); // Resize não representa intenção de rolar.
  });
  if ('ResizeObserver' in window) new ResizeObserver(medir).observe(faixa); // Detecta seletores e títulos com nova altura.
  if ('ResizeObserver' in window) new ResizeObserver(medir).observe(bar); // Detecta alterações reais na altura principal.
  document.addEventListener('keydown', event => {
    teclado = true; // Identifica navegação de teclado antes de seus efeitos.
    if (event.key === 'Escape') mostrar(true); // Preserva o atalho original para revelar a barra.
  }, true);
  document.addEventListener('pointerdown', () => { teclado = false; }, true); // Clique não prende o cabeçalho durante leitura.
  document.addEventListener('wheel', () => { teclado = false; }, { passive: true }); // Roda volta a controlar o movimento.
  document.addEventListener('focusin', event => {
    if (bar.contains(event.target) || faixa.contains(event.target) || event.target.closest('#drawer')) mostrar(true); // Foco visível.
  });
})();
