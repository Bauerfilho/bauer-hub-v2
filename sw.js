/* Atualização autoral: uma edição só fica utilizável depois da conferência completa. */
'use strict';
const VERSION = '64c9d887f070ea3b258777e05bc33a8daf461c2e';
const MANIFEST_HASH = 'eecf6781850b3d753144b5513fa46e72ad905614a3517b79bd2fe78041e5ca0d';
const BASE = new URL(self.registration.scope);
const PREFIX = 'orq-receituarios:' + encodeURIComponent(BASE.pathname) + ':';
const CACHE = PREFIX + VERSION;
const MANIFEST_URL = new URL('release.json', BASE).href;
const clientes = new Map(); // Só identificadores de janela e de edição; nenhum dado clínico.
let ativando = false;

async function hash(bytes) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

async function manifestoDoCache(nome) {
  const cache = await caches.open(nome);
  const salvo = await cache.match(MANIFEST_URL);
  return salvo ? salvo.json() : null;
}

async function preparar() {
  const resposta = await fetch(MANIFEST_URL, {cache: 'no-store', credentials: 'omit'});
  if (!resposta.ok) throw new Error('Manifesto indisponível.');
  const bytes = await resposta.arrayBuffer();
  if (await hash(bytes) !== MANIFEST_HASH) throw new Error('Publicação ainda inconsistente.');
  const manifesto = JSON.parse(new TextDecoder().decode(bytes));
  if (manifesto.version !== VERSION || !Array.isArray(manifesto.assets) || !manifesto.assets.length) {
    throw new Error('Manifesto inválido.');
  }
  const vistos = new Set();
  for (const ativo of manifesto.assets) {
    const url = new URL(ativo.url, BASE);
    if (url.origin !== BASE.origin || !url.pathname.startsWith(BASE.pathname) || url.search || url.hash ||
        vistos.has(url.href) || !/^[a-f0-9]{64}$/.test(ativo.sha256)) throw new Error('Ativo inválido.');
    vistos.add(url.href);
  }
  const anteriores = [];
  for (const nome of await caches.keys()) {
    if (!nome.startsWith(PREFIX) || nome === CACHE) continue;
    const antigo = await manifestoDoCache(nome);
    if (antigo) anteriores.push({cache: await caches.open(nome), manifesto: antigo});
  }
  await caches.delete(CACHE);
  const cache = await caches.open(CACHE);
  try {
    // Quatro transferências por vez evitam dezenas de downloads simultâneos no posto.
    const fila = [...manifesto.assets];
    await Promise.all(Array.from({length: 4}, async () => {
      while (fila.length) {
        const ativo = fila.shift();
        const url = new URL(ativo.url, BASE).href;
        let conteudo = null;
        for (const anterior of anteriores) {
          if (!anterior.manifesto.assets.some(a => a.url === ativo.url && a.sha256 === ativo.sha256)) continue;
          const encontrado = await anterior.cache.match(url);
          if (encontrado && await hash(await encontrado.clone().arrayBuffer()) === ativo.sha256) {
            conteudo = encontrado;
            break;
          }
        }
        if (!conteudo) conteudo = await fetch(url, {cache: 'no-store', credentials: 'omit'});
        if (!conteudo.ok || await hash(await conteudo.clone().arrayBuffer()) !== ativo.sha256) {
          throw new Error('Ativo incompleto: ' + ativo.url);
        }
        await cache.put(url, conteudo);
      }
    }));
    // O manifesto é o selo final: cache sem ele nunca serve uma edição.
    await cache.put(MANIFEST_URL, new Response(bytes, {headers: {'Content-Type': 'application/json'}}));
  } catch (erro) {
    await caches.delete(CACHE);
    throw erro;
  }
}

function consultar(cliente) {
  return new Promise(resolve => {
    const canal = new MessageChannel();
    const fim = valor => { clearTimeout(limite); canal.port1.close(); resolve(valor); };
    const limite = setTimeout(() => fim(null), 4000);
    canal.port1.onmessage = evento => {
      const info = evento.data;
      if (!info || typeof info.version !== 'string' || typeof info.safe !== 'boolean') return fim(null);
      clientes.set(cliente.id, info.version);
      fim(info);
    };
    cliente.postMessage({type: 'ORQ_PWA_STATUS'}, [canal.port2]);
  });
}

