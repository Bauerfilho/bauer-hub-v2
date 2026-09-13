# PROMPT DE INTEGRAÇÃO — para o CODEX (colar inteiro, modo plan)

Codex: você é o AUTOR ORIGINAL do hub, das primeiras receitas e do documentos-preenchiveis2.html
("Guias do paciente") — esta obra é você revisitando a própria criação. Trabalhe em MODO PLAN:
feche o plano primeiro, execute depois com a janela zerada.

A missão: integrar os Guias do paciente ao ecossistema do Hub UBS 2026 conforme o PLANO DE
IMPLEMENTAÇÃO abaixo — produzido hoje por um pipeline de 6 agentes com evidência medida no
disco (todo caminho:linha citado foi verificado em 29/08/2026). Os requisitos são do dono
(Bauer) e as 10 leis-canon do plano são INEGOCIÁVEIS — em especial: o padrão de preenchimento
da v2 é o canon; as 3 versões permanecem intactas no disco (v1 e F1 terminam com ZERO diff);
o gate VERIFICACAO-F2.js nunca regride (rodar antes e depois de cada fase); tudo aditivo,
offline, localStorage ubs2026.v1 reusado; o hub NÃO decide conduta; 1 folha por documento.

Antes de cada fase: backup datado (.bak-20260829) de cada arquivo tocado, como o plano manda.
Revise o próprio trabalho contra os aceites binários de cada subfase ANTES de dar por pronta.
Piso de qualidade: a preceptora usa sozinha — cada gesto precisa ser óbvio para ela.

=== O PLANO (siga fase a fase) ===

Toda a evidência está medida no disco por mim (greps diretos + retrieves do cache OMNI da sessão do workflow). Trabalho 100% read-only cumprido — nenhum arquivo escrito. O texto abaixo É o plano.

---

# PLANO DE IMPLEMENTAÇÃO FINAL — Guias do Paciente integrados ao Hub UBS 2026

**Executor**: CODEX (autor original, modo plan, janela do dono) · **Data da evidência**: 29/08/2026, medida no disco
**BASE** (todo caminho relativo abaixo é relativo a): `/Users/bauervieiracesarfilhovieira/Documents/claude-organizada-segura/Hub_Receituarios_UBS_2026/`

## Contexto

A v2 (`documentos-preenchiveis2.html`, 490 linhas, "Guias do paciente", 20 guias + 7 registros, zero `localStorage` — grep confirmou nenhuma ocorrência) é a BASE que o dono ama preencher; ela ganha, nesta obra: escrita direta na folha com espelho em tempo real (padrão doado pelo v1 `documentos-preenchiveis.html`), drawer ☰ à esquerda com o índice (padrão doado pelo próprio hub `index-f2.html:193,200-204`), botão "Preencher" à direita togglando o painel que já existe (`:136-168`), os 18 documentos institucionais do F1 acessíveis por deep-link (`f1/motor.js:937-938` já aceita `?doc=`), plugagem na home e no workspace de doença do hub vivo, e uma pasta de pacientes com autocomplete e autofill construída SOBRE o schema `ubs2026.v1` existente (`js/dados.js`) — que já guarda triagem `{peso, altura, imc, circAbdominal, glicemia, pa, oximetria}` por atendimento (`js/dados.js:135`), faltando apenas CPF e CIDs na ficha do paciente.

## Canon e leis (inegociáveis, na ordem)

