(function registrarEncaminhamento(registro) {
  'use strict';

  registro.registrar({
    id: 'encaminhamento-geral',
    pdfId: 'PDF-02',
    titulo: 'Encaminhamento e contrarreferência',
    layout: 'encaminhamento',
    classeFonte: 'full-page-complexo',
    orientacaoFonte: 'retrato',
    hashFonte: '1f30b9f1d51c7acadeaf62978dfd03629de1c67d261b700caf6182fc3d9ed243',
    codigoFonte: '358320',
    observacaoFixa: 'OBS: ATA JA ASSINADA',
    camposObrigatorios: ['nome', 'servico-destino', 'motivo-encaminhamento', 'data-encaminhamento']
  });
})(window.F1Registro);
