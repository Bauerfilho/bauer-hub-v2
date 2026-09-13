(function registrarControleEspecial(registro) {
  'use strict';

  registro.registrar({
    id: 'receituario-controle-especial',
    pdfId: 'PDF-12',
    titulo: 'Receituário especial',
    tituloFormulario: 'RECEITUÁRIO CONTROLE ESPECIAL',
    layout: 'controle-especial',
    classeFonte: '2-up-nativo',
    orientacaoFonte: 'paisagem',
    hashFonte: 'cb816f78bdc74091f9ba6ff76314c5a76f3c680e835fe88bb86eff98bd9ddc0d',
    rotulosVias: {
      primeira: '1ª VIA FARMÁCIA',
      segunda: '2ª VIA PACIENTE'
    },
    emitente: {
      titulo: 'IDENTIFICAÇÃO DO EMITENTE',
      nome: 'SECRETARIA MUNICIPAL DE SAÚDE DE GOIÂNIA',
      linhas: [
        'Clínica do Orquestrador',
        'Ed. Palácio das Campinas Venerando de Freitas Borges',
        'Bairro ClÃ­nica do Orquestrador',
        'CEP:   – Goiânia/GO'
      ]
    },
    camposObrigatorios: ['paciente', 'endereco', 'prescricao'],
    camposPaciente: [
      { id: 'paciente', rotulo: 'PACIENTE', tipo: 'text' },
      { id: 'endereco', rotulo: 'ENDEREÇO', tipo: 'text' },
      { id: 'prescricao', rotulo: 'PRESCRIÇÃO', tipo: 'textarea' }
    ],
    comprador: {
      titulo: 'IDENTIFICAÇÃO DO COMPRADOR',
      campos: [
        { id: 'comprador-nome', rotulo: 'NOME', tipo: 'text' },
        { id: 'comprador-id', rotulo: 'I.D.', tipo: 'text' },
        { id: 'comprador-rg-emissor', rotulo: 'RG EMISSOR', tipo: 'text' },
        { id: 'comprador-cidade', rotulo: 'CIDADE', tipo: 'text' },
        { id: 'comprador-uf', rotulo: 'UF', tipo: 'text' },
        { id: 'comprador-telefone', rotulo: 'TELEFONE', tipo: 'tel' }
      ]
    },
    fornecedor: {
      titulo: 'IDENTIFICAÇÃO DO FORNECEDOR',
      modo: 'preenchimento-fisico',
      assinatura: 'ASSINATURA DO FARMACÊUTICO',
      data: 'DATA'
    },
    politicaAssinaturaFornecedor: 'area-fisica-vazia'
  });
})(window.F1Registro);