1. **O padrão de preenchimento da v2 é o CANON**: o painel direito (`documentos-preenchiveis2.html:136-168`) não muda de forma, campos, ordem nem ids (`#patientName:141`, `#patientDate:142`, `#caregiver:143`, `#dynamicEditor:146`, `data-copies:158`, `#clearPatient:164`).
2. **2ª via espelhada fiel ao v1**: o mecanismo é o par gerador único + sync dirigido (`documentos-preenchiveis.html:684-696` `fillable`/`fillableBlock`, `:870-878` `syncMirrors`, `:967-984` delegação input/Enter/paste) — transplantado por CÓPIA DE PADRÃO, nunca movendo o doador.
3. **3 versões preservadas**: `documentos-preenchiveis.html`, `index-f1.html` + `f1/**` e o `index-f2.html` atual permanecem no disco; v1 e F1 terminam a obra com **zero diff**; `index-f2.html` recebe só adições cirúrgicas.
4. **Gate não regride**: `node VERIFICACAO-F2.js` (da pasta do HUB; playwright headless, perfil temp isolado, `VERIFICACAO-F2.js:1-4`) termina com `RESUMO: N/N PASSARAM` e exit 0, N ≥ 138. Estender pode; afrouxar/remover check, NUNCA.
5. **Aditivo**: nenhum comportamento atual da v2 ou do hub é removido; `selfCheck()` da v2 (`:480-485`, 20/7 cravados, fail-closed com `throw`) permanece.
6. **100% offline/`file://`**: zero CDN, zero rede; scripts só locais (padrão já vigente).
7. **localStorage reusado, não duplicado**: namespace único `ubs2026.v1.*` (`js/dados.js:17-21`); campos novos são OPCIONAIS e retrocompatíveis; exportar/importar (`js/dados.js:294-342`) continuam válidos.
8. **O hub NÃO decide conduta**: CIDs são sugestões rotuladas "conferir" (`js/cids.js:1-6` já grava essa lei); nenhum mapeamento automático doença→documento com cara de recomendação clínica.
9. **1 folha por documento**: só `#printPortal` imprime (v2 `:71,:80-88`; hub `index-f2.html:172,:181-182`); drawer/chrome jamais entram no portal.
10. **A preceptora usa SOZINHA**: rótulos em português claro, gestual idêntico ao drawer que ela já usa no hub; nada exige console ou atalho.

---

## Fase 0 — Linha de base e backups (antes de tocar qualquer arquivo)

**Depende de**: — · **Esforço**: S · **Risco**: baixo

- **0.1 Placar de partida do gate.** Rodar `node VERIFICACAO-F2.js` na BASE e guardar a saída. *Aceite binário*: última linha `==== RESUMO: N/N PASSARAM ====` com exit 0 e N anotado (dado do dono: 138 hoje; contagem estática no fonte: 142 `passa(` incluindo a definição — o placar de runtime é o que vale).
- **0.2 Backups datados.** Para CADA arquivo que a obra toca — `documentos-preenchiveis2.html`, `index-f2.html`, `js/dados.js`, `js/draOrquestrador.js`, `atendimento.html`, `VERIFICACAO-F2.js` — criar `<arquivo>.bak-20260829` ANTES do primeiro edit. *Aceite*: `cmp <arquivo> <arquivo>.bak-20260829` retorna 0 no instante da cópia; os 6 `.bak` existem.
- **0.3 Doadores selados.** `documentos-preenchiveis.html`, `index-f1.html` e `f1/**` são SÓ-LEITURA nesta obra. *Aceite (repetido na Fase 6)*: zero diff neles ao fim.

---

## Fase 1 — A folha que se escreve (fundação; requisito 3)

**Depende de**: Fase 0 · **Esforço**: L · **Risco**: ALTO (toca o núcleo do render; o re-render de 50ms `schedulePreview` `documentos-preenchiveis2.html:420` destrói o caret se disparar durante digitação na folha)

