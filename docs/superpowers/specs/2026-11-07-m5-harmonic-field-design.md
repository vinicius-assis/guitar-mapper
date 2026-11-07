# M5 Campo harmônico — Design

Data: 2026-11-07. Sexto marco do plano de 12 meses; depende do M0 (registro de exercícios), do M1 (revisão espaçada por item), do M2 (camada de grafia), reaproveita peças do M3 (botões com atalho declarado, `.answer-grid`, `useAutoAdvance`) e do M4 (`SCALES.major`/`SCALES.minor` e `spellScale`). O dono do produto delegou as decisões de design deste marco; as escolhas abaixo que não vieram da definição do marco são minhas e estão marcadas como tal.

## Origem e motivo

O aluno já sabe onde ficam as notas, os intervalos e as escalas. O passo seguinte, e o mais usado para tocar com outras pessoas, é o **campo harmônico**: saber de cor quais acordes nascem de cada grau de uma tonalidade. É o que permite ler uma cifra e entender "isso é um II–V–I", transpor uma música, tirar acordes de ouvido e conversar com a banda ("vai pro IV"). A habilidade tem três faces: do grau para o acorde ("qual é o IV de Ré?" → Sol), do acorde para o grau ("que grau é Sol em Ré?" → IV) e a qualidade de cada grau (o VI da escala maior é menor).

A definição do marco exige nomes certos: o IV de Fá é **Si♭**, nunca Lá#. A camada de grafia (M2) e `spellScale` (M4) já resolvem isso, uma letra por grau. Este marco cria o domínio de harmonia sobre essa base e três exercícios de botões numa trilha nova. Acordes no braço ficam para o M6.

## Objetivos

1. **Domínio de harmonia** (`src/domain/harmony.ts`): campo harmônico da escala **maior** e da **menor natural** nas 12 tonalidades, em tríades e em tétrades (acordes de sétima), com grau em algarismo romano, qualidade de cada acorde, notas do acorde com a grafia da tonalidade e a armadura (quantos acidentes) de cada tonalidade.
2. **Acorde do grau:** "Qual é o IV de Fá maior?" → o aluno escolhe a fundamental entre 12 notas (Si♭).
3. **Grau do acorde:** "Que grau é G em Ré maior?" → o aluno escolhe o grau entre 7 (IV).
4. **Qualidade do acorde:** "Como é o acorde do VI de Dó maior?" → maior, menor ou diminuto (ou, com tétrades, 7M, 7, m7, m7(♭5)).
5. **Tonalidades em sequência:** um ajuste "Tonalidades" limita as perguntas às tonalidades vizinhas de Dó/Lá menor no ciclo de quintas (até 1 acidente, até 3, todas).
6. **Os três entram na revisão espaçada do M1** (progresso por item do instrumento ativo, sessão de até 20) e funcionam igual no violão e no baixo.

## Não objetivos

- Acordes no braço (desenhos, formas, pestanas): M6, só violão.
- Menor harmônica e menor melódica, campo dos modos, empréstimo modal, dominantes secundárias, acordes com tensões (9, 11, 13), inversões, aumentados.
- Cadências, progressões, funções (tônica/subdominante/dominante), ouvir acordes (reconhecer a qualidade de ouvido).
- Escolher a tonalidade a mão (sorteada dentro do ajuste Tonalidades) ou treinar uma tonalidade só.
- Mapa de domínio desses itens no Progresso e nível no histórico (como no M1/M3/M4, só guardam para a revisão; o histórico mostra o nome do exercício).
- Mudar os exercícios atuais, seus testes, suas chaves, o ajuste Acidentais, `spellNote`, `spellInterval` ou `spellScale`.

## Anti-objetivos (falha, mesmo que "funcione")

- Qualquer acorde errado (fundamental, qualidade ou nota) em qualquer campo × tonalidade × tríade/tétrade.
- O IV de Fá aparecer como A# (em qualquer ajuste de Acidentais), ou um nome com dois sinais (dobrado sustenido/bemol), ou duas notas do campo com a mesma letra.
- A grafia decidir acerto: acerto é por classe de altura (Acorde do grau), por número do grau (Grau do acorde) e pela qualidade (Qualidade do acorde), nunca por nome.
- Revelar a resposta antes do clique (o enunciado do Qualidade do acorde não pode trazer o sufixo `m`/`°` nem o algarismo com qualidade).
- Botões de resposta com rolagem horizontal ou texto cortado num celular de 360 px.
- Um dado salvo antes do M5 (sem os campos novos) ou um arquivo exportado antes dele deixar de carregar, ou ser regravado ao carregar; chaves `hchord:`/`hdeg:`/`hqual:` válidas serem descartadas ao carregar.
- Mexer no comportamento ou nos testes dos nove exercícios atuais (só mudam asserções de lista exata de modos/trilhas/abas). Exceção única: a correção do atalho de teclado da seção 8, que não muda nenhum comportamento observável dos exercícios atuais.

