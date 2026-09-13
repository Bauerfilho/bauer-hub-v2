(function registrarExamesSimples(registro) {
  'use strict';

  registro.registrar({
    id: 'exames-simples',
    pdfId: 'PDF-06',
    titulo: 'Requisição de exames',
    layout: 'exames-livre',
    classeFonte: '2-up-nativo',
    orientacaoFonte: 'paisagem',
    hashFonte: '70c0f49471397c2f4f1f0ba16d999f83462e3a8d62327358bb271487d62391e6',
    codigoFonte: '207268',
    camposObrigatorios: ['nome', 'data'],
    campos: [
      { id: 'nome', rotulo: 'Nome', tipo: 'text' },
      { id: 'data-nascimento', rotulo: 'Data de Nascimento', tipo: 'date' },
      {
        id: 'sexo',
        rotulo: 'Sexo',
        tipo: 'radio',
        opcoes: [
          { valor: 'M', rotulo: 'M' },
          { valor: 'F', rotulo: 'F' }
        ]
      },
      { id: 'dados-clinicos', rotulo: 'Dados Clínicos', tipo: 'textarea' },
      { id: 'exames-solicitados', rotulo: 'Exames Solicitados', tipo: 'textarea' },
      { id: 'data', rotulo: 'Data', tipo: 'date' }
    ],
    politicaAssinatura: 'area-fisica-vazia'
  });
})(window.F1Registro);