async function janelas() {
  return (await self.clients.matchAll({type: 'window', includeUncontrolled: true}))
    .filter(c => { const url = new URL(c.url); return url.origin === BASE.origin && url.pathname.startsWith(BASE.pathname); });
}

async function ativarQuandoSeguro() {
  if (ativando) return;
  ativando = true;
  try {
    const abertas = await janelas();
    const estados = await Promise.all(abertas.map(consultar));
    // Uma aba antiga/ocupada/inacessível impede a troca; nunca presume resposta positiva.
    if (estados.some(e => !e || !e.safe)) return;
    await self.skipWaiting();
  } finally { ativando = false; }
}

async function limparEdicoesSemUso() {
  const abertas = await janelas();
  const estados = await Promise.all(abertas.map(consultar));
  if (estados.some(e => !e)) return; // Cliente desconhecido pode depender de edição anterior.
  const usadas = new Set([VERSION, ...estados.map(e => e.version)]);
  const nomes = (await caches.keys()).filter(nome => nome.startsWith(PREFIX));
  // CacheStorage conserva a ordem de criação. O worker N não apaga N+1 em instalação/espera.
  const anteriores = nomes.slice(0, Math.max(0, nomes.indexOf(CACHE)));
  for (const nome of anteriores) {
    if (nome.startsWith(PREFIX) && !usadas.has(nome.slice(PREFIX.length))) await caches.delete(nome);
  }
}

self.addEventListener('install', evento => evento.waitUntil(preparar()));
self.addEventListener('activate', evento => evento.waitUntil((async () => {
  await self.clients.claim();
  await limparEdicoesSemUso();
})()));
self.addEventListener('message', evento => {
  if (evento.data?.type === 'ORQ_PWA_ACTIVATE') evento.waitUntil(ativarQuandoSeguro());
  if (evento.data?.type === 'ORQ_PWA_HELLO' && evento.source?.id) {
    clientes.set(evento.source.id, String(evento.data.version));
    evento.waitUntil(limparEdicoesSemUso());
  }
  if (evento.data?.type === 'ORQ_PWA_VERSION') evento.ports[0]?.postMessage({version: VERSION});
});

self.addEventListener('fetch', evento => {
  const requisicao = evento.request;
  const url = new URL(requisicao.url);
  if (requisicao.method !== 'GET' || url.origin !== BASE.origin || !url.pathname.startsWith(BASE.pathname)) return;
  if (['release.json', 'sw.js'].some(nome => url.pathname === new URL(nome, BASE).pathname)) return;
  evento.respondWith((async () => {
    const navegacao = requisicao.mode === 'navigate';
    let versao = VERSION;
    if (!navegacao && evento.clientId) {
      if (!clientes.has(evento.clientId)) {
        const cliente = await self.clients.get(evento.clientId);
        if (cliente) await consultar(cliente);
      }
      // Se há mais de uma edição, cliente silencioso não autoriza adivinhar seus ativos.
      if (!clientes.has(evento.clientId) && (await caches.keys()).filter(n => n.startsWith(PREFIX)).length > 1) return Response.error();
      versao = clientes.get(evento.clientId) || VERSION;
    }
    const cache = await caches.open(PREFIX + versao);
    const manifesto = await manifestoDoCache(PREFIX + versao);
    // Evicção/corrupção do selo não autoriza substituir uma edição por arquivos da rede.
    if (!manifesto || manifesto.version !== versao || !Array.isArray(manifesto.assets)) return Response.error();
    const canonica = new URL(url.href);
    canonica.search = ''; canonica.hash = '';
    if (canonica.pathname === BASE.pathname) canonica.pathname += 'index.html';
    if (manifesto?.assets.some(a => new URL(a.url, BASE).href === canonica.href)) {
      const salvo = await cache.match(canonica.href);
      if (!salvo) return Response.error(); // Não mistura rede nova com uma edição antiga.
      if (navegacao && evento.resultingClientId) clientes.set(evento.resultingClientId, VERSION);
      return salvo;
    }
    // Nenhuma resposta fora da lista estática é armazenada.
    return fetch(requisicao);
  })());
});
