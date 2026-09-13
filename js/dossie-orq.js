/* F-H · Dossiê Orquestrador — os esqueminhas de preferência dela.
   Conteúdo clínico ditado pelo Bauer em 28/08/2026 (transcrição fiel; confirmações
   do mesmo dia incorporadas). O dossiê APONTA disponibilidade e preferência — nunca
   decide conduta. Selos: unidade:'sim' (na lista) | 'sim-fora-da-lista' (confirmado
   pelo Bauer apesar de ausente na lista) | 'nao' (rede/compra).
   O dossiê é utilidade de vida médica — nunca pendência ou cobrança na tela dela. */
window.DOSSIE_Orquestrador = {
  titulo: 'Dossiê da Orquestrador — preferências e o que a unidade tem',
  fonteFarmacia: 'js/farmacia.js (lista real da farmácia, 28/08/2026)',
  avisoGeral: 'Auxiliar de consulta. Quem decide a conduta é a médica.',
  esqueminhas: [
    {tema:'Dor', itens:[
      {t:'Dor fraca', d:'Dipirona (preferência) ou paracetamol.', unidade:'sim'},
      {t:'Dor média a intensa', d:'Cetorolaco para poupar opioide.', unidade:'nao'},
      {t:'Dor forte', d:'Paracetamol + codeína 500/30.', unidade:'sim'},
      {t:'Dor inflamatória / muscular', d:'Beta-Long (betametasona 3+3 inj) — a preferida dela. Dexametasona injetável (preferência do Bauer) também disponível.', unidade:'sim'}
    ]},
    {tema:'Insônia', itens:[
      {t:'Seakalm (passiflora)', d:'Ela gosta muito; paciente compra.', unidade:'nao'},
      {t:'Clonazepam 0,5 mg ao deitar', d:'Na unidade: cp de 2 mg e gotas 2,5 mg/ml → 0,5 mg = 5 gotas.', unidade:'sim'},
      {t:'Diazepam', d:'Disponível na unidade.', unidade:'sim'}
    ]},
    {tema:'Respiratório', itens:[
      {t:'Alenia (budesonida+formoterol)', d:'Quando o paciente consegue manter; muitos cortam pelo preço.', unidade:'nao'},
      {t:'Salbutamol', d:'O que se usa do SUS — tem na unidade.', unidade:'sim-fora-da-lista'},
      {t:'Beclometasona 50 e 200 mcg', d:'Disponíveis na unidade.', unidade:'sim'}
    ]},
    {tema:'Depressão / ansiedade', itens:[
      {t:'Homens: escitalopram', d:'Barato; modula impulsos de raiva; poupa a libido.', unidade:'nao'},
      {t:'Depressão + ansiedade: desvenlafaxina', d:'Ela gosta bastante.', unidade:'nao'},
      {t:'Sertralina 50', d:'Resposta melhor em doses um pouco mais altas.', unidade:'sim'},
      {t:'Venlafaxina', d:'Boa opção.', unidade:'nao'},
      {t:'Paroxetina', d:'Pela rede SUS; na unidade há citalopram 20 e fluoxetina 20.', unidade:'nao'}
    ]},
    {tema:'Vitaminas', itens:[
      {t:'Vitamina D', d:'Ela prescreve também na faixa limítrofe.', unidade:'nao'},
      {t:'Vitamina B12', d:'Prescreve quando <250, mesmo acima do limite inferior da normalidade.', unidade:'nao'}
    ]},
    {tema:'Compulsão / alcoolismo', itens:[
      {t:'Se pode pagar', d:'Topiramato; naltrexona 50 mg é 1ª linha para o álcool.', unidade:'nao'},
      {t:'Na unidade', d:'Diazepam como 3ª escolha — freia o impulso, acalma e ajuda a dormir.', unidade:'sim'}
    ]},
    {tema:'Hipertensão — a escada dela', itens:[
      {t:'1º', d:'Losartana.', unidade:'sim'},
      {t:'2º', d:'Anlodipino 1×/dia; depois sobe para 1-0-1.', unidade:'sim'},
      {t:'3º', d:'Hidroclorotiazida em dose baixa — máx. 25 mg NAS RECEITAS DELA (regra dela; a HCTZ pode espoliar potássio).', unidade:'sim'},
      {t:'4º', d:'Espironolactona 25 mg (poupadora de potássio).', unidade:'sim'}
    ]},
    {tema:'Dislipidemia', itens:[
      {t:'1ª opção', d:'Sinvastatina (10/20/40).', unidade:'sim'},
      {t:'Droga mais forte', d:'Rosuvastatina.', unidade:'nao'},
      {t:'Triglicerídeos > 500', d:'Ciprofibrato.', unidade:'nao'}
    ]},
    {tema:'AINEs', itens:[
      {t:'Ibuprofeno (adulto)', d:'600 mg por tomada, 2–3×/dia (8/8 ou 12/12) a critério.', unidade:'sim'}
    ]},
    {tema:'Diabetes', itens:[
      {t:'1ª droga dela', d:'Metformina, até 3×/dia (850 mg na unidade). Nota do Bauer: as diretrizes internacionais atuais já permitem abrir com drogas melhores (as "canetinhas" GLP-1 e os inibidores de SGLT2); ', unidade:'sim'},
      {t:'2ª', d:'Gliclazida — ou, se o paciente pode pagar, dapagliflozina.', unidade:'nao'},
      {t:'3ª (não é fixa)', d:'Escolha por perfil e custo. Candidata barata registrada: pioglitazona (glitazona, genérica). iSGLT2 / canetinha quando o bolso permite.', unidade:'nao'},
      {t:'Obeso: canetinha é o foco', d:'Semaglutida — "Ozivy", caneta de 1 mg, 3 canetas ≈ R$ 900. Se paciente obeso tentando perder peso, ela usa. Orientar: NÃO usar a "TG do Paraguai" sem procedência.', unidade:'nao'},
      {t:'Titulação da semaglutida (esquema dela)', d:'4 semanas com 0,25 mg → 4 semanas com 0,5 mg → RETORNO para avaliação médica → só então subir (ou não) para 1 mg.', unidade:'nao'},
      {t:'Insulinas NPH / Regular', d:'Frasco e tubete para caneta.', unidade:'sim'}
    ]},
    {tema:'Corticoide oral', itens:[
      {t:'Prednisona 20 mg cp', d:'O comprimido de 20 mg da lista é prednisona; prednisolona existe como solução 3 mg/ml.', unidade:'sim'}
    ]},
    {tema:'Náusea', itens:[
      {t:'Ondansetrona — o melhor dela para vômitos', d:'Na unidade: 4 mg orodispersível E 8 mg cp. Adulto pode dobrar a de 4 (2 cp sublinguais) se o enjoo for intenso.', unidade:'sim'}
    ]},
    {tema:'Alergia / dermatites', itens:[
      {t:'Loratadina 10 mg', d:'Muito usada em dermatites alérgicas (ex.: contato).', unidade:'sim'},
      {t:'Prometazina', d:'Também disponível (cp e injetável).', unidade:'sim'}
    ]},
    {tema:'Cefaleia', itens:[
      {t:'Profilaxia', d:'Amitriptilina; duloxetina se o paciente puder comprar.', unidade:'sim'},
      {t:'Não medicamentoso', d:'Orientações de manejo + cuidado com cefaleia por abuso de analgésicos.', unidade:'sim'},
      {t:'Crise', d:'Dipirona; sumatriptano nas migrâneas (compra); cetorolaco (compra) como poupador de opioide nas dores médias-intensas.', unidade:'sim'},
      {t:'Paracetamol + codeína', d:'A dra gosta; tem na unidade; o paciente pode precisar (ex.: salvas).', unidade:'sim'},
      {t:'Tensional', d:'Avaliação oftalmológica.', unidade:'sim'},
      {t:'Trigêmino-autonômicas', d:'Tendência: encaminhar.', unidade:'sim'}
    ]},
    {tema:'Infecções de garganta', itens:[
      {t:'Esquema', d:'Amoxicilina+clavulanato OU azitromicina + anti-inflamatório + controle álgico pela escala de dor.', unidade:'sim'}
    ]},
    {tema:'Transtorno bipolar', itens:[
      {t:'Na unidade', d:'Carbonato de lítio e ácido valproico.', unidade:'sim'}
    ]},
    {tema:'ITU (mulheres)', itens:[
      {t:'Escolha dela', d:'Nitrofurantoína.', unidade:'nao'},
      {t:'Má adesão', d:'Fosfomicina (Monuril) dose única.', unidade:'nao'}
    ]},
    {tema:'Candidíase', itens:[
      {t:'Tópico', d:'Creme vaginal 1×/noite por 7 dias (na lista: miconazol 2%). Obs. do Bauer: acha que ela usa metronidazol — o gel vaginal da lista é classicamente para vaginose; as duas opções valem.', unidade:'sim'},
      {t:'Oral', d:'Fluconazol 150 mg dose única.', unidade:'sim'},
      {t:'Combinada', d:'Creme + oral — opção registrada (agradou o Bauer).', unidade:'sim'}
    ]},
    {tema:'Tremor', itens:[
      {t:'Propranolol', d:'Antes, afastar abstinência.', unidade:'sim'}
    ]},
    {tema:'Pele', itens:[
      {t:'Suspeita fúngica', d:'Miconazol creme (ela usa muito) + creme de hidrocortisona + anti-inflamatório oral (registro do Bauer: "acho") + controle álgico sempre.', unidade:'sim'},
      {t:'Suspeita de hanseníase', d:'Teste rápido na unidade; positivo → encaminhar ao dermatologista.', unidade:'sim'},
      {t:'Suspeita bacteriana (pus, placas, odor fétido)', d:'Cobertura para Staphylococcus sempre. Na unidade: cefalexina, amoxicilina+clavulanato, sulfametoxazol+trimetoprima.', unidade:'sim'},
      {t:'Miíase', d:'Ela usa ivermectina. Alternativa em estudo: nitazoxanida (Anita).', unidade:'nao', obs:'Ivermectina e nitazoxanida não constam na lista da farmácia.'}
    ]}
  ]
};
