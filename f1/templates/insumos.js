(function registrarInsumos(registro) {
  'use strict';

  registro.registrar({
    id: 'insumos-diabetes',
    pdfId: 'PDF-09',
    titulo: 'Insumos',
    layout: 'insumos',
    classeFonte: '2-up-nativo',
    orientacaoFonte: 'paisagem',
    hashFonte: '6ec75cd8c33c2ecb58ef1ed3c6599610b6ac7fb3b4589fcc496d7d07bbad9d4b',
    camposObrigatorios: ['nome', 'tipo-diabetes', 'data'],
    campos: [
      { id: 'nome', rotulo: 'Nome', tipo: 'text' },
      { id: 'tipo-diabetes', rotulo: 'Tipo de diabetes mellitus (DM)', tipo: 'select', opcoes: [] },
      { id: 'cid', rotulo: 'CID 10', tipo: 'text' },
      { id: 'data', rotulo: 'Data', tipo: 'date' }
    ],
    textoFixo: [
      'PACIENTE COM DIAGNÓSTICO DE DIABETES MELLITUS (DM) TIPO',
      'NECESSITA DE CONTROLE GLICÊMICO. DIANTE DISSO NECESSITA DOS SEGUINTES INSUMOS:'
    ],
    itens: [
      { id: 'quantidade-fitas-reagentes', rotulo: 'UN DE FITAS REAGENTES', tipo: 'number' },
      { id: 'quantidade-lancetas-ou-agulhas', rotulo: 'UN DE LANCETAS OU AGULHAS', tipo: 'number' },
      { id: 'quantidade-agulhas-caneta-ou-seringa', rotulo: 'UN DE AGULHAS PARA CANETA DE INSULINA OU SERINGA AGULHADA', tipo: 'number' }
    ],
    rotuloAssinatura: 'Assinatura – CRM',
    politicaAssinatura: 'area-fisica-vazia'
  });
})(window.F1Registro);
