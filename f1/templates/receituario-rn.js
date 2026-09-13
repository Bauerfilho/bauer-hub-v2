(function registrarReceituarioRn(registro) {
  'use strict';

  registro.registrar({
    id: 'receituario-rn',
    pdfId: 'PDF-14',
    titulo: 'Receituário RN',
    tituloFormulario: 'RECEITUÁRIO RN',
    layout: 'receita-opcoes',
    classeFonte: '2-up-nativo',
    orientacaoFonte: 'paisagem',
    hashFonte: 'e8d9ced45d23adc1bd299ce17b33861566124d17a245649e478a207371f73553',
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
            id: 'paracetamol',
            numeroFonte: 1,
            nome: 'Paracetamol 100mg/ml',
            quantidade: '1 fr',
            posologiaAntesDose: 'Dar',
            campoDose: { id: 'dose-paracetamol-gotas', rotulo: 'Gotas de paracetamol', tipo: 'text' },
            posologiaDepoisDose: 'gotas para febre (> 38*) ou dor - até 6/6 horas.'
          },
          {
            id: 'simeticona',
            numeroFonte: 2,
            nome: 'Simeticona 75mg/ml',
            quantidade: '1 fr',
            posologiaAntesDose: 'Dar',
            campoDose: { id: 'dose-simeticona-gotas', rotulo: 'Gotas de simeticona', tipo: 'text' },
            posologiaDepoisDose: 'gotas em caso de cólica, até 8/8 horas.'
          },
          {
            id: 'vitamina-d',
            numeroFonte: 3,
            nome: 'Vitamina D (200 UI) gotas',
            quantidade: '1 fr',
            posologia: 'Dar 02 gotas direto na boca 1 X ao dia; A partir do 14º dia de vida'
          }
        ]
      },
      {
        id: 'uso-topico',
        titulo: 'USO TÓPICO',
        modoSelecao: 'nenhuma',
        itens: [
          {
            id: 'alcool-70',
            numeroFonte: 4,
            nome: 'Álcool 70%',
            quantidade: '1 fr',
            posologia: 'Aplicar no coto umbilical 3 vezes ao dia, até 1 mês'
          },
          {
            id: 'soro-fisiologico',
            numeroFonte: 5,
            nome: 'Soro fisiologico',
            quantidade: '1 fr',
            posologia: 'Aplicar ½ conta-gotas em cada narina antes das mamadas.'
          },
          {
            id: 'nistatina-oxido-zinco',
            numeroFonte: 6,
            nome: 'Nistatina+Óxido de zinco pomada',
            quantidade: '1 fr',
            posologia: 'Aplicar fina camada nas trocas de fraldas.'
          }
        ]
      }
    ],
    recomendacoes: [
      'Oferecer o peito sem restrições de horários;',
      'Não usar talco, perfume e xampu;',
      'Banho de sol diário (antes das 10h da manhã ou após 16h);',
      'Hepatite B, BCG e Teste do Pezinho - Fazer até o 5º dia;',
      'Teste da orelhinha até 30 dias;',
      'Teste do olhinho de 30 a 90 dias'
    ],
    rodape: {
      campoData: 'data',
      assinatura: 'Assinatura – CRM',
      politicaAssinatura: 'area-fisica-vazia'
    }
  });
})(window.F1Registro);
