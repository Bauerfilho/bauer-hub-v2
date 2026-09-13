# Relatório de validação - Hub de Receituários UBS 2026

## Gate de cobertura e schema

- Tópicos clínicos no catálogo: **121** (mínimo auditado: 105)
- Esquemas no catálogo: **359**
- Notas médicas separadas: **94**
- Flags explícitas preservadas: **113**
- Categorias: **5** (Pré-natal, Saúde da mulher, Pediatria, Saúde do adulto, IST)
- Schema-fonte estrito: campos, tipos e textos obrigatórios validados em todos os tópicos e esquemas
- IDs de tópicos: únicos e sintaticamente válidos
- IDs de esquemas: **únicos globalmente**, não apenas dentro de cada tópico
- Tópicos críticos por ID e título canônicos: **8**; as **6** entradas omitidas do sumário estão presentes
- Continuações críticas: página 54 ligada à terbinafina tópica; página 69 ligada aos dois esquemas graves de COVID-19

## Gate de documento autoritativo

- `documentType: control-special`: **12** esquemas, todos e somente os IDs da allowlist RCE
- `documentType: simple`: **347** esquemas
- Exceções simples sem retenção confirmadas: **2** (tretinoína tópica e carisoprodol da formulação catalogada)
- Nenhum tipo de documento é inferido no build por palavras da prescrição

## Gate de segurança do texto-fonte

- `safetyLevel: standard`: **265** esquemas
- `safetyLevel: review-required`: **43** esquemas
- `safetyLevel: raw-blocked`: **51** esquemas
- Bloqueios alcançados pela lista mínima de IDs: **19**
- Bloqueios alcançados por padrões de flags: **44**
- Sobreposição entre ID e padrão: **12**
- Todo esquema `raw-blocked` preserva a transcrição original em `sourcePrescription` e recebe `rawBlocked: true`; a liberação exige correção e confirmação no runtime

## Gate do artefato HTML

- Arquivo final único (`index.html`), sem o placeholder `__CATALOG_JSON__`
- Payload JSON com round-trip validado após a inserção no HTML
- `<`, `>`, `&`, U+2028 e U+2029 escapados como Unicode no bloco de dados
- Nenhuma ocorrência de `</script` dentro do bloco `catalogData`
- Serializador testado com sonda contendo `</script><>&` e os separadores U+2028/U+2029

## Gate funcional final

- Gate estático reprodutível: **18/18 PASS**.
- Bootstrap do JavaScript exercitado com catálogo real em runtime isolado: **PASS**.
- Busca por medicamento e termo sem/com acento: **PASS**.
- Renderização lógica de duas vias simples e duas vias de controle especial: **PASS**.
- Tópico sem receita e bloco global de notas limpam qualquer documento anterior: **PASS**.
- Edição apenas na primeira via, `mirrorCheck`, identificação/receita/orientação sem overflow e impressão via portal isolado: **PASS**.
- Troca de medicamento exige confirmação explícita do tipo de receituário; Clonazepam, Diazepam e Rivotril em formulário simples foram bloqueados no teste dirigido: **PASS**.
- Reauditoria independente: **0 bloqueadores P0/P1 remanescentes**.
- SHA-256 do `index.html` validado: `592e6fe5e08f01f7a997c5f4fa00b8ea4fa7418510782048e71c4457bc3f727c`.

## Gate operacional obrigatório na unidade

Antes da implantação, imprimir uma receita e uma orientação no navegador e na impressora reais do consultório. Conferir A4 paisagem/retrato, escala 100%, cabeçalhos/rodapés desativados, margens físicas, corte central e ausência de recorte. Esse teste depende do equipamento-alvo e não pode ser substituído por validação de código.

## Fontes e limites

O conteúdo terapêutico foi transcrito do PDF fornecido pelo usuário. O build não altera `analysis/catalogo_receitas.json`: `documentType`, `safetyLevel`, `rawBlocked` e `sourcePrescription` são derivados somente no payload final. Esses metadados não substituem julgamento clínico, protocolos vigentes, supervisão ou conferência de alergias, função renal/hepática, gestação, interações e contraindicações.
