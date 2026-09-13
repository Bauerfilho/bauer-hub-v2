/* institucionais-view.js — os 18 documentos da unidade como parte da view Documentos do hub (1 página, 1 identidade).
   LINHAGEM: porte por cópia de padrão de f1/motor.js (doador SELADO, zero diff) em 30/08/2026:
   impressão convertida ao PORTAL do hub (controles viram o espelho formatado), boot preguiçoso via window.InstitucionaisView,
   3 validadores fail-closed preservados (obrigatórios + espelho + geometria). Renomes anti-colisão f1v-*.
   Código da casa — MIT. */
(function iniciarMotorF1(escopoGlobal, documentoHtml) {
  'use strict';

  // Todo estado clínico vive apenas nesta estrutura em memória.
  const estadoPorDocumento = new Map();
  let documentoAtivo = null;

  const elementos = {
    alerta: documentoHtml.getElementById('f1-alerta'),
    formulario: documentoHtml.getElementById('f1-formulario'),
    imprimir: documentoHtml.getElementById('f1-imprimir'),
    novo: documentoHtml.getElementById('f1-novo'),
    progress: documentoHtml.getElementById('f1-progress'),
    seletor: documentoHtml.getElementById('f1-documento')
  };

  function escaparHtml(valor) {
    return String(valor ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function cabecalhoInstitucional() {
    return `
      <header class="form-header" data-printable>
        <div class="unit-line">
          <strong>Clínica do Orquestrador</strong>
          <span>Clínica do Orquestrador<br>Goiânia/GO</span>
        </div>
        <div class="institution-line" aria-label="Sistema Único de Saúde e instituições públicas">
          <span class="sus-mark" aria-hidden="true"><i></i><b>SUS</b></span>
          <span>SISTEMA<br>ÚNICO<br>DE SAÚDE</span>
          <span>MINISTÉRIO<br>DA SAÚDE</span>
          <span>PREFEITURA<br>DE GOIÂNIA</span>
          <span>SECRETARIA<br>MUNICIPAL<br>DE SAÚDE</span>
        </div>
      </header>`;
  }

  function cabecalhoSusBasico() {
    return `<header class="form-header basic-sus-header" data-printable>
      <div class="institution-line" aria-label="Sistema Único de Saúde e instituições públicas">
        <span class="sus-mark" aria-hidden="true"><i></i><b>SUS</b></span>
        <span>SISTEMA<br>ÚNICO<br>DE SAÚDE</span>
        <span>MINISTÉRIO<br>DA SAÚDE</span>
        <span>PREFEITURA<br>MUNICIPAL<br>DE GOIÂNIA</span>
        <span>SECRETARIA<br>MUNICIPAL<br>DE SAÚDE</span>
      </div>
    </header>`;
  }

  function entrada(chave, rotulo, editavel, opcoes = {}) {
    const tipo = opcoes.tipo || 'text';
    const classe = opcoes.classe || '';
    const obrigatorio = Boolean(opcoes.obrigatorio);
    const atributos = [
      `data-campo="${escaparHtml(chave)}"`,
      `data-tipo="${escaparHtml(tipo)}"`,
      obrigatorio ? 'required' : '',
      opcoes.maxlength ? `maxlength="${Number(opcoes.maxlength)}"` : '',
      opcoes.min !== undefined ? `min="${Number(opcoes.min)}"` : '',
      opcoes.max !== undefined ? `max="${Number(opcoes.max)}"` : ''
    ].filter(Boolean).join(' ');

    if (!editavel) {
      return `<span class="f1v-mirror ${classe}" data-espelho="${escaparHtml(chave)}" data-tipo="${escaparHtml(tipo)}" data-printable></span>`;
    }

    if (tipo === 'textarea') {
      return `<textarea class="form-control ${classe}" aria-label="${escaparHtml(rotulo)}" ${atributos}></textarea>`;
    }

    return `<input class="form-control ${classe}" type="${escaparHtml(tipo)}" aria-label="${escaparHtml(rotulo)}" ${atributos}>`;
  }

  function seletor(chave, rotulo, editavel, opcoes = {}) {
    if (!editavel) {
      return `<span class="f1v-mirror ${opcoes.classe || ''}" data-espelho="${escaparHtml(chave)}" data-tipo="select" data-printable></span>`;
    }

    const obrigatorio = opcoes.obrigatorio ? 'required' : '';
    const itens = (opcoes.opcoes || []).map((item) => {
      const valor = typeof item === 'string' ? item : item.valor;
      const texto = typeof item === 'string' ? item : item.rotulo;
      return `<option value="${escaparHtml(valor)}">${escaparHtml(texto)}</option>`;
    }).join('');
    return `<select class="form-control ${opcoes.classe || ''}" aria-label="${escaparHtml(rotulo)}" data-campo="${escaparHtml(chave)}" data-tipo="select" ${obrigatorio}>
      <option value="">Selecione</option>${itens}
    </select>`;
  }

  function linhaSeletor(chave, rotulo, editavel, opcoes = {}) {
    return `<label class="field-row ${opcoes.classeLinha || ''}" data-printable>
      <span class="field-label">${escaparHtml(rotulo)}</span>
      ${seletor(chave, rotulo, editavel, opcoes)}
    </label>`;
  }

  function linhaCheckbox(chave, texto, editavel) {
    if (!editavel) {
      return `<div class="choice-line" data-printable>
        <span class="choice-mirror" data-espelho="${escaparHtml(chave)}" data-tipo="checkbox">☐</span>
        <span>${escaparHtml(texto)}</span>
      </div>`;
    }

    return `<label class="choice-line" data-printable>
      <input type="checkbox" data-campo="${escaparHtml(chave)}" data-tipo="checkbox" aria-label="${escaparHtml(texto)}">
      <span>${escaparHtml(texto)}</span>
    </label>`;
  }

  function grupoRadio(chave, rotulo, opcoes, editavel) {
    if (!editavel) {
      return `<div class="radio-group mirror-radio" data-printable>
        <strong>${escaparHtml(rotulo)}:</strong>
        <span class="f1v-mirror" data-espelho="${escaparHtml(chave)}" data-tipo="radio"></span>
      </div>`;
    }

    const nome = `${documentoAtivo?.id || 'f1'}-${chave}`;
    const itens = opcoes.map((opcao) => `<label>
      <input type="radio" name="${escaparHtml(nome)}" value="${escaparHtml(opcao.valor)}" data-campo="${escaparHtml(chave)}" data-tipo="radio" aria-label="${escaparHtml(`${rotulo}: ${opcao.rotulo}`)}">
      <span>${escaparHtml(opcao.rotulo)}</span>
    </label>`).join('');
    return `<fieldset class="radio-group" data-printable><legend>${escaparHtml(rotulo)}</legend>${itens}</fieldset>`;
  }

  function celulaCampo(chave, rotulo, editavel, tipo = 'text') {
    if (!editavel) {
      return `<span class="table-mirror" data-espelho="${escaparHtml(chave)}" data-tipo="${escaparHtml(tipo)}" data-printable></span>`;
    }

    return `<input class="table-input" type="${escaparHtml(tipo)}" data-campo="${escaparHtml(chave)}" data-tipo="${escaparHtml(tipo)}" aria-label="${escaparHtml(rotulo)}">`;
  }

  function linhaCampo(chave, rotulo, editavel, opcoes = {}) {
    return `<label class="field-row ${opcoes.classeLinha || ''}" data-printable>
      <span class="field-label">${escaparHtml(rotulo)}</span>
      ${entrada(chave, rotulo, editavel, opcoes)}
    </label>`;
  }

  function linhaPorDefinicao(definicao, editavel, obrigatorio = false) {
    if (definicao.tipo === 'radio') {
      return grupoRadio(definicao.id, definicao.rotulo, definicao.opcoes || [], editavel);
    }

    if (definicao.tipo === 'select' && (definicao.opcoes || []).length > 0) {
      return linhaSeletor(definicao.id, definicao.rotulo, editavel, {
        obrigatorio,
        opcoes: definicao.opcoes
      });
    }

    // Campo originalmente aberto não ganha alternativas clínicas inventadas.
    const tipoEfetivo = definicao.tipo === 'select' ? 'text' : definicao.tipo;
    return linhaCampo(definicao.id, definicao.rotulo, editavel, {
      tipo: tipoEfetivo,
      obrigatorio,
      classe: tipoEfetivo === 'textarea' ? 'textarea-large' : ''
    });
  }

  function blocoAssinatura(rotulo) {
    return `<div class="signature-block" data-printable>
      <span aria-hidden="true"></span>
      <strong>${escaparHtml(rotulo)}</strong>
    </div>`;
  }

  function corpoAtestado(documento, editavel) {
    const obrigatorio = new Set(documento.camposObrigatorios || []);
    return `
      <h2 class="form-title" data-printable>ATESTADO MÉDICO</h2>
      <div class="legal-form atestado-body">
        <p data-printable>ATESTO PARA OS DEVIDOS FINS, A PEDIDO, QUE O (A) SR.(A)</p>
        ${linhaCampo('nome', 'Nome do paciente', editavel, { obrigatorio: obrigatorio.has('nome') })}
        ${linhaCampo('identificacao', 'Identificação ou registro', editavel)}
        <p data-printable>FOI ATENDIDO (A) NA:</p>
        ${linhaCampo('unidade-saude', 'Unidade de saúde', editavel)}
        ${linhaCampo('hospital-ambulatorio', 'Hospital ou ambulatório', editavel)}
        <div class="inline-grid inline-grid-atestado">
          ${linhaCampo('data-atendimento', 'No dia', editavel, { tipo: 'date', obrigatorio: obrigatorio.has('data-atendimento') })}
          ${linhaCampo('hora-atendimento', 'Às horas', editavel, { tipo: 'time' })}
          ${linhaCampo('dias-repouso', 'Dias de repouso', editavel, { tipo: 'number', min: 1, max: 365, obrigatorio: obrigatorio.has('dias-repouso') })}
        </div>
        ${linhaCampo('dias-por-extenso', 'Dias de repouso por extenso', editavel)}
        <p data-printable>DIA(S) DE REPOUSO, POR MOTIVO DE DOENÇA, CONFORME LEI ABAIXO.</p>
        ${linhaCampo('cid', 'CID', editavel)}
        ${blocoAssinatura('ASSINATURA DO PACIENTE OU RESPONSÁVEL')}
        ${linhaCampo('local-data', 'Local e data', editavel)}
        ${blocoAssinatura('ASSINATURA DO MÉDICO / ODONTÓLOGO')}
        <p class="signature-note" data-printable>(carimbo contendo nome completo e registro CRM/CRO)</p>
        <div class="source-note" data-printable>
          ${documento.notasFixas.map((nota) => `<p>${escaparHtml(nota)}</p>`).join('')}
        </div>
        <p class="source-code" data-printable>CÓDIGO: ${escaparHtml(documento.codigoFonte)}</p>
      </div>`;
  }

  function corpoEncaminhamento(documento, editavel) {
    const obrigatorio = new Set(documento.camposObrigatorios || []);
    return `
      <div class="encaminhamento-body">
        <section class="referral-section" data-printable>
          <h2 class="form-title compact-title">Ficha de Encaminhamento (Referência) e Retorno (Contra-Referência)<br>Encaminhamento e Pedido de Parecer</h2>
          ${linhaCampo('numero-prontuario', 'Nº prontuário', editavel)}
          ${linhaCampo('unidade-referencia', 'Unidade de referência', editavel)}
          ${linhaCampo('nome', 'Nome', editavel, { obrigatorio: obrigatorio.has('nome') })}
          <div class="inline-grid referral-identification">
            ${linhaCampo('data-nascimento', 'Data de nascimento', editavel, { tipo: 'date' })}
            ${linhaCampo('fone', 'Fone', editavel, { tipo: 'tel' })}
          </div>
          ${linhaCampo('endereco', 'Endereço', editavel)}
          ${linhaCampo('servico-destino', 'Encaminhamento ao serviço de', editavel, { obrigatorio: obrigatorio.has('servico-destino') })}
          ${linhaCampo('motivo-encaminhamento', 'Motivo do encaminhamento', editavel, { tipo: 'textarea', classe: 'textarea-2', obrigatorio: obrigatorio.has('motivo-encaminhamento') })}
          <p class="fixed-observation" data-printable>${escaparHtml(documento.observacaoFixa)}</p>
          ${linhaCampo('resumo-historico', 'Resumo histórico do paciente e tratamento', editavel, { tipo: 'textarea', classe: 'textarea-2' })}
          ${linhaCampo('data-encaminhamento', 'Data', editavel, { tipo: 'date', obrigatorio: obrigatorio.has('data-encaminhamento') })}
          ${blocoAssinatura('ASSINATURA E CARIMBO DO PROFISSIONAL RESPONSÁVEL PELO ENCAMINHAMENTO')}
        </section>

        <section class="referral-section counter-referral" data-printable>
          <h2 class="form-title compact-title">Retorno (Contra-Referência) e Parecer</h2>
          ${linhaCampo('retorno-nome', 'Nome', editavel)}
          ${linhaCampo('retorno-prontuario', 'Nº prontuário', editavel)}
          ${linhaCampo('retorno-unidade', 'Unidade de referência', editavel)}
          ${linhaCampo('parecer', 'Parecer', editavel, { tipo: 'textarea', classe: 'textarea-2' })}
          ${linhaCampo('tratamento-recomendacoes', 'Tratamento realizado e recomendações', editavel, { tipo: 'textarea', classe: 'textarea-3' })}
          ${linhaCampo('data-retorno', 'Data', editavel, { tipo: 'date' })}
          ${blocoAssinatura('ASSINATURA E CARIMBO DO PROFISSIONAL RESPONSÁVEL')}
          <p class="source-code" data-printable>CÓDIGO: ${escaparHtml(documento.codigoFonte)}</p>
        </section>
      </div>`;
  }

  function corpoEncaminhamentoPlanejamento(documento, editavel) {
    const obrigatorio = new Set(documento.camposObrigatorios || []);
    return `
      <div class="encaminhamento-body planning-referral-body">
        <section class="referral-section" data-printable>
          <h2 class="form-title compact-title">Ficha de Encaminhamento (Referência) e Retorno (Contra-Referência)<br>Encaminhamento e Pedido de Parecer</h2>
          ${linhaCampo('numero-prontuario', 'Nº prontuário', editavel)}
          ${linhaCampo('unidade-referencia', 'Unidade de referência', editavel)}
          ${linhaCampo('nome', 'Nome', editavel, { obrigatorio: obrigatorio.has('nome') })}
          <div class="inline-grid referral-identification">
            ${linhaCampo('data-nascimento', 'Data de nascimento', editavel, { tipo: 'date' })}
            ${linhaCampo('fone', 'Fone', editavel, { tipo: 'tel' })}
          </div>
          ${linhaCampo('endereco', 'Endereço', editavel)}
          <p class="fixed-form-line" data-printable><strong>Encaminhamento ao serviço de:</strong> ${escaparHtml(documento.servicoDestinoFixo)}</p>
          <p class="fixed-form-box" data-printable><strong>Motivo do encaminhamento:</strong> ${escaparHtml(documento.motivoEncaminhamentoFixo)}</p>
          <p class="fixed-observation" data-printable>${escaparHtml(documento.observacaoFixa)}</p>
          ${linhaCampo('resumo-historico', 'Resumo histórico do paciente e tratamento', editavel, { tipo: 'textarea', classe: 'textarea-2' })}
          <p class="fixed-form-line" data-printable><strong>CID 10:</strong> ${escaparHtml(documento.cidFixo)}</p>
          ${linhaCampo('data-encaminhamento', 'Data', editavel, { tipo: 'date', obrigatorio: obrigatorio.has('data-encaminhamento') })}
          ${blocoAssinatura('ASSINATURA E CARIMBO DO PROFISSIONAL RESPONSÁVEL PELO ENCAMINHAMENTO')}
        </section>
        <section class="referral-section counter-referral" data-printable>
          <h2 class="form-title compact-title">Retorno (Contra-Referência) e Parecer</h2>
          ${linhaCampo('retorno-nome', 'Nome', editavel)}
          ${linhaCampo('retorno-prontuario', 'Nº prontuário', editavel)}
          ${linhaCampo('retorno-unidade', 'Unidade de referência', editavel)}
          ${linhaCampo('parecer', 'Parecer', editavel, { tipo: 'textarea', classe: 'textarea-2' })}
          ${linhaCampo('tratamento-recomendacoes', 'Tratamento realizado e recomendações', editavel, { tipo: 'textarea', classe: 'textarea-3' })}
          ${linhaCampo('data-retorno', 'Data', editavel, { tipo: 'date' })}
          ${blocoAssinatura('ASSINATURA E CARIMBO DO PROFISSIONAL RESPONSÁVEL')}
          <p class="source-code" data-printable>CÓDIGO: ${escaparHtml(documento.codigoFonte)}</p>
        </section>
      </div>`;
  }

  function corpoExamesLista(documento, editavel) {
    const obrigatorio = new Set(documento.camposObrigatorios || []);
    return `
      <div class="exames-body">
        <h2 class="form-title exames-main-title" data-printable>PEDIDO DE EXAMES</h2>
        ${linhaCampo('nome', 'Nome', editavel, { obrigatorio: obrigatorio.has('nome') })}
        <h3 class="exames-subtitle" data-printable>${escaparHtml(documento.subtitulo)}</h3>
        <ol class="exam-list" data-printable>
          ${documento.exames.map((exame) => `<li>${escaparHtml(exame)}</li>`).join('')}
        </ol>
        ${linhaCampo('solicitacao', 'Solicitação', editavel, { tipo: 'textarea', classe: 'request-field' })}
        <div class="form-footer-row">
          ${linhaCampo('data', 'Data', editavel, { tipo: 'date', obrigatorio: obrigatorio.has('data') })}
          ${blocoAssinatura(documento.rotuloAssinatura || 'ASSINATURA E CARIMBO')}
        </div>
      </div>`;
  }

  function corpoExamesLivre(documento, editavel) {
    const obrigatorio = new Set(documento.camposObrigatorios || []);
    const campo = (id) => documento.campos.find((item) => item.id === id);
    return `
      <div class="free-exams-document">
        <h2 class="form-title exames-main-title" data-printable>REQUISIÇÃO DE EXAMES</h2>
        ${linhaPorDefinicao(campo('nome'), editavel, obrigatorio.has('nome'))}
        <div class="inline-grid free-exams-identification">
          ${linhaPorDefinicao(campo('data-nascimento'), editavel)}
          ${linhaPorDefinicao(campo('sexo'), editavel)}
        </div>
        ${linhaPorDefinicao(campo('dados-clinicos'), editavel)}
        ${linhaPorDefinicao(campo('exames-solicitados'), editavel)}
        <div class="form-footer-row">
          ${linhaPorDefinicao(campo('data'), editavel, obrigatorio.has('data'))}
          ${blocoAssinatura('ASSINATURA E CARIMBO')}
        </div>
        <p class="source-code" data-printable>CÓD.: ${escaparHtml(documento.codigoFonte)}</p>
      </div>`;
  }

  function corpoSolicitacaoTexto(documento, editavel) {
    const obrigatorio = new Set(documento.camposObrigatorios || []);
    const campo = (id) => documento.campos.find((item) => item.id === id);
    const nome = campo('nome');
    const idade = campo('idade');
    const data = campo('data');
    const especificos = documento.campos.filter((item) => !['nome', 'idade', 'data'].includes(item.id));
    return `
      <div class="text-request-document">
        <h2 class="form-title request-title" data-printable>${escaparHtml(documento.titulo.toUpperCase())}</h2>
        ${linhaPorDefinicao(nome, editavel, obrigatorio.has('nome'))}
        <h3 data-printable>${escaparHtml(documento.destinatarioFixo)}</h3>
        <p class="request-paragraph" data-printable>${escaparHtml(documento.textoFixo[0])}</p>
        ${linhaPorDefinicao(idade, editavel, obrigatorio.has('idade'))}
        <p class="request-paragraph" data-printable>${escaparHtml(documento.textoFixo[1])}</p>
        ${especificos.map((item) => linhaPorDefinicao(item, editavel, obrigatorio.has(item.id))).join('')}
        <p class="request-paragraph" data-printable>${escaparHtml(documento.textoFixo[2])}</p>
        <p class="fixed-cid" data-printable>CID 10: ${escaparHtml(documento.cidFixo)}</p>
        <div class="form-footer-row">
          ${linhaPorDefinicao(data, editavel, obrigatorio.has('data'))}
          ${blocoAssinatura(documento.rotuloAssinatura || 'ASSINATURA – CRM')}
        </div>
      </div>`;
  }

  function corpoInsumos(documento, editavel) {
    const obrigatorio = new Set(documento.camposObrigatorios || []);
    const campo = (id) => documento.campos.find((item) => item.id === id);
    return `
      <div class="supplies-document">
        <h2 class="form-title request-title" data-printable>INSUMOS</h2>
        ${linhaPorDefinicao(campo('nome'), editavel, obrigatorio.has('nome'))}
        <p class="request-paragraph" data-printable>${escaparHtml(documento.textoFixo[0])}</p>
        ${linhaPorDefinicao(campo('tipo-diabetes'), editavel, obrigatorio.has('tipo-diabetes'))}
        <p class="request-paragraph" data-printable>${escaparHtml(documento.textoFixo[1])}</p>
        <div class="supply-items">
          ${documento.itens.map((item) => linhaCampo(item.id, item.rotulo, editavel, { tipo: item.tipo, min: 0 })).join('')}
        </div>
        ${linhaPorDefinicao(campo('cid'), editavel)}
        <div class="form-footer-row">
          ${linhaPorDefinicao(campo('data'), editavel, obrigatorio.has('data'))}
          ${blocoAssinatura(documento.rotuloAssinatura || 'ASSINATURA – CRM')}
        </div>
      </div>`;
  }

  function corpoMrpa(documento, editavel) {
    const obrigatorio = new Set(documento.camposObrigatorios || []);
    const campo = (id) => documento.campos.find((item) => item.id === id);
    const linhas = Array.from({ length: documento.dias }, (_, indice) => `<tr>
      <td>${celulaCampo(`mrpa-${String(indice + 1).padStart(2, '0')}-data`, `Data ${indice + 1}`, editavel, 'date')}</td>
      ${documento.periodos.map((periodo) => `<td>${celulaCampo(`mrpa-${String(indice + 1).padStart(2, '0')}-${periodo.id}`, `${periodo.rotulo}, linha ${indice + 1}`, editavel, 'text')}</td>`).join('')}
    </tr>`).join('');
    return `
      <div class="table-document mrpa-document">
        <h2 class="table-document-title" data-printable>${escaparHtml(documento.tituloFormulario)}</h2>
        ${linhaPorDefinicao(campo('nome'), editavel, obrigatorio.has('nome'))}
        <table class="form-table mrpa-table" data-printable>
          <thead><tr><th>DATA</th>${documento.periodos.map((periodo) => `<th>${escaparHtml(periodo.rotulo)}</th>`).join('')}</tr></thead>
          <tbody>${linhas}</tbody>
        </table>
        ${linhaPorDefinicao(campo('retorno'), editavel)}
      </div>`;
  }

  function itemReceita(item, editavel, prefixoNumero = '') {
    const dose = item.campoDose
      ? `<span class="inline-dose">${entrada(item.campoDose.id, item.campoDose.rotulo, editavel, { tipo: item.campoDose.tipo || 'text' })}</span>`
      : '';
    const posologia = item.campoDose
      ? `${escaparHtml(item.posologiaAntesDose)} ${dose} ${escaparHtml(item.posologiaDepoisDose)}`
      : escaparHtml(item.posologia || '');
    const opcao = item.campoOpcao
      ? linhaSeletor(item.campoOpcao.id, item.campoOpcao.rotulo, editavel, { opcoes: item.campoOpcao.opcoes || [] })
      : '';
    return `<div class="prescription-item" data-printable>
      ${item.subtitulo ? `<p class="item-subtitle">${escaparHtml(item.subtitulo)}</p>` : ''}
      <p class="medicine-line"><strong>${prefixoNumero}${escaparHtml(item.nome)}</strong><span></span><b>${escaparHtml(item.quantidade || '')}</b></p>
      ${opcao}
      <p class="dosage-line">${posologia}</p>
    </div>`;
  }

  function corpoReceitaOpcoes(documento, editavel) {
    const obrigatorio = new Set(documento.camposObrigatorios || []);
    const campo = (id) => documento.campos.find((item) => item.id === id);
    return `
      <div class="preset-prescription">
        <h2 class="form-title prescription-title" data-printable>${escaparHtml(documento.tituloFormulario)}</h2>
        ${linhaPorDefinicao(campo('nome'), editavel, obrigatorio.has('nome'))}
        <div class="prescription-sections">
          ${documento.secoes.map((secao) => {
            const grupoUnico = secao.modoSelecao === 'unica'
              ? grupoRadio(`${secao.id}-opcao`, secao.titulo, secao.itens.map((item) => ({ valor: item.nome, rotulo: item.nome })), editavel)
              : `<h3 data-printable>${escaparHtml(secao.titulo)}</h3>`;
            return `<section class="prescription-section">
              ${grupoUnico}
              ${secao.itens.map((item) => {
                const seletorItem = ['multipla', 'condicional'].includes(secao.modoSelecao)
                  ? linhaCheckbox(`selecionar-${item.id}`, `${item.nome} — selecionar`, editavel)
                  : '';
                const numero = item.numeroFonte ? `${item.numeroFonte}) ` : '';
                return `${seletorItem}${itemReceita(item, editavel, numero)}`;
              }).join('')}
            </section>`;
          }).join('')}
        </div>
        ${documento.recomendacoes ? `<section class="recommendations" data-printable><h3>RECOMENDAÇÕES</h3><ul>${documento.recomendacoes.map((item) => `<li>${escaparHtml(item)}</li>`).join('')}</ul></section>` : ''}
        <div class="form-footer-row prescription-footer">
          ${linhaPorDefinicao(campo('data'), editavel, obrigatorio.has('data'))}
          ${blocoAssinatura(documento.rodape?.assinatura || 'ASSINATURA – CRM')}
        </div>
      </div>`;
  }

  function corpoControleEspecial(documento, editavel) {
    const obrigatorio = new Set(documento.camposObrigatorios || []);
    const rotuloVia = editavel ? documento.rotulosVias.primeira : documento.rotulosVias.segunda;
    return `
      <div class="special-prescription">
        <p class="special-copy-label" data-printable>${escaparHtml(rotuloVia)}</p>
        <section class="issuer-box" data-printable>
          <h3>${escaparHtml(documento.emitente.titulo)}</h3>
          <strong>${escaparHtml(documento.emitente.nome)}</strong>
          ${documento.emitente.linhas.map((linha) => `<p>${escaparHtml(linha)}</p>`).join('')}
        </section>
        <h2 class="form-title f1v-special" data-printable>${escaparHtml(documento.tituloFormulario)}</h2>
        <div class="special-patient-fields">
          ${documento.camposPaciente.map((campo) => linhaPorDefinicao(campo, editavel, obrigatorio.has(campo.id))).join('')}
        </div>
        <div class="special-bottom-grid">
          <section class="buyer-box" data-printable>
            <h3>${escaparHtml(documento.comprador.titulo)}</h3>
            ${documento.comprador.campos.map((campo) => linhaPorDefinicao(campo, editavel)).join('')}
          </section>
          <section class="supplier-box" data-printable>
            <h3>${escaparHtml(documento.fornecedor.titulo)}</h3>
            ${blocoAssinatura(documento.fornecedor.assinatura)}
            <p>${escaparHtml(documento.fornecedor.data)}: ____/____/______</p>
          </section>
        </div>
      </div>`;
  }

  function corpoTabelaPa(documento, editavel) {
    const linhas = [];
    for (let dia = 1; dia <= documento.dias; dia += 1) {
      for (let afericao = 1; afericao <= documento.afericoesPorPeriodo; afericao += 1) {
        const celulaData = afericao === 1
          ? `<td rowspan="${documento.afericoesPorPeriodo}">${celulaCampo(`dia-${String(dia).padStart(2, '0')}-data`, `Data ${dia}`, editavel, 'date')}</td>`
          : '';
        const periodos = documento.periodos.map((periodo) => `<td>
          <span class="measurement-index">${afericao}º</span>
          ${celulaCampo(`dia-${String(dia).padStart(2, '0')}-${periodo.id}-${String(afericao).padStart(2, '0')}`, `${periodo.rotulo}, dia ${dia}, aferição ${afericao}`, editavel, 'text')}
        </td>`).join('');
        linhas.push(`<tr>${celulaData}${periodos}</tr>`);
      }
    }

    return `
      <div class="table-document pa-document">
        <h2 class="table-document-title" data-printable>AFERIÇÃO DE PA RESIDENCIAL</h2>
        <table class="form-table pa-table" data-printable>
          <thead><tr><th>DATA</th>${documento.periodos.map((periodo) => `<th>${escaparHtml(periodo.rotulo)}</th>`).join('')}</tr></thead>
          <tbody>${linhas.join('')}</tbody>
        </table>
      </div>`;
  }

  function corpoInsulina(documento, editavel) {
    const obrigatorio = new Set(documento.camposObrigatorios || []);
    const grupos = new Map();
    documento.doses.forEach((dose) => {
      if (!grupos.has(dose.periodo)) {
        grupos.set(dose.periodo, { instrucao: dose.instrucao, doses: [] });
      }
      grupos.get(dose.periodo).doses.push(dose);
    });

    return `
      <div class="insulin-document">
        <header class="insulin-header" data-printable>
          <h2>MEU ESQUEMA DE INSULINA</h2>
          <p>Aplique somente as doses preenchidas pela equipe de saúde.</p>
        </header>
        <div class="insulin-identification">
          ${linhaCampo('nome', 'Nome', editavel, { obrigatorio: obrigatorio.has('nome') })}
          ${linhaCampo('data', 'Data', editavel, { tipo: 'date', obrigatorio: obrigatorio.has('data') })}
          ${linhaCampo('retorno', 'Retorno', editavel, { tipo: 'date' })}
        </div>
        <div class="dose-schedule">
          ${Array.from(grupos.entries()).map(([periodo, grupo], indice) => `<section class="dose-row" data-printable>
            <span class="dose-number">${indice + 1}</span>
            <div class="dose-period"><strong>${escaparHtml(periodo)}</strong><small>${escaparHtml(grupo.instrucao)}</small></div>
            <div class="dose-fields">${grupo.doses.map((dose) => `<label class="dose-field dose-${dose.tipo.toLowerCase()}">
              <span>${escaparHtml(dose.tipo)}</span>
              ${entrada(dose.id, `${periodo} — ${dose.tipo}`, editavel, { tipo: 'number', min: 0, max: 999 })}
              <b>U</b>
            </label>`).join('')}</div>
          </section>`).join('')}
        </div>
        <div class="insulin-types" data-printable>
          <p>${escaparHtml(documento.seguranca.nph)}</p>
          <p>${escaparHtml(documento.seguranca.regular)}</p>
        </div>
        <section class="hypo-box" data-printable>
          <h3>${escaparHtml(documento.seguranca.hipoTitulo)}</h3>
          <p>${escaparHtml(documento.seguranca.hipoSinais)}</p>
          <ol>${documento.seguranca.hipoPassos.map((passo) => `<li>${escaparHtml(passo)}</li>`).join('')}</ol>
          <strong>${escaparHtml(documento.seguranca.emergencia)}</strong>
        </section>
      </div>`;
  }

  function corpoPlanoMedicamentos(documento, editavel) {
    const obrigatorio = new Set(documento.camposObrigatorios || []);
    const linhas = Array.from({ length: documento.linhas }, (_, indice) => `<tr>
      ${documento.colunas.map((coluna) => `<td>${celulaCampo(`med-${String(indice + 1).padStart(2, '0')}-${coluna.id}`, `${coluna.rotulo}, medicamento ${indice + 1}`, editavel, 'text')}</td>`).join('')}
    </tr>`).join('');
    return `
      <div class="table-document medication-plan">
        <h2 class="table-document-title" data-printable>MEU PLANO DE MEDICAMENTOS</h2>
        <p class="empty-model-note" data-printable>Modelo vazio para preenchimento individual pela equipe de saúde.</p>
        <div class="plan-identification">
          ${linhaCampo('nome', 'Nome', editavel, { obrigatorio: obrigatorio.has('nome') })}
          ${linhaCampo('data', 'Data', editavel, { tipo: 'date', obrigatorio: obrigatorio.has('data') })}
        </div>
        <table class="form-table medication-table" data-printable>
          <thead><tr>${documento.colunas.map((coluna) => `<th>${escaparHtml(coluna.rotulo)}</th>`).join('')}</tr></thead>
          <tbody>${linhas}</tbody>
        </table>
        <div class="schedule-legend" data-printable><span>MANHÃ</span><span>ALMOÇO</span><span>JANTAR</span><span>AO DEITAR</span></div>
      </div>`;
  }

  function corpoGlicemia(documento, editavel) {
    const linhas = Array.from({ length: documento.linhas }, (_, indice) => `<tr>
      ${documento.colunas.map((coluna) => `<td>${celulaCampo(`glic-${String(indice + 1).padStart(2, '0')}-${coluna.id}`, `${coluna.rotulo}, linha ${indice + 1}`, editavel, coluna.tipo)}</td>`).join('')}
    </tr>`).join('');
    return `
      <div class="table-document glycemia-document">
        <h2 class="glycemia-title" data-printable>Controle de Glicêmico</h2>
        <table class="form-table glycemia-table" data-printable>
          <thead><tr>${documento.colunas.map((coluna) => `<th>${escaparHtml(coluna.rotulo)}</th>`).join('')}</tr></thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>`;
  }

  function renderizarCorpo(documento, editavel) {
    if (documento.layout === 'atestado') {
      return corpoAtestado(documento, editavel);
    }

    if (documento.layout === 'encaminhamento') {
      return corpoEncaminhamento(documento, editavel);
    }

    if (documento.layout === 'encaminhamento-planejamento') {
      return corpoEncaminhamentoPlanejamento(documento, editavel);
    }

    if (documento.layout === 'exames-lista') {
      return corpoExamesLista(documento, editavel);
    }

    if (documento.layout === 'exames-livre') {
      return corpoExamesLivre(documento, editavel);
    }

    if (documento.layout === 'solicitacao-texto') {
      return corpoSolicitacaoTexto(documento, editavel);
    }

    if (documento.layout === 'insumos') {
      return corpoInsumos(documento, editavel);
    }

    if (documento.layout === 'mrpa') {
      return corpoMrpa(documento, editavel);
    }

    if (documento.layout === 'receita-opcoes') {
      return corpoReceitaOpcoes(documento, editavel);
    }

    if (documento.layout === 'controle-especial') {
      return corpoControleEspecial(documento, editavel);
    }

    if (documento.layout === 'tabela-pa') {
      return corpoTabelaPa(documento, editavel);
    }

    if (documento.layout === 'insulina') {
      return corpoInsulina(documento, editavel);
    }

    if (documento.layout === 'plano-medicamentos') {
      return corpoPlanoMedicamentos(documento, editavel);
    }

    if (documento.layout === 'glicemia') {
      return corpoGlicemia(documento, editavel);
    }

    throw new Error(`F1_LAYOUT_NAO_IMPLEMENTADO:${documento.layout}`);
  }

  function renderizarVia(documento, numeroVia) {
    const editavel = numeroVia === 1;
    const cabecalho = documento.cabecalhoInstitucional === false
      ? ''
      : documento.cabecalhoFonte === 'sus-municipal-sem-unidade'
        ? cabecalhoSusBasico()
        : cabecalhoInstitucional();
    return `<article class="form-copy layout-${escaparHtml(documento.layout)} ${editavel ? 'is-editable' : 'is-mirror'}" data-via="${numeroVia}" ${editavel ? '' : 'inert'}>
      <p class="screen-copy-note" aria-hidden="true">${editavel ? '1ª via — preencha aqui' : '2ª via — espelhada'}</p>
      ${cabecalho}
      ${renderizarCorpo(documento, editavel)}
    </article>`;
  }

  function estadoAtual() {
    if (!estadoPorDocumento.has(documentoAtivo.id)) {
      estadoPorDocumento.set(documentoAtivo.id, Object.create(null));
    }
    return estadoPorDocumento.get(documentoAtivo.id);
  }

  function valorDoControle(controle) {
    if (controle.type === 'checkbox') {
      return controle.checked;
    }

    if (controle.type === 'radio') {
      return controle.checked ? controle.value : undefined;
    }

    return controle.value;
  }

  function valorDoGrupo(controles) {
    if (controles[0]?.type === 'radio') {
      return controles.find((controle) => controle.checked)?.value || '';
    }
    return valorDoControle(controles[0]);
  }

  function valorExibido(valor, tipo) {
    if (tipo === 'checkbox') {
      return valor ? '☒' : '☐';
    }

    if (tipo === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(String(valor || ''))) {
      const [ano, mes, dia] = String(valor).split('-');
      return `${dia}/${mes}/${ano}`;
    }

    return String(valor ?? '');
  }

  function aplicarEspelho(chave, valor, tipo) {
    elementos.formulario.querySelectorAll(`[data-espelho="${CSS.escape(chave)}"]`).forEach((saida) => {
      saida.textContent = valorExibido(valor, tipo);
      saida.dataset.valor = String(valor ?? '');
    });
  }

  function sincronizarControle(controle) {
    const valor = valorDoControle(controle);
    if (valor === undefined) {
      return;
    }

    const estado = estadoAtual();
    estado[controle.dataset.campo] = valor;
    aplicarEspelho(controle.dataset.campo, valor, controle.dataset.tipo || controle.type);
  }

  function restaurarEstado() {
    const estado = estadoAtual();
    elementos.formulario.querySelectorAll('[data-campo]').forEach((controle) => {
      const valor = estado[controle.dataset.campo];
      if (valor === undefined) {
        aplicarEspelho(controle.dataset.campo, '', controle.dataset.tipo || controle.type);
        return;
      }

      if (controle.type === 'checkbox') {
        controle.checked = Boolean(valor);
      } else if (controle.type === 'radio') {
        controle.checked = controle.value === valor;
      } else {
        controle.value = String(valor);
      }
      aplicarEspelho(controle.dataset.campo, valor, controle.dataset.tipo || controle.type);
    });
  }

  function vincularCampos() {
    elementos.formulario.querySelectorAll('[data-campo]').forEach((controle) => {
      controle.addEventListener('input', () => sincronizarControle(controle));
      controle.addEventListener('change', () => sincronizarControle(controle));
      controle.addEventListener('paste', (evento) => {
        if (!evento.clipboardData || controle instanceof HTMLSelectElement) {
          return;
        }
        evento.preventDefault();
        const texto = evento.clipboardData.getData('text/plain');
        const inicio = controle.selectionStart ?? controle.value.length;
        const fim = controle.selectionEnd ?? controle.value.length;
        controle.setRangeText(texto, inicio, fim, 'end');
        controle.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
  }

  function anunciar(mensagem, tipo = 'erro') {
    elementos.alerta.hidden = false;
    elementos.alerta.dataset.tipo = tipo;
    elementos.alerta.textContent = mensagem;
    elementos.alerta.focus({ preventScroll: false });
  }

  function limparAlerta() {
    elementos.alerta.hidden = true;
    elementos.alerta.textContent = '';
    delete elementos.alerta.dataset.tipo;
  }

  function abrirDocumento(id) {
    const documento = escopoGlobal.F1Registro.obter(id);
    if (!documento) {
      anunciar('Documento não encontrado no registro canônico.');
      return;
    }

    documentoAtivo = documento;
    elementos.formulario.dataset.documentoId = documento.id;
    elementos.formulario.innerHTML = `
      <div class="paper-safe" data-paper-safe>
        ${renderizarVia(documento, 1)}
        <div class="cut-line" aria-hidden="true"></div>
        ${renderizarVia(documento, 2)}
      </div>`;
    vincularCampos();
    restaurarEstado();
    limparAlerta();

    const documentos = escopoGlobal.F1Registro.todos();
    const indice = documentos.findIndex((item) => item.id === documento.id);
    elementos.progress.textContent = `Documento ${indice + 1} de ${documentos.length}`;
    elementos.seletor.value = documento.id;
  }

  function lerValorEspelho(saida) {
    return saida.dataset.valor ?? saida.textContent ?? '';
  }

  function validarEspelho() {
    const controles = Array.from(elementos.formulario.querySelectorAll('[data-campo]'));
    const grupos = new Map();
    controles.forEach((controle) => {
      const chave = controle.dataset.campo;
      if (!grupos.has(chave)) {
        grupos.set(chave, []);
      }
      grupos.get(chave).push(controle);
    });
    const saidas = Array.from(elementos.formulario.querySelectorAll('[data-espelho]'));
    const saidasPorChave = new Map(saidas.map((saida) => [saida.dataset.espelho, saida]));

    const grupoInvalido = Array.from(grupos.values()).find((grupo) => grupo.length > 1 && grupo.some((controle) => controle.type !== 'radio'));
    if (grupoInvalido || grupos.size !== saidasPorChave.size) {
      return { ok: false, motivo: 'A estrutura das duas vias não contém as mesmas chaves únicas.' };
    }

    for (const [chave, grupo] of grupos) {
      const saida = saidasPorChave.get(chave);
      const valorPrimeira = valorDoGrupo(grupo);
      const valorSegunda = lerValorEspelho(saida);
      if (String(valorPrimeira ?? '') !== String(valorSegunda ?? '')) {
        return { ok: false, motivo: `A segunda via divergiu no campo ${grupo[0].getAttribute('aria-label')}.` };
      }
    }

    const editaveisNaSegunda = elementos.formulario.querySelectorAll('[data-via="2"] input:not([disabled]), [data-via="2"] textarea:not([disabled]), [data-via="2"] select:not([disabled]), [data-via="2"] [contenteditable="true"]');
    if (editaveisNaSegunda.length > 0) {
      return { ok: false, motivo: 'A segunda via contém controle editável.' };
    }

    return { ok: true };
  }

  function validarObrigatorios() {
    const invalido = elementos.formulario.querySelector('[data-via="1"] :invalid');
    if (!invalido) {
      return { ok: true };
    }

    return {
      ok: false,
      motivo: `Preencha o campo obrigatório: ${invalido.getAttribute('aria-label')}.`,
      alvo: invalido
    };
  }

  function validarGeometria() {
    const caixaSegura = elementos.formulario.querySelector('[data-paper-safe]');
    const limite = caixaSegura.getBoundingClientRect();
    const tolerancia = 0.75;
    const falhas = [];

    elementos.formulario.querySelectorAll('[data-printable], [data-campo], [data-espelho]').forEach((item) => {
      const caixa = item.getBoundingClientRect();
      const fora = caixa.left < limite.left - tolerancia
        || caixa.right > limite.right + tolerancia
        || caixa.top < limite.top - tolerancia
        || caixa.bottom > limite.bottom + tolerancia;
      const cortado = item.scrollWidth > item.clientWidth + 1 || item.scrollHeight > item.clientHeight + 1;
      if (fora || cortado) {
        falhas.push(item);
      }
    });

    if (falhas.length > 0) {
      return { ok: false, motivo: `${falhas.length} elemento(s) excedem a caixa segura ou estão cortados.` };
    }

    return { ok: true };
  }

  function validarImpressao() {
    const verificacoes = [validarObrigatorios(), validarEspelho(), validarGeometria()];
    const falha = verificacoes.find((item) => !item.ok);
    if (!falha) {
      return { ok: true };
    }

    anunciar(falha.motivo);
    if (falha.alvo) {
      falha.alvo.focus();
    }
    return falha;
  }

  function imprimir() {
    limparAlerta();
    if (!validarImpressao().ok) {
      return;
    }

    /* Porte: impressão pelo PORTAL do hub (o F1 original imprimia o DOM vivo).
       Cada controle da via 1 vira o espelho já formatado da via 2 (☒/☐, datas) — papel sem inputs. */
    const clone = elementos.formulario.querySelector('[data-paper-safe]').cloneNode(true);
    clone.querySelectorAll('[data-campo]').forEach((controle) => {
      const chave = controle.dataset.campo;
      const espelho = clone.querySelector(`[data-espelho="${CSS.escape(chave)}"]`);
      const span = espelho ? espelho.cloneNode(true) : documentoHtml.createElement('span');
      span.removeAttribute('data-espelho');
      span.removeAttribute('id');
      controle.replaceWith(span);
    });
    const portal = documentoHtml.getElementById('printPortal');
    const host = documentoHtml.createElement('div');
    host.className = 'f1-host';
    const sheet = documentoHtml.createElement('div');
    sheet.className = 'f1v-sheet';
    sheet.appendChild(clone);
    host.appendChild(sheet);
    portal.innerHTML = '';
    portal.appendChild(host);
    const orientacao = documentoAtivo.orientacaoFonte === 'retrato' ? 'portrait' : 'landscape';
    portal.dataset.orientation = orientacao;
    const estilo = documentoHtml.getElementById('dynamicPageStyle');
    if (estilo) estilo.textContent = `@media print{@page{size:A4 ${orientacao};margin:0}}`;
    escopoGlobal.__printDelegado = true;
    requestAnimationFrame(() => escopoGlobal.print());
  }

  function novoPaciente() {
    if (!documentoAtivo) {
      return;
    }

    estadoPorDocumento.clear();
    abrirDocumento(documentoAtivo.id);
    anunciar('Todos os campos da primeira e da segunda vias foram limpos.', 'sucesso');
  }

  function preencherSintetico() {
    elementos.formulario.querySelectorAll('[data-campo]').forEach((controle, indice) => {
      if (controle instanceof HTMLSelectElement) {
        controle.selectedIndex = Math.max(0, controle.options.length - 1);
      } else if (controle.type === 'date') {
        controle.value = '2026-08-28';
      } else if (controle.type === 'time') {
        controle.value = '10:30';
      } else if (controle.type === 'number') {
        controle.value = String((indice % 5) + 1);
      } else if (controle.type === 'checkbox') {
        controle.checked = true;
      } else if (controle.type === 'radio') {
        controle.checked = true;
      } else {
        controle.value = `SINTÉTICO ${indice + 1}`;
      }
      controle.dispatchEvent(new Event('input', { bubbles: true }));
      controle.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  function executarAutoteste() {
    preencherSintetico();
    const espelho = validarEspelho();
    const geometria = validarGeometria();
    const resultado = {
      documento: documentoAtivo.id,
      camposPrimeiraVia: elementos.formulario.querySelectorAll('[data-campo]').length,
      camposSegundaVia: elementos.formulario.querySelectorAll('[data-espelho]').length,
      espelho,
      geometria,
      segundaViaEditavel: elementos.formulario.querySelectorAll('[data-via="2"] input, [data-via="2"] textarea, [data-via="2"] select, [data-via="2"] [contenteditable="true"]').length > 0,
      armazenamentoPersistente: Boolean(localStorage.length || sessionStorage.length)
    };
    documentoHtml.documentElement.dataset.f1Selftest = btoa(unescape(encodeURIComponent(JSON.stringify(resultado))));
    return resultado;
  }

  /* Porte: boot preguiçoso via API — sem ?doc=, sem auto-abrir, sem guarda própria de beforeprint
     (a guarda de impressão é do hub, via __printDelegado; a limpeza pós-print é do guias-view). */
  let iniciado = false;
  function iniciar() {
    if (iniciado) return true;
    const documentos = escopoGlobal.F1Registro.todos();
    if (documentos.length === 0) {
      anunciar('Nenhum documento foi registrado.');
      return false;
    }

    elementos.seletor.innerHTML = documentos
      .map((documento) => `<option value="${escaparHtml(documento.id)}">${escaparHtml(documento.titulo)}</option>`)
      .join('');
    elementos.seletor.addEventListener('change', () => abrirDocumento(elementos.seletor.value));
    elementos.novo.addEventListener('click', novoPaciente);
    elementos.imprimir.addEventListener('click', imprimir);
    iniciado = true;
    return true;
  }

  escopoGlobal.InstitucionaisView = Object.freeze({
    abrir(id) {
      if (!iniciar()) return false;
      const doc = escopoGlobal.F1Registro.obter(id);
      if (!doc) return false;
      abrirDocumento(id);
      return true;
    },
    ativo: () => (documentoAtivo ? { id: documentoAtivo.id, titulo: documentoAtivo.titulo } : null),
  });

  escopoGlobal.F1VTeste = Object.freeze({
    abrir: abrirDocumento,
    estado: () => estadoPorDocumento,
    preencherSintetico,
    validarEspelho,
    validarGeometria,
    validarImpressao,
    executarAutoteste
  });
})(window, document);