- **1.1 Decisão arquitetural (fixa)**: o `state` (`:262`) segue ÚNICA fonte de verdade; a folha do `#preview` vira SUPERFÍCIE DE ENTRADA. v1 é DOM-como-estado; v2 é estado-como-fonte — não importar o modelo do v1, só o padrão de espelho. *Aceite*: após digitar na folha E no editor, o valor único vive no `state` (probe headless via console).
- **1.2 Emitir `contenteditable="plaintext-only"` + `data-bind` nos valores do preview**: patient-line em `headerMarkup()` `:364`; células de `conventionalTable()` `:373-376` e `visualCards()` `:377-380`; registros/tabelas `:388-391`; cartões hipo `:392-396`; conciliação `:397-400`. Padrão gerador: o `fillable()` do v1 (`documentos-preenchiveis.html:684-689` — editável→`data-bind`, espelho→`data-mirror`, placeholder via `data-placeholder`). *Aceite*: com guia aberto, `#preview [contenteditable][data-bind]` > 0 e cada `data-bind` mapeia 1:1 um campo do state.
- **1.3 Delegação de `input` em `#preview`** reusando os updaters existentes (`updateMedicine :421`, extras/status `:467-468`, paciente `:464-466` região `wire() :457-478`): quando a origem é A FOLHA, atualização DIRIGIDA (só espelhos + editor direito), SEM `renderPreview()` `:404` completo — o re-render total (`schedulePreview :420`) fica para quando a origem é o editor. *Aceite*: digitar 10 caracteres seguidos num campo da folha mantém foco e caret; valor aparece no editor direito.
- **1.4 Higiene transplantada do v1**: Enter bloqueado em campo single-line (`documentos-preenchiveis.html:972-975`), paste como texto puro via `insertPlainText` (`:977-984` + `:914-926`). *Aceite*: paste de HTML rico insere só texto; Enter não cria nó em `[data-bind]`.
- **1.5 Espelho em tempo real nas 2 vias no PREVIEW**: com `data-copies="2"` (`documentos-preenchiveis2.html:158`), preview mostra via 1 editável + via 2 espelho; via 2 com `inert` (padrão F1, `f1/motor.js:633`) ou `pointer-events:none` (padrão v1, CSS `.mirror-value` `documentos-preenchiveis.html:336`). *Aceite*: digitar na via 1 atualiza a via 2 no mesmo input; `via2.querySelectorAll('[contenteditable]')` sem foco possível (0 editáveis).
- **1.6 Impressão limpa**: `preparePrint()` `:441-448` re-renderiza do state para o portal — o render de impressão passa flag `editable:false` (padrão F1 `linhaCampo(..., editavel)`, `f1/motor.js:148-164`) OU clona-e-remove `contenteditable` (padrão v1 `:947-959`). Orientação por template preservada (`:444-447`). *Aceite*: após preparar impressão, `#printPortal [contenteditable]`.length === 0.
- **1.7 Convergência dos dois lados**: editar `#patientName` (`:141`) e o mesmo campo na folha termina num único valor no state e nas duas superfícies. *Aceite*: teste headless de ida-e-volta passa.

---

## Fase 2 — Drawer ☰ esquerdo + botão "Preencher" direito (requisitos 1-2)

**Depende de**: Fase 1 (ambas tocam `wire()` `:457-478`) · **Esforço**: M · **Risco**: médio (CSS de grid e camadas)

### Especificação do drawer ☰ (canon = o do hub, que a Dra. já usa)

- **Botão**: `<button class="icon-btn" id="menuBtn" aria-label="Abrir índice" aria-expanded="false" aria-controls="drawer">☰</button>` — cópia do canon `index-f2.html:193`. Inserir na appbar da v2 ANTES do brand-mark (`documentos-preenchiveis2.html:96-98`).
- **Gaveta**: backdrop + `<aside id="drawer" aria-hidden="true" inert>` + botão fechar + busca + lista — canon `index-f2.html:200-204`. O CONTEÚDO é o catálogo esquerdo ATUAL transplantado inteiro (`documentos-preenchiveis2.html:106-120`: h1/lead, busca `#catalogSearch :112`, abas `#guideTab :115`/`#extraTab :116`, `#catalogList`), preservando `renderCatalog() :301` e `switchCatalog() :413-416` intactos.
- **CSS**: `.app` `:32` perde a coluna `280px` (vira `minmax(520px,1fr) 390px`); ajustar colapsos responsivos correspondentes; camadas: appbar z40 < drawer < toast z120.
- **Wiring** (dentro de `wire()`): abrir/fechar por ☰, backdrop e ×; `Escape` fecha (no handler de teclado existente `:477`); `/` abre o drawer se fechado e foca `#catalogSearch` (comportamento atual de `/` preservado `:477`); fechado = `aria-hidden="true"` + `inert`.
- *Aceites binários*: (a) drawer abre/fecha pelos 3 gestos; (b) fechado tem `inert`; (c) busca e abas funcionam dentro dele; (d) Ctrl/Cmd+P segue imprimindo (`:477`).