## Comportamento

### 1. Trilha nova "Harmonia" com três modos

- Modos `harmony-chord` (**Acorde do grau**), `harmony-degree` (**Grau do acorde**) e `harmony-quality` (**Qualidade do acorde**), registrados como os outros: `QuizMode`, `EXERCISE_META`, `QUIZ_MODES`, `TRACKS` (`domain/exercises.ts`) e `EXERCISES` (`ui/exercises.tsx`).
- `TrackId` ganha `'harmonia'`; `TRACKS` passa a ser Braço, Ouvido, Teoria, Escalas, **Harmonia** (`['harmony-chord', 'harmony-degree', 'harmony-quality']`). `QUIZ_MODES` termina com `'scale-degree', 'scale-play', 'harmony-chord', 'harmony-degree', 'harmony-quality'`. No computador as abas mostram os 12 exercícios; no celular o menu agrupa por trilha.
- Descrições (tela de início):
  - Acorde do grau: "O app diz uma tonalidade e um grau, como o IV de Ré maior. Escolha a nota do acorde desse grau entre as 12. Treina montar o campo harmônico de cabeça."
  - Grau do acorde: "O app mostra um acorde e uma tonalidade, como G em Ré maior. Diga qual grau ele é. Treina reconhecer a função dos acordes numa música."
  - Qualidade do acorde: "O app diz um grau de uma tonalidade. Diga se o acorde dele é maior, menor ou diminuto (ou o tipo de tétrade). Treina a regra do campo harmônico."
- `recordsPositionProgress: false` (gravam no mapa por item do instrumento ativo), `usesFocus: false` (sem cartão de Foco), sem bloqueio de início (não precisam de som), uma posição vinda do Progresso não inicia estes modos, sem nível no histórico (`LEVELED_MODES` não muda).

### 2. Campos harmônicos

Os campos saem das escalas do M4: maior = `SCALES.major` (0 2 4 5 7 9 11), menor natural = `SCALES.minor` (0 2 3 5 7 8 10). O acorde do grau *g* (1–7) empilha terças da própria escala: graus *g*, *g*+2, *g*+4 (tríade) e *g*+6 (tétrade). A qualidade sai dos semitons acima da fundamental: (4, 7) maior, (3, 7) menor, (3, 6) diminuto; com a sétima, maior + 11 = 7M, maior + 10 = 7 (dominante), menor + 10 = m7, diminuto + 10 = m7(♭5) (meio-diminuto).

| campo | grau (algarismo puro) | tríade | tétrade |
|---|---|---|---|
| maior | I II III IV V VI VII | I IIm IIIm IV V VIm VII° | I7M IIm7 IIIm7 IV7M V7 VIm7 VIIm7(♭5) |
| menor natural | I II ♭III IV V ♭VI ♭VII | Im II° ♭III IVm Vm ♭VI ♭VII | Im7 IIm7(♭5) ♭III7M IVm7 Vm7 ♭VI7M ♭VII7 |

- **Algarismo romano** no estilo da cifra brasileira: sempre maiúsculo, com o sufixo do acorde (`IIm`, `VII°`, `V7`); o ♭ do campo menor marca a distância da fundamental até a tônica (como os graus `♭3`, `♭6`, `♭7` do M4). O **algarismo puro** (sem sufixo) é o que aparece nos enunciados e nos botões, para não revelar a qualidade.
- **Símbolo do acorde** (cifra): fundamental + sufixo `''` (maior), `m`, `°`, `7M`, `7`, `m7`, `m7(b5)`. Os nomes de nota seguem o M2 (`Bb`, `F#`; em solfejo `Sib`, `Fá#`), então o sufixo do meio-diminuto usa `b` ASCII como as notas: `Bm7(b5)`. Em solfejo: `Sib7M`, `Mim7`, `Fá#°`.

### 3. Grafia (só exibição)

