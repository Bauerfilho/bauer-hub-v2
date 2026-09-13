/* T0 — aplica a taxonomia das grandes áreas ao catalogData do index-f2.html.
   Regras: ids INTOCADOS · nomes antigos preservados em aliases (busca) · 121 conferidos.
   Uso: node mapa-areas.js            (aplica)
        node mapa-areas.js --dry      (só relatório) */
const fs = require('fs');
const ALVO = '/Users/bauervieiracesarfilhovieira/Documents/claude-organizada-segura/Hub_Receituarios_UBS_2026 2/index-f2.html';
const ESPELHO = '/Users/bauervieiracesarfilhovieira/Documents/claude-organizada-segura/Hub_Receituarios_UBS_2026 2/js/topicos.js';
const DRY = process.argv.includes('--dry');

const M = {}; /* id -> [categoria, subcategoria] */
const põe = (cat, sub, ids) => ids.forEach(id => { if (M[id]) throw new Error('id duplicado no mapa: ' + id); M[id] = [cat, sub]; });

/* 1 · PREVENTIVA */
põe('Preventiva', 'Rastreamentos', ['rastreio-cancer-mulher', 'rastreio-cancer-colorretal']);

/* 2 · CLÍNICA MÉDICA */
põe('Clínica Médica', 'Cardiovascular', ['hipertensao-negros-idosos', 'hipertensao-nefropata-diabetico-obeso', 'hipertensao-branco-jovem', 'hipertensao-ic-dac', 'insuficiencia-venosa-cronica']);
põe('Clínica Médica', 'Metabólico e lipídios', ['dislipidemia-diabetes', 'dislipidemia-alto-risco', 'dislipidemia-aterosclerose-significativa', 'hipertrigliceridemia']);
põe('Clínica Médica', 'Endocrinologia', ['diabetes-mellitus-tipo-2', 'neuropatia-periferica', 'pe-diabetico', 'hipotireoidismo', 'hipertireoidismo']);
põe('Clínica Médica', 'Hematologia', ['anemia-macrocitica', 'anemia-ferropriva']);
põe('Clínica Médica', 'Osteomuscular e reumatologia', ['osteoporose', 'osteoartrite', 'dorsalgia-discopatia', 'fibromialgia', 'gota']);
põe('Clínica Médica', 'Pneumologia e vias aéreas', ['pneumonia-comunitaria-adulto', 'asma-dpoc-adulto', 'rinite-alergica-adulto', 'rinossinusite-adulto', 'faringoamigdalite-adulto']);
põe('Clínica Médica', 'Infectologia e ISTs', ['abscesso-celulite', 'erisipela', 'impetigo-adulto', 'tuberculose-pulmonar', 'infeccao-latente-tuberculose', 'hanseniase', 'herpes-mucocutaneo', 'herpes-zoster', 'covid-19', 'sifilis', 'herpes-genital', 'cancro-mole', 'linfogranuloma-venereo']);
põe('Clínica Médica', 'Dermatologia', ['tinea-capitis-adulto', 'tinea-corporis-adulto', 'onicomicose-adulto', 'candidiase-cutanea-adulto', 'pitiriase-versicolor-adulto', 'escabiose-adulto', 'pediculose-adulto', 'acne', 'afta-oral', 'verruga-vulgar']);
põe('Clínica Médica', 'Gastroenterologia', ['gastroenterite-adulto', 'constipacao-adulto', 'drge-adulto', 'gastrite-dup', 'parasitose-intestinal-adulto']);
põe('Clínica Médica', 'Neurologia', ['migranea', 'vertigem']);
põe('Clínica Médica', 'Olhos e ouvidos', ['conjuntivite', 'hordeolo', 'otite-media-aguda-adulto', 'otite-externa', 'rolha-cerume']);
põe('Clínica Médica', 'Rim e vias urinárias', ['cistite-adulto', 'prostatite', 'hiperplasia-prostatica-benigna']);

/* 4 · OBSTETRÍCIA */
põe('Obstetrícia', 'Pré-natal de rotina', ['pre-natal-rotina']);
põe('Obstetrícia', 'Gestação de alto risco', ['diabetes-gestacao', 'hipertensao-gestacional']);
põe('Obstetrícia', 'Intercorrências da gestação', ['nauseas-vomitos-gestante']);
põe('Obstetrícia', 'Infecções na gestação', ['itu-gestante']);
põe('Obstetrícia', 'Puerpério e amamentação', ['mastite-aguda', 'candidiase-mamaria-moniliase-lactente']);

