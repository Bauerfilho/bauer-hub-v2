(function registrarPlanoVisualMedicamentos(registro) {
  'use strict';

  registro.registrar({
    id: 'plano-visual-medicamentos',
    pdfId: 'PDF-17',
    titulo: 'Plano visual de medicamentos — modelo vazio',
    layout: 'plano-medicamentos',
    cabecalhoInstitucional: false,
    classeFonte: 'full-page-complexo',
    orientacaoFonte: 'retrato',
    hashFonte: 'daac299b640ffe4a36619b12a39eae2a0ef1dfb4647a16df640701bc4436093a',
    fontePiiSanitizada: true,
    camposObrigatorios: ['nome', 'data'],
    linhas: 6,
    colunas: [
      { id: 'medicamento', rotulo: 'Medicamento' },
      { id: 'dose', rotulo: 'Dose' },
      { id: 'manha', rotulo: 'Manhã' },
      { id: 'almoco', rotulo: 'Almoço' },
      { id: 'jantar', rotulo: 'Jantar' },
      { id: 'deitar', rotulo: 'Ao deitar' },
      { id: 'observacoes', rotulo: 'Observações' }
    ]
  });
})(window.F1Registro);