- As notas do campo (fundamentais e notas dos acordes) são `spellScale(tônica, SCALES.major | SCALES.minor, acidentais)`, sem mudar `spellScale`. A nota do acorde do grau *g* na posição *k* é a grafia do grau (*g* − 1 + 2*k*) mod 7 da escala. Uma letra por grau, nunca dobrado.
- **Automático** = a grafia própria da tonalidade (menos acidentes; empate pela tabela do M2): Fá maior tem Si♭; Ré maior tem Fá# e Dó#; Fá# maior tem Mi# (`E#°`); Mi♭ menor tem Dó♭ (`Cb`). **Sustenidos/Bemóis** só escolhem entre os dois nomes de uma tônica preta (Dó# maior × Ré♭ maior), descartando o que exigiria dobrado (em Sustenidos, a tônica 3 maior é Mi♭, porque Ré# maior teria Fá dobrado sustenido). Tônica natural é sempre a mesma em qualquer ajuste, então **o IV de Fá é Bb também em Sustenidos**.
- **Nome da tonalidade:** grafia da tônica + " maior" / " menor" ("F maior", "Fá maior", "F# menor"). Em **Ambos** os nomes nas frases ficam "cifra (solfejo)": "Bb (Sib)", "F maior (Fá maior)", "Em7 (Mim7)"; os botões de nota mantêm o formato "Bb · Sib" do resto do app.
- **Armadura:** número de notas com sinal na escala da tonalidade na grafia Automático. Maior: C 0, Db 5, D 2, Eb 3, E 4, F 1, F# 6, G 1, Ab 4, A 3, Bb 2, B 5. Menor: Cm 3, C#m 4, Dm 1, Ebm 6, Em 1, Fm 4, F#m 3, Gm 2, G#m 5, Am 0, Bbm 5, Bm 2.
- As tabelas completas (2 campos × 12 tônicas × tríade/tétrade no Automático; tônicas pretas em Sustenidos e Bemóis) ficam como teste com valores literais, gerados por script independente do código.

### 4. Ajustes e tela de início

Três ajustes globais novos (valem para os dois instrumentos e para os três exercícios), escolhidos na tela de início (componente `Options` compartilhado), cada um um grupo de botões `aria-pressed` como os do M3/M4:

