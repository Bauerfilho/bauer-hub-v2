import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

// O projeto não instala dependências: usa a cópia global já presente na máquina.
const require = createRequire(import.meta.url);
const { JSDOM, VirtualConsole } = require('/Users/bauervieiracesarfilhovieira/.npm-global/lib/node_modules/jsdom');

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const htmlPath = path.join(raiz, 'index-f1.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const argumentos = new Map(process.argv.slice(2).map((item) => {
  const [chave, valor = 'true'] = item.replace(/^--/, '').split('=');
  return [chave, valor];
}));
const documentoAlvo = argumentos.get('doc') || 'atestado-medico';
const esperado = Number(argumentos.get('expected') || 1);

function aguardarCarregamento(dom) {
  return new Promise((resolve, reject) => {
    const temporizador = setTimeout(() => reject(new Error('F1_JSDOM_TIMEOUT')), 5000);
    dom.window.addEventListener('load', () => {
      clearTimeout(temporizador);
      setTimeout(resolve, 0);
    }, { once: true });
  });
}

async function abrir(parametros) {
  const erros = [];
  const consoleVirtual = new VirtualConsole();
  consoleVirtual.on('jsdomError', (erro) => erros.push(String(erro.message || erro)));
  consoleVirtual.on('error', (erro) => erros.push(String(erro)));

  const dom = new JSDOM(html, {
    beforeParse(janela) {
      // jsdom não expõe CSS.escape; o motor usa somente chaves alfanuméricas com hífen.
      janela.CSS = janela.CSS || {};
      janela.CSS.escape = janela.CSS.escape || ((valor) => String(valor).replace(/[^a-zA-Z0-9_-]/g, '\\$&'));
      janela.print = () => {};
      // A origem file:// é opaca no jsdom; estes dublês só permitem provar que o app não escreve.
      const criarStorageVazio = () => ({
        clear() {},
        getItem() { return null; },
        key() { return null; },
        length: 0,
        removeItem() {},
        setItem() { throw new Error('F1_PERSISTENCIA_PROIBIDA'); }
      });
      Object.defineProperty(janela, 'localStorage', { configurable: true, value: criarStorageVazio() });
      Object.defineProperty(janela, 'sessionStorage', { configurable: true, value: criarStorageVazio() });
    },
    pretendToBeVisual: true,
    resources: 'usable',
    runScripts: 'dangerously',
    url: `${pathToFileURL(htmlPath).href}?${parametros}`,
    virtualConsole: consoleVirtual
  });
  await aguardarCarregamento(dom);
  assert.deepEqual(erros, [], `Erros de runtime: ${erros.join(' | ')}`);
  return dom;
}

const dom = await abrir(`doc=${encodeURIComponent(documentoAlvo)}`);
const { document, Event } = dom.window;

assert.ok(dom.window.F1Registro, 'Registro F1 ausente');
assert.ok(dom.window.F1Teste, 'Seam de teste F1 ausente');
assert.equal(dom.window.F1Registro.todos().length, esperado, 'Quantidade inesperada de documentos');
assert.equal(document.querySelector('.print-sheet')?.dataset.documentoId, documentoAlvo, 'Documento alvo não abriu');

const primeiraVia = Array.from(document.querySelectorAll('[data-via="1"] [data-campo]'));
const segundaVia = Array.from(document.querySelectorAll('[data-via="2"] [data-espelho]'));
const chavesPrimeiraVia = new Set(primeiraVia.map((campo) => campo.dataset.campo));
assert.ok(primeiraVia.length > 0, 'Primeira via sem campos');
assert.equal(chavesPrimeiraVia.size, segundaVia.length, 'Contagem de chaves diverge entre as vias');
const repeticoesInvalidas = Array.from(chavesPrimeiraVia).filter((chave) => {
  const grupo = primeiraVia.filter((campo) => campo.dataset.campo === chave);
  return grupo.length > 1 && grupo.some((campo) => campo.type !== 'radio');
});
assert.deepEqual(repeticoesInvalidas, [], 'Chave repetida fora de grupo radio');
assert.equal(document.querySelectorAll('[data-via="2"] input, [data-via="2"] textarea, [data-via="2"] select, [data-via="2"] [contenteditable="true"]').length, 0, 'Segunda via contém controle editável');

dom.window.F1Teste.preencherSintetico();
assert.equal(dom.window.F1Teste.validarEspelho().ok, true, 'Espelho não acompanha a primeira via');

// Prova o lado ruim: uma divergência artificial precisa bloquear o gate.
const primeiraSaida = segundaVia[0];
primeiraSaida.dataset.valor = 'DIVERGENCIA-PROPOSITAL';
assert.equal(dom.window.F1Teste.validarEspelho().ok, false, 'Gate deixou passar segunda via adulterada');
primeiraVia[0].dispatchEvent(new Event('input', { bubbles: true }));
assert.equal(dom.window.F1Teste.validarEspelho().ok, true, 'Espelho não se recuperou após nova entrada');

assert.equal(dom.window.localStorage.length, 0, 'localStorage recebeu dado clínico');
assert.equal(dom.window.sessionStorage.length, 0, 'sessionStorage recebeu dado clínico');

// Um carregamento novo deve nascer vazio: o estado é efêmero e não cruza sessões.
const domRecarregado = await abrir(`doc=${encodeURIComponent(documentoAlvo)}`);
const preenchidosAposReload = Array.from(domRecarregado.window.document.querySelectorAll('[data-via="1"] [data-campo]'))
  .filter((campo) => ['checkbox', 'radio'].includes(campo.type) ? campo.checked : Boolean(campo.value));
assert.equal(preenchidosAposReload.length, 0, 'Recarregar preservou dados do atendimento');

const recursosExternos = Array.from(document.querySelectorAll('[src], [href]'))
  .map((elemento) => elemento.getAttribute('src') || elemento.getAttribute('href'))
  .filter((recurso) => recurso && /^(?:https?:)?\/\//i.test(recurso));
assert.deepEqual(recursosExternos, [], 'Há recurso externo no fluxo offline');

console.log(JSON.stringify({
  documento: documentoAlvo,
  documentosRegistrados: esperado,
  campos: chavesPrimeiraVia.size,
  espelhoBom: true,
  divergenciaBloqueada: true,
  segundaViaEditavel: false,
  persistencia: false,
  recursosExternos: 0
}));

dom.window.close();
domRecarregado.window.close();
