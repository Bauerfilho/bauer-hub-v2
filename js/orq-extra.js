/* ============================================================================
   HUBv3 — Módulo "Orquestrador extra" (frentes F-D/E/F/G/H/I/J · contrato de 28/08)
   ----------------------------------------------------------------------------
   F-D Login (identidade e acolhimento, NÃO segurança — declarado no LEIA-ME) ·
   F-E Rodapé dela em toda receita e orientação (MutationObserver nos prints) ·
   F-G Histórico com 3 meses (oferta explícita pós-print + repetir + expurgo) ·
   F-H UI do Dossiê (farmácia da unidade + esqueminhas — dados SOBERANOS do
   brain em js/farmacia.js e js/dossie-orq.js: só consome, não reescreve) ·
   F-I Coroa por esquema (DORMANT-GATED: só acorda se os cards do codex
   existirem — #regimenCards div[data-slot="f2"]; sem eles, zero efeito).
   Padrões herdados do módulo F2: IIFE, fail-closed, zero rede, ubs2026.v1.*.
   ========================================================================== */
window.F2X = (() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const DB = () => window.F2DB;

  let ultimoExpurgo = 0;          // F-G: quantas entradas o boot removeu (>90d)
  let snapshotImpressao = null;   // F-G: o que acabou de ser impresso pelo hub
  let coroasArmadas = false;      // F-I: true quando os cards do codex existem

  // Escapa texto antes de virar HTML (mesmo cuidado do módulo F2).
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Toast mínimo (divide o elemento #f2Toast com o módulo F2, se já existir).
  function avisar(msg) {
    let t = $('#f2Toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'f2Toast';
      t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#172033;color:#fff;padding:12px 20px;border-radius:12px;font-size:1rem;z-index:99;box-shadow:0 10px 30px rgba(0,0,0,.25);max-width:90vw;text-align:center;';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.display = 'block';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.style.display = 'none'; }, 2600);
  }

  function rotuloTipoDoc(tipo) {
    return { simples: 'Receituário simples', especial: 'Controle especial',
             orientacao: 'Orientação', livre: 'Livre' }[tipo] || 'Receituário simples';
  }

  // Catálogo do hub (JSON inline — mesma fonte que o boot do hub usa).
  function lerCatalogo() {
    try { return JSON.parse(document.querySelector('#catalogData').textContent); }
    catch (e) { return []; }
  }
  function topicoDoHash() {
    const hash = decodeURIComponent(location.hash.slice(1) || '');
    if (!hash) return null;
    return lerCatalogo().find(t => t.id === hash) || null;
  }

  /* ==========================================================================
     F-D · LOGIN — overlay de boot. CRM Orquestrator + senha Medicalhub1234.
     É identidade e acolhimento: ao entrar, liga a personalização dela.
     ========================================================================== */
  function montarLogin() {
    if (DB().sessao.ler()) { personalizar(); aplicarRepeticaoPendente(); return; }
    if ($('#f2xLogin')) return;
    const fundo = document.createElement('div');
    fundo.id = 'f2xLogin';
    fundo.innerHTML =
      '<div class="f2x-login-card" role="dialog" aria-modal="true" aria-label="Entrada do Orquestrador">' +
        '<div class="orq-emblema" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.4" fill="none" stroke="#15181D" stroke-width="2.4"/><rect x="9.1" y="9.1" width="5.8" height="5.8" rx="1" transform="rotate(45 12 12)" fill="#15181D"/></svg></div>' +
        '<div class="orq-wordmark" aria-label="Orquestrator Medical Hub"><svg viewBox="0 0 380 44"><text id="orqTxt" x="190" y="33" text-anchor="middle" style="font-family:Archivo Black,Inter,ui-sans-serif,sans-serif" font-size="27" letter-spacing="4" fill="#15181D">ORQUESTRATOR</text><rect id="orqQ" x="105" y="29.2" width="9.5" height="3.8" rx="1" transform="rotate(40 109.5 31)" fill="#C9A227"/><rect id="orqA" x="244" y="26.8" width="10.5" height="2.9" rx="0.8" fill="#C9A227"/><polygon id="orqR" points="327,33 335,33 335,23.5" fill="#C9A227"/></svg><div class="orq-wordsub"><span class="w">MEDICAL</span><span class="orq-losango"></span><span class="w">HUB</span></div></div>' +
        '<p>Bem-vindo(a) ao seu HUB de receituários.</p>' +
        '<label for="f2xLoginCrm">Login</label>' +
        '<input type="text" id="f2xLoginCrm" inputmode="numeric" autocomplete="off">' +
        '<label for="f2xLoginSenha">Senha</label>' +
        '<input type="password" id="f2xLoginSenha">' +
        '<div class="f2x-login-erro" role="alert"></div>' +
        '<button type="button" class="f2-btn f2-btn-primario" id="f2xLoginEntrar">Entrar</button>' +
        '<button type="button" class="f2x-esqueci" id="f2xEsqueci">Esqueci minha senha</button>' +
      '</div>';
    document.body.appendChild(fundo);
    const crm = fundo.querySelector('#f2xLoginCrm');
    const senha = fundo.querySelector('#f2xLoginSenha');
    const erro = fundo.querySelector('.f2x-login-erro');
    crm.focus();
    const tentar = () => {
      const ok = DB().sessao.entrar(crm.value, senha.value);
      if (!ok) { erro.textContent = 'Login ou senha não conferem. Tente de novo.'; senha.value = ''; senha.focus(); return; }
      fundo.remove();
      personalizar();
      aplicarRepeticaoPendente();
    };
    fundo.querySelector('#f2xLoginEntrar').addEventListener('click', tentar);
    fundo.addEventListener('keydown', e => { if (e.key === 'Enter') tentar(); });
    fundo.querySelector('#f2xEsqueci').addEventListener('click', () => montarResetSenha());
  }

  /* ==========================================================================
     ADENDO 10 (3) · ESQUECI MINHA SENHA
     Pede o CRM (Orquestrator = a chave) → define senha NOVA 2x → grava em
     ubs2026.v1.meta.senhaCustom (sessao.entrar passa a exigir a nova) →
     notificação ao WhatsApp dela (real via gateway plugável, ou wa.me pronto).
     ========================================================================== */
  function montarResetSenha() {
    const fundo = $('#f2xLogin');
    if (!fundo) return;
    const card = fundo.querySelector('.f2x-login-card');
    card.innerHTML =
      '<div class="orq-emblema" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.4" fill="none" stroke="#15181D" stroke-width="2.4"/><rect x="9.1" y="9.1" width="5.8" height="5.8" rx="1" transform="rotate(45 12 12)" fill="#15181D"/></svg></div>' +
      '<h2>Redefinir senha</h2>' +
      '<p>Para provar que é você, digite o CRM da unidade. Depois escolha a senha nova, com calma.</p>' +
      '<label for="f2xResetCrm">CRM</label>' +
      '<input type="text" id="f2xResetCrm" inputmode="numeric" autocomplete="off">' +
      '<label for="f2xResetS1">Senha nova</label>' +
      '<input type="password" id="f2xResetS1">' +
      '<label for="f2xResetS2">Repita a senha nova</label>' +
      '<input type="password" id="f2xResetS2">' +
      '<div class="f2x-login-erro" role="alert"></div>' +
      '<button type="button" class="f2-btn f2-btn-primario" id="f2xResetOk">Redefinir senha</button>' +
      '<button type="button" class="f2x-esqueci" id="f2xResetVoltar">Voltar para a entrada</button>';
    const crm = card.querySelector('#f2xResetCrm');
    const s1 = card.querySelector('#f2xResetS1');
    const s2 = card.querySelector('#f2xResetS2');
    const erro = card.querySelector('.f2x-login-erro');
    crm.focus();
    const redefinir = () => {
      if (String(crm.value).trim() !== 'Orquestrator') { erro.textContent = 'CRM não confere. O reset usa o CRM da unidade.'; return; }
      if (s1.value.length < 4) { erro.textContent = 'A senha nova precisa ter pelo menos 4 caracteres.'; return; }
      if (s1.value !== s2.value) { erro.textContent = 'As duas senhas novas não são iguais. Confira e repita.'; return; }
      try {
        DB().sessao.trocarSenha(s1.value);
      } catch (err) { erro.textContent = err.message; return; }
      notificarWhatsAppSenha();
      card.innerHTML =
        '<div class="orq-emblema" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.4" fill="none" stroke="#15181D" stroke-width="2.4"/><rect x="9.1" y="9.1" width="5.8" height="5.8" rx="1" transform="rotate(45 12 12)" fill="#15181D"/></svg></div>' +
        '<h2>Senha alterada</h2>' +
        '<p>Sua senha nova já vale a partir de agora. Um aviso foi disparado para o seu WhatsApp.</p>' +
        '<button type="button" class="f2-btn f2-btn-primario" id="f2xResetEntrar">Entrar com a senha nova</button>';
      card.querySelector('#f2xResetEntrar').addEventListener('click', () => {
        fundo.remove();
        montarLogin(); // cartão de entrada novinho em folha
      });
    };
    card.querySelector('#f2xResetOk').addEventListener('click', redefinir);
    card.addEventListener('keydown', e => { if (e.key === 'Enter') redefinir(); });
    card.querySelector('#f2xResetVoltar').addEventListener('click', () => {
      fundo.remove();
      montarLogin();
    });
  }

  // Notificação da troca ao WhatsApp dela ( ):
  //  TENTA envio real via rede — gateway PLUGÁVEL em meta.whatsappGateway
  //  (POST JSON {para, texto}); sem gateway configurado ou se a rede falhar,
  //  abre wa.me com o texto pronto. A lei nova: rede é permitida quando ajuda.
  function notificarWhatsAppSenha() {
    const agora = new Date().toLocaleString('pt-BR');
    const texto = 'Sua senha do Receituários Orquestrador foi alterada em ' + agora + '. Se não foi você, troque a senha.';
    const gw = (DB().meta.ler().whatsappGateway || '').trim();
    const abrirWaMe = () => {
      try {
        window.open('https://wa.me/ ?text=' + encodeURIComponent(texto), '_blank', 'noopener');
        return true;
      } catch (e) { return false; }
    };
    if (gw) {
      try {
        fetch(gw, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ para: ' ', texto }),
        }).catch(() => abrirWaMe()); // rede falhou → wa.me pronto
      } catch (e) { abrirWaMe(); }
    } else {
      abrirWaMe();
    }
    DB().meta.marcar('senhaAvisoEm', new Date().toISOString());
  }

  function cidadeAtual() {
    return (DB().meta.ler().rodapeLocal || 'Goiânia - GO').trim() || 'Goiânia - GO';
  }

  // Adendo 9 — a UNIDADE editável ("vai que um dia ela se mude"). O hub já lê
  // os overrides em ubs2026.v1.meta (unidadeInfo() no cabeçalho das folhas,
  // tema na marca/dedicatória); aqui é o EDITOR + o re-render.
  function unidadeAtual() {
    return (DB().meta.ler().unidadeNome || '').trim() || 'Clínica do Orquestrador';
  }
  function unidadeInfoAtual() {
    const m = DB().meta.ler();
    return {
      nome: (m.unidadeNome || '').trim() || 'Clínica do Orquestrador',
      end: (m.unidadeEndereco || '').trim() || 'Clínica do Orquestrador',
      cid: (m.unidadeCidadeCep || '').trim() || 'Goiânia/GO - CEP  ',
    };
  }

  function abrirEditorUnidade() {
    const linha = $('#f2xSaudacao .f2x-unidade-linha');
    if (!linha) return;
    const u = unidadeInfoAtual();
    linha.innerHTML =
      '<span class="f2x-uni-editor">' +
      'Unidade: <input type="text" id="f2xUniNome" value="' + esc(u.nome) + '" autocomplete="off" aria-label="Nome da unidade"> ' +
      'Endereço: <input type="text" id="f2xUniEnd" value="' + esc(u.end) + '" autocomplete="off" aria-label="Endereço da unidade"> ' +
      'Cidade/CEP: <input type="text" id="f2xUniCid" value="' + esc(u.cid) + '" autocomplete="off" aria-label="Cidade e CEP da unidade"> ' +
      '<button type="button" class="f2x-link" data-f2x="unidade-salvar">Salvar</button> ' +
      '<button type="button" class="f2x-link" data-f2x="unidade-padrao">Voltar ao padrão</button> ' +
      '<button type="button" class="f2x-link" data-f2x="unidade-cancelar">Cancelar</button></span>';
    linha.querySelector('#f2xUniNome').focus();
  }
  function fecharEditorUnidade() {
    const chip = $('#f2xSaudacao');
    if (chip) chip.remove();
    personalizar();
  }
  // Re-render: cabeçalho das folhas abertas (unitHeader novo) + marca e
  // dedicatória — mesmo gesto do editor de cidade.
  function rerenderUnidade() {
    // folhas: clica a aba ativa — switchTab re-renderiza a folha com o cabeçalho novo
    const aba = document.querySelector('.tab-btn.active') || document.querySelector('[data-tab="recipe"]');
    if (aba && !aba.disabled) aba.click();
    // marca na appbar + dedicatória (espelho da lógica do tema)
    const nome = unidadeAtual();
    const brand = document.querySelector('.brand span');
    if (brand && (/USF|UBS|CSF/i.test(brand.textContent) || DB().meta.ler().unidadeNome)) {
      brand.textContent = nome + ' · 2026';
    }
    const ded = document.querySelector('.orq-dedicatoria');
    if (ded) ded.innerHTML = '<span class="orq-coroa"></span>' + esc(nome);
  }
  function salvarUnidade() {
    const m = DB().meta;
    const campos = [['unidadeNome', '#f2xUniNome'], ['unidadeEndereco', '#f2xUniEnd'], ['unidadeCidadeCep', '#f2xUniCid']];
    for (const [chave, sel] of campos) {
      const el = document.querySelector(sel);
      const v = el && el.value.trim();
      if (v) m.marcar(chave, v); else m.remover(chave); // campo vazio = sem override
    }
    fecharEditorUnidade();
    rerenderUnidade();
    avisar('Unidade atualizada.');
  }
  function voltarUnidadePadrao() {
    const m = DB().meta;
    m.remover('unidadeNome'); m.remover('unidadeEndereco'); m.remover('unidadeCidadeCep');
    fecharEditorUnidade();
    rerenderUnidade();
    avisar('Voltou à unidade padrão.');
  }

  // A personalização dela na home: saudação com coroa + cidade do rodapé + sair.
  function personalizar() {
    if ($('#f2xSaudacao')) return;
    const shell = $('#hubView .shell');
    if (!shell) return;
    const s = DB().sessao.ler();
    if (!s) return;
    // Liga o MODO DELA do tema da casa (marfim/ouro) — a personalização na
    // linguagem do próprio hub. Sem tema carregado, segue tudo igual.
    if (window.TEMA && window.TEMA.Orquestrador) window.TEMA.Orquestrador(true);
    const div = document.createElement('div');
    div.id = 'f2xSaudacao';
    div.innerHTML =
      '<span class="orq-coroa f2x-saudacao-coroa" aria-hidden="true"></span>' +
      '<div class="f2x-saudacao-texto"><strong>Olá, <span class="orq-coroa orq-coroa-inline" aria-label="Orquestrador"></span></strong>' +
      '<span>Especialista em Medicina de Família e Comunidade</span>' +
      '<span class="f2x-cidade-linha">Cidade do rodapé: <b>' + esc(cidadeAtual()) + '</b> ' +
      '<button type="button" class="f2x-link" data-f2x="cidade" title="Mudar a cidade do rodapé">alterar</button></span>' +
      '<span class="f2x-unidade-linha">Unidade: <b>' + esc(unidadeAtual()) + '</b> ' +
      '<button type="button" class="f2x-link" data-f2x="unidade" title="Mudar a unidade">alterar</button></span></div>' +
      '<button type="button" class="f2-btn f2-btn-secundario f2-btn-mini" data-f2x="sair">Sair</button>';
    shell.insertBefore(div, shell.firstChild);
  }

  function abrirEditorCidade() {
    const linha = $('#f2xSaudacao .f2x-cidade-linha');
    if (!linha) return;
    linha.innerHTML =
      'Cidade do rodapé: <input type="text" id="f2xCidadeInp" value="' + esc(cidadeAtual()) + '" autocomplete="off"> ' +
      '<button type="button" class="f2x-link" data-f2x="cidade-salvar">Salvar</button> ' +
      '<button type="button" class="f2x-link" data-f2x="cidade-cancelar">Cancelar</button>';
    linha.querySelector('#f2xCidadeInp').focus();
  }
  function fecharEditorCidade() {
    const chip = $('#f2xSaudacao');
    if (chip) chip.remove();
    personalizar();
  }
  function salvarCidade() {
    const inp = $('#f2xCidadeInp');
    const v = inp && inp.value.trim() ? inp.value.trim() : 'Goiânia - GO';
    DB().meta.marcar('rodapeLocal', v);
    injetarRodapes(true); // re-carimba as folhas abertas com a cidade nova
    fecharEditorCidade();
    avisar('Cidade do rodapé atualizada.');
  }

  /* ==========================================================================
     F-E · O RODAPÉ DELA EM TODA RECEITA E ORIENTAÇÃO
     MutationObserver nos mounts de impressão do hub (#recipePrint /
     #orientationPrint): a cada render do hub, re-injeta as 4 linhas no fim de
     CADA via (.rx-copy) e da moldura da orientação — fora do carimbo, impresso.
     O espaço foi aberto antes, de forma permanente, no f2.css (caixas absolutas
     do hub encolhem alguns mm) — por isso o fit/espelho do hub não sente nada.
     ========================================================================== */
  function injetarRodapes(forcar) {
    // Adendo 2 (3): receita REIMPRESSA do histórico leva o selo dela NO LOCAL
    // do carimbo/assinatura (modo "carimbo"); impressão comum: rodapé no pé.
    const carimbo = !!(DB().meta.ler().reimpressaoCarimbo);
    const limpar = raiz => {
      const a = raiz.querySelector('.f2x-rodape-dra'); if (a) a.remove();
      const b = raiz.querySelector('.f2x-rodape-dra-carimbo'); if (b) b.remove();
      const sig = raiz.querySelector('.signature-line.f2x-sig-oculta');
      if (sig) sig.classList.remove('f2x-sig-oculta');
    };
    // Adendo 6 — o selo ancora NO ELEMENTO DA LINHA DE ASSINATURA: vai
    // imediatamente abaixo dela, colado, centralizado (nunca solto no pé).
    const seloAposAssinatura = raiz => {
      const sig = raiz.querySelector('.signature-line');
      if (sig && !raiz.querySelector('.f2x-rodape-dra')) {
        sig.insertAdjacentHTML('afterend', DB().rodapeDraHTML('f2x-rodape-dra'));
      }
    };
    const seloNoCarimbo = raiz => {
      const sig = raiz.querySelector('.signature-line');
      if (sig && !raiz.querySelector('.f2x-rodape-dra-carimbo')) {
        sig.classList.add('f2x-sig-oculta'); // esconde "Assinatura - CRM" genérica
        sig.insertAdjacentHTML('afterend', DB().rodapeDraHTML('f2x-rodape-dra-carimbo'));
      }
    };
    document.querySelectorAll('#recipePrint .rx-copy').forEach(copia => {
      if (forcar) limpar(copia);
      if (carimbo) seloNoCarimbo(copia);
      else seloAposAssinatura(copia);
    });
    const frame = $('#orientationPrint .orientation-frame');
    if (frame) {
      if (forcar) limpar(frame);
      if (carimbo) seloNoCarimbo(frame);
      else seloAposAssinatura(frame);
    }
  }

  // Ciclo de vida do modo carimbo: vale só na doença da receita reimpressa.
  // Chamado pelo dram.js a cada troca de tópico.
  function limparSeloReimpressao(novoTopicId) {
    const m = DB().meta.ler().reimpressaoCarimbo;
    if (!m) return;
    if (novoTopicId && m.topicId === novoTopicId) return; // mesma doença: mantém
    DB().meta.remover('reimpressaoCarimbo');
    injetarRodapes(true); // volta assinatura genérica + rodapé no pé
  }
  function armarObservadoresRodape() {
    const obs = new MutationObserver(() => injetarRodapes(false));
    ['#recipePrint', '#orientationPrint'].forEach(sel => {
      const el = $(sel);
      if (el) obs.observe(el, { childList: true }); // só as vias (filhas diretas) — sem loop
    });
    injetarRodapes(false); // cobre o estado em que a página já abriu renderizada
  }

  /* ==========================================================================
     F-G · HISTÓRICO COM 3 MESES
     (1) oferta explícita "registrar no histórico" no fluxo de impressão —
         NUNCA automático silencioso; (2) expurgo no boot de entradas >90 dias
         (roda no iniciar, em qualquer página do módulo) + idade visível;
     (3) "Repetir esta receita" — recarrega para ajuste e reimpressão com
         data nova (a função-fim: renovação conferindo o que o paciente toma).
     ========================================================================== */
  function snapshotDoPortal() {
    const portal = $('#printPortal');
    if (!portal) return null;
    if (portal.querySelector('.f2-print-sheet')) return null; // impressão do módulo F2 (SOAP/esquema)
    const ehReceita = !!portal.querySelector('.rx-copy');
    const ehOrient = !!portal.querySelector('.orientation-page');
    if (!ehReceita && !ehOrient) return null; // folha de bloqueio do Ctrl+P etc.
    const corpo = ehReceita
      ? ((portal.querySelector('.rx-copy [data-sync="prescription"]') || {}).textContent || '')
      : ((portal.querySelector('.orientation-body') || {}).textContent || '');
    const sel = $('#regimenSelect');
    const opcao = sel && sel.selectedOptions && sel.selectedOptions[0];
    return {
      modo: ehReceita ? 'receita' : 'orientacao',
      tipo: portal.querySelector('.special-copy') ? 'especial' : (ehReceita ? 'simples' : 'orientacao'),
      topicId: decodeURIComponent(location.hash.slice(1) || ''),
      regimenId: sel ? sel.value : '',
      titulo: opcao ? opcao.textContent : '',
      corpo: String(corpo || '').trim(),
      pacienteNome: String(((portal.querySelector('[data-field="name"]') || {}).textContent) || '').trim(),
    };
  }
  function aoAntesDeImprimir() {
    // Roda DEPOIS do hub (que prepara o portal) — por isso o snapshot sai completo.
    snapshotImpressao = snapshotDoPortal();
  }
  function aoDepoisDeImprimir() {
    const snap = snapshotImpressao;
    snapshotImpressao = null;
    if (!snap || !snap.corpo) return;
    setTimeout(() => montarOferta(snap), 150); // deixa o navegador voltar do print
  }

  function montarOferta(snap) {
    if ($('.f2x-oferta-fundo')) return;
    const pacientes = DB().patients.listar().slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const fundo = document.createElement('div');
    fundo.className = 'f2-modal-fundo f2x-oferta-fundo';
    fundo.innerHTML =
      '<div class="f2-modal f2x-oferta" role="dialog" aria-modal="true" aria-label="Registrar no histórico">' +
        '<h2>Registrar esta receita no histórico?</h2>' +
        '<p class="f2x-oferta-resumo"><strong>' + esc(snap.titulo || 'Receita') + '</strong> · ' + esc(rotuloTipoDoc(snap.tipo)) +
        (snap.pacienteNome ? ' · ' + esc(snap.pacienteNome) : '') + '</p>' +
        '<label for="f2xOfertaPaciente">Paciente</label>' +
        '<select id="f2xOfertaPaciente">' +
          '<option value="">— Escolha o paciente —</option>' +
          pacientes.map(p => '<option value="' + esc(p.id) + '">' + esc(p.nome) + '</option>').join('') +
          '<option value="__novo__">＋ Novo paciente…</option>' +
        '</select>' +
        '<div class="f2x-oferta-novo" hidden>' +
          '<label for="f2xOfertaNovoNome">Nome do paciente</label>' +
          '<input type="text" id="f2xOfertaNovoNome" autocomplete="off" value="' + esc(snap.pacienteNome) + '">' +
        '</div>' +
        '<div class="f2-form-erro" role="alert"></div>' +
        '<div class="f2-form-acoes">' +
          '<button type="button" class="f2-btn f2-btn-secundario" data-f2o="agora-nao">Agora não</button>' +
          '<button type="button" class="f2-btn f2-btn-primario" data-f2o="registrar">Registrar</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(fundo);
    const selP = fundo.querySelector('#f2xOfertaPaciente');
    // Pré-seleciona quando o nome da folha bate com um paciente já cadastrado.
    if (snap.pacienteNome) {
      const alvo = DB().norm(snap.pacienteNome);
      const ach = pacientes.find(p => DB().norm(p.nome) === alvo);
      if (ach) selP.value = ach.id;
    }
    selP.addEventListener('change', () => {
      fundo.querySelector('.f2x-oferta-novo').hidden = selP.value !== '__novo__';
    });
    fundo.addEventListener('click', e => {
      const b = e.target.closest('[data-f2o]');
      if (!b || b.dataset.f2o === 'agora-nao' || e.target === fundo) { fundo.remove(); return; }
      const erro = fundo.querySelector('.f2-form-erro');
      try {
        let pid = selP.value;
        if (pid === '__novo__') {
          const nome = fundo.querySelector('#f2xOfertaNovoNome').value.trim();
          if (!nome) { erro.textContent = 'Dê o nome do paciente (ou escolha um da lista).'; return; }
          pid = DB().patients.criar({ nome }).id;
        }
        if (!pid) { erro.textContent = 'Escolha o paciente para registrar.'; return; }
        // Adendo 7 (5): multi-CID — a receita aparece no histórico de CADA
        // doença da sacola (contrato window.ATENDIMENTO.topicos()), com
        // fallback para a doença da folha impressa.
        let topicosRec = [];
        try {
          if (window.ATENDIMENTO && window.ATENDIMENTO.topicos) {
            const lista = window.ATENDIMENTO.topicos();
            if (Array.isArray(lista)) topicosRec = lista.filter(Boolean);
          }
        } catch (e2) {}
        if (!topicosRec.length && snap.topicId) topicosRec = [snap.topicId];
        DB().consults.registrarReceita({
          patientId: pid,
          topicIds: topicosRec,
          receita: { titulo: snap.titulo, corpo: snap.corpo, tipo: snap.tipo, regimenId: snap.regimenId },
        });
        fundo.remove();
        avisar('Receita registrada no histórico.');
        // A lista "Atendimentos nesta doença" reflete na hora, se estiver aberta.
        if (window.F2 && window.F2.onTopicOpen) {
          const t = topicoDoHash();
          if (t) window.F2.onTopicOpen(t);
        }
      } catch (err) {
        erro.textContent = err.message || 'Não consegui registrar.';
      }
    });
  }

  // "Repetir esta receita": guarda a intenção e navega para o hub na doença.
  function prepararRepeticao(consultId) {
    const c = DB().consults.buscar(consultId);
    if (!c || c.kind !== 'receita' || !c.receita) { avisar('Não encontrei esta receita no histórico.'); return; }
    DB().meta.marcar('repetir', { consultId: c.id });
    const tid = (c.topicIds || [])[0] || '';
    const jaNoHub = /index-f2\.html$/.test(location.pathname);
    const busca = (location.search ? location.search + '&' : '?') + 'f2x=rep';
    location.href = (jaNoHub ? location.pathname : 'index-f2.html') + busca + (tid ? '#' + encodeURIComponent(tid) : '');
  }

  // No boot do hub: se houver repetição pendente, carrega esquema + corpo +
  // nome do paciente + DATA NOVA — pronta para conferir, ajustar e imprimir.
  function aplicarRepeticaoPendente() {
    const pend = DB().meta.ler().repetir;
    if (!pend || !pend.consultId) return;
    DB().meta.remover('repetir'); // consome uma vez só, mesmo se algo falhar no meio
    const c = DB().consults.buscar(pend.consultId);
    if (!c || c.kind !== 'receita' || !c.receita) return;
    const tid = (c.topicIds || [])[0] || '';
    const hash = decodeURIComponent(location.hash.slice(1) || '');
    if (tid && hash && tid !== hash) return; // tópico aberto não é o da receita
    setTimeout(() => {
      try {
        const sel = $('#regimenSelect');
        if (sel && c.receita.regimenId && [...sel.options].some(o => o.value === c.receita.regimenId)) {
          sel.value = c.receita.regimenId;
          sel.dispatchEvent(new Event('change')); // o hub troca o esquema na tela
        }
        const ehOrient = c.receita.tipo === 'orientacao';
        if (ehOrient) {
          const aba = document.querySelector('[data-tab="orientation"]');
          if (aba) aba.click();
        }
        // Corpo na 1ª via editável — o hub espelha para a 2ª de graça (input delegate).
        const campo = ehOrient
          ? document.querySelector('#orientationPrint [data-field="orientation"]')
          : document.querySelector('#recipePrint .rx-copy [data-field="prescription"]');
        if (campo) {
          campo.innerText = c.receita.corpo;
          campo.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const pac = DB().patients.buscar(c.patientId);
        injetarCampoPaciente('name', pac ? pac.nome : '');
        injetarCampoPaciente('date', new Intl.DateTimeFormat('pt-BR').format(new Date()));
        // Adendo 2 (3): esta reimpressão veio do histórico — o selo dela vai
        // NO LUGAR do carimbo/assinatura (só nesta doença).
        DB().meta.marcar('reimpressaoCarimbo', { topicId: tid || hash });
        injetarRodapes(true);
        avisar('Receita carregada do histórico — confira, ajuste e imprima com a data nova.');
      } catch (e) { console.error('F2X: repetir falhou', e); }
    }, 120);
  }
  function injetarCampoPaciente(campo, valor) {
    const el = document.querySelector('#recipePrint .rx-copy [data-field="' + campo + '"]') ||
               document.querySelector('#orientationPrint [data-field="' + campo + '"]');
    if (!el) return;
    el.innerText = valor;
    el.dispatchEvent(new Event('input', { bubbles: true })); // hub sincroniza estado + 2ª via
  }

  /* ==========================================================================
     F-H · UI DO DOSSIÊ — a farmácia da unidade + os esqueminhas dela.
     Dados SOBERANOS (js/farmacia.js, js/dossie-orq.js): renderiza como
     estão, sem reescrever uma palavra do conteúdo clínico.
     ========================================================================== */
  // Adendo 8 (BRONCA): pendência/cobrança NUNCA na UI dela. Não existe selo
  // "confirmar" — disponibilidade desconhecida vira SEM selo, nunca tarefa.
  function seloUnidade(u) {
    return {
      'sim': ['✓ tem na unidade', 'f2x-selo-tem'],
      'sim-fora-da-lista': ['✓ tem (fora da lista)', 'f2x-selo-tem-fora'],
      'nao': ['✗ compra / rede', 'f2x-selo-compra'],
    }[u] || ['', ''];
  }
  function renderFarmacia(q) {
    const farm = window.FARMACIA_CSF;
    const alvo = $('#f2xFarmLista');
    if (!alvo) return;
    const termo = DB().norm(q);
    const itens = farm.itens.filter(i => !termo || DB().norm(i.nome).includes(termo) || DB().norm(i.cat).includes(termo));
    const cont = $('#f2xFarmContagem');
    if (cont) cont.textContent = itens.length + ' de ' + farm.itens.length + ' itens';
    if (!itens.length) { alvo.innerHTML = '<div class="f2-vazio">Nada encontrado na lista da farmácia.</div>'; return; }
    let html = '';
    for (const cat of farm.categorias) { // agrupa na ordem oficial das categorias
      const grupo = itens.filter(i => i.cat === cat);
      if (!grupo.length) continue;
      html += '<h3 class="f2x-farm-cat">' + esc(cat) + ' <span>(' + grupo.length + ')</span></h3><ul class="f2x-farm-lista">' +
        grupo.map(i =>
          '<li' + (i.riscado ? ' class="f2x-falta"' : '') + '><span class="f2x-farm-nome">' + esc(i.nome) + '</span>' +
          // Adendo 8: no máximo um discreto "possível falta" — sem verbo de cobrança.
          (i.riscado ? '<span class="f2x-selo-falta">possível falta</span>' : '') +
          (i.obs ? '<small class="f2x-obs">' + esc(i.obs) + '</small>' : '') + '</li>').join('') + '</ul>';
    }
    alvo.innerHTML = html;
  }
  function renderEsqueminhas(q) {
    const dos = window.DOSSIE_Orquestrador;
    const alvo = $('#f2xEsqLista');
    if (!alvo) return;
    const termo = DB().norm(q);
    let html = '';
    for (const esq of dos.esqueminhas) {
      const itens = esq.itens.filter(i => !termo || DB().norm(i.t).includes(termo) || DB().norm(i.d).includes(termo) || DB().norm(esq.tema).includes(termo));
      if (!itens.length && termo) continue;
      html += '<section class="f2x-esqmin"><h3>' + esc(esq.tema) + '</h3><ul>' +
        itens.map(i => {
          const selo = seloUnidade(i.unidade);
          return '<li><div class="f2x-esqmin-topo"><strong>' + esc(i.t) + '</strong>' +
            (selo[0] ? '<span class="f2x-selo ' + selo[1] + '">' + selo[0] + '</span>' : '') + '</div>' +
            '<p>' + esc(i.d) + '</p>' +
            (i.obs ? '<p class="f2x-obs">' + esc(i.obs) + '</p>' : '') +
            '</li>';
        }).join('') + '</ul></section>';
    }
    alvo.innerHTML = html || '<div class="f2-vazio">Nada encontrado nos esqueminhas.</div>';
  }
  function montarDossie() {
    const mount = $('#dossieMount');
    if (!mount || !window.FARMACIA_CSF || !window.DOSSIE_Orquestrador) return;
    const dos = window.DOSSIE_Orquestrador;
    const farm = window.FARMACIA_CSF;
    // Adendo 8: re-render do dado LIMPO — sem bloco de alertas, sem
    // notaRiscados, sem nada com cheiro de pendência na tela dela.
    mount.innerHTML =
      '<div class="f2x-dossie-aviso">' + esc(dos.avisoGeral || '') + '</div>' +
      '<div class="f2-card">' +
        '<input type="text" class="f2-busca" id="dossieBusca" placeholder="Buscar no dossiê (ex.: losartana)…" autocomplete="off">' +
      '</div>' +
      '<div class="f2-card">' +
        '<h2>Farmácia da unidade <span class="f2x-contagem" id="f2xFarmContagem"></span></h2>' +
        '<p class="f2x-fonte">' + esc(farm.unidade) + ' · ' + esc(farm.fonte) + '</p>' +
        '<div id="f2xFarmLista"></div>' +
      '</div>' +
      '<div class="f2-card">' +
        '<h2><span class="orq-esteto" aria-hidden="true"></span> Os esqueminhas do Orquestrador</h2>' +
        '<div id="f2xEsqLista"></div>' +
      '</div>';
    renderFarmacia('');
    renderEsqueminhas('');
    const busca = $('#dossieBusca');
    busca.addEventListener('input', () => { renderFarmacia(busca.value); renderEsqueminhas(busca.value); });
  }

  /* ==========================================================================
     F-I · COROA POR ESQUEMA — DORMANT-GATED.
     Só acorda se o codex entregar os cards: #regimenCards com
     div[data-slot="f2"][data-regimen-id] por card. Sem as âncoras, fica
     dormente SEM erro (fail-closed, padrão do módulo) e o #f2FavBtn do
     select continua no lugar.
     ========================================================================== */
  function armarCoroas() {
    const slots = document.querySelectorAll('#regimenCards div[data-slot="f2"]');
    if (!slots.length) return false; // dormente: os cards ainda não existem
    // Sequência dura do plano (A4): a estrela migra para os cards — o botão
    // único do select aposenta AGORA (e o dram.js não o recria: guard).
    const favAntigo = $('#f2FavBtn');
    if (favAntigo) favAntigo.remove();
    const topico = topicoDoHash();
    slots.forEach(slot => {
      if (slot.dataset.f2xArmado) return;
      slot.dataset.f2xArmado = '1';
      const rid = slot.dataset.regimenId || '';
      const marcado = !!(topico && DB().draOrq.ehFavorito(topico.id, rid));
      slot.innerHTML =
        '<button type="button" class="f2-btn f2-btn-mini f2-coroa" data-f2x="coroar" data-regimen="' + esc(rid) + '" title="Adicionar este esquema na seção da Dra.">Adicionar</button>' +
        '<button type="button" class="f2-btn f2-btn-secundario f2-btn-mini f2x-estrela-btn' + (marcado ? ' f2-fav-on' : '') + '" data-f2x="estrela" data-regimen="' + esc(rid) + '" title="Marcar como preferido">' + (marcado ? '⭐' : '☆') + '</button>';
    });
    coroasArmadas = true;
    return true;
  }
  function coroarEsquema(regimenId) {
    const topico = topicoDoHash();
    if (!topico) { avisar('Abra a doença para adicionar.'); return; }
    const regimen = (topico.regimens || []).find(r => r.id === regimenId);
    if (!regimen) { avisar('Não encontrei este esquema no guia.'); return; }
    const tipo = /special|control/i.test(String(regimen.documentType || '')) ? 'especial' : 'simples';
    const r = DB().draOrq.adicionarOuAtualizarProprio(topico.id, regimen.titulo, regimen.prescription || '', tipo);
    avisar(r.atualizado ? 'Já estava na sua seção — texto atualizado.' : 'Adicionado na sua seção — pode editar à vontade.');
    if (window.F2 && window.F2.onTopicOpen) window.F2.onTopicOpen(topico); // seção reflete na hora
  }
  function alternarEstrelaCard(regimenId, btn) {
    const topico = topicoDoHash();
    if (!topico) return;
    const regimen = (topico.regimens || []).find(r => r.id === regimenId);
    const on = DB().draOrq.alternarFavorito(topico.id, regimenId, regimen ? regimen.titulo : '');
    if (btn) { btn.classList.toggle('f2-fav-on', on); btn.textContent = on ? '⭐' : '☆'; }
    if (window.F2 && window.F2.onTopicOpen) window.F2.onTopicOpen(topico);
  }

  // Delegação de cliques do módulo extra (document-level, padrão do F2).
  function aoClicarExtra(ev) {
    const btn = ev.target.closest('[data-f2x]');
    if (!btn) return;
    const acao = btn.dataset.f2x;
    if (acao === 'repetir') prepararRepeticao(btn.dataset.id);
    else if (acao === 'coroar') coroarEsquema(btn.dataset.regimen);
    else if (acao === 'estrela') alternarEstrelaCard(btn.dataset.regimen, btn);
    else if (acao === 'sair') { DB().sessao.sair(); if (window.TEMA && window.TEMA.Orquestrador) window.TEMA.Orquestrador(false); location.reload(); }
    else if (acao === 'cidade') abrirEditorCidade();
    else if (acao === 'cidade-salvar') salvarCidade();
    else if (acao === 'cidade-cancelar') fecharEditorCidade();
    else if (acao === 'unidade') abrirEditorUnidade();
    else if (acao === 'unidade-salvar') salvarUnidade();
    else if (acao === 'unidade-padrao') voltarUnidadePadrao();
    else if (acao === 'unidade-cancelar') fecharEditorUnidade();
  }

  /* ==========================================================================
     Boot — roda em qualquer página onde o script esteja, com detecção do
     território pelas âncoras (fail-closed: o que não existe, não quebra).
     ========================================================================== */
  function iniciar() {
    if (!window.F2DB) { console.error('F2X: dados.js não carregou — módulo extra desligado, HUB intacto.'); return; }
    // F-G (2): retenção de 3 meses — expurgo no boot, em qualquer página do módulo.
    ultimoExpurgo = DB().consults.expurgarAntigos(90);
    if (ultimoExpurgo > 0) console.info('F2X: histórico — ' + ultimoExpurgo + ' entrada(s) com mais de 3 meses removida(s) no boot.');

    const noHub = !!($('#hubView') && $('#printPortal'));
    const noDossie = !!$('#dossieMount');

    document.addEventListener('click', aoClicarExtra);

    if (noHub) {
      armarObservadoresRodape();                                          // F-E
      window.addEventListener('beforeprint', aoAntesDeImprimir);          // F-G (snapshot)
      window.addEventListener('afterprint', aoDepoisDeImprimir);          // F-G (oferta)
      // F-I — o codex dispara 'hub:regimen-cards' NO DOCUMENT e sem bubbles
      // (CustomEvent padrão): o ouvinte tem de ser no document. No window
      // fica o reforço para o caso de alguém disparar por lá.
      document.addEventListener('hub:regimen-cards', () => armarCoroas());
      window.addEventListener('hub:regimen-cards', () => armarCoroas());
      armarCoroas();                                                      // F-I (se os cards já existirem)
      montarLogin();                                                      // F-D (→ personalizar + repetir)
    }
    if (noDossie) montarDossie();                                         // F-H
  }
  iniciar();

  return {
    montarDossie, prepararRepeticao, injetarRodapes, limparSeloReimpressao,
    coroasAtivas: () => coroasArmadas,
    ultimoExpurgo: () => ultimoExpurgo,
  };
})();