/* 5 · GINECOLOGIA */
põe('Ginecologia', 'Ciclo e hormônios', ['amenorreia', 'sindrome-ovarios-policisticos', 'dismenorreia', 'sangramento-uterino-anormal', 'climaterio']);
põe('Ginecologia', 'Contracepção e planejamento familiar', ['anticoncepcao']);
põe('Ginecologia', 'Infecções ginecológicas', ['vaginose-bacteriana', 'candidiase-vulvovaginal', 'tricomoníase', 'cervicite', 'doenca-inflamatoria-pelvica']);
põe('Ginecologia', 'Mama', ['mastalgia']);
põe('Ginecologia', 'Proteção e violência sexual', ['violencia-sexual']);

/* 6 · PEDIATRIA */
põe('Pediatria', 'Puericultura', ['puericultura']);
põe('Pediatria', 'Respiratório e ouvido', ['resfriado-comum-infantil', 'otite-media-aguda-infantil', 'mastoidite-infantil', 'sinusite-bacteriana-infantil', 'faringoamigdalite-infantil', 'asma-infantil', 'rinite-alergica-infantil', 'pneumonia-infantil']);
põe('Pediatria', 'Pele', ['escabiose-infantil', 'pediculose-infantil', 'larva-migrans-infantil', 'miliaria', 'estrofulo', 'furunculose-infantil', 'candidiase-oral-infantil', 'candidiase-cutanea-infantil', 'dermatite-fraldas', 'tinea-capitis-infantil', 'tinea-corporis-infantil', 'onicomicose-infantil', 'pitiriase-versicolor-infantil', 'urticaria-dermatite-atopica-infantil', 'impetigo-infantil']);
põe('Pediatria', 'Barriga e nutrição', ['gastroenterite-infantil', 'amebiase-giardiase-infantil', 'helmintiase-infantil', 'constipacao-infantil', 'refluxo-infantil']);
põe('Pediatria', 'Infecções da infância', ['exantemas-virais-infantis', 'itu-infantil', 'vulvovaginite-oxiuriase-infantil']);
põe('Pediatria', 'Urológico e cirúrgico da criança', ['criptorquidia', 'hernia-umbilical-infantil', 'prepucio-nao-retratil']);

/* ── aplica ── */
const html = fs.readFileSync(ALVO, 'utf8');
const ini = html.indexOf('<script id="catalogData" type="application/json">');
const abre = html.indexOf('>', ini) + 1;
const fecha = html.indexOf('</script>', abre);
if (ini < 0 || fecha < 0) throw new Error('catalogData não encontrado');
const catalogo = JSON.parse(html.slice(abre, fecha));

const idsAntes = catalogo.map(t => t.id);
const semMapa = catalogo.filter(t => !M[t.id]).map(t => t.id);
const sobrando = Object.keys(M).filter(id => !idsAntes.includes(id));
if (semMapa.length || sobrando.length) {
  console.error(JSON.stringify({ semMapa, sobrandoNoMapa: sobrando }, null, 2));
  throw new Error('mapa não cobre o catálogo 1:1 — nada foi escrito');
}

const contagem = {};
for (const t of catalogo) {
  const [cat, sub] = M[t.id];
  const antiga = t.categoria;
  t.categoria = cat;
  t.subcategoria = sub;
  /* busca: o nome antigo continua achando (aliases é o corpus da busca) */
  t.aliases = Array.isArray(t.aliases) ? t.aliases : [];
  for (const termo of [antiga, sub]) if (termo && !t.aliases.includes(termo)) t.aliases.push(termo);
  contagem[cat] = contagem[cat] || {};
  contagem[cat][sub] = (contagem[cat][sub] || 0) + 1;
}

const idsDepois = catalogo.map(t => t.id);
if (JSON.stringify(idsAntes) !== JSON.stringify(idsDepois)) throw new Error('IDS MUDARAM — abortado');

const relatorio = { total: catalogo.length, semSubcategoria: catalogo.filter(t => !t.subcategoria).length, idsIntactos: true, contagem };
console.log(JSON.stringify(relatorio, null, 2));

if (DRY) { console.log('(dry-run — nada escrito)'); process.exit(0); }

fs.writeFileSync(ALVO, html.slice(0, abre) + JSON.stringify(catalogo) + html.slice(fecha), 'utf8');

/* espelho js/topicos.js regenerado (é derivado — cabeçalho manda regenerar) */
const espelho = fs.readFileSync(ESPELHO, 'utf8');
const cab = espelho.slice(0, espelho.indexOf('window.F2_TOPICOS'));
const linhas = catalogo.map(t => ({ id: t.id, titulo: t.titulo, categoria: t.categoria, subcategoria: t.subcategoria }));
fs.writeFileSync(ESPELHO, cab + 'window.F2_TOPICOS = ' + JSON.stringify(linhas) + ';\n', 'utf8');
console.log('APLICADO: catalogData + js/topicos.js regenerado');
