(function registrarExamesPreNatal(registro) {
  'use strict';

  registro.registrar({
    id: 'exames-labs-pre-natal',
    pdfId: 'PDF-04',
    titulo: 'Exames laboratoriais — pré-natal de rotina',
    layout: 'exames-lista',
    classeFonte: '2-up-nativo',
    orientacaoFonte: 'paisagem',
    hashFonte: 'c8211ec883028bc74bd0e62c036ca3487fbb753c17b8b48f6a4ac9f9f9487a69',
    subtitulo: 'Pré-natal',
    camposObrigatorios: ['nome', 'data'],
    exames: [
      'Hemograma completo',
      'EAS + urocultura com antibiograma',
      'Eletroforese de Hb',
      'Tipagem sanguínea + fator Rh',
      'Anti HBS',
      'TSH',
      'T4 livre',
      'Glicemia de jejum'
    ],
    rotuloAssinatura: 'Assinatura – Coren',
    politicaAssinatura: 'area-fisica-vazia'
  });
})(window.F1Registro);
