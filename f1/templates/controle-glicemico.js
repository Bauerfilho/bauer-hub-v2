(function registrarControleGlicemico(registro) {
  'use strict';

  registro.registrar({
    id: 'controle-glicemico',
    pdfId: 'PDF-18',
    titulo: 'Controle de glicêmico',
    layout: 'glicemia',
    cabecalhoInstitucional: false,
    classeFonte: 'full-page-complexo',
    orientacaoFonte: 'paisagem',
    hashFonte: '503f9ee9b6b78055b8dfab2b03190af4fbd927264a6cf4a4f64502a4cddb0854',
    linhas: 19,
    colunas: [
      { id: 'data', rotulo: 'Data', tipo: 'date' },
      { id: 'jejum', rotulo: 'Glicemia Jejum', tipo: 'number' },
      { id: 'pos-cafe', rotulo: 'Glicemia 2h após café', tipo: 'number' },
      { id: 'pre-almoco', rotulo: 'Glicemia antes do almoço', tipo: 'number' },
      { id: 'pos-almoco', rotulo: 'Glicemia 2h após almoço', tipo: 'number' },
      { id: 'pre-jantar', rotulo: 'Glicemia antes do jantar', tipo: 'number' },
      { id: 'pos-jantar', rotulo: 'Glicemia 2h após o jantar', tipo: 'number' },
      { id: 'deitar', rotulo: 'Glicemia ao deitar', tipo: 'number' },
      { id: 'tres-horas', rotulo: 'Glicemia às 3:00', tipo: 'number' }
    ],
    totalCamposPorVia: 171
  });
})(window.F1Registro);
