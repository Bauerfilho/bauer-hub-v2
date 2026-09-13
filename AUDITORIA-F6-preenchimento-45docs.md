# AUDITORIA F6' — o modelo de preenchimento em TODOS os documentos (30/08/2026, madrugada)

**Requisito do dono:** o modelo de preenchimento bom (escrever direto na folha, espelho em tempo real,
impressão limpa) em TODOS os documentos. **Veredito: CUMPRIDO em 47/47 superfícies imprimíveis**, provado
por prova headless + gate (178/178) — cada classe verificada nos DOIS lados (positivo e negativo).

| Classe (n) | Superfície de escrita | 2ª via | Impressão | Prova |
|---|---|---|---|---|
| 20 guias do paciente | folha `contenteditable` + painel espelhado bidirecional (`data-bind`/`syncBoundSurfaces`, js/guias-view.js) | espelho `inert` em tempo real quando 2 vias | portal do hub, zero `contenteditable` no papel, portrait | prova F1' (`conv folha↔editor`, portal 1 página/0 editáveis) + gate "Integração Guias" (caret 10 inputs, via-2 sem foco, portal limpo) |
| 7 registros (MRPA, mapa glicêmico…) | editores dinâmicos por tipo (`table/hypo/reconcile`) + folha | idem guias | portal, orientação por template (landscape p/ diários — `data-orientation`) | gate "1 grupo × 2 vias = 2 folhas"; prova F2' landscape |
| 18 institucionais (atestado, encaminhamentos, exames, receita especial, fórmula, fraldas, insumos, MRPA, puérpera, gestante, RN, PA residencial, insulina, plano visual, glicêmico…) | via-1 com `input/textarea/select` (`data-campo`), escrita direta na folha | via-2 `inert` espelhada ao vivo (`data-espelho`, ☒/☐ e datas formatadas) | portal: controles substituídos pelo espelho formatado — papel 100% texto; **3 validadores fail-closed ANTES** (obrigatórios + espelho + geometria) | prova F2' 18/18 (via1=10 campos, via2 inert=10 espelhos no atestado; negativa: obrigatório vazio BLOQUEIA com alerta; positiva: portal 1 sheet/0 controles/landscape) |
| Receita do hub (simples + controle especial, 121 doenças/360 esquemas) | 1ª via `contenteditable` na folha | 2ª via espelhada por `syncAll` (`data-sync`) | portal fail-closed (`printAuthorized`; Cmd+P sem autorização = aviso) | gate A1-A7 + espelhos + "só o portal imprime" |
| Orientações ao paciente (por esquema) | corpo `contenteditable="plaintext-only"` + nome editável (`renderOrientation`, index-f2.html:567) | 1 via por desenho (documento de orientação) | portal, portrait | gate de orientação + emulação print |

**Decisão de gate:** NÃO foi criado um check 45× adicional — cada classe já é provada nos dois lados pelos
checks existentes (178), e check redundante é custo sem nova informação (gate se estende quando há
comportamento NOVO a vigiar, nunca por cerimônia). A porta de entrada única (view Documentos) garante que
documento novo cai numa das 5 classes acima — coberto por construção.

**Fora do escopo desta auditoria:** pacientes/atendimento (não são documentos imprimíveis; F4' em porte).
