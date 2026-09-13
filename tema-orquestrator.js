/* TEMA ORQUESTRATOR — ativador e marcas (screen-only, zero rede, idempotente).
   Autoria: brain, 28/08/2026. API pública: window.TEMA.Orquestrador(true|false).
   Injeta: selo "ORQUESTRATOR" na appbar + dedicatória à Clínica do Orquestrador no hero.
   Nunca toca folhas de impressão nem o IIFE do hub. */
(function(){
  'use strict';
  function selo(){
    var bar=document.querySelector('.appbar');
    if(!bar||bar.querySelector('.orq-marca'))return;
    var m=document.createElement('div');
    m.className='orq-marca';m.setAttribute('aria-hidden','true');
    m.innerHTML='<span class="orq-simbolo"></span>ORQUESTRATOR';
    bar.appendChild(m);
  }
  function dedicatoria(){
    var hero=document.querySelector('.hero');
    if(!hero||hero.querySelector('.orq-dedicatoria'))return;
    var d=document.createElement('div');
    d.className='orq-dedicatoria';
    d.innerHTML='<span class="orq-coroa"></span>Clínica do Orquestrador · Clínica do Orquestrador';
    hero.appendChild(d);
  }
  function unidadeNome(){try{var m=JSON.parse(localStorage.getItem('ubs2026.v1.meta')||'{}');return m.unidadeNome||'Clínica do Orquestrador'}catch(_){return 'Clínica do Orquestrador'}}
  function marcaUnidade(){
    var b=document.querySelector('.brand span');
    if(b&&/USF|UBS|CSF/i.test(b.textContent))b.textContent=unidadeNome()+' · 2026';
    var d=document.querySelector('.orq-dedicatoria');
    if(d)d.innerHTML='<span class="orq-coroa"></span>'+unidadeNome().replace(/</g,'&lt;')+' · Clínica do Orquestrador';
  }
  /* Os desenhos dos ícones do índice (ordem do dono 22h18): SVG de traço fino
     verde, centrado, no lugar dos caracteres de texto. */
  function iconesFinos(){
    var S='fill="none" stroke="#0f766e" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';
    var ICONES={
      'Índice':'<path d="M9 6.5h10M9 12h10M9 17.5h10" '+S+'/><circle cx="5.2" cy="6.5" r="1" fill="#0f766e"/><circle cx="5.2" cy="12" r="1" fill="#0f766e"/><circle cx="5.2" cy="17.5" r="1" fill="#0f766e"/>',
      'Documentos':'<path d="M7 3.5h6.5L18 8v11.3a1.2 1.2 0 0 1-1.2 1.2H7a1.2 1.2 0 0 1-1.2-1.2V4.7A1.2 1.2 0 0 1 7 3.5z" '+S+'/><path d="M13.5 3.5V8H18M9 12.5h6M9 16h6" '+S+'/>',
      'Gate':'<circle cx="12" cy="12" r="8.3" '+S+'/><path d="M8.4 12.3l2.5 2.5 4.9-5.2" '+S+'/>',
      'Pacientes':'<circle cx="10" cy="8.8" r="3.2" '+S+'/><path d="M4.6 19.2a5.4 5.4 0 0 1 10.8 0M17.6 8v5M15.1 10.5h5" '+S+'/>',
      'Guias':'<path d="M12 5.5c-1.6-1.3-3.7-2-6-2v13c2.3 0 4.4.7 6 2 1.6-1.3 3.7-2 6-2v-13c-2.3 0-4.4.7-6 2z" '+S+'/><path d="M12 5.5v13" '+S+'/>'
    };
    document.querySelectorAll('.feature-card').forEach(function(card){
      var titulo=(card.querySelector('strong')||{}).textContent||'';
      var chave=Object.keys(ICONES).find(function(k){return titulo.indexOf(k)===0||titulo.indexOf(k)>-1});
      var icone=card.querySelector('.feature-icon');
      if(chave&&icone&&!icone.dataset.orq){icone.dataset.orq='1';icone.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">'+ICONES[chave]+'</svg>'}
    });
  }
  /* O modo dela (palha/marfim) liga SEMPRE que há sessão viva — blindado contra
     regressões no fluxo de login (28/08 22h55: boot com sessão persistida perdia o tema). */
  function ligarModoDela(){try{if(localStorage.getItem('ubs2026.v1.session'))document.body.classList.add('tema-Orquestrador')}catch(_){}}
  function boot(){selo();dedicatoria();marcaUnidade();iconesFinos();ligarModoDela();}
  window.TEMA={
    Orquestrador:function(on){document.body.classList.toggle('tema-Orquestrador',!!on);}
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
