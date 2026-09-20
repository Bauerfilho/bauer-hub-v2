(function iniciarRegistroF1(escopoGlobal) {
  'use strict';

  // O Map é a definição canônica única: um ID nunca pode registrar dois templates.
  const documentos = new Map();

  function registrar(documento) {
    if (!documento || typeof documento !== 'object') {
      throw new TypeError('F1_REGISTRO_DOCUMENTO_INVALIDO');
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(documento.id || '')) {
      throw new Error(`F1_ID_INVALIDO:${documento.id || 'ausente'}`);
    }

    if (documentos.has(documento.id)) {
      throw new Error(`F1_ID_DUPLICADO:${documento.id}`);
    }

    if (!documento.pdfId || !documento.hashFonte || !documento.layout || !documento.titulo) {
      throw new Error(`F1_TEMPLATE_INCOMPLETO:${documento.id}`);
    }

    documentos.set(documento.id, Object.freeze(documento));
  }

  function obter(id) {
    return documentos.get(id) || null;
  }

  function todos() {
    return Array.from(documentos.values());
  }

  escopoGlobal.F1Registro = Object.freeze({ registrar, obter, todos });
})(window);
