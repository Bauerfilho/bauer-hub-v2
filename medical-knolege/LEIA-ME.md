# medical-knolege — o conhecimento clínico que a IA local vai navegar

**Ideia do dono (28/08/2026):** uma IA de TEXTO pequena, rodando num desktop simples do
SUS, com acesso a esta pasta e a poucas diretrizes. Ela **navega**, não decora: abre
UMA página, UM tópico ou UM capítulo por vez — nunca mais que isso. O índice fica
sempre visível quando ela dispara um comando; as imagens vivem separadas, com caminho,
e uma skill as abre dentro do documento.

**Por que funciona em máquina fraca:** o gargalo nunca foi raciocínio, foi CONTEXTO. Com
navegação estrutural (índice no lugar do banco vetorial), um modelo pequeno basta — e a
resposta sai com a **página exata da fonte**, conferível no PDF impresso. Zero
alucinação de fonte; é a régua da casa aplicada ao produto.

## Estrutura
```
medical-knolege/
├── fontes-oficiais/      PDFs originais, intocados (a verdade de referência)
│   ├── reumatologia/     ✅ 2 diretrizes do MS/CONITEC
│   ├── respiratorio/     (asma, DPOC — a preencher)
│   └── cardiometabolico/ (HAS, DM — a preencher)
├── md-paginado/          o MD com paginação FIEL ao PDF (p. 28 = página 28)
├── imagens/              figuras extraídas, com caminho referenciado no MD
└── indices/              índice hierárquico: capítulo → tópico → página
```

## O que já está no disco (28/08)
| arquivo | fonte | páginas |
|---|---|---|
| `DN-osteoartrite-joelho-MS-conitec.pdf` | Diretriz Brasileira p/ Tratamento Não Cirúrgico da OA de Joelho — MS/CONITEC (2024) | 82 |
| `DN-osteoartrite-quadril-MS-conitec.pdf` | idem, Quadril — MS/CONITEC (2024) | 72 |

⚠️ **Falhou o download** (servidor recusou, tentar depois): *Protocolos de encaminhamento
da atenção básica para reumatologia/ortopedia* (MS/BVS, v. III) —
`bvsms.saude.gov.br/bvs/publicacoes/protocolos_atencao_basica_reumatologia_ortopedia_v_III.pdf`.
É peça de alto valor para a rotina dele (critério de quando encaminhar e o que escrever).

## O perfil REAL do serviço dele (dado dele, 28/08 — define a prioridade)
Volume alto de **osteoartrite** (coluna cervical e lombar, mãos, joelhos), **artrite
reumatoide** e **lúpus**; junto com HAS, DM, asma e DPOC. Ele descreve os achados
radiográficos como osteófitos e redução do espaço articular; parte dos pacientes faz
infiltração, com alívio curto — ou seja, **retornam**: a ferramenta será usada
repetidamente no mesmo paciente, o que valoriza seguimento e critério de encaminhamento
tanto quanto a página de diagnóstico.

## A fila de fontes (a buscar)
AR e LES: PCDT do MS (componente especializado) · asma e DPOC · HAS e DM ·
protocolos de encaminhamento (o que falhou acima) · e conferir cobertura de **coluna e
mãos**, que as duas diretrizes baixadas NÃO cobrem (são joelho e quadril).

## Vocabulário do MS (para o índice não errar o nome)
O CONITEC chancela **PCDT**, **DDT** (Diagnóstica e Terapêutica), **PU** (Protocolo de
Uso) e **DN** (Diretriz Nacional) — as de osteoartrite são DN. Todas devem ser
atualizadas a cada 2 anos; ao indexar, gravar a DATA da versão e reconferir.

## Lição que originou esta pasta
Eu afirmei que "não havia canon federal para osteoartrite". **Estava errado** — ele
desconfiou ("deve haver e você não sabe, pois é a mais comum"), mandei buscar e as duas
diretrizes apareceram. Afirmação sobre fonte sem grep é o mesmo defeito que eu tinha
acabado de auditar num braço da frota.
