(function registrarFormulaLactea(registro) {
  'use strict';

  registro.registrar({
    id: 'formula-lactea',
    pdfId: 'PDF-07',
    titulo: 'Fórmula láctea',
    layout: 'solicitacao-texto',
    classeFonte: '2-up-nativo',
    orientacaoFonte: 'paisagem',
    hashFonte: 'acd6d8a1d69dca9e95fac89114e46e093ba3c5ad5db41792161350cd984b7e3e',
    destinatarioFixo: 'À OVG',
    cidFixo: 'Z00.1',
    camposObrigatorios: ['nome', 'idade', 'sugestao-formula', 'data'],
    campos: [
      { id: 'nome', rotulo: 'Nome', tipo: 'text' },
      { id: 'idade', rotulo: 'Idade', tipo: 'text' },
      { id: 'sugestao-formula', rotulo: 'Sugestão', tipo: 'text' },
      { id: 'data', rotulo: 'Data', tipo: 'date' }
    ],
    textoFixo: [
      'CRIANÇA, LACTENTE, COM IDADE DE',
      'NECESSITA DE FÓRMULA LÁCTEA COMPATÍVEL COM SUA IDADE',
      'PARA COMPLEMENTAÇÃO DE SUA ALIMENTAÇÃO. DIANTE DISSO SOLICITO FORNECIMENTO.'
    ],
    rotuloAssinatura: 'Assinatura – CRM',
    politicaAssinatura: 'area-fisica-vazia'
  });
})(window.F1Registro);
