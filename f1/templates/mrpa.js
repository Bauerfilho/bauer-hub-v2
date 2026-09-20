(function registrarMrpa(registro) {
  'use strict';

  registro.registrar({
    id: 'mrpa',
    pdfId: 'PDF-10',
    titulo: 'MRPA',
    tituloFormulario: 'MAPA DE PRESSÃO ARTERIAL/GLICEMIA',
    layout: 'mrpa',
    classeFonte: '2-up-nativo',
    orientacaoFonte: 'paisagem',
    hashFonte: 'c1ed17305f1f5866cc881e774f25226f3f49187656e3d26282a3969d050a5dc2',
    cabecalhoFonte: 'sus-municipal-sem-unidade',
    camposObrigatorios: ['nome'],
    campos: [
      { id: 'nome', rotulo: 'Nome', tipo: 'text' },
      { id: 'retorno', rotulo: 'Retorno', tipo: 'text' }
    ],
    dias: 7,
    periodos: [
      { id: 'manha', rotulo: 'MANHÃ' },
      { id: 'tarde', rotulo: 'TARDE' },
      { id: 'noite', rotulo: 'NOITE' }
    ],
    afericoesPorPeriodo: 1
  });
})(window.F1Registro);
