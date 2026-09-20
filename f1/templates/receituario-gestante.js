(function registrarReceituarioGestante(registro) {
  'use strict';

  registro.registrar({
    id: 'receituario-gestante',
    pdfId: 'PDF-13',
    titulo: 'Receituário gestante',
    tituloFormulario: 'RECEITUÁRIO GESTANTE',
    layout: 'receita-opcoes',
    classeFonte: '2-up-nativo',
    orientacaoFonte: 'paisagem',
    hashFonte: '45c17fa4c4b7f2e1c6a53471bbb0dc88057d98c193d60ecd32666613160fdd22',
    camposObrigatorios: ['nome', 'data'],
    campos: [
      { id: 'nome', rotulo: 'Nome', tipo: 'text' },
      { id: 'data', rotulo: 'Data', tipo: 'date' }
    ],
    secoes: [
      {
        id: 'uso-oral',
        titulo: 'Uso oral',
        modoSelecao: 'multipla',
        itens: [
          {
            id: 'paracetamol',
            nome: 'Paracetamol 500mg',
            quantidade: '10 cps',
            posologia: 'Tomar 1 comprimido de 6 em 6 horas, se febre ou dor.',
            selecionavel: true
          },
          {
            id: 'buscopan',
            nome: 'Buscopan 10mg',
            quantidade: '10 cps',
            posologia: 'Tomar 1 comprimido de 8 em 8 horas, se dor abdominal.',
            selecionavel: true
          },
          {
            id: 'ondansetrona',
            nome: 'Ondansetrona 4mg ou 8mg',
            quantidade: '10 cps',
            posologia: 'Tomar 1 comprimido de 8 em 8 horas, se náuseas ou vômitos.',
            selecionavel: true,
            campoOpcao: {
              id: 'dose-ondansetrona',
              rotulo: 'Dose da ondansetrona',
              tipo: 'select',
              opcoes: [
                { valor: '4mg', rotulo: '4 mg' },
                { valor: '8mg', rotulo: '8 mg' }
              ]
            }
          },
          {
            id: 'loratadina',
            nome: 'Loratadina 10mg',
            quantidade: '10 cps',
            posologia: 'Tomar 1 comprimido de 12/12h, se prurido, congestão nasal ou coriza nasal.',
            selecionavel: true
          },
          {
            id: 'sulfato-ferroso',
            nome: 'Sulfato Ferroso 40 mg Fe elem(a partir de 12 semanas)',
            quantidade: 'Uso cont',
            posologia: 'Tomar 1 comprimido antes ou após almoço, até 3 meses pos parto.',
            selecionavel: true
          },
          {
            id: 'carbonato-calcio',
            nome: 'Carb. Calcio (500mg Ca elementar)',
            quantidade: 'Uso cont',
            posologia: 'Tomar 1 cp após café da manhã e 1 cp após jantar',
            selecionavel: true
          },
          {
            id: 'acido-folico',
            nome: 'Acido Fólico 5mg (até o final da gestação)',
            quantidade: 'Uso cont',
            posologia: 'Tomar 1 comprimido ao dia (qualquer horário)',
            selecionavel: true
          }
        ]
      }
    ],
    rodape: {
      campoData: 'data',
      assinatura: 'Assinatura – CRM',
      politicaAssinatura: 'area-fisica-vazia'
    }
  });
})(window.F1Registro);
