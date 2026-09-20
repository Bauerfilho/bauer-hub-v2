(function registrarExamesLabsRotina(registro) {
  'use strict';

  registro.registrar({
    id: 'exames-labs-rotina',
    pdfId: 'PDF-05',
    titulo: 'Exames laboratoriais — rotina',
    layout: 'exames-lista',
    classeFonte: '2-up-nativo',
    orientacaoFonte: 'paisagem',
    hashFonte: '1eedbf7734d013c17d61452003d1e534e62e6a29cc18f7cc5f6e21a0725c41de',
    subtitulo: 'EXAME DE ROTINA',
    camposObrigatorios: ['nome', 'data'],
    exames: [
      'Hemograma completo',
      'Glicose Jejum',
      'Lipidograma',
      'Ureia',
      'Creatinina',
      'TSH',
      'T4 livre',
      'EAS',
      'EPF',
      'Hemoglobina Glicada'
    ],
    politicaAssinatura: 'area-fisica-vazia',
    artefatosFonteNaoReproduzidos: ['assinatura manuscrita rasterizada', 'watermark CamScanner']
  });
})(window.F1Registro);
