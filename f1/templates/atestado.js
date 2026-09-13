(function registrarAtestado(registro) {
  'use strict';

  registro.registrar({
    id: 'atestado-medico',
    pdfId: 'PDF-01',
    titulo: 'Atestado médico',
    layout: 'atestado',
    classeFonte: '2-up-nativo',
    orientacaoFonte: 'paisagem',
    hashFonte: 'e9735254ff9b4b8ed44c7db31cac56f59b06ea6e990b65af2c4142fbc7ff8501',
    codigoFonte: '61832',
    camposObrigatorios: ['nome', 'data-atendimento', 'dias-repouso'],
    notasFixas: [
      'NOTA - Este atestado é valido para finalidade previstas no art. 27 de CLPS, aprovada pelo Decreto nº 89.312 de 23/01/84, a resolução CFM - 1190/84 e será expedido para Justificativa de 1 a 15 dias de afastamento do trabalho.',
      '- Art 7º, XVIII da C.F/88.',
      '- Para gestantes - Parágrafo 1º art. 392 da CLT e art 3º do Decreto nº 75 207/75.',
      '- Este atestado vale como declaração de acompanhante.'
    ]
  });
})(window.F1Registro);
