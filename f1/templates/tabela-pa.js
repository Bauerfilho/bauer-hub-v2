(function registrarTabelaPa(registro) {
  'use strict';

  registro.registrar({
    id: 'tabela-pa-residencial',
    pdfId: 'PDF-15',
    titulo: 'Aferição de PA residencial',
    layout: 'tabela-pa',
    cabecalhoInstitucional: false,
    classeFonte: 'full-page-complexo',
    orientacaoFonte: 'retrato',
    hashFonte: '64532984996be009de7bd8c591139a03d40886f101ea6483a772164467ecc589',
    dias: 6,
    periodos: [
      { id: 'manha', rotulo: 'MANHÃ' },
      { id: 'tarde', rotulo: 'TARDE' },
      { id: 'noite', rotulo: 'NOITE' }
    ],
    afericoesPorPeriodo: 3
  });
})(window.F1Registro);
