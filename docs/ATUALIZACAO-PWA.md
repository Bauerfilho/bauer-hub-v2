# Atualização automática dentro do aplicativo

O aplicativo instalado carrega `https://bauerfilho.github.io/bauer-hub-v2/`.
A publicação usa o Pages nativo, a partir da branch `gh-pages`. O pacote é gerado
localmente por `scripts/publish-pages.py` e identificado pelo SHA de `main`, sem
edição manual de número de versão. O aplicativo continua detectando as edições
publicadas automaticamente.

Em 20/09/2026, a execução GitHub Actions `35527440675` foi recusada antes de qualquer
etapa porque a conta apresentou bloqueio de faturamento. O workflow automático
foi retirado para não produzir novas falhas a cada push. Nenhuma configuração
de cobrança foi alterada. **Enquanto esse bloqueio existir, push em `main` sozinho
não publica o PWA**: execute o comando abaixo após o push.
A retirada do workflow permanece mesmo se o faturamento for regularizado; voltar
a publicar por Actions exige sua reintrodução e a troca explícita da origem do Pages.

## Publicação

Na raiz do repositório, com Git e GitHub CLI já disponíveis e autenticados:

```sh
python3 scripts/publish-pages.py --wait 120
```

O script exige checkout limpo e `HEAD` igual ao commit atual de `origin/main`.
Valida que `origin` é `Bauerfilho/bauer-hub-v2`, gera o pacote em pasta temporária,
acrescenta um commit ao histórico existente de `gh-pages` e usa push normal,
sem force. Mudança concorrente da fonte ou da branch de publicação interrompe
a operação. Arquivos temporários e relatório ficam preservados no caminho
informado ao final; o checkout original não é substituído.
Variáveis `GIT_*` herdadas são removidas para impedir redirecionamento acidental
do índice ou da árvore de trabalho. A autenticação do GitHub CLI e os arquivos
normais de configuração do Git continuam disponíveis.

Depois, configura o Pages nativo para `gh-pages` na raiz e solicita um build uma
única vez. Se o push já iniciou um build e a API responder HTTP 409, acompanha
o build existente. `--wait` limita a observação; sem essa opção, apenas informa
o estado atual. Um build ainda em fila não é apresentado como entrega concluída.

Confira a propriedade `version` em
`https://bauerfilho.github.io/bauer-hub-v2/release.json`: ela deve ser igual ao SHA
de `main` publicado. A confirmação do build e a confirmação HTTP são verificações
distintas. O script não altera cobrança, hooks, autorizações ou domínio do site.

## Funcionamento

- O app verifica novidades ao abrir, recuperar foco/visibilidade, voltar à rede e periodicamente.
- Em condições normais, a verificação periódica ocorre a cada minuto; falhas usam espera progressiva.
- Os arquivos novos são preparados e conferidos por SHA-256 antes de a edição poder ativar.
- A troca ocorre por recarga interna da mesma janela. Não é necessário fechar e reabrir o aplicativo.
- Receita, composição, item livre, SOAP, atendimento, guias, documentos, paciente, modais,
  impressão e controles em uso impedem a recarga enquanto houver trabalho pendente.
- Uma aba segura não pode autorizar a troca por outra aba em edição.
- Após salvar, cancelar ou limpar o trabalho pelos controles próprios de cada área,
  o atualizador reavalia automaticamente a possibilidade de aplicar a edição preparada.
- O atualizador não salva prontuários, não importa dados e não persiste rascunhos clínicos.
  Os dados já salvos continuam no localStorage da mesma origem; rascunhos continuam em memória.

Na primeira implantação, uma página antiga já aberta ainda não possui esse mecanismo.
Ela precisa ser recarregada uma vez, depois de salvar ou resolver o trabalho em edição.
Essa ativação inicial não exige encerrar o aplicativo. As publicações seguintes são
detectadas pelo próprio atualizador.

## Cache e integridade

O build inclui somente ativos públicos permitidos do aplicativo: 93 arquivos,
aproximadamente 19 MB nesta entrega. Bancos, testes, provas e backups ficam fora.
O service worker não integra o próprio manifesto, evitando um ciclo de hashes.

Os caches usam prefixo exclusivo, incluindo o escopo do aplicativo. Ativos idênticos
podem ser reaproveitados. Edições em uso e arquivos de uma edição em preparação são
preservados. Uma página que precise continuar na edição antiga mantém seus arquivos
daquela edição; ausência de ativo ou de selo de integridade não autoriza misturar
arquivos novos da rede. Caches de outros aplicativos não são apagados.

## Verificação independente

Resultado: **16 cenários únicos aprovados**, mais controle negativo detectado.
Evidência consolidada: `tests/evidencias/pwa-2026-09-20.json`.

Foram verificadas instalação inicial sem recarga extra, troca N→N+1 na mesma janela,
preservação byte a byte do localStorage, rascunhos das diferentes áreas, item livre
oculto, múltiplas abas, edição iniciada após o voto de segurança, arquivos corrompidos,
perda do selo de cache, offline/reconexão e preservação de cache alheio.

A atualização automática foi comprovada por evento real de reconexão:
`context.setOffline(false)` provocou a nova edição, sem chamada manual a `check()`
ou `recheck()`. Remover o veto apenas de um worker temporário fez o teste falhar
precisamente por ativação com uma janela insegura.

Os testes usam Chromium e um perfil temporário com dados fictícios. Não acessam
o perfil nem os dados do operador, e não acionam impressora. A instância pessoal
instalada do operador não foi controlada durante a validação.

## Reexecução

Com Playwright disponível no ambiente Node:

```sh
PWA_QA_DIR=/tmp/receituarios-pwa-provas node tests/pwa-update.cjs
PWA_ENTRY=index.html PWA_QA_DIR=/tmp/receituarios-pwa-index node tests/pwa-update.cjs
```

Use `NODE_PATH` quando o pacote Playwright estiver instalado fora do projeto.
O teste constrói edições temporárias e as serve na mesma origem, no subdiretório
`/bauer-hub-v2/`; não depende da publicação real para simular a mudança de versão.