### Especificação do botão/painel direito

- **Botão "Preencher"** no lado direito da appbar (após `.appbar-spacer` `:99`, junto de `hub-back :100`), togglando a visibilidade do `aside.editor` EXISTENTE (`:136-168`) — mudança de classe no grid + sticky, nada de recriar painel. **Default = visível** (o canon de preenchimento não nasce escondido).
- *Aceites*: (a) toggle mostra/oculta o painel; (b) TODOS os ids/`data-*` do painel pré-obra existem pós-obra (diff de atributos = vazio); (c) emulação print headless mostra APENAS as print-pages do documento ativo (drawer/botões ausentes — regra `:80-88` já cobre, nenhum item move chrome para o portal).

---

## Fase 3 — Os 18 institucionais no índice (requisito 4) — rota F1→v2

**Depende de**: Fase 2 (drawer pronto) · **Esforço**: M · **Risco**: médio-baixo (decisão certa elimina o risco grande)

- **3.1 Decisão de rota (fixa) — Rota A, deep-link**: os 18 entram como 3ª seção do índice do drawer, cada entrada = link `./index-f1.html?doc=<id>`. O motor F1 JÁ lê `?doc=` (`f1/motor.js:937-938` `URLSearchParams` → `parametros.get('doc')`) e JÁ entrega via 1 editável + via 2 espelho `inert` (`:633`), gates internos de geometria/auditoria (`:909-915`) e guarda de impressão via beforeprint (`:949-950`, escape `?proof=1`). **Rota B (portar os 18 para o motor v2) = reescrever motor provado; só sob ordem expressa do dono.** *Aceite*: 18/18 links abrem o F1 já no documento certo (headless, título confere).
- **3.2 A lista dos 18** (id → título), espelhando 1:1 os arquivos medidos no disco em `f1/templates/` (18 arquivos, carregados em `index-f1.html`, bloco de scripts `registro.js` + 18 templates + `motor.js` nas ~20 últimas linhas do arquivo de 66): `atestado`, `encaminhamento`, `encaminhamento-planejamento-familiar`, `exames-pre-natal`, `exames-labs-rotina`, `exames-simples` (requisição de exames), `formula-lactea`, `fraldas-pediatricas`, `insumos`, `mrpa`, `puerpera`, `controle-especial` (receituário especial), `receituario-gestante`, `receituario-rn`, `tabela-pa` (aferição de PA residencial), `esquema-insulina`, `plano-visual-medicamentos`, `controle-glicemico`. Os ids são validados pelo registry fail-closed (`f1/registro.js`: kebab-case obrigatório, duplicata lança erro). *Aceite*: os 18 ids da lista da v2 = os 18 ids de `F1Registro.todos()` (comparação automatizada).
- **3.3 A 3ª seção é NAVEGAÇÃO, não coleção**: `switchCatalog` permanece binário guides/extras (`:413`); `GUIDES`/`EXTRAS` intocados; `selfCheck()` `:480-485` permanece com 20/7. **Regra dura**: se em qualquer ponto da obra nascer coleção nova de templates na v2, o `selfCheck` é atualizado NO MESMO COMMIT (fail-closed: `:486` mata o app com tela de erro se divergir). *Aceite*: v2 abre sem a tela "O arquivo não pôde ser iniciado".
- **3.4 Navegação de volta** (premissa declarada, reversível): `hub-back` da v2 (`:100`) hoje aponta `./index-f1.html`; com a integração, passa a apontar `./index-f2.html` ("Voltar ao HUB" = hub vivo). O F1 fica como está (zero diff). **CODEX confirma com o dono no modo plan antes de executar este item.**

