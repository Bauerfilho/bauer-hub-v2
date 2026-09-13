/* F-H · Mapa do dossiê → doenças do catálogo (roteamento de apresentação).
   Autoria: brain, 28/08/2026, por ordem do dono: os esqueminhas do dossiê da Dra.
   aparecem TAMBÉM dentro da página de cada doença relacionada, como cartão de
   REFERÊNCIA ("não é que ela vá usar exatamente — é referência e um jeito de
   explicar como a plataforma funciona"). Chave = `tema` do DOSSIE_Orquestrador;
   valor = ids de tópicos do catalogData. Tema sem tópico ([]) só aparece na
   página do dossiê. Rotular na doença: "Referência da Orquestrador". */
window.DOSSIE_MAPA = {
  temaParaTopicos: {
    'Dor': ['dorsalgia-discopatia','osteoartrite','fibromialgia','migranea','gota'],
    'Insônia': [],
    'Respiratório': ['asma-dpoc-adulto','asma-infantil','rinite-alergica-adulto','rinite-alergica-infantil'],
    'Depressão / ansiedade': [],
    'Vitaminas': ['anemia-macrocitica','osteoporose'],
    'Compulsão / alcoolismo': [],
    'Hipertensão — a escada dela': ['hipertensao-negros-idosos','hipertensao-nefropata-diabetico-obeso','hipertensao-branco-jovem','hipertensao-ic-dac'],
    'Dislipidemia': ['dislipidemia-diabetes','dislipidemia-alto-risco','dislipidemia-aterosclerose-significativa','hipertrigliceridemia'],
    'AINEs': ['dorsalgia-discopatia','osteoartrite','gota','dismenorreia'],
    'Diabetes': ['diabetes-mellitus-tipo-2','neuropatia-periferica','pe-diabetico'],
    'Corticoide oral': ['asma-dpoc-adulto','asma-infantil','urticaria-dermatite-atopica-infantil','gota'],
    'Náusea': ['gastroenterite-adulto','gastroenterite-infantil','vertigem'],
    'Alergia / dermatites': ['urticaria-dermatite-atopica-infantil','rinite-alergica-adulto','rinite-alergica-infantil','estrofulo','miliaria'],
    'Cefaleia': ['migranea'],
    'Infecções de garganta': ['faringoamigdalite-adulto','faringoamigdalite-infantil'],
    'Transtorno bipolar': [],
    'ITU (mulheres)': ['cistite-adulto','itu-gestante','itu-infantil'],
    'Candidíase': ['candidiase-vulvovaginal','candidiase-mamaria-moniliase-lactente','candidiase-oral-infantil','candidiase-cutanea-infantil','candidiase-cutanea-adulto'],
    'Tremor': [],
    'Pele': ['abscesso-celulite','erisipela','impetigo-adulto','impetigo-infantil','furunculose-infantil','hanseniase','larva-migrans-infantil','escabiose-adulto','escabiose-infantil','tinea-capitis-adulto','tinea-corporis-adulto','onicomicose-adulto','pitiriase-versicolor-adulto','tinea-capitis-infantil','tinea-corporis-infantil','onicomicose-infantil','pitiriase-versicolor-infantil']
  }
};
