(function registrarPuerpera(registro) {
  'use strict';

  registro.registrar({
    id: 'receituario-puerpera',
    pdfId: 'PDF-11',
    titulo: 'Puérpera',
    tituloFormulario: 'RECEITUÁRO PUÉRPERA',
    layout: 'receita-opcoes',
    classeFonte: '2-up-nativo',
    orientacaoFonte: 'paisagem',
    hashFonte: '9dc61e68a98a87885c1234bc816fe65f5bc187d6bd38e1daa61393f9dd372ebb',
    camposObrigatorios: ['nome', 'data'],
    campos: [
      { id: 'nome', rotulo: 'Nome', tipo: 'text' },
      { id: 'data', rotulo: 'Data', tipo: 'date' }
    ],
    secoes: [
      {
        id: 'uso-oral',
        titulo: 'Uso oral',
        modoSelecao: 'nenhuma',
        itens: [
          {
            id: 'sulfato-ferroso',
            numeroFonte: 1,
            nome: 'Sulfato ferroso (40mg Fe Elementar)',
            quantidade: 'Uso contínuo',
            posologia: 'Tomar 1 comprimido antes do almoço até 3 meses após o parto'
          }
        ]
      },
      {
        id: 'anticoncepcionais',
        titulo: 'Anticoncepcionais - ESCOLHER UMA DAS OPÇÕES',
        numeroFonte: 2,
        modoSelecao: 'unica',
        itens: [
          {
            id: 'desogestrel',
            nome: 'Desogestrel 75 mcg',
            quantidade: 'Uso contínuo',
            posologia: 'Tomar 1 comprimido VO 1x/dia; emendar uma cartela na outra.'
          },
          {
            id: 'medroxiprogesterona',
            subtitulo: 'INJETAVEL INTRAMUSCULAR',
            nome: 'Medroxiprogesterona 150 mg/mL',
            quantidade: 'Uso contínuo',
            posologia: 'Aplicar 1 dose de 90 em 90 dias.'
          }
        ]
      },
      {
        id: 'laceracao-parto',
        titulo: 'SE LACERAÇÃO NO PARTO – USO TÓPICO',
        modoSelecao: 'condicional',
        itens: [
          {
            id: 'andolba',
            numeroFonte: 3,
            nome: 'Andolba',
            quantidade: '1 FR',
            posologia: 'Aplicar na lesão, 4 vezes ao longo do dia, enquanto houver desconforto.'
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
