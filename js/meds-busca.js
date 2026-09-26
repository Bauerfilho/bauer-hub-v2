/* meds-busca.js — busca inteligente de medicamentos do Receituários Orquestrador.

   A regra, cravada por ele em 25/09: "não devia importar qual a posição na lista".
   Os 2.473 princípios ativos competem em pé de igualdade. Pontua-se a QUALIDADE do
   encontro, ordena-se, e só então corta — nunca o contrário.

   Mesmo motor da busca de CID (js/orquestrator-assist.js), estendido para:
   - procurar no genérico E nas marcas;
   - devolver POR QUE casou (genérico ou qual marca), para a tela poder mostrar;
   - marcar o que existe na farmácia da unidade.

   O Orquestrator SUGERE e organiza; a decisão é sempre da médica.
   Código da casa — MIT. */
(function (global) {
  'use strict';

  const fold = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  /* pontua UM texto contra a busca — idêntico em espírito ao scoreCid */
  function pontuar(texto, q) {
    const t = fold(texto);
    if (!t.includes(q)) return 0;                                  /* saída barata */
    if (t === q) return 1000;                                      /* nome exato */
    if (t.split(/[^a-z0-9]+/).some(p => p.startsWith(q))) return 500; /* inicia palavra */
    return 50;                                                     /* no meio: exciPIEntes */
  }

  /* farmácia da unidade: sobe o que o paciente consegue pegar hoje */
  function naUnidade(generico) {
    const farm = global.FARMACIA_UNIDADE;
    if (!Array.isArray(farm)) return null;
    const g = fold(generico);
    const achou = farm.find(i => {
      const nome = fold(i && (i.nome || i.n || i.t || i));
      return nome && (nome.includes(g) || g.includes(nome));
    });
    if (!achou) return null;
    return achou.riscado ? 'riscado' : 'tem';
  }

  /**
   * Busca medicamentos. Devolve SEMPRE em ordem de relevância.
   * @param {string} termo  o que a médica digitou
   * @param {number} teto   quantos devolver (0 = todos — use no painel)
   */
  function buscar(termo, teto) {
    const q = fold(String(termo || '').trim());
    if (q.length < 2) return [];
    const base = global.MEDS || [];
    const achados = [];

    for (let i = 0; i < base.length; i++) {
      const [generico, classe, marcas] = base[i];

      let pt = pontuar(generico, q);
      let via = pt ? 'generico' : null;
      let marcaCasada = null;

      const lista = marcas || [];
      for (let m = 0; m < lista.length; m++) {
        const pm = pontuar(lista[m], q);
        if (pm > pt) { pt = pm; via = 'marca'; marcaCasada = lista[m]; }
        else if (pm && !marcaCasada) { marcaCasada = lista[m]; }
      }
      /* classe só desempata; nunca sozinha traz o item */
      if (!pt) continue;

      /* genérico vence marca no mesmo nível: é o que vai na receita (Lei 9.787/99) */
      if (via === 'marca') pt -= 1;

      /* SUBSTÂNCIA PURA VENCE COMBINAÇÃO. Quem digita "dipi" quer Dipirona, não
         "Escopolamina + Dipirona + Cafeína". Sem isso, qualquer componente de uma
         associação de 5 pontua igual ao princípio sozinho — defeito medido em 25/09,
         quando "glu" escondia Semaglutida atrás de nutrição parenteral. */
      const componentes = generico.split(/\s\+\s/).length;
      if (componentes > 1) pt -= (componentes - 1) * 40;

      const estoque = naUnidade(generico);
      if (estoque === 'tem') pt += 2;      /* empate desfeito pelo que existe hoje */

      achados.push({ generico, classe, marcas: lista, via, marcaCasada, estoque, _pt: pt, _i: i });
    }

    achados.sort((a, b) => (b._pt - a._pt) || (a._i - b._i));  /* empate: ordem alfabética */
    return teto ? achados.slice(0, teto) : achados;
  }

  global.MedsBusca = { buscar, pontuar, fold };
})(typeof window !== 'undefined' ? window : globalThis);