- `harmonyField`: **Campo** — "Maior" (`'major'`, padrão), "Menor" (`'minor'`), "Os dois" (`'both'`).
- `harmonySevenths`: **Acordes** — "Tríades" (`false`, padrão), "Tétrades" (`true`).
- `harmonyKeys`: **Tonalidades** — "Fáceis" (`'easy'`, padrão: armadura ≤ 1 → C, F, G; Am, Dm, Em), "Médias" (`'medium'`: ≤ 3 → acrescenta D, A, Bb, Eb; Bm, F#m, Gm, Cm), "Todas" (`'all'`: as 12). Abaixo, uma linha com o texto do nível:
  - easy: "Tonalidades com até 1 acidente: C, F e G maior; Am, Dm e Em."
  - medium: "Até 3 acidentes: acrescenta D, A, Bb e Eb maior; Bm, F#m, Gm e Cm."
  - all: "As 12 tonalidades."
- A tela de início mostra a descrição, as opções, "Sessão de N perguntas" e Iniciar (sem cartão de Foco, como no M3/M4).

### 5. Acorde do grau (`harmony-chord`)

- **Item:** `{ campo, tônica, grau }` com grau 2–7 (o I é a própria tônica, que já está no enunciado). Chave `hchord:<major|minor>:<tônica 0–11>:<grau 2–7>`. Pool: campos do ajuste × tonalidades do nível × graus 2–7 (padrão 18; "Os dois" + "Todas" = 144). Tríade e tétrade usam o mesmo item (a resposta, a fundamental, é a mesma).
- **Pergunta:** `Qual é o <algarismo puro> de <tonalidade>?` — "Qual é o IV de F maior?", "Qual é o ♭VI de A menor?".
- **Respostas:** 12 botões de nota (`.note-grid`, ordem C…B por classe de altura, como em Intervalos). Rótulo: as 7 classes da escala da tonalidade com a grafia dela (no campo de Fá: `Bb`; no de Fá# maior: `E#` no lugar de `F`); as outras 5 pela tabela do ajuste Acidentais (`noteLabel`). Teclado: A–G e Shift = ♯, como em Intervalos (sem `data-shortcut`); dica "Teclado: A–G · Shift = ♯".
- **Acerto:** classe de altura escolhida = fundamental do acorde do grau.
- **Depois de responder:** o botão certo fica `option--correct`, o escolhido errado `option--wrong`; status "Correto! O IV de F maior é Bb." ou "Errado. O IV de F maior é Bb."; linha de detalhe com o acorde e as notas: "Bb: Bb D F" (tétrade: "Bb7M: Bb D F A"). Toca o acorde arpejado (seção 7). Acertou: avança sozinho; errou: botão Próxima.

### 6. Grau do acorde (`harmony-degree`)

- **Item:** igual ao do Acorde do grau, chave `hdeg:<major|minor>:<tônica>:<grau 2–7>`; mesmo pool.
- **Pergunta:** `Que grau é <acorde> em <tonalidade>?` — "Que grau é G em D maior?", com tétrades "Que grau é G7M em D maior?". O acorde traz o sufixo de qualidade (é assim que ele aparece numa cifra).
- **Respostas:** 7 botões com o algarismo puro do campo (maior: I…VII; menor: I II ♭III IV V ♭VI ♭VII), incluindo o I, em `.answer-grid`; rótulo acessível "Grau IV"; atalho declarado (`data-shortcut`) 1–7 por posição; dica "Teclado: 1–7".
- **Acerto:** grau escolhido = grau do item.
- **Depois de responder:** status "Correto! G é o IV de D maior." ou "Errado. G é o IV de D maior." (com o algarismo completo: "Em7 é o IIm7 de D maior"); detalhe com as notas; toca o acorde; avança sozinho no acerto, Próxima no erro.

### 7. Qualidade do acorde (`harmony-quality`)

- **Item:** `{ campo, tétrade, grau }` com grau 1–7 (a qualidade não depende da tônica). Chave `hqual:<major|minor>:<triad|seventh>:<grau 1–7>`. Pool: campos do ajuste × 7 graus, no tamanho de acorde do ajuste (7 ou 14).
- **Pergunta:** na montagem da fila, cada item recebe uma tônica sorteada (`rng`) entre as tonalidades do nível daquele campo. Enunciado: `Como é o acorde do <algarismo puro> de <tonalidade>?` — "Como é o acorde do VI de C maior?". Nada no enunciado revela a qualidade.
- **Respostas:** tríades: "Maior", "Menor", "Diminuto"; tétrades: "7M" / "7" / "m7" / "m7(♭5)", cada um com o nome por baixo em letra menor ("maior com 7ª maior", "dominante", "menor com 7ª", "meio-diminuto"). Grade de 2 colunas (`.answer-grid--words`). Atalho declarado 1–3 ou 1–4; dica "Teclado: 1–3" / "1–4". Os botões mostram todas as qualidades possíveis do conjunto, mesmo as que o campo não tem num dado grau (é a pergunta).
- **Acerto:** qualidade escolhida = qualidade do grau.
- **Depois de responder:** status "Correto! O VI de C maior é Am (menor)." ou "Errado. O VI de C maior é Am (menor)."; detalhe com as notas; toca o acorde; avança/Próxima como os outros.

### 8. Som e teclado

- **Som** (só se o Som estiver ligado; não bloqueia o início): depois de responder, toca o acorde arpejado (`playPitches`, 250 ms entre notas), da fundamental para cima, com a fundamental na menor altura da faixa de ouvido do instrumento (`EAR_RANGE`: violão 45–76, baixo 33–60) com aquela classe. O som é cancelado ao sair da pergunta. `prepareSound` carrega as 4 notas (tétrade) de cada pergunta, para servir aos dois tamanhos.
- **Teclado:** Enter = Próxima (já existe). Correção no `useQuizShortcuts`: a busca do botão com `data-shortcut` usa `querySelector('[data-shortcut="${tecla}"]')`, que lança erro com teclas como `"` ou `\` (achado da revisão do M3). Passa a comparar `dataset.shortcut` em `querySelectorAll('[data-shortcut]')`, sem montar seletor; com teste.

### 9. Leiaute celular

- 12 notas: `.note-grid` existente (4 colunas no celular → 3 linhas; 6 a partir de 768 px).
- 7 graus: `.answer-grid` existente (4 colunas → 2 linhas; 7 a partir de 768 px).
- Qualidades: `.answer-grid--words`, 2 colunas `minmax(0, 1fr)` em qualquer largura (4 a partir de 768 px nas tétrades), botão com quebra de linha permitida e o nome pequeno numa segunda linha.
- Nada pode passar de 360 px de largura (conferido à mão no fim; jsdom não mede).

### 10. Dados

- Aditivo em `guitar-mapper:v2`, sem trocar a versão e sem migração:
  - `sanitizeSettings`: `harmonyField` (`'major' | 'minor' | 'both'`, senão `'major'`), `harmonySevenths` (booleano, senão `false`), `harmonyKeys` (`'easy' | 'medium' | 'all'`, senão `'easy'`); `mode` aceita os modos novos (via `QUIZ_MODES`).
  - Mapa por item: aceita `hchord:<major|minor>:<0–11>:<2–7>`, `hdeg:<major|minor>:<0–11>:<2–7>` e `hqual:<major|minor>:<triad|seventh>:<1–7>`, sem zeros à esquerda; o resto é descartado, como hoje. Chaves de tonalidades fora do nível atual continuam válidas.
  - Histórico: aceita os modos novos, sem `level`.
- A importação (M0) passa pelos mesmos sanitizadores.

## Restrições

- Texto da interface em português. Nenhuma biblioteca nova. Celular primeiro (botões cabem em 360 px).
- Os nove exercícios atuais não mudam (código de comportamento, testes e dados); só mudam as asserções de lista exata de modos/trilhas/abas, mais a correção do atalho da seção 8.
- Acerto por classe de altura, número do grau ou qualidade; a grafia é só exibição.
- Sorteios com o `rng` injetado (`ExerciseContext`), para testes determinísticos.
- Tabelas de teste literais, geradas por script independente, nunca recalculadas pelo próprio código testado.
- Sem reformatar arquivos existentes (cada arquivo mantém aspas, quebras e vírgulas do jeito que está; `spelling.ts` usa aspas duplas, o resto simples).

## Decisões minhas (a conferir)

- Trilha nova **Harmonia** (não dentro de Teoria), pensando em M6+ (acordes, cadências); ids `harmony-chord`/`harmony-degree`/`harmony-quality`, nomes "Acorde do grau", "Grau do acorde", "Qualidade do acorde".
- **Três exercícios** separados (um por face da habilidade) em vez de um exercício com perguntas misturadas, para que o progresso por item e a sessão de cada um façam sentido sozinhos.
- Algarismos no **estilo brasileiro** (maiúsculos + sufixo: `IIm7`, `VII°`, `♭VII`), não no estilo de maiúscula/minúscula (`ii`, `vii°`); o campo menor com ♭ nos graus 3, 6 e 7. Botões e enunciados mostram o algarismo puro; o completo aparece no retorno.
- **Menor natural** como o campo menor (não harmônica); dominante V7 da menor harmônica fica fora.
- Tétrades entram como ajuste "Acordes" (custo baixo: a regra de empilhar terças é a mesma). Elas mudam o acorde exibido, as notas e o som; no Acorde do grau e no Grau do acorde o item é o mesmo da tríade (a fundamental e o grau não mudam); na Qualidade do acorde são itens separados (as respostas são outras).
- O grau **I fica fora** do Acorde do grau e do Grau do acorde (resposta óbvia), mas o botão I existe no Grau do acorde para os atalhos baterem com o número do grau (como o 1 no M4).
- "Tonalidades em sequência" virou o ajuste **Tonalidades** por armadura (≤ 1, ≤ 3, todas), os vizinhos de Dó/Lá menor no ciclo de quintas; sem desbloqueio automático.
- Botões de nota do Acorde do grau com a **grafia da tonalidade** nas 7 notas do campo (o aluno escolhe "Bb", não "A#") e a tabela do ajuste nas outras 5. Aceito que, quando os dois estilos se misturam, isso dá uma pista das notas do campo: é o nome que o aluno precisa aprender.
- Em Sustenidos/Bemóis a tônica preta segue o ajuste (Dó# maior × Ré♭ maior), descartando a que exigiria dobrado; tônica natural igual em todos os ajustes.
- Símbolos: `°` para a tríade diminuta, `7M` para a sétima maior, `m7(b5)` no acorde e `m7(♭5)` no algarismo/botão. Em Ambos, frases com "cifra (solfejo)".
- Qualidade do acorde com tônica sorteada a cada pergunta (só contexto; o item não guarda a tônica).
- Som do acorde arpejado depois de responder, sem bloquear o início sem som.
- Corrigir o atalho `data-shortcut` que lança erro com `"`/`\`, já que o marco acrescenta duas telas que o usam.
- Ajustes globais compartilhados pelos três exercícios, padrão campo maior, tríades, tonalidades fáceis.

## Fica a cargo de quem for construir

- Nomes de tipos e funções internas, desde que as chaves, as regras de grafia e qualidade e as tabelas de teste sejam as acima.
- Um componente de tela por exercício ou um componente com variantes.
- O visual exato de `.answer-grid--words` e da linha de detalhe, seguindo `.answer-grid`, `.option` e `.ear-detail`.
- Onde ficam os textos (`modeLabels.ts` ou um módulo de rótulos de harmonia).
- Distribuição do sorteio da tônica no Qualidade do acorde (qualquer uma sobre as tonalidades do nível com o `rng` injetado).