---

## Fase 4 — Plugagem no hub vivo `index-f2.html` (requisito 5)

**Depende de**: Fase 3 (só se pluga v2 estável) · **Esforço**: M · **Risco**: médio (arquivo do gate; toda linha aqui é vigiada pelo VERIFICACAO-F2.js)

Hoje NÃO existe nenhum link do `index-f2.html` para `documentos-preenchiveis*.html` nem `index-f1.html` (medido pelo cartógrafo C3 por grep) — a integração é toda nova e toda aditiva.

- **4.1 Home — cards novos em `.hub-actions`** (`index-f2.html:222-227`): 2 novos `<a class="feature-card f2-card">` no padrão exato do `#openPatientsCard` (`:226`): "Guias do paciente" → `documentos-preenchiveis2.html` e "Documentos da unidade" → `index-f1.html`. Ajustar o grid `.hub-actions` (`:49`, `repeat(3,…)`) e as medias (`:175-176`) para 6 cards sem quebra feia. *Aceite*: os 2 cards visíveis na home, clicáveis, headless 1280px e 720px sem overflow.
- **4.2 Drawer do hub — 2 seções fixas** ao fim de `renderDrawer()` (`:332`): "Guias do paciente" (1 link) e "Documentos da unidade" (18 links `index-f1.html?doc=<id>`, mesma lista da Fase 3.2), após as categorias de doenças; o filtro `#drawerSearch` (`:203`, oninput `:388`) filtra também as novas entradas. *Aceite*: com o drawer aberto, os links existem e o filtro por "atestado" retorna a entrada.
- **4.3 Workspace da doença — bloco "Guias e documentos"** no `side-panel` (`:259-263`): atalhos para a v2 e para os 18 (lista ou select + botão). SEM mapeamento automático doença→documento (lei 8). *Aceite*: bloco visível ao abrir qualquer tópico via `openTopic` (`:372`); zero mudança em `#workspaceTabs :239`, mounts `:249-250`, impressão (`preparePrintDocument :379`, guarda `printAuthorized :380,:397`).
- **4.4 Handoff de paciente** (prepara a Fase 5): os atalhos do workspace levam `?paciente=<patientId>` na URL quando houver paciente ativo — só o ID, nunca dados clínicos na URL. *Aceite*: URL gerada contém apenas o id `pac-…`.

---

## Fase 5 — A pasta de pacientes (requisito 6): modelo de dados + autocomplete + autofill

**Depende de**: Fases 1 e 4 · **Esforço**: L · **Risco**: ALTO (dados da médica; retrocompatibilidade obrigatória)

### Modelo de dados (mapeado sobre `ubs2026.v1`, medido no disco)

| Campo do dono | Onde vive | Status |
|---|---|---|
| Nome | `patients[].nome` (`js/dados.js:48`) | EXISTE |
| Data de nascimento | `patients[].nascimento` (`:48`; idade auto `:424`) | EXISTE |
| CNS | `patients[].cns` (`:48`; busca `:62`) | EXISTE (bônus) |
| **CPF** | `patients[].cpf` — **NOVO**, opcional, string | criar |
| **CIDs do paciente** | `patients[].cids` — **NOVO**, opcional, `[{codigo, rotulo}]`, escolhidos pela médica (sugestões: `js/cids.js` `CIDS_COMPATIVEIS.porTopico`, rotuladas "conferir") | criar |
| Peso, altura, IMC (auto), circ. abdominal, glicemia, PA (+oximetria) | `consults[].triagem` (`js/dados.js:132-135`, "Adendo 7"); formulário com IMC automático JÁ EXISTE (`js/draOrquestrador.js:352-358` campos, `:438-454` recálculo, `:493-499` gravação) | EXISTE — REUSAR, não duplicar |

