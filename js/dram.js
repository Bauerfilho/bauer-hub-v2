/* ============================================================================
   F2b — O BOTÃO DA Orquestrador (frente mais importante)
   ----------------------------------------------------------------------------
   O que faz: dentro de CADA doença do HUB, no TOPO do workspace, monta a seção
   "Esquemas do Orquestrador": os esquemas PRÓPRIOS da casa (selo "Meu esquema")
   aparecem primeiro, depois os espelhos dos favoritos ⭐ do guia. Vazia, a
   seção mostra um convite curto + botão grande [＋ Adicionar meu esquema].
   Também monta "Atendimentos nesta doença" (o caminho inverso da F2).
   Onde grava: localStorage deste navegador (ver js/dados.js) — declarado na
   própria seção, com Exportar/Importar para trocar de computador.
   NADA sai para a internet: zero fetch / zero rede neste arquivo.
   ========================================================================== */
window.F2 = (() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const DB = () => window.F2DB;

  // Tópico aberto no momento (chega pelo gancho F2.onTopicOpen do HUB).
  let topicoAtual = null;
  // Flag do caminho de impressão F2 dentro do HUB (ver B6 no fim do arquivo).
  let impressaoF2Armada = null;

  // Escapa texto antes de virar HTML (proteção básica contra quebra/injeção).
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Aviso falado no rodapé da tela (o HUB tem #toast, mas a função dele é
  // interna; este é um toast mínimo do módulo, criado sob demanda).
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

  // Caixa de confirmação simples (2 gestos de verdade: ler e clicar de novo).
  function confirmar(titulo, texto, rotuloConfirmar, aoConfirmar) {
    const fundo = document.createElement('div');
    fundo.className = 'f2-modal-fundo';
    fundo.innerHTML =
      '<div class="f2-modal" role="dialog" aria-modal="true" aria-label="' + esc(titulo) + '">' +
        '<h2>' + esc(titulo) + '</h2><p>' + esc(texto) + '</p>' +
        '<div class="f2-form-acoes">' +
          '<button type="button" class="f2-btn f2-btn-secundario" data-acao="voltar">Voltar</button>' +
          '<button type="button" class="f2-btn f2-btn-perigo" data-acao="confirmar">' + esc(rotuloConfirmar) + '</button>' +
        '</div>' +
      '</div>';
    fundo.addEventListener('click', e => {
      const acao = e.target.closest('[data-acao]');
      if (!acao || acao.dataset.acao === 'voltar' || e.target === fundo) { fundo.remove(); return; }
      fundo.remove();
      aoConfirmar();
    });
    document.body.appendChild(fundo);
  }

  /* ==========================================================================
     B1 — A seção montada em TODA doença, no topo.
     Adendo 2: o título usa o ESTETOSCOPIO da casa (classe .orq-esteto — o tema
     desenha o SVG dourado; sem emoji) e ganhou TRÊS BOTÕES ao lado:
     [Histórico] [Meus esquemas] [SOAP]. Cada botão troca a view do corpo da
     seção; "Meus esquemas" é a view original (padrão ao abrir a doença).
     ========================================================================== */
  let visaoAtual = 'esquemas'; // 'esquemas' | 'historico' | 'soap'

  function renderizarSecao() {
    const mount = $('#draOrqMount');
    if (!mount || !topicoAtual) return;

    const aba = (id, rotulo) =>
      '<button type="button" role="tab" data-f2view="' + id + '" aria-selected="' + (visaoAtual === id) + '"' +
      (visaoAtual === id ? ' class="ativa"' : '') + '>' + rotulo + '</button>';

    let html =
      '<section class="f2-dra" aria-label="Área do Orquestrador nesta doença">' +
        '<div class="f2-dra-topo">' +
          '<h2 class="f2-coroa"><span class="orq-esteto" aria-hidden="true"></span> Esquemas do Orquestrador <span class="f2-esq-selo">nesta doença</span></h2>' +
          '<div class="f2-dra-abas" role="tablist" aria-label="Área da casa nesta doença">' +
            aba('historico', 'Histórico') + aba('esquemas', 'Meus esquemas') + aba('soap', 'SOAP') +
          '</div>' +
        '</div>';

    if (visaoAtual === 'historico') html += viewHistoricoHTML();
    else if (visaoAtual === 'soap') html += viewSoapHTML();
    else html += viewEsquemasHTML();

    html += '</section>';
    mount.innerHTML = html;
    if (visaoAtual === 'soap') ligarFormSoap();
  }

  // Adendo 3 (2) — DOSSIÊ POR DOENÇA: os esqueminhas do dossiê da casa aparecem
  // dentro da área de esquemas de cada doença relacionada, como cartão de
  // REFERÊNCIA ("Referência do Orquestrador") — NÃO é esquema imprimível do
  // guia. Mapa pronto do brain em js/dossie-mapa.js (tema → ids de tópicos);
  // tema sem tópico só aparece na página do dossiê. Dados soberanos: leitura
  // direta, sem reescrever uma palavra.
  function seloUnidadeLocal(u) {
    return { sim: ['✓ tem na unidade', 'f2x-selo-tem'],
      'sim-fora-da-lista': ['✓ tem (fora da lista)', 'f2x-selo-tem-fora'],
      nao: ['✗ compra / rede', 'f2x-selo-compra'],
    }[u] || ['', '']; // adendo 8: sem selo "confirmar" — desconhecido = sem selo
  }
  function cartoesReferenciaHTML() {
    if (!window.DOSSIE_MAPA || !window.DOSSIE_Orquestrador) return '';
    const mapa = window.DOSSIE_MAPA.temaParaTopicos || {};
    const temas = Object.keys(mapa).filter(t => (mapa[t] || []).includes(topicoAtual.id));
    if (!temas.length) return '';
    return temas.map(temaNome => {
      const esq = (window.DOSSIE_Orquestrador.esqueminhas || []).find(e => e.tema === temaNome);
      if (!esq) return '';
      return '<aside class="f2-ref-dra" aria-label="Referência do Orquestrador — ' + esc(temaNome) + '">' +
        '<h3><span class="orq-esteto" aria-hidden="true"></span> Referência do Orquestrador <span class="f2-ref-tema">' + esc(temaNome) + '</span></h3>' +
        '<p class="f2-ref-nota">Referência de como o Orquestrador costuma conduzir — não é esquema imprimível do guia.</p>' +
        '<ul>' + esq.itens.map(i => {
          const selo = seloUnidadeLocal(i.unidade);
          return '<li><div class="f2-esqmin-topo"><strong>' + esc(i.t) + '</strong>' +
            (selo[0] ? '<span class="f2x-selo ' + selo[1] + '">' + selo[0] + '</span>' : '') + '</div>' +
            '<p>' + esc(i.d) + '</p>' +
            (i.obs ? '<p class="f2x-obs">' + esc(i.obs) + '</p>' : '') + '</li>';
        }).join('') + '</ul></aside>';
    }).join('');
  }

  // View "Meus esquemas" — o conteúdo original da seção (B1/B2/B3/B4).
  function viewEsquemasHTML() {
    const dra = DB().draOrq;
    const proprios = dra.propriosDoTopico(topicoAtual.id);
    const favoritos = dra.favoritosDoTopico(topicoAtual.id);
    const vazio = proprios.length === 0 && favoritos.length === 0;

    let html = '<p class="f2-dra-sub">Os seus esquemas preferidos e os seus próprios, sempre primeiro.</p>';
    if (vazio) {
      // Convite curto quando vazio — vazio mudo "parece quebrado".
      html +=
        '<div class="f2-dra-vazio">' +
          '<p>Nenhum esquema seu aqui ainda.<br>Marque <strong>⭐</strong> num esquema do guia (botão ao lado da lista de esquemas) ou adicione o seu.</p>' +
          '<button type="button" class="f2-btn f2-btn-primario" data-f2="adicionar">＋ Adicionar meu esquema</button>' +
        '</div>';
    } else {
      html += '<div class="f2-esq-lista">';
      // 1º: esquemas PRÓPRIOS (selo "Meu esquema").
      for (const e of proprios) html += cartaoProprio(e);
      // 2º: espelhos dos favoritos do guia.
      for (const f of favoritos) html += cartaoEspelho(f);
      html += '</div>' +
        '<button type="button" class="f2-btn f2-btn-secundario" data-f2="adicionar">＋ Adicionar meu esquema</button>';
    }

    // Adendo 3 (2): cartões de referência do dossiê desta doença, se houver.
    html += cartoesReferenciaHTML();

    // Rodapé: declaração de onde grava + exportar/importar (B4).
    // Adendo 2: rótulos em linguagem simples — a casa não precisa saber o que é JSON.
    html +=
        '<div class="f2-dra-rodape">' +
          '<span class="f2-onde">Guardado <strong>neste computador, neste navegador</strong>. Nada vai para a internet. Para trocar de computador: exporte, leve o arquivo e importe no outro.</span>' +
          '<button type="button" class="f2-btn f2-btn-secundario" data-f2="exportar">Exportar meus esquemas</button>' +
          '<button type="button" class="f2-btn f2-btn-secundario" data-f2="importar">Importar de um arquivo</button>' +
          '<input type="file" accept="application/json,.json" data-f2="arquivo" hidden>' +
        '</div>';
    return html;
  }

  // View "Histórico" — TUDO o que foi registrado nesta doença (receitas,
  // orientações e atendimentos SOAP), do mais recente ao mais antigo.
  // Adendo 3 (1): as prescrições aparecem COMPLETAS na página (caso nº 1:
  // receita repetida de paciente que sempre volta pela mesma coisa).
  // Adendo 3 (4): lê como a PASTA "por doença" — o nome do paciente é atalho
  // cruzado para a pasta dele (registro único, duas leituras).
  // Selos informativos das marcações do adendo 7 (só informação, nunca cobrança).
  function rotuloTipoAtendimento(t) {
    return { agendado: 'Agendado', 'demanda-espontanea': 'Demanda espontânea',
             intercorrencia: 'Intercorrência', renovacao: 'Renovação de receita' }[t] || '';
  }
  function rotuloLocalAtendimento(l) {
    return { 'na-unidade': 'Na unidade', remoto: 'Remoto' }[l] || '';
  }
  function selosMarcacoesHTML(c) {
    const partes = [];
    if (c.tipoAtendimento && rotuloTipoAtendimento(c.tipoAtendimento)) {
      partes.push('<span class="f2-selo-marc">' + esc(rotuloTipoAtendimento(c.tipoAtendimento)) + '</span>');
    }
    if (c.localAtendimento && rotuloLocalAtendimento(c.localAtendimento)) {
      partes.push('<span class="f2-selo-marc f2-selo-local">' + esc(rotuloLocalAtendimento(c.localAtendimento)) + '</span>');
    }
    return partes.length ? '<span class="f2-marc-selos">' + partes.join('') + '</span>' : '';
  }
  function linhaTriagemHTML(c) {
    if (!c.triagem) return '';
    const t = c.triagem;
    const partes = [];
    if (t.peso) partes.push('Peso ' + esc(t.peso) + ' kg');
    if (t.altura) partes.push('Altura ' + esc(t.altura) + ' cm');
    if (t.imc) partes.push('IMC ' + esc(t.imc));
    if (t.circAbdominal) partes.push('CA ' + esc(t.circAbdominal) + ' cm');
    if (t.glicemia) partes.push('Glicemia ' + esc(t.glicemia));
    if (t.pa) partes.push('PA ' + esc(t.pa));
    if (t.oximetria) partes.push('SpO₂ ' + esc(t.oximetria) + '%');
    return partes.length ? '<div class="f2-tri-linha">' + partes.join(' · ') + '</div>' : '';
  }

  function linkPaciente(c, pac) {
    if (!pac) return '<strong>(paciente removido)</strong>';
    return '<a class="f2-link-pac" href="pacientes.html#p=' + encodeURIComponent(c.patientId) + '" title="Abrir a pasta deste paciente">' + esc(pac.nome) + '</a>';
  }
  function viewHistoricoHTML() {
    const lista = DB().consults.daDoenca(topicoAtual.id);
    let html = '<p class="f2-dra-sub"><span class="f2-pasta-selo">Pasta: por doença</span> Tudo o que foi registrado aqui — receitas, orientações e atendimentos. O nome do paciente abre a pasta dele.</p>';
    if (!lista.length) {
      return html + '<div class="f2-dra-vazio"><p>Nada registrado nesta doença ainda.<br>As receitas registradas após a impressão e os atendimentos SOAP aparecem aqui.</p></div>';
    }
    html += '<ul class="f2-hist-lista">';
    for (const c of lista) {
      const pac = DB().patients.buscar(c.patientId);
      const quando = new Date(c.datetime).toLocaleDateString('pt-BR');
      const idade = DB().idadeTexto(c.datetime);
      const carimboIdade = idade ? ' <span class="f2-atd-idade">(' + esc(idade) + ')</span>' : '';
      if (c.kind === 'receita' && c.receita) {
        const corpo = (c.receita.corpo || c.receita.titulo || '');
        html += '<li><div class="f2-hist-linha"><span class="f2-selo-receita">' + esc(rotuloTipo(c.receita.tipo)) + '</span>' +
          linkPaciente(c, pac) +
          '<span class="f2-atd-data">' + esc(quando) + carimboIdade + '</span></div>' +
          (c.receita.titulo && c.receita.corpo ? '<div class="f2-hist-titulo">' + esc(c.receita.titulo) + '</div>' : '') +
          (corpo ? '<div class="f2-hist-trecho">' + esc(corpo) + '</div>' : '') +
          '<div class="f2-esq-acoes"><button type="button" class="f2-btn f2-btn-primario f2-btn-mini" data-f2x="repetir" data-id="' + esc(c.id) + '">Repetir esta receita</button></div></li>';
      } else {
        const trecho = (c.s || c.p || '').slice(0, 160);
        html += '<li><div class="f2-hist-linha"><span class="f2-esq-selo f2-selo-guia">Atendimento SOAP</span>' +
          linkPaciente(c, pac) +
          selosMarcacoesHTML(c) +
          '<span class="f2-atd-data">' + esc(quando) + carimboIdade + '</span></div>' +
          linhaTriagemHTML(c) +
          (trecho ? '<div class="f2-hist-trecho">' + esc(trecho) + (trecho.length >= 160 ? '…' : '') + '</div>' : '') +
          '<div class="f2-esq-acoes"><a class="f2-btn f2-btn-secundario f2-btn-mini" href="atendimento.html#c=' + encodeURIComponent(c.id) + '">Abrir registro</a></div></li>';
      }
    }
    return html + '</ul>';
  }

  // View "SOAP" — nota de atendimento no padrão PEC, já ligada a esta doença.
  // ADENDO 7: (1) CIDs na AVALIAÇÃO (A amarela), união de TODAS as doenças da
  // sacola (window.ATENDIMENTO.topicos()), rótulo por doença, toque leva ao
  // texto da Avaliação · (2) marcações de 1 clique (tipo/local) salvas no
  // atendimento · (3) triagem no O com IMC automático · (4) nascimento pedido
  // ANTES, com acolhimento e sem cobrança · (5) salvar multi-CID: o registro
  // aparece no histórico de CADA doença da sacola.
  let marcTipo = '';  // tipo de atendimento escolhido na view atual
  let marcLocal = ''; // local escolhido na view atual

  // Títulos das doenças do catálogo (para os rótulos da união de CIDs).
  let _mapaTopicos = null;
  function tituloDoTopico(id) {
    if (!_mapaTopicos) {
      _mapaTopicos = {};
      try {
        const cat = JSON.parse(document.querySelector('#catalogData').textContent);
        for (const t of cat) _mapaTopicos[t.id] = t.titulo;
      } catch (e) {}
    }
    return _mapaTopicos[id] || id;
  }

  // As doenças vivas do atendimento: a sacola global (contrato do brain), com
  // fallback para a doença aberta se o contrato não existir.
  function topicosDoAtendimento() {
    try {
      if (window.ATENDIMENTO && window.ATENDIMENTO.topicos) {
        const lista = window.ATENDIMENTO.topicos();
        if (Array.isArray(lista) && lista.length) return lista;
      }
    } catch (e) {}
    return topicoAtual ? [topicoAtual.id] : [];
  }

  function viewSoapHTML() {
    const pacientes = DB().patients.listar().slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    // (1) UNIÃO de CIDs de todas as doenças da sacola, com rótulo por doença.
    const gruposCids = topicosDoAtendimento().map(tid => {
      const cids = (window.CIDS_COMPATIVEIS && window.CIDS_COMPATIVEIS.porTopico &&
        window.CIDS_COMPATIVEIS.porTopico[tid]) || [];
      return { tid, titulo: tituloDoTopico(tid), cids };
    }).filter(g => g.cids.length);
    const cidsHTML = gruposCids.length
      ? gruposCids.map(g =>
          '<div class="f2-cids-grupo"><h5>' + esc(g.titulo) + '</h5><ul class="f2-cids-lista">' +
          g.cids.map(par =>
            '<li><button type="button" class="f2-cid" data-cid="' + esc(par[0]) + '" data-desc="' + esc(par[1]) + '"><strong>' + esc(par[0]) + '</strong> ' + esc(par[1]) + '</button></li>').join('') +
          '</ul></div>').join('') +
        '<p class="f2-cids-nota">Toque numa sugestão para levá-la à Avaliação. O CID do atendimento é decisão da médica.</p>'
      : '<p class="f2-cids-nota">Nenhuma sugestão de CID cadastrada para esta(s) doença(s).</p>';

    return '<p class="f2-dra-sub">Nota de atendimento no padrão PEC, já ligada a esta doença.</p>' +
      '<div class="f2-form f2-soap-form">' +
        '<label for="f2SoapBuscaPac">Buscar paciente</label>' +
        '<input type="search" class="f2-busca" id="f2SoapBuscaPac" placeholder="Digite nome, CNS ou CPF…" autocomplete="off" aria-controls="f2SoapPacRes" aria-expanded="false">' +
        '<div class="f2-chip-busca-resultados" id="f2SoapPacRes" role="listbox" aria-label="Pacientes encontrados" hidden></div>' +
        '<label for="f2SoapPac">Ou escolha na lista completa</label>' +
        '<select id="f2SoapPac">' +
          '<option value="">— Escolha o paciente —</option>' +
          pacientes.map(p => '<option value="' + esc(p.id) + '">' + esc(p.nome) + '</option>').join('') +
          '<option value="__novo__">＋ Novo paciente…</option>' +
        '</select>' +
        '<label for="f2SoapCpf">CPF <span class="f2-opcional">(opcional — será guardado ao salvar o atendimento)</span></label>' +
        '<input type="text" id="f2SoapCpf" inputmode="numeric" autocomplete="off">' +
        // (4) NASCIMENTO ANTES — bloco acolhedor quando o paciente não tem a
        // data: sem ela, idade e IMC não saem certinhos. NUNCA bloqueia nem cobra.
        '<div class="f2-soap-nasc-antes" id="f2SoapNascFalta" hidden>' +
          '<p class="f2-nasc-antes-texto">Antes de tudo: me conta a <strong>data de nascimento</strong> do paciente? ' +
          'Com ela a idade e o IMC já saem certinhos aqui para você. 💛</p>' +
          '<div class="f2-soap-data-linha">' +
            '<input type="date" id="f2SoapNasc" aria-label="Data de nascimento do paciente">' +
            '<button type="button" class="f2-btn f2-btn-secundario f2-btn-mini" data-f2s="salvar-nasc">Guardar no cadastro (opcional)</button>' +
          '</div>' +
        '</div>' +
        '<div class="f2-soap-idade" id="f2SoapIdade" hidden></div>' +
        '<div id="f2SoapNovo" hidden>' +
          // nascimento pedido PRIMEIRO também no paciente novo
          '<label for="f2SoapNovoNasc">Data de nascimento <span class="f2-opcional">(para a idade e o IMC certinhos)</span></label>' +
          '<input type="date" id="f2SoapNovoNasc">' +
          '<label for="f2SoapNovoNome">Nome do paciente</label>' +
          '<input type="text" id="f2SoapNovoNome" autocomplete="off">' +
        '</div>' +
        // (2) MARCAÇÕES de 1 clique — botões de marcar, não texto.
        '<div class="f2-marcacoes">' +
          '<span class="f2-marc-rotulo">Tipo de atendimento</span>' +
          '<div class="f2-marc-grupo" role="group" aria-label="Tipo de atendimento">' +
            '<button type="button" data-tipo="agendado">Agendado</button>' +
            '<button type="button" data-tipo="demanda-espontanea">Demanda espontânea</button>' +
            '<button type="button" data-tipo="intercorrencia">Intercorrência</button>' +
            '<button type="button" data-tipo="renovacao">Renovação de receita</button>' +
          '</div>' +
          '<span class="f2-marc-rotulo">Local</span>' +
          '<div class="f2-marc-grupo" role="group" aria-label="Local do atendimento">' +
            '<button type="button" data-local="na-unidade">Na unidade</button>' +
            '<button type="button" data-local="remoto">Remoto</button>' +
          '</div>' +
        '</div>' +
        '<label for="f2SoapData">Data do atendimento</label>' +
        '<div class="f2-soap-data-linha"><input type="date" id="f2SoapData">' +
        '<button type="button" class="f2-btn f2-btn-secundario f2-btn-mini" data-f2s="hoje">Preencher data de hoje</button></div>' +
        '<div class="f2-soap">' +
          '<section class="f2-soap-bloco f2-soap-s"><h3><span class="f2-letra">S</span> Subjetivo — o que o paciente conta</h3>' +
            '<textarea id="f2SoapS" placeholder="Queixa, história, sintomas relatados…"></textarea></section>' +
          '<section class="f2-soap-bloco f2-soap-o"><h3><span class="f2-letra">O</span> Objetivo — o que você observa e mede</h3>' +
            // (3) TRIAGEM — campos curtos; IMC calculado automático.
            '<p class="f2-cids-nota" id="f2TriAnterior" hidden><strong>Valores da última consulta.</strong> Confira e ajuste antes de salvar.</p>' +
            '<div class="f2-triagem">' +
              '<div class="f2-tri-campo"><label for="f2TriPeso">Peso (kg)</label><input type="text" id="f2TriPeso" inputmode="decimal" autocomplete="off"></div>' +
              '<div class="f2-tri-campo"><label for="f2TriAltura">Altura (cm)</label><input type="number" id="f2TriAltura" min="0" step="1" inputmode="numeric"></div>' +
              '<div class="f2-tri-campo f2-tri-imc"><label for="f2TriImc">IMC (automático)</label><input type="text" id="f2TriImc" readonly tabindex="-1" placeholder="—"><span class="f2-tri-imc-classe" id="f2TriImcClasse"></span></div>' +
              '<div class="f2-tri-campo"><label for="f2TriCirc">Circ. abdominal (cm)</label><input type="number" id="f2TriCirc" min="0" step="1" inputmode="numeric"></div>' +
              '<div class="f2-tri-campo"><label for="f2TriGlic">Glicemia capilar</label><input type="number" id="f2TriGlic" min="0" step="1" inputmode="numeric"></div>' +
              '<div class="f2-tri-campo"><label for="f2TriPA">Pressão arterial</label><input type="text" id="f2TriPA" placeholder="ex.: 120x80" autocomplete="off"></div>' +
              '<div class="f2-tri-campo"><label for="f2TriOxi">Oximetria (%)</label><input type="number" id="f2TriOxi" min="0" max="100" step="1" inputmode="numeric"></div>' +
            '</div>' +
            '<textarea id="f2SoapO" placeholder="Exame físico, outros achados, resultados…"></textarea></section>' +
          '<section class="f2-soap-bloco f2-soap-a"><h3><span class="f2-letra">A</span> Avaliação — o seu raciocínio</h3>' +
            '<textarea id="f2SoapA" placeholder="Hipóteses, diagnóstico, CID, gravidade…"></textarea>' +
            // (1) o dossiê de CIDs vive AQUI agora (era do Plano).
            '<div class="f2-cids"><h4>CIDs compatíveis <span class="f2-cids-aviso">sugestões — conferir</span></h4>' +
            '<div id="f2SoapCidsPaciente"></div>' +
            cidsHTML +
            '<p class="f2-cids-nota">Somente os CIDs tocados pela médica serão guardados na ficha.</p>' +
            '</div>' +
          '</section>' +
          '<section class="f2-soap-bloco f2-soap-p"><h3><span class="f2-letra">P</span> Plano — o que fica decidido</h3>' +
            '<textarea id="f2SoapP" placeholder="Prescrição, exames, orientações, retorno…"></textarea></section>' +
        '</div>' +
        '<div class="f2-form-erro" role="alert"></div>' +
        '<div class="f2-form-acoes">' +
          '<button type="button" class="f2-btn f2-btn-primario" data-f2s="salvar">Salvar atendimento</button>' +
        '</div>' +
      '</div>';
  }

  // Liga os eventos da view SOAP (renderizada agora).
  function ligarFormSoap() {
    const mount = $('#draOrqMount');
    if (!mount) return;
    const selPac = mount.querySelector('#f2SoapPac');
    const buscaPac = mount.querySelector('#f2SoapBuscaPac');
    const resPac = mount.querySelector('#f2SoapPacRes');
    const inpCpf = mount.querySelector('#f2SoapCpf');
    const formSoap = mount.querySelector('.f2-soap-form');
    let cidsConfirmados = [];
    marcTipo = ''; marcLocal = ''; // marcações zeram a cada render da view

    const chaveCid = cid => DB().norm((cid && cid.codigo) || '') || DB().norm((cid && cid.rotulo) || '');
    const unirCids = (...listas) => {
      const mapa = new Map();
      listas.forEach(lista => (Array.isArray(lista) ? lista : []).forEach(item => {
        const cid = { codigo: String(item && item.codigo || '').trim(), rotulo: String(item && item.rotulo || '').trim() };
        const chave = chaveCid(cid);
        if (chave && !mapa.has(chave)) mapa.set(chave, cid);
      }));
      return [...mapa.values()];
    };
    const classeImc = imc => imc < 18.5 ? 'baixo peso' : imc < 25 ? 'eutrofia' : imc < 30 ? 'sobrepeso' : 'obesidade';
    const limparTriagem = () => {
      ['#f2TriPeso','#f2TriAltura','#f2TriImc','#f2TriCirc','#f2TriGlic','#f2TriPA','#f2TriOxi'].forEach(id => { mount.querySelector(id).value = ''; });
      mount.querySelector('#f2TriImcClasse').textContent = '';
      mount.querySelector('#f2TriAnterior').hidden = true;
    };
    const preencherTriagem = triagem => {
      limparTriagem();
      if (!triagem) return;
      const mapa = { f2TriPeso:'peso', f2TriAltura:'altura', f2TriImc:'imc', f2TriCirc:'circAbdominal', f2TriGlic:'glicemia', f2TriPA:'pa', f2TriOxi:'oximetria' };
      Object.entries(mapa).forEach(([id, campo]) => { mount.querySelector('#' + id).value = triagem[campo] || ''; });
      let imc = parseFloat(String(mount.querySelector('#f2TriImc').value).replace(',', '.'));
      if (!isFinite(imc)) {
        const peso = parseFloat(String(mount.querySelector('#f2TriPeso').value).replace(',', '.'));
        const altura = parseFloat(String(mount.querySelector('#f2TriAltura').value).replace(',', '.'));
        if (isFinite(peso) && peso > 0 && isFinite(altura) && altura > 0) {
          imc = peso / Math.pow(altura / 100, 2);
          mount.querySelector('#f2TriImc').value = imc.toFixed(1).replace('.', ',');
        }
      }
      mount.querySelector('#f2TriImcClasse').textContent = isFinite(imc) ? classeImc(imc) : '';
      mount.querySelector('#f2TriAnterior').hidden = false;
    };
    const ultimaTriagem = patientId => DB().consults.doPaciente(patientId)
      .find(c => c && c.kind !== 'receita' && c.triagem && Object.values(c.triagem).some(v => String(v || '').trim())) || null;
    const atualizarBotoesCid = () => {
      mount.querySelectorAll('button[data-cid]').forEach(btn => {
        const on = cidsConfirmados.some(cid => chaveCid(cid) === chaveCid({ codigo: btn.dataset.cid, rotulo: btn.dataset.desc }));
        btn.setAttribute('aria-pressed', String(on));
        btn.style.background = on ? '#FFF8E1' : '';
        btn.style.borderColor = on ? '#F9A825' : '';
      });
    };
    const renderCidsPaciente = paciente => {
      const alvo = mount.querySelector('#f2SoapCidsPaciente');
      const cidsTopicos = new Set([...mount.querySelectorAll('.f2-cids > .f2-cids-grupo button[data-cid]')]
        .map(btn => chaveCid({ codigo: btn.dataset.cid, rotulo: btn.dataset.desc })));
      const cids = (paciente && Array.isArray(paciente.cids) ? paciente.cids : [])
        .filter(cid => !cidsTopicos.has(chaveCid(cid)));
      alvo.innerHTML = cids.length
        ? '<div class="f2-cids-grupo"><h5>Da ficha do paciente</h5><ul class="f2-cids-lista">' + cids.map(cid =>
            '<li><button type="button" class="f2-cid" data-cid="' + esc(cid.codigo) + '" data-desc="' + esc(cid.rotulo) + '"><strong>' + esc(cid.codigo) + '</strong> ' + esc(cid.rotulo) + '</button></li>').join('') + '</ul></div>'
        : '';
      atualizarBotoesCid();
    };

    const atualizarIdade = () => {
      const idadeEl = mount.querySelector('#f2SoapIdade');
      const faltaEl = mount.querySelector('#f2SoapNascFalta');
      const p = DB().patients.buscar(selPac.value);
      if (!p) { idadeEl.hidden = true; faltaEl.hidden = true; return; }
      if (p.nascimento) {
        idadeEl.hidden = false;
        idadeEl.innerHTML = '<strong>' + esc(p.nome) + '</strong> · Nasc.: ' + esc(DB().dataBR(p.nascimento)) +
          ' · <strong>' + esc(DB().idadeDetalhada(p.nascimento)) + '</strong>';
        faltaEl.hidden = true;
      } else {
        // (4) sem nascimento: pede ANTES, com acolhimento, sem cobrar
        idadeEl.hidden = true;
        faltaEl.hidden = false;
      }
    };
    const aplicarPaciente = (valor, usarUltima) => {
      const p = DB().patients.buscar(valor);
      selPac.value = p ? p.id : (valor === '__novo__' ? '__novo__' : '');
      mount.querySelector('#f2SoapNovo').hidden = selPac.value !== '__novo__';
      buscaPac.value = p ? p.nome : '';
      inpCpf.value = p ? (p.cpf || '') : '';
      cidsConfirmados = [];
      renderCidsPaciente(p);
      atualizarIdade();
      const triagemDigitada = ['#f2TriPeso','#f2TriAltura','#f2TriCirc','#f2TriGlic','#f2TriPA','#f2TriOxi']
        .some(id => String(mount.querySelector(id).value || '').trim());
      if (triagemDigitada) { /* triagem digitada pela médica não se apaga na troca de paciente */ }
      else if (usarUltima && p) {
        const ultima = ultimaTriagem(p.id);
        preencherTriagem(ultima && ultima.triagem);
      } else limparTriagem();
      resPac.hidden = true;
      buscaPac.setAttribute('aria-expanded', 'false');
    };
    selPac.addEventListener('change', () => {
      aplicarPaciente(selPac.value, true);
    });
    buscaPac.addEventListener('input', () => {
      const q = buscaPac.value.trim();
      if (!q) { resPac.hidden = true; resPac.innerHTML = ''; buscaPac.setAttribute('aria-expanded', 'false'); return; }
      const achados = DB().patients.procurar(q).slice(0, 10);
      resPac.innerHTML = achados.map(p => '<button type="button" role="option" data-soap-paciente="' + esc(p.id) + '"><strong>' + esc(p.nome) + '</strong>' +
        (p.cns ? ' <span class="f2-cat">· CNS ' + esc(p.cns) + '</span>' : '') +
        (p.cpf ? ' <span class="f2-cat">· CPF ' + esc(p.cpf) + '</span>' : '') + '</button>').join('') ||
        '<button type="button" disabled>Nenhum paciente encontrado</button>';
      resPac.hidden = false;
      buscaPac.setAttribute('aria-expanded', 'true');
    });
    resPac.addEventListener('click', ev => {
      const b = ev.target.closest('[data-soap-paciente]');
      if (b) aplicarPaciente(b.dataset.soapPaciente, true);
    });
    buscaPac.addEventListener('blur', () => setTimeout(() => {
      if (!resPac.contains(document.activeElement)) {
        resPac.hidden = true;
        buscaPac.setAttribute('aria-expanded', 'false');
      }
    }, 0));

    // Idade calculada ao vivo enquanto digita (nos dois campos de nascimento).
    const mostrarIdadeDe = (iso, nomeRef) => {
      const idadeEl = mount.querySelector('#f2SoapIdade');
      const idade = DB().idadeDetalhada(iso);
      if (!idade) { idadeEl.hidden = true; return; }
      idadeEl.hidden = false;
      idadeEl.innerHTML = (nomeRef ? '<strong>' + esc(nomeRef) + '</strong> · ' : '') +
        'Nasc.: ' + esc(DB().dataBR(iso)) + ' · <strong>' + esc(idade) + '</strong>';
    };
    const inpNovoNasc = mount.querySelector('#f2SoapNovoNasc');
    const inpNovoNome = mount.querySelector('#f2SoapNovoNome');
    const inpNascFalta = mount.querySelector('#f2SoapNasc');
    if (inpNovoNasc) inpNovoNasc.addEventListener('input', () => mostrarIdadeDe(inpNovoNasc.value, inpNovoNome.value.trim()));
    if (inpNovoNome) inpNovoNome.addEventListener('input', () => mostrarIdadeDe(inpNovoNasc.value, inpNovoNome.value.trim()));
    if (inpNascFalta) inpNascFalta.addEventListener('input', () => {
      const p = DB().patients.buscar(selPac.value);
      mostrarIdadeDe(inpNascFalta.value, p ? p.nome : '');
    });

    // (2) Marcações de 1 clique (single-select por grupo).
    mount.querySelector('.f2-marcacoes').addEventListener('click', ev => {
      const b = ev.target.closest('button[data-tipo],button[data-local]');
      if (!b) return;
      if (b.dataset.tipo !== undefined && b.dataset.tipo !== '') {
        marcTipo = (marcTipo === b.dataset.tipo) ? '' : b.dataset.tipo; // toque de novo desmarca
        mount.querySelectorAll('button[data-tipo]').forEach(x => x.classList.toggle('ativa', x.dataset.tipo === marcTipo));
      } else if (b.dataset.local) {
        marcLocal = (marcLocal === b.dataset.local) ? '' : b.dataset.local;
        mount.querySelectorAll('button[data-local]').forEach(x => x.classList.toggle('ativa', x.dataset.local === marcLocal));
      }
    });

    // (3) IMC calculado automático (peso kg / altura m², 1 casa) + classe.
    const recalcImc = () => {
      const peso = parseFloat(String(mount.querySelector('#f2TriPeso').value).replace(',', '.'));
      const altCm = parseFloat(String(mount.querySelector('#f2TriAltura').value).replace(',', '.'));
      const imcEl = mount.querySelector('#f2TriImc');
      const classeEl = mount.querySelector('#f2TriImcClasse');
      if (isFinite(peso) && peso > 0 && isFinite(altCm) && altCm > 0) {
        const m = altCm / 100;
        const imc = peso / (m * m);
        imcEl.value = imc.toFixed(1).replace('.', ',');
        classeEl.textContent = imc < 18.5 ? 'baixo peso' : imc < 25 ? 'eutrofia' : imc < 30 ? 'sobrepeso' : 'obesidade';
      } else {
        imcEl.value = '';
        classeEl.textContent = '';
      }
    };
    mount.querySelector('#f2TriPeso').addEventListener('input', recalcImc);
    mount.querySelector('#f2TriAltura').addEventListener('input', recalcImc);

    // (1) toque no CID confirma/desconfirma a sugestão e leva a confirmação à
    // AVALIAÇÃO. A lista da ficha nunca decide conduta sozinha.
    if (mount.querySelector('.f2-cids')) mount.querySelector('.f2-cids').addEventListener('click', ev => {
      const b = ev.target.closest('.f2-cid');
      if (!b) return;
      const cid = { codigo: b.dataset.cid, rotulo: b.dataset.desc };
      const chave = chaveCid(cid);
      const i = cidsConfirmados.findIndex(item => chaveCid(item) === chave);
      if (i >= 0) {
        cidsConfirmados.splice(i, 1);
        atualizarBotoesCid();
        return;
      }
      cidsConfirmados.push(cid);
      const alvo = mount.querySelector('#f2SoapA');
      const linha = 'CID-10: ' + b.dataset.cid + ' — ' + b.dataset.desc;
      if (!alvo.value.includes(linha)) alvo.value = alvo.value.trim() ? alvo.value.replace(/\s+$/, '') + '\n' + linha : linha;
      atualizarBotoesCid();
    });

    formSoap.addEventListener('click', ev => {
      const b = ev.target.closest('[data-f2s]');
      if (!b) return;
      const acao = b.dataset.f2s;
      const erro = mount.querySelector('.f2-form-erro');
      if (acao === 'hoje') {
        const d = new Date();
        const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        mount.querySelector('#f2SoapData').value = iso;
      } else if (acao === 'salvar-nasc') {
        const iso = mount.querySelector('#f2SoapNasc').value;
        if (!iso) { erro.textContent = 'Escolha a data de nascimento para guardar.'; return; }
        DB().patients.atualizar(selPac.value, { nascimento: iso });
        erro.textContent = '';
        atualizarIdade();
        avisar('Nascimento guardado no cadastro.');
      } else if (acao === 'salvar') {
        try {
          let pid = selPac.value;
          if (pid === '__novo__') {
            const nome = mount.querySelector('#f2SoapNovoNome').value.trim();
            if (!nome) { erro.textContent = 'Dê o nome do paciente (ou escolha um da lista).'; return; }
            pid = DB().patients.criar({ nome, nascimento: mount.querySelector('#f2SoapNovoNasc').value, cpf: inpCpf.value, cids: cidsConfirmados }).id;
          }
          if (!pid) { erro.textContent = 'Escolha o paciente antes de salvar.'; return; }
          const dataISO = mount.querySelector('#f2SoapData').value;
          const triagem = {
            peso: mount.querySelector('#f2TriPeso').value,
            altura: mount.querySelector('#f2TriAltura').value,
            imc: mount.querySelector('#f2TriImc').value,
            circAbdominal: mount.querySelector('#f2TriCirc').value,
            glicemia: mount.querySelector('#f2TriGlic').value,
            pa: mount.querySelector('#f2TriPA').value,
            oximetria: mount.querySelector('#f2TriOxi').value,
          };
          // (5) HISTÓRICO MULTI-CID: o registro entra em TODAS as doenças da sacola.
          const topicos = topicosDoAtendimento();
          DB().consults.criar({
            patientId: pid,
            datetime: dataISO ? new Date(dataISO + 'T12:00:00').toISOString() : new Date().toISOString(),
            topicIds: topicos.length ? topicos : [topicoAtual.id],
            s: mount.querySelector('#f2SoapS').value,
            o: mount.querySelector('#f2SoapO').value,
            a: mount.querySelector('#f2SoapA').value,
            p: mount.querySelector('#f2SoapP').value,
            tipoAtendimento: marcTipo,
            localAtendimento: marcLocal,
            triagem,
          });
          const paciente = DB().patients.buscar(pid);
          DB().patients.atualizar(pid, {
            cpf: inpCpf.value,
            cids: unirCids(paciente && paciente.cids, cidsConfirmados),
          });
          avisar('Atendimento salvo no histórico.');
          visaoAtual = 'historico';
          renderizarSecao();
          renderizarAtendimentos();
        } catch (err) {
          erro.textContent = err.message || 'Não consegui salvar. Tente de novo.';
        }
      }
    });
  }

  // Rótulo amigável do tipo de receituário escolhido por ela (F-F).
  function rotuloTipo(tipo) {
    return { simples: 'Receituário simples', especial: 'Controle especial',
             orientacao: 'Orientação', livre: 'Livre' }[tipo] || 'Receituário simples';
  }

  // Cartão de esquema PRÓPRIO (selo "Meu esquema" + selo do tipo escolhido).
  // F-J: se o texto tem hidroclorotiazida > 25 mg, o cartão mostra o aviso da
  // regra da casa — destacado, NUNCA bloqueio (imprime normal).
  function cartaoProprio(e) {
    const img = e.imagem
      ? '<img src="' + esc(e.imagem) + '" alt="Foto do esquema" onerror="this.style.display=\'none\'">'
      : '';
    const doseHctz = DB().hctzAcimaDe25 ? DB().hctzAcimaDe25(e.texto) : null;
    return (
      '<article class="f2-esq" data-id="' + esc(e.id) + '">' +
        '<div class="f2-esq-topo"><span class="f2-esq-titulo">' + esc(e.nome) + '</span>' +
        '<span class="f2-esq-selo">Meu esquema</span>' +
        (e.tipo ? '<span class="f2-esq-selo f2-selo-tipo">' + esc(rotuloTipo(e.tipo)) + '</span>' : '') +
        '</div>' +
        (doseHctz ? '<div class="f2-hctz-aviso" role="alert">Regra da casa: hidroclorotiazida no máximo 25 mg — este esquema cita ' + esc(String(doseHctz).replace('.', ',')) + ' mg.</div>' : '') +
        (e.texto ? '<div class="f2-esq-texto">' + esc(e.texto) + '</div>' : '') +
        img +
        '<div class="f2-esq-acoes">' +
          '<button type="button" class="f2-btn f2-btn-secundario" data-f2="imprimir" data-id="' + esc(e.id) + '">Imprimir</button>' +
          '<button type="button" class="f2-btn f2-btn-secundario" data-f2="editar" data-id="' + esc(e.id) + '">Editar</button>' +
          '<button type="button" class="f2-btn f2-btn-secundario" data-f2="apagar" data-id="' + esc(e.id) + '">Apagar</button>' +
        '</div>' +
      '</article>'
    );
  }

  // Cartão-ESPELHO de favorito do guia (não copia conteúdo: aponta pro esquema).
  function cartaoEspelho(f) {
    return (
      '<article class="f2-esq" data-regimen="' + esc(f.regimenId) + '">' +
        '<div class="f2-esq-topo"><span class="f2-esq-titulo">' + esc(f.titulo || 'Esquema do guia') + '</span>' +
        '<span class="f2-esq-selo f2-selo-guia">⭐ Do guia</span></div>' +
        '<div class="f2-esq-acoes">' +
          '<button type="button" class="f2-btn f2-btn-primario" data-f2="abrir" data-regimen="' + esc(f.regimenId) + '">Abrir</button>' +
          '<button type="button" class="f2-btn f2-btn-secundario" data-f2="desmarcar" data-regimen="' + esc(f.regimenId) + '">Tirar a estrela</button>' +
        '</div>' +
      '</article>'
    );
  }

  /* ==========================================================================
     B3 — Adicionar/editar esquema próprio: formulário de 2 campos
     (só o NOME é obrigatório — ordem do contrato)
     ========================================================================== */
  function abrirFormulario(edicao) {
    const mount = $('#draOrqMount');
    if (!mount || !topicoAtual) return;
    const velho = mount.querySelector('.f2-form');
    if (velho) velho.remove(); // fecha um formulário aberto antes

    const form = document.createElement('div');
    form.className = 'f2-form';
    form.innerHTML =
      '<label for="f2Nome">Nome do esquema</label>' +
      '<input type="text" id="f2Nome" autocomplete="off" value="' + esc(edicao ? edicao.nome : '') + '">' +
      '<label for="f2Tipo">Tipo de receituário <span class="f2-opcional">(à sua escolha)</span></label>' +
      '<select id="f2Tipo">' +
        '<option value="simples">Receituário simples</option>' +
        '<option value="especial">Controle especial</option>' +
        '<option value="orientacao">Orientação</option>' +
        '<option value="livre">Outro / livre</option>' +
      '</select>' +
      '<label for="f2Texto">Como eu faço <span class="f2-opcional">(opcional — posologia, observação, o que quiser)</span></label>' +
      '<textarea id="f2Texto">' + esc(edicao ? edicao.texto : '') + '</textarea>' +
      '<div class="f2-hctz-aviso" role="alert" hidden></div>' +
      '<div class="f2-form-erro" role="alert"></div>' +
      '<div class="f2-form-acoes">' +
        '<button type="button" class="f2-btn f2-btn-primario" data-f2f="salvar">Salvar</button>' +
        '<button type="button" class="f2-btn f2-btn-secundario" data-f2f="cancelar">Cancelar</button>' +
      '</div>';
    // O formulário entra logo após a lista, dentro da seção.
    mount.querySelector('.f2-dra').appendChild(form);
    form.querySelector('#f2Tipo').value = edicao && edicao.tipo ? edicao.tipo : 'simples';
    form.querySelector('#f2Nome').focus();

    // F-J — aviso da regra da casa (HCTZ > 25 mg) aparece ENQUANTO digita.
    // É aviso destacado, nunca bloqueio: salvar e imprimir seguem livres.
    const avisoHctz = form.querySelector('.f2-hctz-aviso');
    const conferirHctz = () => {
      const dose = DB().hctzAcimaDe25 ? DB().hctzAcimaDe25(form.querySelector('#f2Texto').value) : null;
      avisoHctz.hidden = !dose;
      if (dose) avisoHctz.textContent = 'Regra da casa: hidroclorotiazida no máximo 25 mg — aqui está ' + String(dose).replace('.', ',') + ' mg. Pode salvar mesmo assim.';
    };
    form.querySelector('#f2Texto').addEventListener('input', conferirHctz);
    conferirHctz();

    form.addEventListener('click', ev => {
      const btn = ev.target.closest('[data-f2f]');
      if (!btn) return;
      if (btn.dataset.f2f === 'cancelar') { form.remove(); return; }
      if (btn.dataset.f2f === 'salvar') {
        const nome = form.querySelector('#f2Nome').value.trim();
        const tipo = form.querySelector('#f2Tipo').value;
        const texto = form.querySelector('#f2Texto').value;
        const erro = form.querySelector('.f2-form-erro');
        if (!nome) { erro.textContent = 'Dê um nome ao esquema para salvar.'; return; }
        try {
          if (edicao) {
            DB().draOrq.atualizarProprio(edicao.id, { nome, texto, tipo });
            avisar('Esquema atualizado.');
          } else {
            DB().draOrq.adicionarProprio(topicoAtual.id, nome, texto, tipo);
            avisar('Esquema salvo.');
          }
          renderizarSecao();
        } catch (err) {
          erro.textContent = err.message || 'Não consegui salvar. Tente de novo.';
        }
      }
    });
  }

  /* ==========================================================================
     B2 — ⭐ Preferido em 1 clique (botão ao lado do seletor de esquema)
     O seletor é <option>: não comporta estrela por item — por isso a estrela
     fica FORA do seletor e marca o esquema SELECIONADO (limitação declarada).
     ========================================================================== */
  function montarBotaoEstrela() {
    const select = $('#regimenSelect');
    if (!select || $('#f2FavBtn')) return;
    // F-I: se os cards do codex existirem, a estrela vive nos cards (Orquestrador-extra);
    // o botão único do select aposenta — não recriar.
    if (window.F2X && window.F2X.coroasAtivas && window.F2X.coroasAtivas()) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'f2FavBtn';
    btn.className = 'f2-fav-btn';
    btn.textContent = '⭐ Marcar este esquema';
    select.insertAdjacentElement('afterend', btn);
    btn.addEventListener('click', () => {
      if (!topicoAtual || !select.value) return;
      const regimen = (topicoAtual.regimens || []).find(r => r.id === select.value);
      if (!regimen) return;
      const marcou = DB().draOrq.alternarFavorito(topicoAtual.id, regimen.id, regimen.titulo);
      avisar(marcou ? 'Marcado como preferido.' : 'Estrela retirada.');
      atualizarEstrela();
      renderizarSecao();
    });
    select.addEventListener('change', atualizarEstrela);
  }

  function atualizarEstrela() {
    const btn = $('#f2FavBtn');
    const select = $('#regimenSelect');
    if (!btn || !select) return;
    const on = topicoAtual && select.value && DB().draOrq.ehFavorito(topicoAtual.id, select.value);
    btn.classList.toggle('f2-fav-on', !!on);
    btn.textContent = on ? '⭐ Preferido (clique para tirar)' : '⭐ Marcar este esquema';
  }

  /* ==========================================================================
     B4 — Exportar / Importar (troca de computador)
     ========================================================================== */
  function baixarArquivo(nome, objeto) {
    const blob = new Blob([JSON.stringify(objeto, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    DB().meta.marcar('lastExportAt', new Date().toISOString());
  }

  function exportarEsquemas() {
    baixarArquivo(DB().nomeArquivoDraOrq(), DB().exportarDraOrq());
    avisar('Arquivo de esquemas baixado.');
  }

  function importarEsquemas(input) {
    const arquivo = input.files && input.files[0];
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = () => {
      try {
        const obj = JSON.parse(String(leitor.result));
        const r = DB().importarDraOrq(obj); // valida ANTES de gravar
        avisar(DB().plural(r.esquemas, 'esquema') + ' e ' + DB().plural(r.favoritos, 'favorito') + ' importados.');
        renderizarSecao();
        atualizarEstrela();
      } catch (err) {
        avisar(err.message || 'Arquivo inválido. Nada foi alterado.');
      }
      input.value = ''; // permite importar o mesmo arquivo de novo
    };
    leitor.onerror = () => avisar('Não consegui ler o arquivo. Nada foi alterado.');
    leitor.readAsText(arquivo);
  }

  /* ==========================================================================
     B6 — Imprimir o esquema da casa em 1 folha A4
     Reusa o portal de impressão do HUB (#printPortal): no "beforeprint", o HUB
     prepara a folha dele e ESTE módulo, registrado depois, sobrescreve o portal
     com a folha F2 quando a impressão foi armada por aqui. Ordem determinística
     (este script carrega após o do HUB). Se NÃO foi armado aqui, não toca em
     nada — a impressão normal do HUB segue intacta.
     ========================================================================== */
  function imprimirEsquema(id) {
    if (!topicoAtual) return;
    const e = DB().draOrq.propriosDoTopico(topicoAtual.id).find(x => x.id === id);
    if (!e) return;
    const folha =
      '<section class="f2-print-sheet">' +
        '<div class="f2-print-head"><h1>' + esc(e.nome) + '</h1>' +
        '<p>Esquema pessoal do Orquestrador · ' + esc(topicoAtual.titulo) + ' · ' + new Date().toLocaleDateString('pt-BR') + '</p></div>' +
        '<div class="f2-print-texto" style="font-size:11pt;line-height:1.45;white-space:pre-wrap">' + esc(e.texto || '(sem texto)') + '</div>' +
        (e.imagem ? '<p style="margin-top:6pt"><img src="' + esc(e.imagem) + '" style="max-width:170mm;max-height:180mm"></p>' : '') +
        '<div class="f2-print-assinatura"><div class="f2-linha-ass"></div>Assinatura e carimbo</div>' +
        (DB().rodapeDraHTML ? DB().rodapeDraHTML() : '') +
        '<div class="f2-print-rodape"><span>Hub de Receituários UBS 2026 — módulo Orquestrador</span><span>Uso interno</span></div>' +
      '</section>';

    // Mede ANTES de imprimir: a folha tem min-height de 1 A4 e CRESCE com o
    // conteúdo — então a régua é a altura renderizada vs 1 A4 em px (com
    // tolerância para o arredondamento inteiro do offsetHeight).
    const medidor = document.createElement('div');
    medidor.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;';
    medidor.innerHTML = folha;
    document.body.appendChild(medidor);
    const excedeu = medidor.firstChild.offsetHeight > Math.round(297 * 96 / 25.4) + 3;
    medidor.remove();

    const armar = () => {
      impressaoF2Armada = folha;
      window.print();
    };
    if (excedeu) {
      confirmar('Este esquema passa de 1 folha',
        'Do jeito que está, a impressão vai usar mais de 1 folha A4. Resuma o texto ou confirme para imprimir assim mesmo.',
        'Imprimir assim mesmo', armar);
    } else {
      armar();
    }
  }

  // Ouvinte do beforeprint do MÓDULO (registrado depois do do HUB → roda depois).
  function aoAntesDeImprimir() {
    if (!impressaoF2Armada) return; // impressão do próprio HUB: não tocar
    const portal = $('#printPortal');
    const pageStyle = $('#dynamicPageStyle');
    if (portal) {
      portal.dataset.mode = 'orientation';
      portal.innerHTML = impressaoF2Armada;
    }
    if (pageStyle) pageStyle.textContent = '@media print{@page{size:A4 portrait;margin:0}}';
    impressaoF2Armada = null;
  }

  /* ==========================================================================
     E5 — O caminho inverso: atendimentos listados na página da doença
     ========================================================================== */
  function renderizarAtendimentos() {
    const mount = $('#atendimentosMount');
    if (!mount || !topicoAtual) return;
    const lista = DB().consults.daDoenca(topicoAtual.id);
    // Adendo 3 (1): a seção MOSTRA as prescrições anteriores completas dentro
    // da página (não só conta), prontas para "Repetir esta receita".
    // Adendo 3 (4): PASTA "por doença" — nome do paciente é atalho cruzado.
    let html = '<section class="f2-atd" aria-label="Atendimentos nesta doença">' +
      '<h2>Atendimentos nesta doença (' + lista.length + ') <span class="f2-pasta-selo">Pasta: por doença</span></h2>';
    if (lista.length === 0) {
      html += '<p class="f2-atd-vazio">Nenhum atendimento registrado nesta doença ainda.</p>';
    } else {
      html += '<ul>';
      for (const c of lista) {
        const pac = DB().patients.buscar(c.patientId);
        const quando = new Date(c.datetime).toLocaleDateString('pt-BR');
        const idade = DB().idadeTexto ? DB().idadeTexto(c.datetime) : '';
        const carimboIdade = idade ? ' <span class="f2-atd-idade">(' + esc(idade) + ')</span>' : '';
        if (c.kind === 'receita' && c.receita) {
          const corpo = (c.receita.corpo || c.receita.titulo || '');
          html += '<li class="f2-atd-rec"><span class="f2-atd-data">' + esc(quando) + carimboIdade + '</span>' +
            '<span class="f2-selo-receita">Receita</span>' +
            linkPaciente(c, pac) +
            (c.receita.titulo && c.receita.corpo ? '<span class="f2-hist-titulo">' + esc(c.receita.titulo) + '</span>' : '') +
            (corpo ? '<span class="f2-hist-trecho">' + esc(corpo) + '</span>' : '') +
            '<button type="button" class="f2-btn f2-btn-primario f2-btn-mini" data-f2x="repetir" data-id="' + esc(c.id) + '">Repetir esta receita</button></li>';
        } else {
          const trecho = (c.s || c.p || '').slice(0, 80);
          html += '<li><span class="f2-atd-data">' + esc(quando) + carimboIdade + '</span>' +
            linkPaciente(c, pac) +
            (trecho ? '<span>— ' + esc(trecho) + '…</span>' : '') +
            '<a href="atendimento.html#c=' + encodeURIComponent(c.id) + '">Abrir registro</a></li>';
        }
      }
      html += '</ul>';
    }
    html += '</section>';
    mount.innerHTML = html;
  }

  /* ==========================================================================
     Gancho chamado pelo HUB a cada abertura de tópico
     (o remendo no openTopic chama window.F2.onTopicOpen(state.topic))
     ========================================================================== */
  function onTopicOpen(topic) {
    topicoAtual = topic || null;
    visaoAtual = 'esquemas'; // cada doença abre na view "Meus esquemas"
    renderizarSecao();
    renderizarAtendimentos();
    montarBotaoEstrela();
    atualizarEstrela();
    // Adendo 2: trocar de doença encerra o modo "selo no lugar do carimbo"
    // (ele vale só para a reimpressão vinda do histórico daquela doença).
    if (window.F2X && window.F2X.limparSeloReimpressao) {
      window.F2X.limparSeloReimpressao(topic && topic.id);
    }
  }

  // Delegação de cliques da seção (um ouvinte só, nos mounts).
  function aoClicar(ev) {
    const abaBtn = ev.target.closest('[data-f2view]');
    if (abaBtn) { visaoAtual = abaBtn.dataset.f2view; renderizarSecao(); return; }
    const btn = ev.target.closest('[data-f2]');
    if (!btn) return;
    const acao = btn.dataset.f2;
    if (acao === 'adicionar') abrirFormulario(null);
    else if (acao === 'exportar') exportarEsquemas();
    else if (acao === 'importar') {
      const mount = $('#draOrqMount');
      const input = mount && mount.querySelector('input[data-f2="arquivo"]');
      if (input) input.click();
    }
    else if (acao === 'imprimir') imprimirEsquema(btn.dataset.id);
    else if (acao === 'editar') {
      const e = DB().draOrq.propriosDoTopico(topicoAtual.id).find(x => x.id === btn.dataset.id);
      if (e) abrirFormulario(e);
    }
    else if (acao === 'apagar') {
      const e = DB().draOrq.propriosDoTopico(topicoAtual.id).find(x => x.id === btn.dataset.id);
      if (!e) return;
      confirmar('Apagar este esquema?',
        '"' + e.nome + '" será apagado deste computador. Esta ação não pode ser desfeita.',
        'Apagar', () => { DB().draOrq.apagarProprio(e.id); avisar('Esquema apagado.'); renderizarSecao(); });
    }
    else if (acao === 'abrir') {
      const select = $('#regimenSelect');
      if (select) {
        select.value = btn.dataset.regimen;
        select.dispatchEvent(new Event('change')); // o HUB troca o esquema na tela
        window.scrollTo(0, 0);
      }
    }
    else if (acao === 'desmarcar') {
      if (!topicoAtual) return;
      DB().draOrq.removerFavorito(topicoAtual.id, btn.dataset.regimen);
      avisar('Estrela retirada.');
      atualizarEstrela();
      renderizarSecao();
    }
  }

  // O boot do HUB roda DENTRO do script principal, que executa ANTES deste
  // arquivo carregar — então, ao abrir o HUB direto por link #doenca, o gancho
  // ainda não existia e as seções não montavam. Aqui se recupera o tópico pelo
  // hash e se monta a seção nesse caso (bug encontrado na bancada, 28/08).
  function recuperarTopicoDoBoot() {
    try {
      const hash = decodeURIComponent(location.hash.slice(1));
      if (!hash) return null;
      const wv = document.querySelector('#workspaceView');
      if (!wv || wv.hidden) return null; // hub na home: nada a montar
      const cat = JSON.parse(document.querySelector('#catalogData').textContent);
      return cat.find(t => t.id === hash) || null;
    } catch (e) { return null; }
  }

  // Inicialização: o script carrega no fim do body, o DOM já existe.
  function iniciar() {
    if (!window.F2DB) { console.error('F2: dados.js não carregou — módulo desligado, HUB intacto.'); return; }
    document.addEventListener('click', aoClicar);
    document.addEventListener('change', ev => {
      if (ev.target && ev.target.matches && ev.target.matches('input[data-f2="arquivo"]')) importarEsquemas(ev.target);
    });
    window.addEventListener('beforeprint', aoAntesDeImprimir);
    window.addEventListener('afterprint', () => { impressaoF2Armada = null; });
    const t = recuperarTopicoDoBoot();
    if (t) onTopicOpen(t);
  }
  iniciar();

  return { onTopicOpen };
})();
