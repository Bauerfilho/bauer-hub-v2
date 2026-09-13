/* ============================================================================
   F2 — Camada única de dados (pacientes, atendimentos SOAP, esquemas da Dra.)
   ----------------------------------------------------------------------------
   ONDE GRAVA: localStorage do navegador, neste computador. NADA vai para a
   internet (zero fetch / zero XMLHttpRequest neste arquivo — verificável).
   CHAVES: namespace "ubs2026.v1.*" (o "v1" é a versão do formato dos dados;
   se um dia o formato mudar, a versão permite migrar sem perder nada).
   REGRA DE OURO: importar é o único momento que sobrescreve — por isso o
   arquivo é validado INTEIRO antes de tocar no armazenamento. Arquivo ruim =
   erro falado em linguagem simples e o armazenamento fica INTOCADO.
   ========================================================================== */
window.F2DB = (() => {
  'use strict';

  // Nomes das gavetas dentro do armazenamento do navegador.
  const K = {
    patients: 'ubs2026.v1.patients',   // pacientes cadastrados
    consults: 'ubs2026.v1.consults',   // atendimentos (SOAP)
    draOrq: 'ubs2026.v1.draOrq', // esquemas preferidos e próprios da Dra.
    meta: 'ubs2026.v1.meta',           // carimbos internos (ex.: última cópia exportada)
    session: 'ubs2026.v1.session',     // sessão do login da Dra. (F-D: identidade, NÃO segurança)
  };
  const VERSAO = 1; // versão do formato (vai dentro de cada arquivo exportado)

  // --- Leitura/escrita básica, com proteção contra dado corrompido ---------
  function lerJSON(chave, padrao) {
    try {
      const bruto = localStorage.getItem(chave);
      if (!bruto) return padrao;
      return JSON.parse(bruto);
    } catch (e) {
      // Se o conteúdo gravado estiver ilegível, NÃO apaga: devolve o padrão
      // em memória e avisa no console. O dado original continua no navegador.
      console.error('F2DB: conteúdo ilegível em ' + chave, e);
      return padrao;
    }
  }
  function gravarJSON(chave, valor) {
    localStorage.setItem(chave, JSON.stringify(valor));
  }

  // Gera um identificador único curto (data + sorteio) — suficiente para uso local.
  function novoId(prefixo) {
    return prefixo + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  // Campos opcionais acrescentados à ficha do paciente. A higienização é
  // deliberadamente conservadora: preserva pontuação de CPF e a grafia
  // escolhida pela médica, removendo apenas controles invisíveis e espaços
  // nas extremidades. Não valida nem sugere diagnóstico.
  function textoFicha(valor) {
    if (valor == null) return '';
    return String(valor).replace(/[\u0000-\u001F\u007F]/g, ' ').trim();
  }
  function cpfFicha(valor) {
    return textoFicha(valor);
  }
  function chaveCpf(valor) {
    return cpfFicha(valor).replace(/\D/g, '');
  }
  function cidsFicha(valor) {
    if (!Array.isArray(valor)) return [];
    const vistos = new Set();
    const resultado = [];
    for (const item of valor) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const codigo = textoFicha(item.codigo);
      const rotulo = textoFicha(item.rotulo);
      if (!codigo && !rotulo) continue;
      const chave = norm(codigo) + '|' + norm(rotulo);
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      resultado.push({ codigo, rotulo });
    }
    return resultado;
  }

  // ==========================================================================
  // PACIENTES — [{id, nome, nascimento?, cns?, cpf?, cids?, createdAt, updatedAt}]
  // cpf e cids são opcionais: fichas antigas continuam válidas sem migração.
  // ==========================================================================
  const patients = {
    listar() {
      return lerJSON(K.patients, []);
    },
    buscar(idOuCpf) {
      const referencia = String(idOuCpf == null ? '' : idOuCpf).trim();
      const lista = patients.listar();
      const porId = lista.find(p => p.id === referencia);
      if (porId) return porId;
      // CPF é uma segunda chave exata. A busca parcial pertence a procurar(),
      // evitando que um fragmento seja confundido com patientId ao salvar.
      const cpf = chaveCpf(referencia);
      if (!cpf) return null;
      return lista.find(p => chaveCpf(p.cpf) === cpf) || null;
    },
    // Busca a cada letra, sem diferenciar acento nem maiúscula.
    procurar(texto) {
      const t = norm(texto);
      if (!t) return patients.listar();
      const cpfProcurado = chaveCpf(texto);
      return patients.listar().filter(p =>
        norm(p.nome).includes(t) ||
        norm(p.cns || '').includes(t) ||
        norm(p.cpf || '').includes(t) ||
        (cpfProcurado && chaveCpf(p.cpf).includes(cpfProcurado)));
    },
    criar(dados) {
      if (!dados || !String(dados.nome || '').trim()) {
        throw new Error('O nome do paciente é obrigatório.');
      }
      const agora = new Date().toISOString();
      const p = {
        id: novoId('pac'),
        nome: String(dados.nome).trim(),
        nascimento: dados.nascimento || '',
        cns: dados.cns || '',
        cpf: cpfFicha(dados.cpf),
        cids: cidsFicha(dados.cids),
        createdAt: agora,
        updatedAt: agora,
      };
      const lista = patients.listar();
      lista.push(p);
      gravarJSON(K.patients, lista);
      return p;
    },
    atualizar(id, mudancas) {
      const lista = patients.listar();
      const i = lista.findIndex(p => p.id === id);
      if (i < 0) return null;
      const seguras = Object.assign({}, mudancas || {});
      if (Object.prototype.hasOwnProperty.call(seguras, 'cpf')) seguras.cpf = cpfFicha(seguras.cpf);
      if (Object.prototype.hasOwnProperty.call(seguras, 'cids')) seguras.cids = cidsFicha(seguras.cids);
      lista[i] = Object.assign({}, lista[i], seguras, { id, updatedAt: new Date().toISOString() });
      gravarJSON(K.patients, lista);
      return lista[i];
    },
    // Apaga o paciente E os atendimentos dele (cascata declarada na tela).
    apagar(id) {
      gravarJSON(K.patients, patients.listar().filter(p => p.id !== id));
      gravarJSON(K.consults, consults.listar().filter(c => c.patientId !== id));
    },
  };

  // ==========================================================================
  // ATENDIMENTOS (SOAP) — [{id, patientId, datetime, topicIds[], s,o,a,p, ...}]
  // e, desde a v3, RECEITAS registradas — [{id, kind:'receita', patientId,
  // datetime, topicIds[], receita:{titulo,corpo,tipo,regimenId}, ...}]
  // topicIds é a ponte com as doenças do HUB: UM registro só, lido de dois
  // lados (ficha do paciente e página da doença) — sem cópia, sem dessincronia.
  // ==========================================================================
  const consults = {
    listar() {
      return lerJSON(K.consults, []);
    },
    buscar(id) {
      return consults.listar().find(c => c.id === id) || null;
    },
    doPaciente(patientId) {
      return consults.listar()
        .filter(c => c.patientId === patientId)
        .sort((a, b) => String(b.datetime).localeCompare(String(a.datetime))); // recente primeiro
    },
    daDoenca(topicId) {
      return consults.listar()
        .filter(c => Array.isArray(c.topicIds) && c.topicIds.includes(topicId))
        .sort((a, b) => String(b.datetime).localeCompare(String(a.datetime)));
    },
    criar(dados) {
      if (!dados || !dados.patientId || !patients.buscar(dados.patientId)) {
        throw new Error('Escolha o paciente antes de salvar.');
      }
      const agora = new Date().toISOString();
      const c = {
        id: novoId('atd'),
        patientId: dados.patientId,
        datetime: dados.datetime || agora,
        topicIds: Array.isArray(dados.topicIds) ? dados.topicIds : [],
        s: dados.s || '', o: dados.o || '', a: dados.a || '', p: dados.p || '',
        // Adendo 7 — marcações de 1 clique e triagem (opcionais, retrocompatíveis)
        tipoAtendimento: dados.tipoAtendimento || '',   // agendado | demanda-espontanea | intercorrencia | renovacao
        localAtendimento: dados.localAtendimento || '', // na-unidade | remoto
        triagem: dados.triagem || null,                 // {peso, altura, imc, circAbdominal, glicemia, pa, oximetria}
        createdAt: agora,
        updatedAt: agora,
      };
      const lista = consults.listar();
      lista.push(c);
      gravarJSON(K.consults, lista);
      return c;
    },
    atualizar(id, mudancas) {
      const lista = consults.listar();
      const i = lista.findIndex(c => c.id === id);
      if (i < 0) return null;
      lista[i] = Object.assign({}, lista[i], mudancas, { id, updatedAt: new Date().toISOString() });
      gravarJSON(K.consults, lista);
      return lista[i];
    },
    apagar(id) {
      gravarJSON(K.consults, consults.listar().filter(c => c.id !== id));
    },
    // F-G — Registra uma RECEITA impressa no histórico (oferta explícita dela,
    // nunca automático). Mesma gaveta dos atendimentos: lida por paciente E
    // por doença pelos métodos já existentes (doPaciente / daDoenca).
    registrarReceita(dados) {
      if (!dados || !dados.patientId || !patients.buscar(dados.patientId)) {
        throw new Error('Escolha o paciente antes de registrar.');
      }
      const receita = dados.receita || {};
      if (!String(receita.titulo || '').trim() && !String(receita.corpo || '').trim()) {
        throw new Error('Não encontrei o conteúdo da receita para registrar.');
      }
      const agora = new Date().toISOString();
      const c = {
        id: novoId('rec'),
        kind: 'receita',
        patientId: dados.patientId,
        datetime: dados.datetime || agora,
        topicIds: Array.isArray(dados.topicIds) ? dados.topicIds : [],
        receita: {
          titulo: String(receita.titulo || '').trim(),
          corpo: receita.corpo || '',
          tipo: receita.tipo || 'simples',      // simples | especial | orientacao | livre
          regimenId: receita.regimenId || '',
        },
        createdAt: agora,
        updatedAt: agora,
      };
      const lista = consults.listar();
      lista.push(c);
      gravarJSON(K.consults, lista);
      return c;
    },
    // F-G — Retenção de 3 meses: remove entradas com mais de `dias` dias.
    // Roda no boot (Orquestrador-extra). Devolve quantas entradas saíram.
    expurgarAntigos(dias) {
      const limite = (dias == null ? 90 : dias) * 24 * 60 * 60 * 1000;
      const agora = Date.now();
      const lista = consults.listar();
      const ficam = lista.filter(c => {
        const t = new Date(c.datetime || c.createdAt || 0).getTime();
        return !isFinite(t) || (agora - t) <= limite;
      });
      const saidas = lista.length - ficam.length;
      if (saidas > 0) gravarJSON(K.consults, ficam);
      return saidas;
    },
  };

  // ==========================================================================
  // Orquestrador — preferências da médica (NÃO é dado de paciente).
  // { favorites:[{topicId, regimenId, titulo, createdAt}],
  //   own:[{id, topicId, nome, texto, imagem?, createdAt, updatedAt}] }
  // "own" já nasce com o campo "imagem" reservado para as fotos futuras (B5).
  // ==========================================================================
  const draOrq = {
    _ler() {
      const d = lerJSON(K.draOrq, null);
      return (d && Array.isArray(d.favorites) && Array.isArray(d.own))
        ? d : { favorites: [], own: [] };
    },
    _gravar(d) { gravarJSON(K.draOrq, d); },

    // --- Favoritos do guia (espelho ⭐) ---
    favoritosDoTopico(topicId) {
      return draOrq._ler().favorites.filter(f => f.topicId === topicId);
    },
    ehFavorito(topicId, regimenId) {
      return draOrq._ler().favorites.some(f => f.topicId === topicId && f.regimenId === regimenId);
    },
    // Marca/desmarca em 1 clique. Devolve true se ficou marcado.
    alternarFavorito(topicId, regimenId, titulo) {
      const d = draOrq._ler();
      const i = d.favorites.findIndex(f => f.topicId === topicId && f.regimenId === regimenId);
      if (i >= 0) { d.favorites.splice(i, 1); draOrq._gravar(d); return false; }
      d.favorites.push({ topicId, regimenId, titulo: titulo || '', createdAt: new Date().toISOString() });
      draOrq._gravar(d);
      return true;
    },
    removerFavorito(topicId, regimenId) {
      const d = draOrq._ler();
      d.favorites = d.favorites.filter(f => !(f.topicId === topicId && f.regimenId === regimenId));
      draOrq._gravar(d);
    },

    // --- Esquemas próprios ---
    propriosDoTopico(topicId) {
      return draOrq._ler().own
        .filter(e => e.topicId === topicId)
        .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    },
    adicionarProprio(topicId, nome, texto, tipo) {
      if (!String(nome || '').trim()) throw new Error('Dê um nome ao esquema.');
      const agora = new Date().toISOString();
      const d = draOrq._ler();
      const e = { id: novoId('esq'), topicId, nome: String(nome).trim(), texto: texto || '', tipo: tipo || 'simples', imagem: '', createdAt: agora, updatedAt: agora };
      d.own.push(e);
      draOrq._gravar(d);
      return e;
    },
    // F-I — Coroa por esquema: vira esquema PRÓPRIO com dedup POR NOME no
    // mesmo tópico. Se já existe um com o mesmo nome, ATUALIZA texto/tipo em
    // vez de duplicar. Devolve { entrada, atualizado }.
    adicionarOuAtualizarProprio(topicId, nome, texto, tipo) {
      const nomeLimpo = String(nome || '').trim();
      if (!nomeLimpo) throw new Error('Dê um nome ao esquema.');
      const d = draOrq._ler();
      const alvo = norm(nomeLimpo);
      const existente = d.own.find(e => e.topicId === topicId && norm(e.nome) === alvo);
      if (existente) {
        const i = d.own.findIndex(e => e.id === existente.id);
        d.own[i] = Object.assign({}, existente, { texto: texto || '', tipo: tipo || existente.tipo || 'simples', updatedAt: new Date().toISOString() });
        draOrq._gravar(d);
        return { entrada: d.own[i], atualizado: true };
      }
      const e = draOrq.adicionarProprio(topicId, nomeLimpo, texto, tipo);
      return { entrada: e, atualizado: false };
    },
    atualizarProprio(id, mudancas) {
      const d = draOrq._ler();
      const i = d.own.findIndex(e => e.id === id);
      if (i < 0) return null;
      d.own[i] = Object.assign({}, d.own[i], mudancas, { id, updatedAt: new Date().toISOString() });
      draOrq._gravar(d);
      return d.own[i];
    },
    apagarProprio(id) {
      const d = draOrq._ler();
      d.own = d.own.filter(e => e.id !== id);
      draOrq._gravar(d);
    },
  };

  // ==========================================================================
  // EXPORTAR / IMPORTAR — dois arquivos separados (regra D9):
  //  (a) pacientes+atendimentos = SENSÍVEL (leva aviso no nome e dentro do JSON)
  //  (b) esquemas do Orquestrador = preferência de médica, não sensível
  // ==========================================================================
  function dataHoje() { return new Date().toISOString().slice(0, 10); }

  function exportarPacientes() {
    return {
      v: VERSAO, tipo: 'ubs2026-pacientes',
      _aviso: 'CONTÉM DADOS DE PACIENTES. Guarde com cuidado e não compartilhe.',
      exportadoEm: new Date().toISOString(),
      patients: patients.listar(),
      consults: consults.listar(),
    };
  }
  function exportarDraOrq() {
    return {
      v: VERSAO, tipo: 'ubs2026-draOrq',
      exportadoEm: new Date().toISOString(),
      draOrq: draOrq._ler(),
    };
  }
  function nomeArquivoPacientes() { return 'BACKUP-PACIENTES-SENSIVEL-' + dataHoje() + '.json'; }
  function nomeArquivoDraOrq() { return 'esquemas-dra-Orquestrador-' + dataHoje() + '.json'; }

  // Validação ANTES de gravar: se qualquer peça estiver errada, lança erro e
  // NADA é escrito (o chamador mostra a mensagem e o armazenamento segue igual).
  function validarPacientes(obj) {
    if (!obj || obj.tipo !== 'ubs2026-pacientes' || !Array.isArray(obj.patients) || !Array.isArray(obj.consults)) {
      throw new Error('Este arquivo não é um backup de pacientes válido. Nada foi alterado.');
    }
    for (const p of obj.patients) {
      if (!p || !p.id || !p.nome) throw new Error('Há um paciente sem nome ou sem identificação no arquivo. Nada foi alterado.');
    }
    for (const c of obj.consults) {
      if (!c || !c.id || !c.patientId) throw new Error('Há um atendimento incompleto no arquivo. Nada foi alterado.');
    }
  }
  function validarDraOrq(obj) {
    if (!obj || obj.tipo !== 'ubs2026-draOrq' || !obj.draOrq ||
        !Array.isArray(obj.draOrq.favorites) || !Array.isArray(obj.draOrq.own)) {
      throw new Error('Este arquivo não é um backup de esquemas válido. Nada foi alterado.');
    }
  }

  // Importação SUBSTITUI o conteúdo atual daquela gaveta (é o "restaurar cópia").
  // A validação acima já rodou antes de qualquer escrita.
  function importarPacientes(obj) {
    validarPacientes(obj);
    gravarJSON(K.patients, obj.patients);
    gravarJSON(K.consults, obj.consults);
    return { pacientes: obj.patients.length, atendimentos: obj.consults.length };
  }
  // Esquemas da Dra.: MESCLA (o mais recente vence em conflito de id).
  function importarDraOrq(obj) {
    validarDraOrq(obj);
    const atual = draOrq._ler();
    const novo = obj.draOrq;
    const porId = new Map();
    for (const e of atual.own) porId.set(e.id, e);
    for (const e of novo.own) {
      const antigo = porId.get(e.id);
      if (!antigo || String(e.updatedAt || '') >= String(antigo.updatedAt || '')) porId.set(e.id, e);
    }
    const chaveFav = f => f.topicId + '|' + f.regimenId;
    const favs = new Map();
    for (const f of atual.favorites) favs.set(chaveFav(f), f);
    for (const f of novo.favorites) {
      const antigo = favs.get(chaveFav(f));
      if (!antigo || String(f.createdAt || '') >= String(antigo.createdAt || '')) favs.set(chaveFav(f), f);
    }
    draOrq._gravar({ favorites: [...favs.values()], own: [...porId.values()] });
    return { esquemas: novo.own.length, favoritos: novo.favorites.length };
  }

  // ==========================================================================
  // META / MANUTENÇÃO
  // ==========================================================================
  const meta = {
    ler() { return lerJSON(K.meta, {}); },
    marcar(chave, valor) { const m = meta.ler(); m[chave] = valor; gravarJSON(K.meta, m); },
    remover(chave) { const m = meta.ler(); delete m[chave]; gravarJSON(K.meta, m); },
    ultimaExportacao() { return meta.ler().lastExportAt || ''; },
  };

  // ==========================================================================
  // SESSÃO (F-D) — login do Orquestrador. É IDENTIDADE E ACOLHIMENTO, não
  // segurança: nada aqui criptografa nem bloqueia dado (coerente com a decisão
  // da F2 de não criptografar o histórico). Só liga a personalização dela.
  // ==========================================================================
  const sessao = {
    ler() {
      const d = lerJSON(K.session, null);
      return (d && d.crm) ? d : null;
    },
    // Adendo 5: DUAS entradas com a mesma senha — o CRM Orquestrator OU o  
    // dela. Qualquer outro número não entra. Guarda qual dos dois ela usou.
    // Adendo 10: se existir senhaCustom (trocada em "Esqueci minha senha"), a
    // senha vigente é ELA — a padrão deixa de abrir a porta (aceite do dono:
    // "entrar com a nova ✓ e com a antiga ✗").
    entrar(crm, senha) {
      const numero = String(crm || '').trim();
      const vigente = (meta.ler().senhaCustom || '').trim() || 'Medicalhub1234';
      const entradaValida = (numero === 'Orquestrator') && String(senha || '') === vigente;
      if (entradaValida) {
        const d = { crm: numero, nome: 'Orquestrador', loginAt: new Date().toISOString() };
        gravarJSON(K.session, d);
        return d;
      }
      return null;
    },
    // "Esqueci minha senha": grava a senha NOVA dela (a chave do reset é o
    // CRM Orquestrator — validado no fluxo, em Orquestrador-extra.js).
    trocarSenha(nova) {
      const limpa = String(nova || '');
      if (limpa.length < 4) throw new Error('A senha nova precisa ter pelo menos 4 caracteres.');
      meta.marcar('senhaCustom', limpa);
      meta.marcar('senhaCustomEm', new Date().toISOString());
    },
    sair() { localStorage.removeItem(K.session); },
  };

  // F-G — Idade visível de uma entrada ("há 2 meses"), em linguagem simples.
  function idadeTexto(iso) {
    const t = new Date(iso).getTime();
    if (!isFinite(t)) return '';
    const dias = Math.floor((Date.now() - t) / 86400000);
    if (dias <= 0) return 'hoje';
    if (dias === 1) return 'ontem';
    if (dias < 30) return 'há ' + dias + ' dias';
    const meses = Math.floor(dias / 30.44);
    if (meses < 12) return meses === 1 ? 'há 1 mês' : 'há ' + meses + ' meses';
    const anos = Math.floor(meses / 12);
    return anos === 1 ? 'há 1 ano' : 'há ' + anos + ' anos';
  }

  // Adendo 2 — IDADE CALCULADA automática a partir da data de nascimento
  // (formato do <input type="date">: 'AAAA-MM-DD'). Em linguagem simples.
  function idadeDetalhada(nascISO) {
    const d = new Date(String(nascISO || '') + 'T00:00:00');
    if (!isFinite(d.getTime())) return '';
    const hoje = new Date();
    let anos = hoje.getFullYear() - d.getFullYear();
    let meses = hoje.getMonth() - d.getMonth();
    if (hoje.getDate() < d.getDate()) meses--;
    if (meses < 0) { anos--; meses += 12; }
    if (anos < 0) return '';
    if (anos === 0) {
      if (meses === 0) return 'recém-nascido';
      return meses === 1 ? '1 mês' : meses + ' meses';
    }
    const a = anos === 1 ? '1 ano' : anos + ' anos';
    if (meses === 0) return a;
    return a + ' e ' + (meses === 1 ? '1 mês' : meses + ' meses');
  }

  // 'AAAA-MM-DD' → 'DD/MM/AAAA' (para exibir a data de nascimento).
  function dataBR(iso) {
    const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? m[3] + '/' + m[2] + '/' + m[1] : String(iso || '');
  }

  // Adendo 2 — plural em linguagem simples: nunca "atendimento(s)" na tela.
  function plural(n, singular, pluralForm) {
    return n + ' ' + (n === 1 ? singular : (pluralForm || singular + 's'));
  }

  // F-J — Regra da Dra.: hidroclorotiazida no MÁXIMO 25 mg nas receitas DELA.
  // Procura "hidroclorotiazida ... <n> mg" (e a sigla HCTZ) no texto e devolve
  // a MAIOR dose encontrada quando passa de 25 mg; senão devolve null.
  // AVISO apenas — nunca bloqueio (o hub oferece e obedece).
  function hctzAcimaDe25(texto) {
    const t = String(texto || '');
    if (!t) return null;
    const re = /(?:hidroclorotiazida|hctz)\b[^\n.;]{0,30}?(\d+(?:[.,]\d+)?)\s*mg/gi;
    let m, maior = 0;
    while ((m = re.exec(t)) !== null) {
      const dose = parseFloat(String(m[1]).replace(',', '.'));
      if (isFinite(dose) && dose > maior) maior = dose;
    }
    return maior > 25 ? maior : null;
  }

  // F-E — O rodapé dela (4 linhas), fiel ao e-SUS, fora do carimbo.
  // A cidade tem override editável em ubs2026.v1.meta.rodapeLocal.
  function rodapeDraHTML(classe) {
    const local = (meta.ler().rodapeLocal || 'Goiânia - GO').trim() || 'Goiânia - GO';
    const dataExtenso = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
    return '<div class="' + (classe || 'f2x-rodape-dra') + '">' +
      '<strong><span class="orq-coroa orq-coroa-inline" aria-label="Orquestrador"></span></strong>' +
      '<span>CRM-GO Orquestrator</span>' +
      '<span>Médica da Estratégia de Saúde da Família</span>' +
      '<span>' + local + ', ' + dataExtenso + '</span>' +
      '</div>';
  }

  // Tamanho ocupado, para o aviso de quota (R3 do plano).
  function usageBytes() {
    let total = 0;
    for (const chave of Object.values(K)) {
      const v = localStorage.getItem(chave);
      if (v) total += v.length * 2; // JS grava em UTF-16: ~2 bytes por caractere
    }
    return total;
  }

  // Apaga TUDO do módulo (botão vermelho, 2 gestos na tela).
  function apagarTudo() {
    for (const chave of Object.values(K)) localStorage.removeItem(chave);
  }

  // Normalização para busca: minúsculas e sem acento.
  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  return { patients, consults, draOrq, meta, sessao, usageBytes, apagarTudo, norm,
           idadeTexto, idadeDetalhada, dataBR, plural, hctzAcimaDe25, rodapeDraHTML,
           exportarPacientes, exportarDraOrq, importarPacientes, importarDraOrq,
           validarPacientes, validarDraOrq, nomeArquivoPacientes, nomeArquivoDraOrq, novoId };
})();
