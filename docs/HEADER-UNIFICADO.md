# Cabeçalho integrado — fonte correta

Fonte: `Bauerfilho/bauer-hub-v2`, branch `main`, base `7fc911c`.
Esta revisão substitui a entrega feita sobre o repositório antigo `bauer-hub-preview`.
O commit rejeitado permanece apenas na branch de recuperação
`backup/header-base-antiga-20260920`, fora da história da entrega atual.

## Identificação da versão

Fonte e render conferidos pelos elementos solicitados pelo operador:
marca Receituários Orquestrador, Clínica do Orquestrador, Home, cards coloridos,
Esquemas do Orquestrador e painel **lateral** com Imprimir, Preencher data de hoje
e Novo paciente. Na base correta, a barra escondia até -72px enquanto a faixa
da doença permanecia entre 70px e 139px no teste desktop.

## Alteração

O controlador mantém a transição original de 340ms e a histerese de 6px.
Cabeçalho e faixa direta da doença recebem a mesma translação, calculada pela
altura real de ambos. O recolhimento só começa depois que o espaço inicial do
conjunto já passou pela janela. Subir revela os dois simultaneamente.

O DOM não foi reorganizado. Painel lateral, seletores, abas, folhas e conteúdo
clínico continuam nos mesmos lugares. A faixa interna do preview de documentos
não participa da animação. Trocas de vista revelam o cabeçalho e restauram o topo.
O foco na busca ao voltar ao hub usa `preventScroll` para não provocar uma nova
rolagem automática em telas estreitas.

## Provas

| Verificação | Resultado |
| --- | --- |
| Painel lateral: HTML e geometria, nas duas entradas e três larguras | Idênticos à base |
| Painel lateral: comparação de pixels em desktop, nas duas entradas | Zero diferença |
| 121 tópicos em `index.html` e 121 em `index-f2.html` | PASS |
| Desktop 1440×900, celular 390×844 e tela 320×568 | PASS |
| Topo, rolagem curta, descida, subida, troca de doença e retorno ao hub | PASS |
| Seletores, abas, espelho das vias, ações laterais, foco e índice | PASS |
| Documentos, CSS de impressão e movimento reduzido | PASS |
| Erros JavaScript no navegador | Zero |
| Revisão estática independente e delta de foco | Sem bloqueadores |

O corpo HTML e os blocos clínicos foram comparados byte a byte com `7fc911c`.
SHA-256 do `catalogData`, igual nas duas entradas e na base:
`cccea571329d320c8681ce5b28b0b254fc8b482b84065fa7fff8437e6a31354c`.

Resultado automatizado: `tests/evidencias/header-v2-2026-09-20.json`.
O teste usa uma identidade fictícia em perfil temporário vazio; não usa senha,
credencial, ficha ou perfil de navegador do operador.

## Reexecução

Sirva este checkout em `http://127.0.0.1:8931` e uma extração de `7fc911c` em
`http://127.0.0.1:8934`. Com Playwright e pngjs disponíveis no ambiente Node:

```sh
BASE_URL=http://127.0.0.1:8931 \
BASELINE_URL=http://127.0.0.1:8934 \
HEADER_QA_DIR=/tmp/receituarios-header-v2-provas \
node tests/header-unificado.cjs
```

Use `NODE_PATH` se esses módulos estiverem instalados fora do projeto.
O teste gera imagens e JSON e fecha seu navegador ao terminar.
Impressão validada aqui significa preservação do portal/CSS e das ações existentes;
não foi acionada uma impressora nem feita uma avaliação clínica das prescrições.

Entrega por commit local, sem push ou publicação.
