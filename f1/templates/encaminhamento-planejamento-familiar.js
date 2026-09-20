(function registrarEncaminhamentoPlanejamentoFamiliar(registro) {
  'use strict';

  registro.registrar({
    id: 'encaminhamento-planejamento-familiar',
    pdfId: 'PDF-03',
    titulo: 'Encaminhamento — planejamento familiar',
    layout: 'encaminhamento-planejamento',
    classeFonte: 'full-page-complexo',
    orientacaoFonte: 'retrato',
    hashFonte: '6869f64083d714f4ed8acebfd35782d2a0765385111b6395b52a5d4150d5ca5b',
    codigoFonte: '358320',
    servicoDestinoFixo: 'PLANEJAMENTO FAMILIAR',
    motivoEncaminhamentoFixo: 'PACIENTE COM DESEJO DE REALIZAR LAQUEADURA TUBARIA PARA ESTERILIZAÇÃO DEFINITIVA. SOLICITO AVALIAÇÃO E CONDUTA. GRATO!',
    observacaoFixa: 'OBS: ATA JA ASSINADA',
    cidFixo: 'Z30.2',
    camposObrigatorios: ['nome', 'data-encaminhamento']
  });
})(window.F1Registro);
