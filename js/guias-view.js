/* guias-view.js — motor dos Guias do paciente como VIEW INTERNA do hub (1 página, 1 identidade).
   LINHAGEM: transplante mecânico do <script> de documentos-preenchiveis2.html (autor original: codex),
   adaptado pela casa em 30/08/2026: raiz escopada em #documentsView, portal/toast/estilo de página do hub,
   drawer removido (catálogo é coluna fixa), atalhos condicionados à view, boot lazy fail-closed na view.
   Código da casa — MIT. */
  (()=>{
    'use strict';

    const ICONS={
      search:'<circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path>',
      book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"></path>',
      eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle>',
      person:'<circle cx="12" cy="7" r="4"></circle><path d="M4 22v-2a8 8 0 0 1 16 0v2"></path>',
      check:'<path d="m4 12 5 5L20 6"></path><path d="M21 12a9 9 0 1 1-5.3-8.2"></path>',
      print:'<path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect>',
      contrast:'<circle cx="12" cy="12" r="9"></circle><path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none"></path>',
      clock:'<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>',
      calendar:'<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4M8 3v4M3 10h18"></path>',
      pill:'<path d="m10.5 20.5-7-7a5 5 0 0 1 7-7l7 7a5 5 0 0 1-7 7Z"></path><path d="m8 11 5-5"></path>',
      drops:'<path d="M12 2s5 6 5 11a5 5 0 0 1-10 0c0-5 5-11 5-11Z"></path><path d="M9.5 14.5c.4 1 1.2 1.5 2.5 1.5"></path>',
      syringe:'<path d="m18 2 4 4M17 7l2-2M4 20l5-5M3 21l2-1"></path><path d="m8 17-3-3 9-9 3 3Z"></path><path d="m11 8 3 3M9 10l3 3"></path>',
      inhaler:'<path d="M8 3h8v8H8z"></path><path d="M9 11h7l3 4v6H8v-8"></path><path d="M12 6h4"></path>',
      sun:'<path d="M4 18h16"></path><path d="M6 16a6 6 0 0 1 12 0"></path><path d="M12 2v3M4.9 4.9 7 7M19.1 4.9 17 7M2 12h3M19 12h3"></path>',
      midday:'<circle cx="12" cy="8" r="4"></circle><path d="M12 1v2M4.2 3.2l1.4 1.4M19.8 3.2l-1.4 1.4M3 8H1M23 8h-2"></path><circle cx="12" cy="17" r="5"></circle><path d="M4 13v8M2 13v4h4v-4M20 13v8"></path>',
      sunset:'<path d="M4 17h16M6 20h12"></path><path d="M7 15a5 5 0 0 1 10 0"></path><path d="M12 5v3M5 8l2 2M19 8l-2 2"></path>',
      moon:'<path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"></path><path d="m17 4 .5 1.2L19 6l-1.5.8L17 8l-.5-1.2L15 6l1.5-.8Z"></path>',
      meal:'<circle cx="12" cy="13" r="6"></circle><path d="M4 3v7M2 3v4h4V3M20 3v18"></path>',
      warning:'<path d="M10.3 3.7 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z"></path><path d="M12 9v4M12 17h.01"></path>',
      heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"></path><path d="M4 12h4l2-4 3 8 2-4h5"></path>',
      brain:'<path d="M9.5 4.5A3 3 0 0 0 4 6a3 3 0 0 0-1 5.8A3.5 3.5 0 0 0 6.5 18H9"></path><path d="M14.5 4.5A3 3 0 0 1 20 6a3 3 0 0 1 1 5.8A3.5 3.5 0 0 1 17.5 18H15"></path><path d="M9 3v18M15 3v18M6 9h3M15 9h3M6 15h3M15 15h3"></path>',
      kidney:'<path d="M9 4C5 2 2 5 2 10c0 6 3 10 7 10 2 0 3-2 3-5V8c0-2-1-3-3-4Z"></path><path d="M15 4c4-2 7 1 7 6 0 6-3 10-7 10-2 0-3-2-3-5V8c0-2 1-3 3-4Z"></path>',
      lungs:'<path d="M12 3v8"></path><path d="M10 11 7 7c-2 1-4 4-4 8 0 4 2 6 5 6 2 0 3-2 3-4V11Z"></path><path d="m14 11 3-4c2 1 4 4 4 8 0 4-2 6-5 6-2 0-3-2-3-4v-6Z"></path>',
      thyroid:'<path d="M8 5c-3 1-5 4-4 8 1 4 5 5 8 2V9C10 9 9 7 8 5Z"></path><path d="M16 5c3 1 5 4 4 8-1 4-5 5-8 2V9c2 0 3-2 4-4Z"></path>',
      skin:'<path d="M4 4h16v16H4z"></path><path d="M4 9c4-3 6 3 10 0s5 0 6 1M4 15c3-2 6 2 9 0s5-1 7 0"></path>',
      child:'<circle cx="12" cy="6" r="3"></circle><path d="M8 21v-5l-2 2M16 21v-5l2 2M8 10h8v6H8z"></path>',
      stomach:'<path d="M9 3v6c0 2-3 2-3 6a6 6 0 0 0 12 0c0-3-2-5-5-5V3"></path>',
      pressure:'<rect x="3" y="3" width="13" height="15" rx="2"></rect><path d="M7 8h5M7 12h3M16 13h2a3 3 0 0 1 3 3v5"></path>',
      glucose:'<rect x="5" y="2" width="12" height="20" rx="2"></rect><path d="M8 6h6v5H8zM9 18h4M19 4s3 3 3 5a3 3 0 0 1-6 0c0-2 3-5 3-5Z"></path>',
      insulin:'<path d="m5 19 8-8M12 5l7 7M14 3l7 7M4 20l-1 1"></path><rect x="9" y="6" width="8" height="8" rx="1" transform="rotate(-45 13 10)"></rect>',
      reconcile:'<path d="M4 5h16M4 12h16M4 19h16"></path><path d="m7 2-3 3 3 3M17 9l3 3-3 3M7 16l-3 3 3 3"></path>',
      local:'<path d="M12 21s7-4.4 7-11a7 7 0 1 0-14 0c0 6.6 7 11 7 11Z"></path><circle cx="12" cy="10" r="2"></circle>',
      caregiver:'<circle cx="8" cy="7" r="3"></circle><circle cx="17" cy="8" r="2.5"></circle><path d="M2 21v-2a6 6 0 0 1 12 0v2M14 21v-1a5 5 0 0 1 8-4"></path>',
      chair:'<path d="M7 3v9h8V7M7 12v8M15 12v8M5 20h12"></path>',
      rest:'<circle cx="12" cy="12" r="8"></circle><path d="M12 7v5l3 2"></path>',
      feet:'<path d="M8 3c2 0 3 3 2 6s-3 5-5 4-2-3-1-6 2-4 4-4ZM16 10c2 0 4 2 4 5s-1 5-3 5-4-2-4-5 1-5 3-5Z"></path>',
      arm:'<path d="M4 15c4-1 4-8 7-8 2 0 2 3 1 5l4 1c3 0 5 2 4 5H9c-3 0-5-1-5-3Z"></path>',
      quiet:'<path d="M3 10v4h4l5 4V6l-5 4Z"></path><path d="m18 9 4 4M22 9l-4 4"></path>'
    };
    const icon=(name,cls='icon')=>`<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name]||ICONS.book}</svg>`;
    const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const norm=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const today=()=>{const date=new Date(),pad=value=>String(value).padStart(2,'0');return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`};
    const uid=()=>globalThis.crypto?.randomUUID?.()||`m-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const GUIDES=[
      {id:'routine',title:'Rotina diária sem diagnóstico',category:'Gerais',icon:'clock',hint:'Organize qualquer tratamento apenas pelos horários, sem citar doença.',groups:['Meus medicamentos'],meta:[['Dias de uso','Ex.: todos os dias ou dias escolhidos'],['Orientação geral','Mensagem curta da equipe']]},
      {id:'temporary',title:'Tratamento temporário',category:'Gerais',icon:'calendar',hint:'Mostre com clareza quando começar e quando terminar.',groups:['Tratamento por tempo definido'],meta:[['Começar em','Data de início'],['Terminar em','Data de término'],['Duração total','Preencher conforme receita']]},
      {id:'rescue',title:'Medicamentos de resgate',category:'Gerais',icon:'warning',hint:'Separe medicamentos usados somente em situações definidas.',groups:['Somente se precisar'],meta:[['Usar quando','Situação ou sintoma definido pela equipe'],['Intervalo mínimo','Tempo mínimo entre usos'],['Máximo em 24 horas','Limite individual prescrito'],['Quando procurar ajuda','Orientação individual']]},
      {id:'hypertension',title:'Hipertensão arterial',category:'Condições crônicas',icon:'pressure',hint:'Organize os medicamentos da pressão e vincule o acompanhamento.',groups:['Pressão arterial'],meta:[['Meta definida pela equipe','Deixar em branco se não definida'],['Próximo retorno','Data'],['Plano de medidas em casa','Orientação individual']]},
      {id:'diabetes-no-insulin',title:'Diabetes sem insulina',category:'Condições crônicas',icon:'glucose',hint:'Organize comprimidos e injetáveis não insulínicos.',groups:['Diabetes'],meta:[['Quando medir a glicemia','Frequência definida pela equipe'],['Próximo retorno','Data'],['Alerta individual','Somente se orientado']]},
      {id:'dyslipidemia',title:'Dislipidemia',category:'Condições crônicas',icon:'heart',hint:'Quadro simples para medicamentos do colesterol e triglicérides.',groups:['Colesterol e triglicérides'],meta:[['Data da revisão','Próximo controle'],['O que comunicar à equipe','Orientação individual']]},
      {id:'triple-care',title:'Pressão + diabetes + colesterol',category:'Condições crônicas',icon:'heart',hint:'Três blocos independentes, com até quatro medicamentos em cada um.',groups:['Pressão arterial','Diabetes','Colesterol e triglicérides'],meta:[['Próximo retorno','Data'],['Orientação geral','Mensagem curta da equipe']]},
      {id:'insulin',title:'Esquema de insulinas',category:'Alto risco',icon:'insulin',hint:'Identifique tipo, quantidade em unidades, horário e refeição sem depender da cor.',groups:['Insulinas'],meta:[['Dispositivo','Caneta, seringa ou outro'],['Onde guardar','Orientação conferida'],['Plano para glicemia baixa','Orientação individual'],['Contato de apoio','Telefone ou referência']]},
      {id:'kidney',title:'Rins e doença renal',category:'Condições crônicas',icon:'kidney',hint:'Destaque intervalos e diferenças nos dias de diálise, quando houver.',groups:['Cuidado renal'],meta:[['Dias com diálise','Se aplicável'],['Dias sem diálise','Se houver diferença'],['Líquidos conforme orientação','Não preencher automaticamente'],['Última revisão','Data']]},
      {id:'psychotropics',title:'Psicotrópicos',category:'Saúde mental e neurológica',icon:'brain',hint:'Organize horários, mudanças graduais e resgates exatamente como prescritos.',groups:['Saúde mental'],meta:[['Data da reavaliação','Data'],['Mudança gradual prescrita','Etapas conferidas'],['Alerta selecionado pela equipe','Não inserir automaticamente']]},
      {id:'heart',title:'Coração',category:'Condições crônicas',icon:'heart',hint:'Reúna medicamentos cardíacos e sinais individualizados de acompanhamento.',groups:['Cuidado do coração'],meta:[['Acompanhar em casa','Peso, pulso ou pressão se indicado'],['Sinais para comunicar','Orientação individual'],['Próximo retorno','Data']]},
      {id:'anticoagulants',title:'Anticoagulantes e antiagregantes',category:'Alto risco',icon:'drops',hint:'Destaque dias, horários, exames e orientações individualizadas sobre sangramento.',groups:['Proteção contra coágulos'],meta:[['Próxima coleta','Data e exame, se aplicável'],['Meta individual','Somente se definida'],['Se esquecer','Orientação específica'],['Quando procurar ajuda','Orientação individual']]},
      {id:'respiratory',title:'Asma, DPOC e inaladores',category:'Uso por dispositivo',icon:'lungs',hint:'Diferencie tratamento diário, resgate, sequência e técnica.',groups:['Respiração'],meta:[['Medicamento de controle','Identificação conferida'],['Medicamento de resgate','Identificação conferida'],['Usa espaçador','Orientação'],['Após usar','Cuidado individual']]},
      {id:'neurology',title:'Medicamentos neurológicos',category:'Saúde mental e neurológica',icon:'brain',hint:'Mostre horários exatos e o plano individual para atrasos ou resgate.',groups:['Cuidado neurológico'],meta:[['Plano para dose esquecida','Orientação individual'],['Medicamento de resgate','Se prescrito'],['Data da reavaliação','Data']]},
      {id:'pain',title:'Dor aguda ou crônica',category:'Sintomas e suporte',icon:'warning',hint:'Separe medicamento fixo daquele usado somente quando necessário.',groups:['Uso fixo','Somente se precisar'],meta:[['Quando usar o resgate','Situação definida'],['Intervalo mínimo','Conforme prescrição'],['Máximo em 24 horas','Conforme prescrição']]},
      {id:'gastro',title:'Estômago e intestino',category:'Sintomas e suporte',icon:'stomach',hint:'Deixe visível o jejum, a relação com refeições e a duração.',groups:['Estômago e intestino'],meta:[['Tempo antes de comer','Se orientado'],['Duração do tratamento','Conforme receita'],['Sintoma a acompanhar','Se necessário']]},
      {id:'thyroid',title:'Tireoide',category:'Condições crônicas',icon:'thyroid',hint:'Organize jejum e separação de outros produtos conforme orientação.',groups:['Tireoide'],meta:[['Tempo até comer','Orientação individual'],['Separar de quais produtos','Se orientado'],['Próximo controle','Data']]},
      {id:'pregnancy',title:'Gestante e puérpera',category:'Ciclos de vida',icon:'person',hint:'Organize suplementos e tratamentos por fase, sem misturar horários.',groups:['Gestação ou pós-parto'],meta:[['Fase atual','Idade gestacional ou pós-parto'],['Amamentação','Se aplicável'],['Próxima revisão','Data']]},
      {id:'pediatric',title:'Pediátrico e cuidador',category:'Ciclos de vida',icon:'child',hint:'Destaque concentração, volume e responsável por cada administração.',groups:['Medicamentos da criança'],meta:[['Peso e data','Preenchimento pela equipe'],['Cuidador responsável','Nome'],['Dispositivo de medida','Seringa dosadora ou outro'],['Duração','Conforme receita']]},
      {id:'local-use',title:'Pele, olhos, ouvidos e nariz',category:'Uso por dispositivo',icon:'local',hint:'Mostre região, lado, quantidade e sequência de aplicação.',groups:['Uso local'],meta:[['Região e lado','Ex.: olho direito; não presumir'],['Higiene antes do uso','Orientação individual'],['Sequência entre produtos','Se houver'],['Duração','Conforme receita']]}
    ];

    const EXTRAS=[
      {id:'mrpa-7',title:'MRPA · protocolo de 7 dias',category:'Pressão arterial',icon:'pressure',hint:'Manhã e noite, com duas medidas em cada período.',kind:'table',rows:14,orientation:'portrait',columns:[['date','Data'],['period','Período'],['first','1ª pressão'],['second','2ª pressão'],['pulse','Pulso'],['symptoms','Sintomas / observação']],meta:[['Data de início',''],['Data de retorno',''],['Horários combinados','']]},
      {id:'pressure-diary',title:'Diário simplificado de pressão',category:'Pressão arterial',icon:'pressure',hint:'Registro cotidiano com números de cima, de baixo e pulso.',kind:'table',rows:14,orientation:'portrait',columns:[['date','Data'],['period','Manhã / noite'],['upper','Número de cima'],['lower','Número de baixo'],['pulse','Pulso'],['taken','Tomou o remédio?'],['symptoms','Sintomas']],meta:[['Período do registro',''],['Data de retorno','']]},
      {id:'glucose-basic',title:'Diário glicêmico essencial',category:'Glicemia',icon:'glucose',hint:'Selecione e registre os momentos definidos pela equipe.',kind:'table',rows:7,orientation:'landscape',columns:[['date','Data'],['fasting','Jejum'],['postBreakfast','Após café'],['preLunch','Antes almoço'],['postLunch','Após almoço'],['preDinner','Antes jantar'],['bedtime','Ao deitar'],['medication','Medicamento / insulina'],['symptoms','Sintomas']],meta:[['Frequência definida pela equipe',''],['Data de retorno','']]},
      {id:'glucose-intensive',title:'Diário glicêmico intensivo',category:'Glicemia',icon:'glucose',hint:'Grade ampla para esquemas intensivos e eventos do dia.',kind:'table',rows:7,orientation:'landscape',columns:[['date','Data'],['fasting','Jejum'],['preBreakfast','Antes café'],['postBreakfast','Após café'],['preLunch','Antes almoço'],['postLunch','Após almoço'],['preDinner','Antes jantar'],['postDinner','Após jantar'],['bedtime','Ao deitar'],['threeAM','3 horas'],['insulin','Insulina aplicada'],['events','Exercício / alimentação / sintomas']],meta:[['Momentos escolhidos pela equipe',''],['Data de retorno','']]},
      {id:'hypoglycemia-card',title:'Cartão visual de glicemia baixa',category:'Glicemia',icon:'warning',hint:'Quatro cartões destacáveis com conduta inteiramente preenchida pela equipe.',kind:'hypo',orientation:'portrait',meta:[['Valor-limite definido',''],['Como posso me sentir','Sintomas explicados'],['O que fazer','Conduta individual'],['Quando medir novamente','Tempo definido'],['Quando procurar ajuda','Orientação individual'],['Contato de apoio','Nome e telefone']]},
      {id:'non-daily',title:'Calendário de medicamentos não diários',category:'Organização',icon:'calendar',hint:'Para usos semanais, quinzenais, mensais ou em dias definidos.',kind:'table',rows:12,orientation:'portrait',columns:[['date','Data'],['weekday','Dia da semana'],['time','Horário'],['medicine','Medicamento'],['amount','Quantidade'],['checked','Marcar depois de usar']],meta:[['Frequência prescrita',''],['Data final',''],['Alerta individual','']]},
      {id:'reconciliation',title:'O que mudou hoje',category:'Organização',icon:'reconcile',hint:'Conciliação clara: começar, continuar, mudou ou parar.',kind:'reconcile',rows:4,orientation:'landscape',meta:[['Origem da mudança','Consulta, alta ou outro'],['Data da mudança',''],['Próximo retorno','']]}
    ];

    const INSTITUTIONAL_DOCS=[
      ['atestado-medico','Atestado médico'],
      ['encaminhamento-geral','Encaminhamento e contrarreferência'],
      ['encaminhamento-planejamento-familiar','Encaminhamento — planejamento familiar'],
      ['exames-labs-pre-natal','Exames laboratoriais — pré-natal de rotina'],
      ['exames-labs-rotina','Exames laboratoriais — rotina'],
      ['exames-simples','Requisição de exames'],
      ['formula-lactea','Fórmula láctea'],
      ['fraldas-pediatricas','Fraldas pediátricas'],
      ['insumos-diabetes','Insumos'],
      ['mrpa','MRPA'],
      ['receituario-puerpera','Puérpera'],
      ['receituario-controle-especial','Receituário especial'],
      ['receituario-gestante','Receituário gestante'],
      ['receituario-rn','Receituário RN'],
      ['tabela-pa-residencial','Aferição de PA residencial'],
      ['esquema-insulina-nph-regular','Meu esquema de insulina'],
      ['plano-visual-medicamentos','Plano visual de medicamentos — modelo vazio'],
      ['controle-glicemico','Controle de glicêmico']
    ];

    const UNIT_OPTIONS=['','COMPRIMIDO','COMPRIMIDOS','CÁPSULA','CÁPSULAS','mL','GOTA','GOTAS','UNIDADE','UNIDADES','JATO','JATOS','APLICAÇÃO','APLICAÇÕES','OUTRO'];
    const ROUTE_OPTIONS=['','PELA BOCA','NA PELE','NO OLHO','NO OUVIDO','NO NARIZ','INALADO','INJEÇÃO','OUTRA'];
    const MOMENT_OPTIONS=['','AO ACORDAR','CAFÉ DA MANHÃ','MEIO-DIA','ALMOÇO','À TARDE','JANTAR','À NOITE','AO DEITAR','HORÁRIO EXATO','SÓ SE PRECISAR'];
    const MEAL_OPTIONS=['','INDEPENDE DA COMIDA','ANTES DE COMER','JUNTO COM A COMIDA','DEPOIS DE COMER'];
    const MARKERS=[{shape:'circle',color:'#d99800'},{shape:'square',color:'#e34b3f'},{shape:'triangle',color:'#0f887f'},{shape:'diamond',color:'#4057a8'}];
    const state={catalog:'guides',selectedId:'routine',mode:'conventional',copies:1,bw:false,editorVisible:true,patient:{id:'',name:'',date:today(),caregiver:''},drafts:{},teach:{medicine:false,amount:false,timing:false}};

    let guiaEditado=false; // Rascunhos e opções permanecem exclusivamente nesta memória.
    window.OrqPWA?.registerGuard('guias',()=>!guiaEditado);
    const VIEW=document.getElementById('documentsView');
    /* G1 (30/08): motor GLOBAL — os nós do guia podem ser adotados pelo leitor da doença (zero ID duplicado, auditado) */
    const $=selector=>document.querySelector(selector);
    const $$=selector=>[...document.querySelectorAll(selector)];
    const $doc=selector=>document.querySelector(selector); /* portal/estilo de impressão vivem no chassi do hub */
    const guiaAtivo=()=>!VIEW.hidden||!!document.getElementById('orqGuiaHost');
    const newMedicine=()=>({id:uid(),name:'',strength:'',amount:'',unit:'',route:'',moment:'',time:'',meal:'',notes:''});
    const currentTemplate=()=>state.catalog==='guides'?GUIDES.find(x=>x.id===state.selectedId):EXTRAS.find(x=>x.id===state.selectedId);
    const optionList=(values,current)=>{
      const available=current&&!values.includes(current)?[...values,current]:values;
      return available.map(v=>`<option value="${esc(v)}"${v===current?' selected':''}>${esc(v||'Selecione')}</option>`).join('');
    };

    function ensureDraft(template){
      if(state.drafts[template.id])return state.drafts[template.id];
      if(state.catalog==='guides'){
        state.drafts[template.id]={meta:Object.fromEntries(template.meta.map((_,i)=>[i,''])),groups:template.groups.map(()=>({medicines:[newMedicine()]}))};
      }else if(template.kind==='table'){
        state.drafts[template.id]={meta:Object.fromEntries(template.meta.map((_,i)=>[i,''])),rows:Array.from({length:template.rows},(_,rowIndex)=>{
          const row=Object.fromEntries(template.columns.map(([key])=>[key,'']));
          if((template.id==='mrpa-7'||template.id==='pressure-diary')&&Object.hasOwn(row,'period'))row.period=rowIndex%2?'NOITE':'MANHÃ';
          return row;
        })};
      }else if(template.kind==='hypo'){
        state.drafts[template.id]={meta:Object.fromEntries(template.meta.map((_,i)=>[i,'']))};
      }else{
        state.drafts[template.id]={meta:Object.fromEntries(template.meta.map((_,i)=>[i,''])),statuses:{start:Array.from({length:4},()=>({name:'',before:'',after:'',date:''})),continue:Array.from({length:4},()=>({name:'',before:'',after:'',date:''})),changed:Array.from({length:4},()=>({name:'',before:'',after:'',date:''})),stop:Array.from({length:4},()=>({name:'',before:'',after:'',date:''}))}};
      }
      return state.drafts[template.id];
    }

    function markerMarkup(index){const m=MARKERS[index%MARKERS.length];return `<span class="marker ${m.shape}" style="--marker:${m.color}"><span>${index+1}</span></span>`}
    function medicineIcon(med){if(med.unit==='mL')return 'syringe';if(med.unit==='GOTA'||med.unit==='GOTAS')return 'drops';if(med.unit==='UNIDADE'||med.unit==='UNIDADES')return 'insulin';if(med.unit==='JATO'||med.unit==='JATOS'||med.route==='INALADO')return 'inhaler';return 'pill'}
    function momentInfo(value){
      const v=norm(value);
      if(v.includes('acordar')||v.includes('manha')||v.includes('cafe'))return {icon:'sun',color:'#d99800',label:value||'MANHÃ'};
      if(v.includes('meio')||v.includes('almoco'))return {icon:'midday',color:'#e34b3f',label:value||'ALMOÇO'};
      if(v.includes('tarde')||v.includes('jantar'))return {icon:'sunset',color:'#0f887f',label:value||'TARDE / JANTAR'};
      if(v.includes('noite')||v.includes('deitar'))return {icon:'moon',color:'#4057a8',label:value||'NOITE'};
      if(v.includes('precisar'))return {icon:'warning',color:'#b42318',label:'SÓ SE PRECISAR'};
      return {icon:'clock',color:'#0f766e',label:value||'HORÁRIO'};
    }
    function displayDate(value){if(!value)return '';const [y,m,d]=value.split('-');return y&&m&&d?`${d}/${m}/${y}`:value}

    /* U1 (ordem do dono 30/08 ~02h30): os institucionais entram no MESMO índice, com o MESMO estilo de
       item dos guias — a lista cinza do rodapé morreu. Índice único em grupos-accordion crescendo para baixo. */
    function renderInstitutionalItems(query=''){
      const tokens=norm(query).split(/\s+/).filter(Boolean);
      const filtered=INSTITUTIONAL_DOCS.filter(([id,title])=>tokens.every(token=>norm(`${id} ${title} documentos da unidade`).includes(token)));
      return filtered.map(([id,title])=>`<button type="button" class="catalog-item${state.instDoc===id?' active':''}" data-institutional-doc="${esc(id)}"><span class="catalog-item-icon">${icon('book')}</span><span><strong>${esc(title)}</strong><span>Documento oficial · 1ª via editável, 2ª espelhada</span></span></button>`).join('');
    }

    function renderCatalog(query=''){
      const tokens=norm(query).split(/\s+/).filter(Boolean);
      const casa=item=>tokens.every(token=>norm(`${item.title} ${item.category} ${item.hint}`).includes(token));
      const item=(x,cat,sub)=>`<button class="catalog-item${x.id===state.selectedId&&!state.instDoc&&state.catalog===cat?' active':''}" data-select="${esc(x.id)}" data-catalog="${cat}"><span class="catalog-item-icon">${icon(x.icon)}</span><span><strong>${esc(x.title)}</strong><span>${sub}</span></span></button>`;
      const g=GUIDES.filter(casa),e=EXTRAS.filter(casa);
      let gHtml='';
      for(const category of [...new Set(g.map(x=>x.category))]){
        gHtml+=`<div class="catalog-category">${esc(category)}</div>`+g.filter(x=>x.category===category).map(x=>item(x,'guides','Leitura + visual')).join('');
      }
      const inst=renderInstitutionalItems(query);
      const grupo=(id,titulo,total,corpo,extra)=>corpo?`<details class="gv-acc"${extra||''} open><summary><span class="gv-acc-chevron" aria-hidden="true">▸</span>${titulo}<span class="gv-acc-n">${total}</span></summary><div class="gv-acc-body"${id?` id="${id}"`:''}>${corpo}</div></details>`:'';
      const html=grupo('','Guias do paciente',g.length,gHtml)
        +grupo('','Registros',e.length,e.map(x=>item(x,'extras','Registro preenchível')).join(''))
        +grupo('institutionalList','Documentos da unidade',INSTITUTIONAL_DOCS.length,inst,' id="institutionalNav"');
      $('#catalogList').innerHTML=html||`<div class="empty-state">${icon('search')}<div>Nenhum modelo encontrado.</div></div>`;
    }

    function renderMetaEditor(template,draft){
      if(!template.meta?.length)return '';
      return `<section class="editor-section"><h3>${icon('calendar')} Campos deste modelo</h3><div class="field-grid">${template.meta.map(([label,placeholder],i)=>`<div class="field${template.meta.length%2&&i===template.meta.length-1?' full':''}"><label for="meta-${i}">${esc(label)}</label><input id="meta-${i}" data-meta="${i}" value="${esc(draft.meta[i])}" placeholder="${esc(placeholder||'Preencher se necessário')}" autocomplete="off"></div>`).join('')}</div></section>`;
    }

    function renderMedicineEditor(med,g,m,index,canRemove){
      const summary=med.name||`Medicamento ${index+1}`;
      const detail=[med.amount,med.unit,med.moment].filter(Boolean).join(' · ')||'Preencha nome, quantidade e horário';
      return `<details class="med-editor"${index===0?' open':''}>
        <summary>${markerMarkup(index)}<span class="med-summary-copy"><strong>${esc(summary)}</strong><span>${esc(detail)}</span></span></summary>
        <div class="med-editor-body"><div class="field-grid">
          <div class="field full"><label>Nome do medicamento</label><input aria-label="Nome do medicamento ${index+1}" data-med-field="name" data-group="${g}" data-med="${m}" value="${esc(med.name)}" placeholder="Não sugerimos medicamentos" autocomplete="off"></div>
          <div class="field"><label>Concentração / apresentação</label><input aria-label="Concentração ou apresentação do medicamento ${index+1}" data-med-field="strength" data-group="${g}" data-med="${m}" value="${esc(med.strength)}" placeholder="Preencha conforme receita" autocomplete="off"></div>
          <div class="field"><label>Quantidade por vez</label><input aria-label="Quantidade por vez do medicamento ${index+1}" data-med-field="amount" data-group="${g}" data-med="${m}" value="${esc(med.amount)}" inputmode="decimal" placeholder="Ex.: número ou volume" autocomplete="off"></div>
          <div class="field"><label>Unidade por vez</label><select aria-label="Unidade por vez do medicamento ${index+1}" data-med-field="unit" data-group="${g}" data-med="${m}">${optionList(UNIT_OPTIONS,med.unit)}</select></div>
          <div class="field"><label>Como usar</label><select aria-label="Como usar o medicamento ${index+1}" data-med-field="route" data-group="${g}" data-med="${m}">${optionList(ROUTE_OPTIONS,med.route)}</select></div>
          <div class="field"><label>Momento da rotina</label><select aria-label="Momento da rotina do medicamento ${index+1}" data-med-field="moment" data-group="${g}" data-med="${m}">${optionList(MOMENT_OPTIONS,med.moment)}</select></div>
          <div class="field"><label>Horário exato (opcional)</label><input aria-label="Horário exato do medicamento ${index+1}" data-med-field="time" data-group="${g}" data-med="${m}" value="${esc(med.time)}" type="time"></div>
          <div class="field full"><label>Relação com a comida</label><select aria-label="Relação com a comida do medicamento ${index+1}" data-med-field="meal" data-group="${g}" data-med="${m}">${optionList(MEAL_OPTIONS,med.meal)}</select></div>
          <div class="field full"><label>Observação curta</label><textarea aria-label="Observação do medicamento ${index+1}" data-med-field="notes" data-group="${g}" data-med="${m}" placeholder="Somente orientação individual conferida">${esc(med.notes)}</textarea></div>
        </div><div class="med-actions"><button class="btn small danger" data-remove-med="${m}" data-group="${g}"${canRemove?'':' disabled'}>Remover</button></div></div>
      </details>`;
    }

    function renderGuideEditor(template,draft){
      return `${renderMetaEditor(template,draft)}<section class="editor-section"><h3>${icon(template.icon)} Medicamentos</h3><div class="notice warn" style="margin-bottom:10px">Nenhum medicamento ou dose é sugerido. Cada bloco aceita no máximo 4 itens.</div>${template.groups.map((label,g)=>{
        const group=draft.groups[g];
        return `<div class="condition-editor"><div class="condition-editor-head">${icon(template.icon)}<strong>${esc(label)}</strong><span>${group.medicines.length}/4</span></div>${group.medicines.map((med,m)=>renderMedicineEditor(med,g,m,m,group.medicines.length>1)).join('')}<div class="add-row"><span>${group.medicines.length<4?'Adicione somente o que foi conferido.':'Limite de 4 atingido.'}</span><button class="btn small" data-add-med data-group="${g}"${group.medicines.length>=4?' disabled':''}>Adicionar</button></div></div>`;
      }).join('')}</section>`;
    }

    function renderTableEditor(template,draft){
      const rowName=r=>(template.id==='mrpa-7'||template.id==='pressure-diary')?`Dia ${Math.floor(r/2)+1} · ${r%2?'noite':'manhã'}`:`Linha ${r+1}`;
      const cells=draft.rows.map((row,r)=>`<details class="condition-editor med-editor"${r===0?' open':''}><summary><span class="med-summary-copy"><strong>${esc(rowName(r))}</strong><span>${esc(template.columns.map(([key])=>row[key]).filter(Boolean).slice(0,3).join(' · ')||'Toque para preencher')}</span></span></summary><div class="med-editor-body"><div class="field-grid">${template.columns.map(([key,label])=>`<div class="field"><label>${esc(label)}</label><input aria-label="${esc(label)} · ${esc(rowName(r))}" data-extra-row="${r}" data-extra-field="${esc(key)}" value="${esc(row[key])}" autocomplete="off"></div>`).join('')}</div></div></details>`).join('');
      return `${renderMetaEditor(template,draft)}<section class="editor-section"><h3>${icon(template.icon)} Registros</h3><div class="notice" style="margin-bottom:10px">Os campos apenas registram valores; o formulário não interpreta resultados.</div>${cells}</section>`;
    }

    function renderHypoEditor(template,draft){return `${renderMetaEditor(template,draft)}<section class="editor-section"><div class="notice danger">Não há conduta ou quantidade predefinida. Tudo deve ser preenchido conforme o plano individual aprovado pela equipe.</div></section>`}
    function renderReconcileEditor(template,draft){
      const labels={start:'COMEÇAR',continue:'CONTINUAR',changed:'MUDOU',stop:'PARAR'};
      return `${renderMetaEditor(template,draft)}<section class="editor-section"><h3>${icon('reconcile')} Mudanças</h3>${Object.entries(labels).map(([status,label])=>`<div class="condition-editor"><div class="condition-editor-head"><strong>${label}</strong></div>${draft.statuses[status].map((item,i)=>`<div class="med-editor-body" style="border-top:1px solid #d8dee9;padding-top:10px"><div class="field-grid"><div class="field full"><label>Medicamento ${i+1}</label><input data-status="${status}" data-status-row="${i}" data-status-field="name" value="${esc(item.name)}"></div><div class="field"><label>Dose anterior</label><input data-status="${status}" data-status-row="${i}" data-status-field="before" value="${esc(item.before)}"></div><div class="field"><label>Nova dose</label><input data-status="${status}" data-status-row="${i}" data-status-field="after" value="${esc(item.after)}"></div><div class="field full"><label>Data</label><input data-status="${status}" data-status-row="${i}" data-status-field="date" value="${esc(item.date)}"></div></div></div>`).join('')}</div>`).join('')}</section>`;
    }

    function renderEditor(){
      const template=currentTemplate(),draft=ensureDraft(template);
      $('#dynamicEditor').innerHTML=state.catalog==='guides'?renderGuideEditor(template,draft):template.kind==='table'?renderTableEditor(template,draft):template.kind==='hypo'?renderHypoEditor(template,draft):renderReconcileEditor(template,draft);
      $('#patientName').value=state.patient.name;$('#patientDate').value=state.patient.date;$('#caregiver').value=state.patient.caregiver;
      $$('[data-teach]').forEach(input=>input.checked=!!state.teach[input.dataset.teach]);
      updatePatientLinkStatus();
    }

    function renderOptions(options={}){return {editable:false,mirror:false,preview:false,...options}}
    function boundValue(binding,value,placeholder,options={},classes='',multiline=false,ariaLabel=''){
      const opts=renderOptions(options),tag=multiline?'div':'span',className=`${opts.editable?'fillable-value':opts.mirror?'mirror-value':'static-value'}${multiline?' multiline':''}${classes?` ${classes}`:''}`;
      if(opts.editable)return `<${tag} class="${className}" contenteditable="plaintext-only" role="textbox" spellcheck="${multiline?'true':'false'}" data-bind="${esc(binding)}" data-placeholder="${esc(placeholder||'')}"${ariaLabel?` aria-label="${esc(ariaLabel)}"`:''}>${esc(value)}</${tag}>`;
      if(opts.mirror)return `<${tag} class="${className}" data-mirror="${esc(binding)}" data-placeholder="${esc(placeholder||'')}" aria-hidden="true">${esc(value)}</${tag}>`;
      return `<${tag} class="${className}">${esc(value)||esc(placeholder||'')}</${tag}>`;
    }
    function headerMarkup(title,subtitle,iconName,options={}){return `<div class="doc-brandline">Clínica do Orquestrador · SUS</div><header class="doc-header"><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></header><div class="patient-line"><div>Paciente${boundValue('patient.name',state.patient.name,'nome completo',options,'patient-value',false,'Nome do paciente')}</div><div>Data${boundValue('patient.date',displayDate(state.patient.date),'dd/mm/aaaa',options,'patient-value',false,'Data do guia')}</div></div>`}
    function metaMarkup(template,draft,options={}){
      const opts=renderOptions(options),entries=template.meta.map(([label],i)=>({label,index:i,value:draft.meta[i]})).filter(item=>opts.preview||item.value);
      return entries.length?`<div class="meta-strip">${entries.map(item=>`<span class="meta-chip"><strong>${esc(item.label)}:</strong> ${boundValue(`meta.${item.index}`,item.value,'preencher',opts,'',false,item.label)}</span>`).join('')}</div>`:'';
    }
    function teachbackMarkup(options={}){
      const mark=key=>state.teach[key]?'☒':'☐';
      const opts=renderOptions(options),caregiver=opts.preview||state.patient.caregiver?`<span>Quem ajuda: ${boundValue('patient.caregiver',state.patient.caregiver,'nome do cuidador',opts,'',false,'Quem ajuda')}</span>`:'';
      return `<section class="teachback">${icon('caregiver')}<div><h4>VAMOS CONFERIR JUNTOS</h4><p>Mostre qual é o próximo medicamento, quanto vai usar e em qual horário.</p><div class="teach-checks"><span>${mark('medicine')} medicamento</span><span>${mark('amount')} quantidade</span><span>${mark('timing')} horário e comida</span>${caregiver}</div></div></section>`;
    }
    function footerMarkup(){return `<footer class="doc-foot"><p><strong>Se tiver dúvida, não adivinhe.</strong>Leve esta folha, as receitas e as embalagens à UBS ou à farmácia. Este guia educativo não substitui a receita médica.</p><span class="form-version">UBS · GUIA 2026 · DADOS NÃO SALVOS</span></footer>`}

    function medRowsForPrint(group,options={}){const all=group.medicines.map((med,index)=>({med,index})),filled=all.filter(({med})=>Object.entries(med).some(([key,value])=>key!=='id'&&value));return options.preview?all:(filled.length?filled:all)}
    function conventionalTable(group,groupIndex,options={}){
      const opts=renderOptions(options),meds=medRowsForPrint(group,opts);
      return `<table class="med-table"><thead><tr><th aria-label="Número">Nº</th><th>Medicamento</th><th>Quanto usar</th><th>Quando usar</th><th>Comida</th><th>Observação</th></tr></thead><tbody>${meds.map(({med,index},i)=>{const base=`guide.${groupIndex}.${index}`;return `<tr><td class="med-num-cell">${markerMarkup(i)}</td><td><div class="med-name">${boundValue(`${base}.name`,med.name,'nome do medicamento',opts,'',false,`Nome do medicamento ${index+1}`)}</div><div class="med-strength">${boundValue(`${base}.strength`,med.strength,'concentração / apresentação',opts,'',false,`Concentração do medicamento ${index+1}`)}</div></td><td><div class="table-main">${boundValue(`${base}.amount`,med.amount,'quantidade',opts,'',false,`Quantidade do medicamento ${index+1}`)} ${boundValue(`${base}.unit`,med.unit,'unidade',opts,'',false,`Unidade do medicamento ${index+1}`)}</div><div class="table-sub">${boundValue(`${base}.route`,med.route,'como usar',opts,'',false,`Via do medicamento ${index+1}`)}</div></td><td><div class="table-main">${boundValue(`${base}.moment`,med.moment,'momento da rotina',opts,'',false,`Momento do medicamento ${index+1}`)}</div><div class="table-sub">${boundValue(`${base}.time`,med.time,'horário',opts,'',false,`Horário do medicamento ${index+1}`)}</div></td><td><div class="table-main">${boundValue(`${base}.meal`,med.meal,'relação com comida',opts,'',false,`Relação com comida do medicamento ${index+1}`)}</div></td><td><div class="table-sub">${boundValue(`${base}.notes`,med.notes,'observação',opts,'',true,`Observação do medicamento ${index+1}`)}</div></td></tr>`}).join('')}</tbody></table>`;
    }
    function visualCards(group,groupIndex,options={}){
      const opts=renderOptions(options),meds=medRowsForPrint(group,opts);
      return `<div class="visual-list">${meds.map(({med,index},i)=>{const moment=momentInfo(med.moment),marker=MARKERS[i%4],base=`guide.${groupIndex}.${index}`;return `<section class="visual-med" style="--accent:${marker.color}"><div class="visual-number">${markerMarkup(i)}</div><div class="visual-cell visual-name"><small>QUAL REMÉDIO?</small>${icon(medicineIcon(med))}<strong>${boundValue(`${base}.name`,med.name,'NOME DO MEDICAMENTO',opts,'',false,`Nome do medicamento ${index+1}`)}</strong><span class="med-strength">${boundValue(`${base}.strength`,med.strength,'CONCENTRAÇÃO',opts,'',false,`Concentração do medicamento ${index+1}`)}</span></div><div class="visual-cell"><small>QUANTO USAR?</small>${icon(medicineIcon(med))}<strong>${boundValue(`${base}.amount`,med.amount,'QUANTIDADE',opts,'',false,`Quantidade do medicamento ${index+1}`)} ${boundValue(`${base}.unit`,med.unit,'UNIDADE',opts,'',false,`Unidade do medicamento ${index+1}`)}</strong><span class="med-strength">${boundValue(`${base}.route`,med.route,'COMO USAR',opts,'',false,`Via do medicamento ${index+1}`)}</span></div><div class="visual-cell"><small>QUANDO USAR?</small>${icon(moment.icon)}<strong>${boundValue(`${base}.moment`,med.moment,'HORÁRIO',opts,'',false,`Momento do medicamento ${index+1}`)}</strong><span class="med-strength">${boundValue(`${base}.time`,med.time,'',opts,'',false,`Horário do medicamento ${index+1}`)}</span></div><div class="visual-note"><strong>COMIDA:</strong> ${boundValue(`${base}.meal`,med.meal,'relação com comida',opts,'',false,`Relação com comida do medicamento ${index+1}`)} · <strong>LEMBRETE:</strong> ${boundValue(`${base}.notes`,med.notes,'observação',opts,'',true,`Observação do medicamento ${index+1}`)}</div></section>`}).join('')}</div>`;
    }

    function renderGuide(template,draft,mode,options={}){
      const opts=renderOptions(options);
      const visual=mode==='visual';
      return `<div class="print-document${state.bw?' bw':''}${opts.mirror?' mirror-copy':''}">${template.groups.map((label,g)=>`<article class="print-page">${headerMarkup(visual?'MEUS REMÉDIOS — PASSO A PASSO':'MEU PLANO DE MEDICAMENTOS',visual?'Um passo de cada vez. Aponte e mostre como fará em casa.':'Este quadro ajuda a organizar seus medicamentos. Use somente o que foi conferido com a equipe.',template.icon,opts)}<section class="condition-title">${icon(template.icon)}<div><h3>${esc(label)}</h3><p>${esc(template.hint)}</p></div></section>${metaMarkup(template,draft,opts)}${visual?visualCards(draft.groups[g],g,opts):conventionalTable(draft.groups[g],g,opts)}${teachbackMarkup(opts)}${footerMarkup()}</article>`).join('')}</div>`;
    }

    function instructionsMarkup(){return `<div class="measurement-instructions"><div class="instruction-step">${icon('chair')}SENTE-SE</div><div class="instruction-step">${icon('rest')}DESCANSE</div><div class="instruction-step">${icon('feet')}PÉS NO CHÃO</div><div class="instruction-step">${icon('arm')}BRAÇO APOIADO</div><div class="instruction-step">${icon('quiet')}NÃO FALE</div></div>`}
    function renderTableExtra(template,draft,mode,options={}){
      const opts=renderOptions(options);
      const visual=mode==='visual';
      return `<div class="print-document${state.bw?' bw':''}${opts.mirror?' mirror-copy':''}"><article class="print-page">${headerMarkup(template.title,visual?'Quadro visual para registrar e levar à equipe de saúde.':'Preencha nos momentos definidos pela equipe. Este quadro apenas registra valores.',template.icon,opts)}${metaMarkup(template,draft,opts)}${template.id.includes('pressure')||template.id==='mrpa-7'?instructionsMarkup():''}<div class="extra-table-wrap"><table class="extra-table${visual?' visual-log':''}"><thead><tr>${template.columns.map(([,label])=>`<th>${esc(label)}</th>`).join('')}</tr></thead><tbody>${draft.rows.map((row,rowIndex)=>`<tr>${template.columns.map(([key,label])=>`<td>${boundValue(`row.${rowIndex}.${key}`,row[key],' ',opts,'',false,`${label} · linha ${rowIndex+1}`)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${teachbackMarkup(opts)}${footerMarkup()}</article></div>`;
    }
    function renderHypoExtra(template,draft,mode,options={}){
      const opts=renderOptions(options);
      const values=template.meta.map((x,i)=>draft.meta[i]);
      const card=()=>`<section class="hypo-card"><h3>GLICEMIA BAIXA</h3>${icon('warning')}<div class="hypo-line"><strong>Meu limite definido pela equipe</strong>${boundValue('meta.0',values[0],'preencher',opts,'',false,'Limite de glicemia')}</div><div class="hypo-line"><strong>Como posso me sentir</strong>${boundValue('meta.1',values[1],'preencher',opts,'',true,'Sintomas de glicemia baixa')}</div><div class="hypo-line"><strong>O que devo fazer</strong>${boundValue('meta.2',values[2],'preencher',opts,'',true,'O que fazer')}</div><div class="hypo-line"><strong>Quando medir novamente</strong>${boundValue('meta.3',values[3],'preencher',opts,'',false,'Quando medir novamente')}</div><div class="hypo-line"><strong>Quando procurar ajuda</strong>${boundValue('meta.4',values[4],'preencher',opts,'',true,'Quando procurar ajuda')}</div><div class="hypo-line"><strong>Contato de apoio</strong>${boundValue('meta.5',values[5],'preencher',opts,'',false,'Contato de apoio')}</div></section>`;
      return `<div class="print-document${state.bw?' bw':''}${opts.mirror?' mirror-copy':''}"><article class="print-page">${headerMarkup('CARTÃO VISUAL DE GLICEMIA BAIXA','Recorte os quatro cartões somente depois que a equipe conferir todos os campos.',template.icon,opts)}<div class="hypo-grid">${card()}${card()}${card()}${card()}</div>${footerMarkup()}</article></div>`;
    }
    function renderReconcileExtra(template,draft,mode,options={}){
      const opts=renderOptions(options);
      const defs=[['start','COMEÇAR','#0f766e'],['continue','CONTINUAR','#3155a5'],['changed','MUDOU','#b77900'],['stop','PARAR','#b42318']];
      return `<div class="print-document${state.bw?' bw':''}${opts.mirror?' mirror-copy':''}"><article class="print-page">${headerMarkup('O QUE MUDOU HOJE','Um único quadro para conferir o que começa, continua, mudou ou deve parar.',template.icon,opts)}${metaMarkup(template,draft,opts)}<div class="reconcile-grid">${defs.map(([key,label,color])=>`<section class="reconcile-col" style="--accent:${color}"><h3>${label}</h3>${draft.statuses[key].map((item,rowIndex)=>{const base=`status.${key}.${rowIndex}`;return `<div class="reconcile-item"><strong>${boundValue(`${base}.name`,item.name,'MEDICAMENTO',opts,'',false,`${label} · medicamento ${rowIndex+1}`)}</strong><span>Antes: ${boundValue(`${base}.before`,item.before,'________',opts,'',false,`${label} · dose anterior ${rowIndex+1}`)}</span><br><span>Agora: ${boundValue(`${base}.after`,item.after,'________',opts,'',false,`${label} · nova dose ${rowIndex+1}`)}</span><br><span>Data: ${boundValue(`${base}.date`,item.date,'________',opts,'',false,`${label} · data ${rowIndex+1}`)}</span></div>`}).join('')}</section>`).join('')}</div>${teachbackMarkup(opts)}${footerMarkup()}</article></div>`;
    }
    function renderExtra(template,draft,mode,options={}){return template.kind==='table'?renderTableExtra(template,draft,mode,options):template.kind==='hypo'?renderHypoExtra(template,draft,mode,options):renderReconcileExtra(template,draft,mode,options)}
    function renderDocument(mode=state.mode,options={}){const template=currentTemplate(),draft=ensureDraft(template);return state.catalog==='guides'?renderGuide(template,draft,mode,options):renderExtra(template,draft,mode,options)}

    function renderPreview(){
      const original=renderDocument(state.mode,{editable:true,preview:true});
      const mirror=state.copies===2?`<div class="preview-copy-shell" data-copy="mirror" inert aria-label="Segunda via espelhada"><div class="preview-copy-label">2ª via · espelho automático</div>${renderDocument(state.mode,{mirror:true,preview:true})}</div>`:'';
      $('#preview').innerHTML=`<div class="preview-copy-shell" data-copy="original" aria-label="Primeira via editável"><div class="preview-copy-label">1ª via · escreva diretamente na folha</div>${original}</div>${mirror}`;
      $('#previewWrap').classList.toggle('bw',state.bw);
      const template=currentTemplate();$('#activeTitle').textContent=template.title;$('#activeSubtitle').textContent=state.catalog==='guides'?'Guia do paciente · até 4 medicamentos por bloco':'Registro preenchível · sem interpretação automática';
      $$('.segmented [data-mode]').forEach(button=>{const active=button.dataset.mode===state.mode;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active))});
      $('#bwBtn').setAttribute('aria-pressed',String(state.bw));
    }

    function fecharInstitucional(){
      if(!state.instDoc)return;state.instDoc=null;
      const host=$('#f1Host');if(host)host.hidden=true;
      $('#previewWrap').hidden=false;(e=>{if(e)e.hidden=false})($('#editorToggle'));setEditorVisible(true);
    }
    function abrirInstitucional(id){
      if(!window.InstitucionaisView||!InstitucionaisView.abrir(id)){showToast('Documento da unidade indisponível.',true);return}
      state.instDoc=id;
      $('#previewWrap').hidden=true;
      const host=$('#f1Host');host.hidden=false;
      setEditorVisible(false);(e=>{if(e)e.hidden=true})($('#editorToggle')); /* o F1 preenche direto na folha; assistente não se aplica */
      const info=InstitucionaisView.ativo();
      $('#activeTitle').textContent=info?info.titulo:'Documento da unidade';
      $('#activeSubtitle').textContent='Documento da unidade · 1ª via editável, 2ª via espelhada';
      setCatalogVisible(false);
    }
    function selectTemplate(id){fecharInstitucional();state.selectedId=id;ensureDraft(currentTemplate());renderCatalog($('#catalogSearch').value);renderEditor();renderPreview();setCatalogVisible(false);if(innerWidth<821)$('.workspace').scrollIntoView({behavior:'smooth',block:'start'})}
    function switchCatalog(catalog){
      state.catalog=catalog;state.selectedId=catalog==='guides'?GUIDES[0].id:EXTRAS[0].id;
      $('#catalogSearch').value='';renderCatalog();renderEditor();renderPreview();
    }

    let previewTimer;
    function schedulePreview(){clearTimeout(previewTimer);previewTimer=setTimeout(renderPreview,50)}
    function updateMedicine(target){const draft=ensureDraft(currentTemplate()),med=draft.groups[Number(target.dataset.group)].medicines[Number(target.dataset.med)];med[target.dataset.medField]=target.value;schedulePreview()}
    function updateExtraRow(target){const draft=ensureDraft(currentTemplate());draft.rows[Number(target.dataset.extraRow)][target.dataset.extraField]=target.value;schedulePreview()}
    function updateStatus(target){const draft=ensureDraft(currentTemplate());draft.statuses[target.dataset.status][Number(target.dataset.statusRow)][target.dataset.statusField]=target.value;schedulePreview()}

    function normalizedDateFromPreview(value){
      const text=String(value||'').trim(),br=text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      return br?`${br[3]}-${br[2]}-${br[1]}`:text;
    }
    function displayForBinding(binding,value){return binding==='patient.date'?displayDate(value):String(value??'')}
    function stateValueForBinding(binding){
      const parts=binding.split('.'),draft=ensureDraft(currentTemplate());
      if(parts[0]==='patient')return state.patient[parts[1]]??'';
      if(parts[0]==='meta')return draft.meta[Number(parts[1])]??'';
      if(parts[0]==='guide')return draft.groups[Number(parts[1])].medicines[Number(parts[2])][parts[3]]??'';
      if(parts[0]==='row')return draft.rows[Number(parts[1])][parts[2]]??'';
      if(parts[0]==='status')return draft.statuses[parts[1]][Number(parts[2])][parts[3]]??'';
      return '';
    }
    function setStateFromBinding(binding,value){
      const parts=binding.split('.'),draft=ensureDraft(currentTemplate());
      if(parts[0]==='patient'){
        const field=parts[1],next=field==='date'?normalizedDateFromPreview(value):value;
        state.patient[field]=next;
        if(field==='name'&&state.patient.id){const patient=localPatientById(state.patient.id);if(!patient||norm(patient.nome)!==norm(next))state.patient.id=''}
      }else if(parts[0]==='meta')draft.meta[Number(parts[1])]=value;
      else if(parts[0]==='guide')draft.groups[Number(parts[1])].medicines[Number(parts[2])][parts[3]]=value;
      else if(parts[0]==='row')draft.rows[Number(parts[1])][parts[2]]=value;
      else if(parts[0]==='status')draft.statuses[parts[1]][Number(parts[2])][parts[3]]=value;
      return stateValueForBinding(binding);
    }
    function editorControlForBinding(binding){
      const parts=binding.split('.');
      if(parts[0]==='patient')return parts[1]==='name'?$('#patientName'):parts[1]==='date'?$('#patientDate'):$('#caregiver');
      if(parts[0]==='meta')return $(`[data-meta="${parts[1]}"]`);
      if(parts[0]==='guide')return $(`[data-group="${parts[1]}"][data-med="${parts[2]}"][data-med-field="${parts[3]}"]`);
      if(parts[0]==='row')return $(`[data-extra-row="${parts[1]}"][data-extra-field="${parts[2]}"]`);
      if(parts[0]==='status')return $(`[data-status="${parts[1]}"][data-status-row="${parts[2]}"][data-status-field="${parts[3]}"]`);
      return null;
    }
    function setControlValue(control,value){
      if(!control)return;
      if(control.tagName==='SELECT'&&![...control.options].some(option=>option.value===value)){
        const option=document.createElement('option');option.value=value;option.textContent=value;option.dataset.previewCustom='true';control.append(option);
      }
      control.value=value;
    }
    function syncBoundSurfaces(binding,source=null){
      const value=stateValueForBinding(binding),display=displayForBinding(binding,value);
      $$('#preview [data-bind]').filter(field=>field.dataset.bind===binding&&field!==source).forEach(field=>{field.textContent=display});
      $$('#preview [data-mirror]').filter(field=>field.dataset.mirror===binding).forEach(field=>{field.textContent=display});
      setControlValue(editorControlForBinding(binding),value);
      if(binding.startsWith('patient.'))updatePatientLinkStatus();
    }
    function insertPlainText(text){
      const selection=window.getSelection();if(!selection||!selection.rangeCount)return false;
      const range=selection.getRangeAt(0);range.deleteContents();const node=document.createTextNode(text);range.insertNode(node);range.setStartAfter(node);range.collapse(true);selection.removeAllRanges();selection.addRange(range);return true;
    }

    function validate(){
      const errors=[];if(!state.patient.name.trim())errors.push('Preencha o nome do paciente.');if(!state.patient.date)errors.push('Preencha a data do guia.');
      if(state.catalog==='guides'){
        const draft=ensureDraft(currentTemplate());
        draft.groups.forEach((group,g)=>group.medicines.forEach((med,m)=>{
          const touched=[med.name,med.strength,med.amount,med.unit,med.route,med.moment,med.time,med.meal,med.notes].some(Boolean);if(!touched)return;
          if(!med.name.trim())errors.push(`${currentTemplate().groups[g]} · medicamento ${m+1}: falta o nome.`);
          if(!med.strength.trim())errors.push(`${currentTemplate().groups[g]} · medicamento ${m+1}: falta concentração/apresentação.`);
          if(!med.amount.trim()||!med.unit)errors.push(`${currentTemplate().groups[g]} · medicamento ${m+1}: falta quantidade/unidade.`);
          if(!med.route)errors.push(`${currentTemplate().groups[g]} · medicamento ${m+1}: falta como usar.`);
          if(!med.moment)errors.push(`${currentTemplate().groups[g]} · medicamento ${m+1}: falta o momento.`);
        }));
      }
      return [...new Set(errors)];
    }

    function preparePrint(kind){
      const errors=validate();if(errors.length){showToast(errors[0],true);const first=!state.patient.name.trim()?$('#patientName'):!state.patient.date?$('#patientDate'):$('[data-med-field]');first?.focus();return}
      const modes=kind==='both'?['conventional','visual']:[kind];
      const copies=[];for(let copy=0;copy<state.copies;copy++)for(const mode of modes)copies.push(renderDocument(mode,{editable:false,mirror:false,preview:false}));
      const template=currentTemplate(),orientation=state.catalog==='extras'?(template.orientation||'portrait'):'portrait';
      const portal=$doc('#printPortal');portal.dataset.orientation=orientation;portal.innerHTML=copies.join('');
      portal.querySelectorAll('[contenteditable]').forEach(field=>field.removeAttribute('contenteditable'));
      try{window.OrqLacunas&&OrqLacunas.transformarParaImpressao(portal)}catch(_){/* a folha sai como antes se o módulo faltar */}
      $doc('#dynamicPageStyle').textContent=orientation==='landscape'?'@media print{@page{size:A4 landscape;margin:0}}':'@media print{@page{size:A4 portrait;margin:0}}';
      window.__printDelegado=true;
      requestAnimationFrame(()=>window.print());
    }
    function cleanupPrint(){setTimeout(()=>{if(!window.__printDelegado)return;window.__printDelegado=false;$doc('#printPortal').innerHTML='';$doc('#dynamicPageStyle').textContent=''},250)}
    function showToast(message,error=false){const toast=$doc('#toast');toast.textContent=message;toast.classList.toggle('error',error);toast.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.classList.remove('show'),3800)}
    /* drawer próprio da v2 removido na integração: o catálogo é coluna fixa da view; o índice geral é o drawer do hub */
    function setCatalogVisible(visible){
      state.catalogVisible=!!visible;$('#app').classList.toggle('catalog-open',state.catalogVisible);const t=$('#catalogToggle');if(t)t.setAttribute('aria-pressed',String(state.catalogVisible));
    }
    function setEditorVisible(visible){
      state.editorVisible=!!visible;$('#app').classList.toggle('editor-hidden',!state.editorVisible);$('#editorPanel').setAttribute('aria-hidden',String(!state.editorVisible));(e=>{if(e){e.setAttribute('aria-pressed',String(state.editorVisible));e.textContent='Preencher'}})($('#editorToggle'));
    }
    function patientApi(){
      const api=window.F2DB?.patients;
      return api&&typeof api.listar==='function'&&typeof api.buscar==='function'?api:null;
    }
    function validLocalPatients(){
      const api=patientApi();if(!api)return [];
      try{const list=api.listar();return Array.isArray(list)?list.filter(patient=>patient&&typeof patient.id==='string'&&patient.id&&typeof patient.nome==='string'&&patient.nome.trim()):[]}catch(error){console.warn('Guias: fichas locais indisponíveis.',error);return []}
    }
    function localPatientById(id){
      const api=patientApi();if(!api||!id)return null;
      try{const patient=api.buscar(id);return patient&&typeof patient.id==='string'&&typeof patient.nome==='string'?patient:null}catch(error){return null}
    }
    function hidePatientSuggestions(){const list=$('#patientSuggestions');list.hidden=true;list.innerHTML='';$('#patientName').setAttribute('aria-expanded','false')}
    function updatePatientLinkStatus(){
      const input=$('#patientName'),status=$('#patientLinkStatus');if(!input||!status)return;
      const patient=localPatientById(state.patient.id);
      if(patient){input.dataset.patientId=patient.id;status.textContent='Ficha local vinculada neste dispositivo.'}
      else{state.patient.id='';delete input.dataset.patientId;status.textContent=patientApi()?'Digite 3 letras para procurar uma ficha local.':''}
    }
    function renderPatientSuggestions(query){
      const list=$('#patientSuggestions'),input=$('#patientName'),text=String(query||'').trim();if(text.length<3){hidePatientSuggestions();return}
      const tokens=norm(text).split(/\s+/).filter(Boolean),digits=text.replace(/\D/g,'');
      const matches=validLocalPatients().filter(patient=>tokens.every(token=>norm(`${patient.nome} ${patient.cns||''} ${patient.cpf||''}`).includes(token))||(digits&&String(patient.cpf||'').replace(/\D/g,'').includes(digits))).slice(0,8);
      if(!matches.length){list.innerHTML='<div class="empty-state" style="padding:10px">Nenhuma ficha encontrada.</div>';list.hidden=false;input.setAttribute('aria-expanded','true');return}
      list.innerHTML=matches.map(patient=>`<button class="patient-suggestion" type="button" role="option" data-patient-id="${esc(patient.id)}"><strong>${esc(patient.nome)}</strong><span>${patient.nascimento?`Nascimento: ${esc(displayDate(patient.nascimento))}`:'Ficha local'}${patient.cns?` · CNS final ${esc(String(patient.cns).slice(-4))}`:''}</span></button>`).join('');list.hidden=false;input.setAttribute('aria-expanded','true');
    }
    function selectLocalPatient(id){
      const patient=localPatientById(id);if(!patient)return;
      guiaEditado=true;
      state.patient.id=patient.id;state.patient.name=patient.nome;state.patient.date=state.patient.date||today();hidePatientSuggestions();renderEditor();renderPreview();showToast('Ficha local vinculada ao guia.');
    }
    function clearPatient(){
      if(!confirm('Limpar nome, data e todos os dados preenchidos neste atendimento?'))return;
      guiaEditado=false;
      state.patient={id:'',name:'',date:'',caregiver:''};state.drafts={};state.teach={medicine:false,amount:false,timing:false};ensureDraft(currentTemplate());hidePatientSuggestions();renderEditor();renderPreview();showToast('Dados do atendimento apagados da memória.');
    }

    function wire(){
      // A delegação acompanha os editores quando são movidos para dentro da doença.
      const campos='#patientName,#patientDate,#caregiver,#dynamicEditor,#preview [data-bind],.check-list [data-teach]';
      ['input','change'].forEach(tipo=>document.addEventListener(tipo,e=>{
        if(e.target.closest(campos)&&guiaAtivo())guiaEditado=true;
      },true));
      document.addEventListener('click',e=>{
        if(e.target.closest('.copies button,#bwBtn,.segmented [data-mode],[data-add-med],[data-remove-med]')&&guiaAtivo())guiaEditado=true;
      },true);
      $('#searchIcon').innerHTML=icon('search');$('#readIcon').innerHTML=icon('book');$('#visualIcon').innerHTML=icon('eye');$('#bwIcon').innerHTML=icon('contrast');$('#personIcon').innerHTML=icon('person');$('#checkIcon').innerHTML=icon('check');$('#printIcon').innerHTML=icon('print');
      (e=>{if(e)e.addEventListener('click',()=>setEditorVisible(!state.editorVisible))})($('#editorToggle'));setEditorVisible(true);
      $('#catalogToggle').addEventListener('click',()=>setCatalogVisible(!state.catalogVisible));
      $('#catalogSearch').addEventListener('input',e=>renderCatalog(e.target.value));
      $('#catalogList').addEventListener('click',e=>{const button=e.target.closest('[data-select]');if(button){if(button.dataset.catalog&&button.dataset.catalog!==state.catalog)state.catalog=button.dataset.catalog;selectTemplate(button.dataset.select)}});
      /* institucionais nascem dinâmicos dentro do índice unificado — delegação no container estático */
      $('#catalogList').addEventListener('click',e=>{const b=e.target.closest('[data-institutional-doc]');if(b)abrirInstitucional(b.dataset.institutionalDoc)});
      $$('.segmented [data-mode]').forEach(button=>button.addEventListener('click',()=>{state.mode=button.dataset.mode;renderPreview()}));
      $('#bwBtn').addEventListener('click',()=>{state.bw=!state.bw;renderPreview()});
      $('#patientName').addEventListener('input',e=>{state.patient.name=e.target.value;if(state.patient.id){const linked=localPatientById(state.patient.id);if(!linked||norm(linked.nome)!==norm(e.target.value))state.patient.id=''}updatePatientLinkStatus();renderPatientSuggestions(e.target.value);schedulePreview()});
      $('#patientName').addEventListener('focus',e=>renderPatientSuggestions(e.target.value));
      $('#patientSuggestions').addEventListener('click',e=>{const button=e.target.closest('[data-patient-id]');if(button)selectLocalPatient(button.dataset.patientId)});
      $('#patientDate').addEventListener('input',e=>{state.patient.date=e.target.value;schedulePreview()});
      $('#caregiver').addEventListener('input',e=>{state.patient.caregiver=e.target.value;schedulePreview()});
      $('#dynamicEditor').addEventListener('input',e=>{const t=e.target;if(t.dataset.meta!==undefined){ensureDraft(currentTemplate()).meta[Number(t.dataset.meta)]=t.value;schedulePreview()}else if(t.dataset.medField)updateMedicine(t);else if(t.dataset.extraField)updateExtraRow(t);else if(t.dataset.statusField)updateStatus(t)});
      $('#dynamicEditor').addEventListener('change',e=>{const t=e.target;if(t.dataset.medField)updateMedicine(t);else if(t.dataset.extraField)updateExtraRow(t);else if(t.dataset.statusField)updateStatus(t)});
      $('#dynamicEditor').addEventListener('click',e=>{
        const add=e.target.closest('[data-add-med]');if(add){const group=ensureDraft(currentTemplate()).groups[Number(add.dataset.group)];if(group.medicines.length<4){group.medicines.push(newMedicine());renderEditor();renderPreview()}return}
        const remove=e.target.closest('[data-remove-med]');if(remove){const group=ensureDraft(currentTemplate()).groups[Number(remove.dataset.group)];if(group.medicines.length>1){group.medicines.splice(Number(remove.dataset.removeMed),1);renderEditor();renderPreview()}return}
      });
      $('#preview').addEventListener('input',e=>{const field=e.target.closest('[data-bind]');if(!field)return;let text=(field.innerText!==undefined?field.innerText:field.textContent).replace(/\r/g,'');if(!field.classList.contains('multiline'))text=text.replace(/\s*\n+\s*/g,' ');setStateFromBinding(field.dataset.bind,text);syncBoundSurfaces(field.dataset.bind,field)});
      $('#preview').addEventListener('keydown',e=>{const field=e.target.closest('[contenteditable][data-bind]');if(field&&!field.classList.contains('multiline')&&e.key==='Enter')e.preventDefault()});
      $('#preview').addEventListener('paste',e=>{
        const field=e.target.closest('[contenteditable][data-bind]');if(!field)return;
        /* Um guia pode estar adotado dentro do #workspaceView (palco da doença,
           orquestrator-guias.js): lá o paste do hub (#workspaceView:1120) também
           escuta ESTE evento. Insertamos aqui, previnimos e marcamos; o hub vê a
           marca e só previne — sem a inserção dupla do achado #30. */
        let text=(e.clipboardData||window.clipboardData).getData('text/plain');
        if(!field.classList.contains('multiline'))text=text.replace(/\s+/g,' ');
        if(insertPlainText(text))field.dispatchEvent(new Event('input',{bubbles:true}));
        e.preventDefault();
        try{Object.defineProperty(e,'__lacunasPasteOk',{value:true})}catch(_){e.__lacunasPasteOk=true}
      });
      $$('.check-list [data-teach]').forEach(input=>input.addEventListener('change',e=>{state.teach[e.target.dataset.teach]=e.target.checked;renderPreview()}));
      $$('.copies button').forEach(button=>button.addEventListener('click',()=>{state.copies=Number(button.dataset.copies);$$('.copies button').forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});renderPreview()}));
      $$('[data-print]').forEach(button=>button.addEventListener('click',()=>preparePrint(button.dataset.print)));
      $('#clearPatient').addEventListener('click',clearPatient);window.addEventListener('afterprint',cleanupPrint);
      /* atalhos globais só valem com a view Documentos visível — fora da casa, o hub manda */
      document.addEventListener('click',e=>{if(!guiaAtivo())return;if(!e.target.closest('.patient-autocomplete'))hidePatientSuggestions()});
      document.addEventListener('keydown',e=>{
        if(!guiaAtivo())return;
        if(e.key==='Escape')hidePatientSuggestions();
        if(e.key==='/'&&!e.target.closest('input,textarea,select,[contenteditable]')){e.preventDefault();const cs=$('#catalogSearch');if(cs)cs.focus()}
        if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='p'){e.preventDefault();preparePrint(state.mode)}
      });
    }

    function selfCheck(){
      const ids=[...GUIDES,...EXTRAS].map(x=>x.id),unique=new Set(ids);const failures=[];
      if(GUIDES.length!==20)failures.push(`esperados 20 guias, encontrados ${GUIDES.length}`);if(EXTRAS.length!==7)failures.push(`esperados 7 extras, encontrados ${EXTRAS.length}`);if(unique.size!==ids.length)failures.push('IDs duplicados');if(GUIDES.some(g=>g.groups.length<1))failures.push('guia sem grupo');
      if(failures.length)throw new Error(`Falha de integridade: ${failures.join('; ')}`);
    }

    /* boot preguiçoso e fail-closed NA VIEW: erro trava só a view Documentos, jamais o hub inteiro */
    let booted=false;
    function boot(){
      if(booted)return true;
      try{selfCheck();ensureDraft(currentTemplate());wire();renderCatalog();renderEditor();renderPreview();setCatalogVisible(true);booted=true;return true}
      catch(error){VIEW.innerHTML=`<div class="empty-state" role="alert" style="padding:60px 20px"><h2>Guias indisponíveis</h2><p>Falha de integridade — não use este módulo neste atendimento. O restante do hub segue normal.</p><pre style="text-align:left;white-space:pre-wrap">${esc(error.message)}</pre></div>`;return false}
    }
    window.GuiasView=Object.freeze({
      boot,
      open(id,catalog){if(!boot())return false;
        if(catalog==='unit'){setCatalogVisible(true);requestAnimationFrame(()=>{const nav=$('#institutionalNav');if(nav)nav.scrollIntoView({block:'nearest'})});return true}
        if(catalog)switchCatalog(catalog);if(id)selectTemplate(id);return true},
      openInstitutional(id){if(!boot())return false;abrirInstitucional(id);return !!state.instDoc},
      setPatient(pid){if(!boot())return false;selectLocalPatient(pid);return true},
    });
  })();
