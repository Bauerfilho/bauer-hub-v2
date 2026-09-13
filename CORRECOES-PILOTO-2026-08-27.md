# Correções-piloto — 27/08/2026 (claude/brain)

**Ordem do Bauer:** fazer 1-2 das correções pendentes do hub, uma seguida da outra,
com busca de material autorizada, para calibrar o método antes das demais.

**O que são "as correções":** o build do codex deixou **51 esquemas `raw-blocked`**
(anomalia do documento-fonte que trava a impressão até correção médica) + 43
`review-required`. Esta é a lista de trabalho embutida no próprio hub.

**Onde está o resultado:** `index-correcoes-piloto.html` — CÓPIA de trabalho com as
2 correções aplicadas e provadas na tela (headless, zero erros JS).
⚠️ O `index.html` original está INTACTO (SHA-256 `592e6fe5…` confere com o
RELATORIO_VALIDACAO). Nada foi promovido sem o seu veredito.

---

## Correção 1 — `vaginose-clindamicina` (Saúde da mulher · pág. 15 do guia)

- **Defeito (flag do build):** `quantidade_divergente_posologia_14_cp_necessarios` —
  o guia dizia **28 comprimidos** para 1 cp VO 12/12h × 7 dias (= 14 cp).
- **Correção:** quantidade **14 comprimidos** (posologia inalterada).
- **Fonte (literal):** Protocolo Brasileiro para IST 2020 / PCDT IST (MS), segunda opção:
  *"Clindamicina 300mg, VO, 2x/dia, por 7 dias"* —
  [SciELO/Epidemiol. Serv. Saúde](https://www.scielo.br/j/ress/a/X9WkLLZRBbcW3mFwbRYBHXD/?format=html&lang=pt).
  1ª opção do mesmo protocolo é o metronidazol — o esquema Metronidazol do hub
  (28 cp = 2 cp 12/12h × 7d) está CORRETO, não foi tocado.
- **Orientação ao paciente (estava vazia — texto NOVO, rascunho meu → precisa do teu aval):**
  água/refeições · completar os 7 dias · retorno se persistir · alerta de diarreia
  intensa (colite associada à clindamicina).
- **Estado na cópia:** `rawBlocked: false` · `safetyLevel: review-required`
  (mantém confirmação médica antes de imprimir — não afrouxei o gate a "standard").

## Correção 2 — `puericultura-ferro-pn-normal` (Pediatria · pág. 20 do guia)

- **Defeitos (flags):** `formula_peso_dividido_por_1_25_ambigua` + `frequencia_nao_informada`.
- **Correção:** fórmula explicitada — **gotas/dia = peso (kg) ÷ 1,25**, com exemplo
  (10 kg → 8 gotas) — e frequência **1 vez ao dia**. Aritmética que fecha:
  125 mg/mL de sulfato ferroso = 25 mg/mL de ferro elementar; 20 gotas/mL →
  1,25 mg Fe/gota; profilaxia 1 mg/kg/dia → peso ÷ 1,25 gotas. Canon do guia
  (peso/1,25 · início aos 3 meses · até 2 anos) PRESERVADO.
- **Fonte (literal):** BVS APS, citando o PNSF/MS: *"suplementação profilática de ferro…
  na dose de 1mg de ferro elementar/Kg/dia"* —
  [BVS APS](https://aps-repo.bvs.br/aps/qual-a-prescricao-profilatica-recomendada-de-sulfato-ferroso-e-acido-folico-para-criancas/) ·
  [Manual PNSF/MS](https://bvsms.saude.gov.br/bvs/publicacoes/manual_suplementacao_ferro_condutas_gerais.pdf) ·
  [Caderno de Micronutrientes MS 2022](https://bvsms.saude.gov.br/bvs/publicacoes/caderno_programas_nacionais_suplementacao_micronutrientes.pdf).
- **Orientação ao paciente (estava vazia — texto NOVO, rascunho meu → precisa do teu aval):**
  antes da alimentação · com fruta rica em vit. C · não com leite · fezes escuras
  esperadas · frasco longe de crianças · consultas de puericultura.
- **Estado na cópia:** `rawBlocked: false` · `safetyLevel: review-required`.

### ⚠️ Divergências SINALIZADAS (guia = canon; eu não corrigi, só aponto)
1. **Calibração do conta-gotas:** a resposta da BVS APS usa produto em que
   *"01 gota contém 01 mg de ferro elementar… prescrever 01 gota/kg"* (25 gotas/mL).
   O guia usa peso/1,25 (20 gotas/mL). **Depende do frasco da rede** — vale conferir
   o produto que a farmácia da USF dispensa; se for o de 1 mg/gota, a fórmula vira
   1 gota/kg/dia.
2. **Idade de início:** guia = 3 meses; PNSF/MS = 6 meses (4 meses se não estiver em
   aleitamento materno exclusivo); SBP recomenda 3-6 meses conforme cenário.
   Mantive o canon do guia (3 meses).

---

## A prova (auditada renderizada, não só no dado)
- Round-trip do payload: 14 cp presente · 49 raw-blocked restantes intactos · escapes
  (`<`,`>`,`&`,U+2028/29) preservados · sem `</script` no bloco.
- Headless (Playwright, janela própria): rx-body da Clindamicina mostra
  "14 comprimidos"; rx-body do ferro mostra a fórmula + "1 vez ao dia"; abas de
  Orientações preenchidas; **zero erros de JS**. Screenshots:
  `prova-final-clinda.png` · `prova-final-ferro.png` (scratchpad da sessão).

## O que decide o DONO (nada disso foi feito)
1. Aprovar os 2 textos de orientação (autoria minha, rascunho clínico).
2. Promover `index-correcoes-piloto.html` → `index.html` (regera CHECKSUMS + RELATORIO).
3. Conta-gotas: manter peso/1,25 ou migrar para 1 gota/kg conforme o frasco da rede.
4. Autorizar a fila seguinte. Próximos que EXIGEM decisão clínica tua (por isso não fiz):
   - `itu-gestante-pielonefrite`: quantidade de cefalexina depende de quantos dias
     restam do curso de 14 após a alta (4 cp/dia × dias restantes) — precisa de regra tua.
   - `pre-natal-acido-folico-alto-risco`: duração/quantidade do ácido fólico 5 mg
     (periconcepcional até 12ª semana? gestação toda?) — conduta a cravar por ti.
