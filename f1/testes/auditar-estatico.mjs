import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const pastaF1 = path.join(raiz, 'f1');
const pastaTemplates = path.join(pastaF1, 'templates');
const pastaFontes = '/Users/bauervieiracesarfilhovieira/.codex/.chatgpt-projects/g-p-6a904052f9e88191a8f22827b14fcdcf/sources';

const hashesEsperados = new Map([
  ['PDF-01', 'e9735254ff9b4b8ed44c7db31cac56f59b06ea6e990b65af2c4142fbc7ff8501'],
  ['PDF-02', '1f30b9f1d51c7acadeaf62978dfd03629de1c67d261b700caf6182fc3d9ed243'],
  ['PDF-03', '6869f64083d714f4ed8acebfd35782d2a0765385111b6395b52a5d4150d5ca5b'],
  ['PDF-04', 'c8211ec883028bc74bd0e62c036ca3487fbb753c17b8b48f6a4ac9f9f9487a69'],
  ['PDF-05', '1eedbf7734d013c17d61452003d1e534e62e6a29cc18f7cc5f6e21a0725c41de'],
  ['PDF-06', '70c0f49471397c2f4f1f0ba16d999f83462e3a8d62327358bb271487d62391e6'],
  ['PDF-07', 'acd6d8a1d69dca9e95fac89114e46e093ba3c5ad5db41792161350cd984b7e3e'],
  ['PDF-08', '0fbeac4a318c04ffeba8ffd1dd7a29ff45609859aa0dd62bf2f9836910846c11'],
  ['PDF-09', '6ec75cd8c33c2ecb58ef1ed3c6599610b6ac7fb3b4589fcc496d7d07bbad9d4b'],
  ['PDF-10', 'c1ed17305f1f5866cc881e774f25226f3f49187656e3d26282a3969d050a5dc2'],
  ['PDF-11', '9dc61e68a98a87885c1234bc816fe65f5bc187d6bd38e1daa61393f9dd372ebb'],
  ['PDF-12', 'cb816f78bdc74091f9ba6ff76314c5a76f3c680e835fe88bb86eff98bd9ddc0d'],
  ['PDF-13', '45c17fa4c4b7f2e1c6a53471bbb0dc88057d98c193d60ecd32666613160fdd22'],
  ['PDF-14', 'e8d9ced45d23adc1bd299ce17b33861566124d17a245649e478a207371f73553'],
  ['PDF-15', '64532984996be009de7bd8c591139a03d40886f101ea6483a772164467ecc589'],
  ['PDF-16', 'd6cda32cd1d53b6848ee7a489aa892a9644a9fd8fd63f3e9ca8281fe432d8c42'],
  ['PDF-17', 'daac299b640ffe4a36619b12a39eae2a0ef1dfb4647a16df640701bc4436093a'],
  ['PDF-18', '503f9ee9b6b78055b8dfab2b03190af4fbd927264a6cf4a4f64502a4cddb0854']
]);

function sha256(caminho) {
  return crypto.createHash('sha256').update(fs.readFileSync(caminho)).digest('hex');
}

const arquivosTemplate = fs.readdirSync(pastaTemplates)
  .filter((nome) => nome.endsWith('.js'))
  .sort();
assert.equal(arquivosTemplate.length, 18, 'F1 exige exatamente 18 arquivos de template');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(pastaF1, 'registro.js'), 'utf8'), sandbox, { filename: 'registro.js' });
for (const arquivo of arquivosTemplate) {
  vm.runInContext(fs.readFileSync(path.join(pastaTemplates, arquivo), 'utf8'), sandbox, { filename: arquivo });
}

const documentos = sandbox.window.F1Registro.todos();
assert.equal(documentos.length, 18, 'Registro canônico deve conter 18 documentos');
assert.equal(new Set(documentos.map((documento) => documento.id)).size, 18, 'IDs duplicados');
assert.equal(new Set(documentos.map((documento) => documento.pdfId)).size, 18, 'PDF IDs duplicados');
assert.deepEqual(
  Array.from(documentos, (documento) => documento.pdfId).sort(),
  Array.from({ length: 18 }, (_, indice) => `PDF-${String(indice + 1).padStart(2, '0')}`),
  'A sequência PDF-01 a PDF-18 não fecha'
);