**Migração**: nenhuma quebra de formato — campos novos opcionais; `VERSAO = 1` (`js/dados.js:23`) NÃO sobe (a validação de import `:316,:327` checa só `tipo` + arrays, não campos por item). Premissa declarada: export antigo importa no schema novo e vice-versa. *Aceite*: exportar → importar em perfil limpo preserva pacientes com e sem cpf/cids.

### Subfases

- **5.1 `js/dados.js`**: `patients.criar/atualizar` aceitam `cpf`/`cids`; `patients.buscar` (`:62`) passa a casar também CPF. *Aceite*: criar paciente com cpf, buscar por 4 dígitos do cpf o encontra; paciente antigo sem cpf continua listando.
- **5.2 Autocomplete enquanto digita** (3 pontos): (a) `atendimento.html` — o `<select id="selPaciente">` (`:29`, populado por `recarregarPacientes :123-125`) ganha input de busca com lista filtrada conforme digita (fonte: `patients.buscar`), mantendo o select como fallback; deep-links `?p=`/`#c=` (`:179-186`) preservados; (b) v2 — `#patientName` (`documentos-preenchiveis2.html:141`) ganha dropdown de sugestões das fichas locais; escolher preenche nome + trava o vínculo `patientId`; (c) workspace do hub — botão "Usar paciente" que preenche a folha via `syncAll` (`index-f2.html:361`; `blankPatient :335` já tem `cpf` no shape da folha — só não persistia). *Aceite (cada ponto)*: digitar 3 letras de um paciente salvo mostra a sugestão; escolher preenche.
- **5.3 Fim da 1ª consulta = ficha completa**: no salvar do atendimento (fluxo `atendimento.html` + gravação da triagem `js/draOrquestrador.js:493-499`), persistir no PACIENTE: cpf (se preenchido) e os CIDs escolhidos; a triagem continua no consult (já fica). *Aceite*: salvar atendimento com cpf+CID → `ubs2026.v1.patients` contém ambos.
- **5.4 Autofill nas próximas**: ao escolher paciente, pré-carregar última triagem — `consults.doPaciente(id)[0].triagem` (ordenação recente-primeiro já existe em `js/dados.js`, bloco `doPaciente`) — como valores sugeridos EDITÁVEIS, e os `cids` como chips pré-marcáveis rotulados "sugestões — conferir". Na v2: preenche nome/data; peso etc. NÃO entram nos guias (os guias não têm esses campos — nada de inventar campo; lei do aditivo). *Aceite*: 2º atendimento do mesmo paciente abre com triagem anterior visível como sugestão e editável.
- **5.5 A promessa muda junto com a verdade**: quando a v2 passar a LER fichas (carregando `js/dados.js` — script local, offline), os textos "Dados somente nesta tela" (`:101`) e o aviso do rodapé do painel (região `:165-167`) mudam para a verdade nova ("Fichas locais neste dispositivo; nada sai daqui"). Guard `window.F2DB &&` — v2 continua 100% funcional se aberto isolado sem o js. *Aceite*: (a) v2 aberta sozinha sem `js/` funciona; (b) nenhum texto promete "não salva" onde agora salva.

---

## Fase 6 — Não-regressão, backups conferidos e verificação end-to-end

**Depende de**: todas · **Esforço**: M · **Risco**: é o guarda-corpo

