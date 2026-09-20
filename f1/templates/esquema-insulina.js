(function registrarEsquemaInsulina(registro) {
  'use strict';

  registro.registrar({
    id: 'esquema-insulina-nph-regular',
    pdfId: 'PDF-16',
    titulo: 'Meu esquema de insulina',
    layout: 'insulina',
    cabecalhoInstitucional: false,
    classeFonte: 'full-page-complexo',
    orientacaoFonte: 'retrato',
    hashFonte: 'd6cda32cd1d53b6848ee7a489aa892a9644a9fd8fd63f3e9ca8281fe432d8c42',
    camposObrigatorios: ['nome', 'data'],
    doses: [
      { id: 'manha-nph', periodo: 'MANHÃ / CAFÉ', tipo: 'NPH', instrucao: 'Regular: 30 minutos antes.' },
      { id: 'manha-regular', periodo: 'MANHÃ / CAFÉ', tipo: 'REGULAR', instrucao: 'Regular: 30 minutos antes.' },
      { id: 'almoco-regular', periodo: 'ALMOÇO', tipo: 'REGULAR', instrucao: 'Aplicar 30 minutos antes de comer.' },
      { id: 'jantar-regular', periodo: 'JANTAR', tipo: 'REGULAR', instrucao: 'Aplicar 30 minutos antes de comer.' },
      { id: 'deitar-nph', periodo: 'AO DEITAR', tipo: 'NPH', instrucao: 'Aplicar no horário escrito pela equipe.' }
    ],
    seguranca: {
      nph: 'NPH — frasco leitoso. Rolar entre as mãos 20 vezes. Não agitar.',
      regular: 'REGULAR — frasco transparente. Aplicar 30 minutos antes da refeição.',
      hipoTitulo: 'SE A GLICOSE FICAR ABAIXO DE 70',
      hipoSinais: 'ou tiver suor frio, tremor, fome, tontura ou confusão:',
      hipoPassos: [
        'Tomar 1 colher de sopa de açúcar ou mel.',
        'Esperar 15 minutos e medir de novo.',
        'Se continuar abaixo de 70, repetir.'
      ],
      emergencia: 'DESMAIO OU CONFUSÃO FORTE: NÃO DAR NADA PELA BOCA. LIGAR 192.'
    }
  });
})(window.F1Registro);
