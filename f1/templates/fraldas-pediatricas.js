(function registrarFraldasPediatricas(registro) {
  'use strict';

  registro.registrar({
    id: 'fraldas-pediatricas',
    pdfId: 'PDF-08',
    titulo: 'Fraldas pediátricas',
    layout: 'solicitacao-texto',
    classeFonte: '2-up-nativo',
    orientacaoFonte: 'paisagem',
    hashFonte: '0fbeac4a318c04ffeba8ffd1dd7a29ff45609859aa0dd62bf2f9836910846c11',
    destinatarioFixo: 'À OVG',
    cidFixo: 'Z00.1',
    camposObrigatorios: ['nome', 'idade', 'tamanho', 'unidades-dia', 'data'],
    campos: [
      { id: 'nome', rotulo: 'Nome', tipo: 'text' },
      { id: 'idade', rotulo: 'Idade', tipo: 'text' },
      { id: 'tamanho', rotulo: 'Tamanho', tipo: 'select', opcoes: [] },
      { id: 'unidades-dia', rotulo: 'Unidades/dia', tipo: 'number' },
      { id: 'data', rotulo: 'Data', tipo: 'date' }
    ],
    textoFixo: [
      'CRIANÇA, LACTENTE, COM IDADE DE',
      'NECESSITA DE FRALDAS PEDIÁTRICAS COMPATÍVEL COM SUA IDADE',
      'PARA AUXÍLIO DE SUA HIGIENE. DIANTE DISSO SOLICITO FORNECIMENTO.'
    ],
    rotuloAssinatura: 'Assinatura – CRM',
    politicaAssinatura: 'area-fisica-vazia'
  });
})(window.F1Registro);