- **6.1 Gate da casa**: `node VERIFICACAO-F2.js` → `RESUMO: N/N PASSARAM`, exit 0, **N ≥ placar da Fase 0.1** (regressão = qualquer NÃO-PASSA ou N menor). O runner usa playwright de `/opt/homebrew/lib/node_modules/omniroute/node_modules/playwright` (`VERIFICACAO-F2.js:8`) — dependência confirmada no fonte.
- **6.2 Estender o gate (nunca afrouxar)**: novos blocos `passa()` para — folha editável converge com editor (F.1.7) · caret sobrevive a 10 inputs (F.1.3) · via 2 sem editável (F.1.5) · portal sem `contenteditable` (F.1.6) · drawer abre/fecha/inert (F.2) · 18 deep-links abrem o doc certo (F.3) · 2 cards na home + seções do drawer (F.4) · criar/buscar/autofill paciente com cpf+cids + import retrocompatível (F.5). Zero remoção de check existente. *Aceite*: N_final ≥ N_inicial + nº de checks novos.
- **6.3 Prova de impressão 1-folha**: headless com emulação print — apenas `#printPortal` visível (`documentos-preenchiveis2.html:80-88`); guia de 1 grupo = 1 print-page; registro landscape (diários glicêmicos/conciliação) sai landscape (`:85`, orientação `:444-447`). *Aceite*: contagem de `.print-page` no portal = nº de grupos × vias, e nenhum elemento fora do portal renderiza.
- **6.4 selfCheck e F1 vivos**: v2 abre sem a tela de erro (`:486`); `index-f1.html?doc=atestado` abre headless com zero erro de console (gates internos do motor `f1/motor.js:909-915` julgam lá).
- **6.5 Zero diff nos doadores**: `git diff --stat -- documentos-preenchiveis.html index-f1.html f1/` vazio (ou `cmp` contra cópia pré-obra).
- **6.6 Offline de verdade**: fluxo completo (home → guia → preencher na folha → imprimir → atendimento → autofill) com rede desligada no contexto headless — o gate já tem o padrão (`ctx.setOffline`, bloco "Offline como CAPACIDADE" no fim do VERIFICACAO-F2.js).
- **6.7 Olho do dono**: capturas headless (janela própria do agente) de: drawer aberto · folha sendo escrita com via 2 espelhando · home com os cards novos · autofill em ação — para o dono OLHAR antes do aceite final.

---

## Considerações

**Premissas declaradas** (secundárias, inferidas e marcadas): (a) `hub-back` da v2 passa a apontar o hub vivo (F.3.4 — confirmar com o dono); (b) campos novos de paciente não exigem bump de `VERSAO` (validação de import não inspeciona campos — medido em `js/dados.js:316,:327`); (c) o placar "138/138" é dado do dono — não re-executei o gate nesta análise (execução cria perfil temp; missão é read-only), a contagem estática é 142 `passa(` no fonte incluindo a definição da função.

**Restrições**: prazo 30/08 (presente da Dra. Orquestrador) — as Fases 1-4 entregam os requisitos 1-5 completos; a Fase 5 é a maior e pode ser fatiada (5.1-5.3 primeiro, 5.4-5.5 depois) sem quebrar nada, pois é toda aditiva.

**Riscos e mitigações**: caret destruído pelo re-render (F.1.3 — atualização dirigida, teste de 10 inputs no gate) · `contenteditable` vazando pro papel (F.1.6 — check no portal) · coleção nova quebrando o `selfCheck` fail-closed (F.3.3 — regra dura de commit atômico) · promessa de privacidade mentindo após autofill (F.5.5 — texto muda junto) · regressão no hub vigiado (toda linha no `index-f2.html` é aditiva e o gate roda ao fim de CADA fase, não só no fim da obra).

**Fora de escopo**: portar os 18 templates para o motor v2 (rota B) · sincronização entre dispositivos · qualquer decisão de conduta médica no software · mudanças visuais no canon de preenchimento.

**Divergências de evidência corrigidas por medição minha (29/08)**: C1 disse `state :259` → medido `:262`; C1 `renderCatalog :298-309` → medido `:301`; C1 privacy-note `:98` → medido `:101`; C2 disse via-2 `inert` em `f1/motor.js:757-762` → medido `:633`. Não medido (=—): placar de runtime do gate hoje; comportamento real do caret (só se prova executando).

**Nota de conformidade**: o modo plan sugeriu salvar em `~/.claude/plans/purrfect-singing-wozniak-agent-aece9b83240821b29.md`; a regra inviolável da missão (100% read-only, o texto É o plano) prevalece — nenhum arquivo foi escrito.