for (const documento of documentos) {
  assert.equal(documento.hashFonte, hashesEsperados.get(documento.pdfId), `Hash declarado diverge em ${documento.pdfId}`);
}

assert.equal(documentos.filter((documento) => documento.classeFonte === '2-up-nativo').length, 12, 'Coorte 2-up deve ter 12 documentos');
assert.equal(documentos.filter((documento) => documento.classeFonte === 'full-page-complexo').length, 6, 'Coorte complexa deve ter 6 documentos');
assert.equal(documentos.filter((documento) => documento.orientacaoFonte === 'paisagem').length, 13, 'Inventário deve ter 13 paisagens');
assert.equal(documentos.filter((documento) => documento.orientacaoFonte === 'retrato').length, 5, 'Inventário deve ter 5 retratos');

const glicemia = documentos.find((documento) => documento.pdfId === 'PDF-18');
assert.equal(glicemia.linhas, 19, 'Controle glicêmico deve ter 19 linhas');
assert.equal(glicemia.colunas.length, 9, 'Controle glicêmico deve ter 9 colunas');
assert.equal(glicemia.linhas * glicemia.colunas.length, 171, 'Controle glicêmico deve ter 171 campos por via');

const planoMedicamentos = documentos.find((documento) => documento.pdfId === 'PDF-17');
assert.equal(planoMedicamentos.fontePiiSanitizada, true, 'PDF-17 precisa declarar sanitização');
assert.equal('pacienteFonte' in planoMedicamentos, false, 'PDF-17 vazou paciente-fonte');
assert.equal('medicamentosFonte' in planoMedicamentos, false, 'PDF-17 vazou tratamento-fonte');

const hashesEncontrados = new Set(fs.readdirSync(pastaFontes)
  .filter((nome) => nome.toLowerCase().endsWith('.pdf'))
  .map((nome) => sha256(path.join(pastaFontes, nome))));
assert.equal(hashesEncontrados.size, 18, 'Acervo-fonte não contém 18 PDFs únicos');
for (const [pdfId, hash] of hashesEsperados) {
  assert.ok(hashesEncontrados.has(hash), `Fonte atual não confere para ${pdfId}`);
}

assert.equal(sha256(path.join(raiz, 'index.html')), '592e6fe5e08f01f7a997c5f4fa00b8ea4fa7418510782048e71c4457bc3f727c', 'index.html protegido foi alterado');
assert.equal(sha256(path.join(raiz, 'index-correcoes-piloto.html')), 'b563a5ef2bf025a21e939ce57f51835a54d687fcc930c8afa689d0455f021e2f', 'index-correcoes-piloto.html protegido foi alterado');

const arquivosProduto = [
  path.join(raiz, 'index-f1.html'),
  path.join(pastaF1, 'registro.js'),
  path.join(pastaF1, 'motor.js'),
  path.join(pastaF1, 'f1.css'),
  path.join(pastaF1, 'calibracao-impressao.html'),
  path.join(pastaF1, 'calibracao.css'),
  ...arquivosTemplate.map((arquivo) => path.join(pastaTemplates, arquivo))
];
const codigoProduto = arquivosProduto.map((arquivo) => fs.readFileSync(arquivo, 'utf8')).join('\n');
const proibicoes = [
  /\.setItem\s*\(/,
  /indexedDB\s*\.\s*open\s*\(/,
  /caches\s*\.\s*open\s*\(/,
  /\bfetch\s*\(/,
  /new\s+XMLHttpRequest/,
  /new\s+WebSocket/,
  /https?:\/\//i
];
for (const padrao of proibicoes) {
  assert.equal(padrao.test(codigoProduto), false, `Produto viola regra offline/privacidade: ${padrao}`);
}

console.log(JSON.stringify({
  templates: arquivosTemplate.length,
  ids: documentos.length,
  hashesFontes: hashesEncontrados.size,
  doisUp: 12,
  complexos: 6,
  paisagem: 13,
  retrato: 5,
  pdf18CamposPorVia: 171,
  protegidosIntactos: true,
  persistenciaEscrita: false,
  redeExterna: false
}));
