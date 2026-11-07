# M4 Escalas — Design

Data: 2026-11-07. Quinto marco do plano de 12 meses; depende do M0 (registro de exercícios), do M1 (revisão espaçada por item), do M2 (camada de grafia) e reaproveita peças do M3 (botões com atalho declarado, `.answer-grid`, `useAutoAdvance`). O dono do produto delegou as decisões de design deste marco; as escolhas abaixo que não vieram da definição do marco são minhas e estão marcadas como tal.

## Origem e motivo

O app ensina onde fica cada nota (trilha Braço), como soa (Ouvido) e a distância entre duas notas (Intervalos). Falta o passo que todo aluno de violão e baixo dá em seguida: **escalas e os desenhos delas no braço**. É assim que se improvisa, se tira música de ouvido e se entende campo harmônico (M5). O aluno precisa de duas habilidades: saber tocar o desenho de cor e saber a **função** de cada nota dentro dele (onde está a tônica, a terça, a blue note).

O app já tem o braço com marcas, o progresso por item (`itemKey`, `selectForReview`, `recordItemAnswer`) e a grafia correta de intervalos (`spellInterval`). Este marco acrescenta o domínio de escalas (notas, graus, grafia e desenhos para violão e baixo) e dois exercícios numa trilha nova.

## Objetivos

1. **Domínio de escalas** (`src/domain/scales.ts`): pentatônica menor e maior, blues, maior (jônio), menor natural (eólio) e os outros cinco modos (dórico, frígio, lídio, mixolídio, lócrio), com graus, classes de altura e **desenhos** no braço do violão e do baixo: 5 desenhos nas pentatônicas e no blues, 7 posições (3 notas por corda) nas escalas de 7 notas.
2. **Grafia de escala** (`spellScale` em `src/domain/spelling.ts`): uma letra por grau (Lá♭ maior = Ab Bb C Db Eb F G; Fá# maior tem Mi#), respeitando a preferência do ajuste Acidentais quando ela é possível.
3. **Grau no desenho:** o braço mostra um desenho com as tônicas marcadas e destaca uma nota; o aluno diz qual grau ela é.
4. **Toque a escala:** o app pede escala, tônica e desenho; o aluno toca no braço todas as notas do desenho.
5. **Os dois entram na revisão espaçada do M1** (progresso por item do instrumento ativo, sessão de até 20) e funcionam igual no violão e no baixo.

## Não objetivos

- Tocar a escala em som (sequência ascendente), ouvir a escala ou qualquer exercício de ouvido com escalas.
- Modo de consulta (só ver o desenho, sem pergunta), mapa do braço inteiro com a escala, ligar desenhos vizinhos.
- Escolher a tônica (a tônica é sorteada a cada pergunta) ou a oitava do desenho.
- Desenhos CAGED de 5 posições para as escalas de 7 notas, desenhos de 4 casas "um dedo por casa" no baixo, digitação (qual dedo), corda solta nos desenhos.
- Menor harmônica, menor melódica, blues maior, escalas exóticas, arpejos, acordes e campo harmônico (M5).
- Histórico com escala ou desenho (o histórico mostra só o nome do exercício, sem nível).
- Mapa de domínio desses itens no Progresso (como no M1/M3, só guardam para a revisão).
- Mudar os exercícios atuais, seus testes, suas chaves ou o ajuste Acidentais.

## Anti-objetivos (falha, mesmo que "funcione")

- Uma nota errada num desenho, um desenho que não bate com o padrão conhecido (Lá menor pentatônica, desenho 1 = casas 5–8 no violão) ou uma casa fora de 1–24, em qualquer escala × desenho × tônica × instrumento.
- A grafia decidir acerto: acerto é por grau (posição → classe de altura → grau) e por altura tocada, nunca por nome.
- Um nome de escala com dois sinais (dobrado sustenido ou dobrado bemol) ou com letra repetida/pulada fora da regra do blues.
- Um toque numa nota da escala dentro da janela contar como erro em "Toque a escala".
- Revelar a resposta antes do clique (grau ou nome no DOM, rótulo nas marcas).
- Um dado salvo antes do M4 (sem os campos novos) ou um arquivo exportado antes dele deixar de carregar, ou ser regravado ao carregar; chaves `scaledeg:`/`scaleplay:` válidas serem descartadas ao carregar.
- Mexer no comportamento ou nos testes dos sete exercícios atuais (só mudam asserções de lista exata de modos/trilhas).

## Comportamento

### 1. Trilha nova "Escalas" com dois modos

- Modos `scale-degree` (**Grau no desenho**) e `scale-play` (**Toque a escala**), registrados como os outros: `QuizMode`, `EXERCISE_META`, `QUIZ_MODES`, `TRACKS` (`domain/exercises.ts`) e `EXERCISES` (`ui/exercises.tsx`).
- `TrackId` ganha `'escalas'`; `TRACKS` passa a ser Braço, Ouvido, Teoria, **Escalas** (`['scale-degree', 'scale-play']`). `QUIZ_MODES` termina com `'interval', 'scale-degree', 'scale-play'`. No computador as abas mostram os 9 exercícios (a grade de 5 colunas quebra em duas linhas); no celular o menu agrupa por trilha.
- Descrições (tela de início):
  - Grau no desenho: "O braço mostra um desenho da escala com as tônicas marcadas e destaca uma nota. Diga qual grau ela é. Treina enxergar a função de cada nota no desenho."
  - Toque a escala: "O app pede uma escala e um desenho e marca as tônicas. Toque no braço todas as outras notas do desenho. Um toque fora da escala encerra a pergunta."
- `recordsPositionProgress: false` (gravam no mapa por item do instrumento ativo), `usesFocus: false` (sem cartão de Foco), sem bloqueio de início (não precisam de som), uma posição vinda do Progresso não inicia estes modos, sem nível no histórico.

### 2. Escalas

| id | rótulo (menu) | nome (após a tônica) | semitons | graus | letras (passos) | desenhos |
|---|---|---|---|---|---|---|
| `pent-minor` | Pentatônica menor | pentatônica menor | 0 3 5 7 10 | 1 ♭3 4 5 ♭7 | 0 2 3 4 6 | 5 (2 por corda) |
| `pent-major` | Pentatônica maior | pentatônica maior | 0 2 4 7 9 | 1 2 3 5 6 | 0 1 2 4 5 | 5 (2 por corda) |
| `blues` | Blues | blues | 0 3 5 6 7 10 | 1 ♭3 4 ♭5 5 ♭7 | 0 2 3 4 4 6 | 5 (da pentatônica menor) |
| `major` | Maior (jônio) | maior | 0 2 4 5 7 9 11 | 1 2 3 4 5 6 7 | 0..6 | 7 (3 por corda) |
| `minor` | Menor natural (eólio) | menor natural | 0 2 3 5 7 8 10 | 1 2 ♭3 4 5 ♭6 ♭7 | 0..6 | 7 |
| `dorian` | Dórico | dórico | 0 2 3 5 7 9 10 | 1 2 ♭3 4 5 6 ♭7 | 0..6 | 7 |
| `phrygian` | Frígio | frígio | 0 1 3 5 7 8 10 | 1 ♭2 ♭3 4 5 ♭6 ♭7 | 0..6 | 7 |
| `lydian` | Lídio | lídio | 0 2 4 6 7 9 11 | 1 2 3 ♯4 5 6 7 | 0..6 | 7 |
| `mixolydian` | Mixolídio | mixolídio | 0 2 4 5 7 9 10 | 1 2 3 4 5 6 ♭7 | 0..6 | 7 |
| `locrian` | Lócrio | lócrio | 0 1 3 5 6 8 10 | 1 ♭2 ♭3 4 ♭5 ♭6 ♭7 | 0..6 | 7 |

- O rótulo do grau sai dos semitons comparados à escala maior no mesmo passo de letra (♭ = um a menos, ♯ = um a mais). A blue note é **♭5** (passo de letra da 5ª), nunca ♯4.
- No seletor, as escalas ficam em três grupos: "Pentatônicas e blues", "Maior e menor", "Modos".

### 3. Desenhos no braço

Regra única para violão (6 cordas, E A D G B E) e baixo (4 cordas, E A D G); corda 1 = a mais aguda, como no resto do app.

- **Pentatônicas e escalas de 7 notas:** o desenho *k* começa no grau *k* da escala na **corda mais grave** e segue em altura crescente pelas notas seguintes da escala, **2 notas por corda** (pentatônicas) ou **3 notas por corda** (7 notas), da corda mais grave à mais aguda. A casa de cada nota é a altura menos a corda solta. Assim o desenho 1 sempre começa na tônica; os desenhos 2…*n* começam nos graus seguintes.
- **Blues:** desenho *k* = desenho *k* da pentatônica menor + **toda casa da ♭5 dentro da janela de casas** desse desenho (qualquer corda), sem repetir altura.
- **Colocação:** entre as oitavas possíveis, a mais grave em que **toda casa é ≥ 1** (o app não usa corda solta nas perguntas, `FIRST_QUIZ_FRET`). Mi menor pentatônica, desenho 1, fica em 12–15, não em 0–3.
- **Janela** do desenho: da menor à maior casa dele. Pentatônicas e blues ocupam 4–5 casas; as escalas de 7 notas, 5–7 casas. Toda casa cai entre 1 e 18.
- Cada nota do desenho guarda posição, altura (MIDI) e grau (índice na escala, 0 = tônica). As alturas de um desenho são todas diferentes.
- **Propriedade conferida por teste (todas as escalas × desenhos × tônicas × instrumentos):** toda casa da janela, em qualquer corda, cuja nota é da escala tem a altura de alguma nota do desenho. (Nas escalas de 7 notas a mesma altura pode aparecer em duas cordas dentro da janela; é a mesma nota.)
- **Referências** (violão): Lá menor pentatônica = desenhos 1: 5–8, 2: 7–10, 3: 9–13, 4: 12–15, 5: 2–5 (o desenho 5 "de 14–17" uma oitava abaixo, pela regra de colocação). Lá blues desenho 1 = o desenho 1 da pentatônica mais Mi♭ na corda 5 casa 6 e na corda 3 casa 8. Sol maior posição 1 = casas 3–8. Baixo: Lá menor pentatônica desenho 1 = cordas 4–1, casas 5–8 (as quatro cordas graves do desenho do violão).
- O desenho tem a mesma forma para qualquer tônica (só desloca casas). Por isso o item de "Grau no desenho" não leva a tônica.

### 4. Grafia das escalas (`spellScale`)

- `spellScale(raiz, escala, acidentais)` devolve uma grafia (`Spelling`, letra + sinal −1/0/+1) por grau.
- **Letra por grau:** a letra do grau *i* é a letra da tônica avançada pelo passo de letra da escala (tabela da seção 2); o sinal é a diferença entre a classe de altura e a letra natural.
- **Blues:** a ♭5 usa a letra da 5ª (Lá blues: Mi♭; Dó blues: Sol♭; Fá blues: Dó♭). Só quando isso exigiria dobrado bemol, ela usa a letra da 4ª (Mi♭ blues: Lá, não Si𝄫).
- **Tônica:** tônica natural (C D E F G A B) é sempre escrita natural. Tônica preta tem dois candidatos (sustenido e bemol); descarta-se o candidato que exigiria dobrado em algum grau. Ordem de preferência: **Sustenidos** → sustenido primeiro; **Bemóis** → bemol primeiro; **Automático** → o de menos sinais no total, e no empate o da tabela Automático do M2 (Db, Eb, F#, Ab, Bb). Exemplos no Automático: Db maior (não C#), F# maior (empate com Gb, fica F#), G# menor natural, C# pentatônica menor, Eb blues.
- **Nomes raros** (Cb, Fb, E#, B#) aparecem quando a letra por grau exige (Fá# maior: E#; Fá blues: Cb). A regra do M2 de evitá-los continua valendo para os exercícios do M2.
- As tabelas completas (12 tônicas × 10 escalas no Automático; tônicas pretas em Sustenidos e Bemóis) ficam como teste.
- A grafia é só exibição: nome da escala no enunciado, nome da nota no feedback.

### 5. Ajustes e tela de início

- Dois ajustes globais novos (valem para os dois instrumentos e para os dois exercícios), escolhidos na tela de início (componente `Options` do exercício):
  - `scale`: id da escala, padrão `pent-minor`. Um `<select>` "Escala" com os três grupos.
  - `scaleBox`: `'all'` ou um número de 1 ao número de desenhos da escala, padrão `1`. Grupo de botões "Desenho": "Todos", "1"…"5" (ou "7"), `aria-pressed`.
  - Trocar de escala para uma com menos desenhos que o escolhido volta o desenho para 1.
- A tela de início mostra a descrição, as opções, "Sessão de N perguntas" e Iniciar (sem cartão de Foco, como no M3).

### 6. Grau no desenho (`scale-degree`)

- **Item:** `{ escala, desenho, corda, grau }` com grau ≥ 1 (a tônica não é perguntada, porque já está marcada). Chave `scaledeg:<escala>:<desenho>:<corda>:<grau>`. O pool são as notas não-tônica dos desenhos escolhidos (desenho do ajuste ou todos), no instrumento ativo. Tamanhos com "Todos": violão 48 (pentatônicas), 56 (blues), 108 (7 notas); baixo 32, 37, 72.
- **Pergunta:** na montagem da fila, cada item recebe uma tônica sorteada (`rng`). O braço mostra só a janela do desenho, com `fit`: tônicas como marca `root`, as outras notas como `scale`, a nota perguntada como `target`; nenhuma marca tem rótulo antes de responder.
- Enunciado: "Qual grau é a nota destacada?" e, abaixo, o nome: "A pentatônica menor · desenho 1" (tônica pela grafia da escala e pela Notação).
- **Respostas:** um botão por grau da escala, incluindo o 1, na ordem da escala (`1`, `♭3`, `4`, `5`, `♭7`), numa `.answer-grid`; rótulo acessível "Grau ♭3". Atalho declarado (`data-shortcut`) por posição: 1…*n*; dica "Teclado: 1–5".
- **Acerto:** grau escolhido = grau da nota destacada (calculado da posição e da tônica).
- **Depois de responder:** a destacada fica `correct` ou `wrong`; todas as marcas ganham o rótulo do grau; status "Correto! É o ♭3 (C)." ou "Errado. Era o ♭3 (C)." (nome pela grafia da escala). Toca a nota destacada. Acertou: avança sozinho; errou: botão Próxima.

### 7. Toque a escala (`scale-play`)

- **Item:** `{ escala, tônica, desenho }`, chave `scaleplay:<escala>:<tônica>:<desenho>`. Pool: 12 tônicas × desenhos escolhidos (12 com um desenho; 60 ou 84 com "Todos").
- **Pergunta:** "Toque a escala" e o nome ("Ab maior · desenho 3"). O braço mostra a janela do desenho, com `fit`, todas as casas tocáveis; as tônicas do desenho já aparecem como `root` (contam como encontradas). Uma linha "Faltam N notas" (`aria-live`).
- **Cada toque:** toca o som da casa. Se a altura é de uma nota do desenho ainda não encontrada, a casa fica `scale` e a nota conta. Se a altura já foi encontrada (a mesma casa, outra casa com o mesmo som ou uma tônica), a casa fica marcada e nada muda. Se a nota não é da escala, a casa fica `wrong` e a pergunta acaba errada.
- **Fim:** encontrou todas as alturas → certa, "Correto! Desenho completo.", avança sozinho. Errou → "Errado. F não está na escala." (nome pelo ajuste de Acidentais); o desenho inteiro aparece com o rótulo do grau, as notas que faltavam como `hint`; botão Próxima.
- Acerto por altura (e portanto por posição e classe de altura), nunca por nome.

### 8. Braço: marcas novas e legenda

- `MarkKind` ganha `root` (tônica) e `scale` (nota da escala). Cor nova `--root` (azul), diferente de alvo (âmbar), certa (verde) e errada (vermelho); `scale` é um círculo da cor da superfície com contorno do texto e rótulo legível.
- Legenda abaixo do braço nos dois exercícios (lista `.legend` com bolinhas `.swatch--root`, `.swatch--scale`, e `.swatch--target` em Grau no desenho): "Tônica", "Nota da escala", "Nota destacada".

### 9. Dados

- Aditivo em `guitar-mapper:v2`, sem trocar a versão e sem migração:
  - `sanitizeSettings`: `scale` (id válido, senão `pent-minor`) e `scaleBox` (`'all'` ou inteiro de 1 ao número de desenhos da escala já saneada, senão `1`); `mode` aceita os modos novos (via `QUIZ_MODES`).
  - Mapa por item: aceita `scaledeg:<escala>:<desenho>:<corda 1–6>:<grau 1..n−1>` e `scaleplay:<escala>:<0–11>:<desenho>`, com desenho de 1 ao número de desenhos da escala, sem zeros à esquerda; o resto é descartado, como hoje.
  - Histórico: aceita os modos novos, sem `level`.
- A importação (M0) passa pelos mesmos sanitizadores.

## Restrições

- Texto da interface em português. Nenhuma biblioteca nova. Celular primeiro (janela do desenho cabe em 390 px com `fit`).
- Os sete exercícios atuais não mudam (código de comportamento, testes e dados); só mudam as asserções de lista exata de modos/trilhas/abas.
- Acerto por grau e altura; a grafia é só exibição.
- Sorteios com o `rng` injetado (`ExerciseContext`), para testes determinísticos.
- Toda casa de desenho entre 1 e 24 (na prática 1–18), nos dois instrumentos.

## Decisões minhas (a conferir)

- Trilha nova **Escalas** (não dentro de Teoria), ids `scale-degree`/`scale-play`, nomes "Grau no desenho" e "Toque a escala"; a palavra "desenho" para box/posição em todas as escalas.
- Pergunta do exercício 1: **qual grau é a nota destacada** (não o nome da nota, que já é treinado no Braço), com as tônicas marcadas; a tônica nunca é perguntada, mas o botão 1 existe para os atalhos baterem com o número do grau nas escalas de 7 notas.
- Escalas de 7 notas com **7 posições de 3 notas por corda**; pentatônicas com 5 desenhos de 2 notas por corda; desenho 1 começa na tônica na corda mais grave (também na pentatônica maior).
- Blues = pentatônica menor + ♭5 dentro da janela; só blues menor.
- **Os cinco modos entram** (dórico a lócrio), porque a regra de desenhos e de grafia é a mesma: custo baixo.
- **Baixo usa os mesmos desenhos** (as 4 cordas graves da regra), não desenhos de 4 casas.
- Desenhos sem corda solta, na oitava mais grave possível (Lá menor pentatônica desenho 5 em 2–5; Mi menor pentatônica desenho 1 em 12–15).
- Grafia: tônica natural sempre natural; tônica preta pela preferência do ajuste, descartando o que exigiria dobrado; no Automático, menos sinais e empate pela tabela do M2. Nomes raros permitidos dentro de escalas. Blue note com a letra da 5ª, letra da 4ª só para evitar dobrado bemol.
- Tônica sorteada a cada pergunta; o item de Grau no desenho não guarda a tônica (a forma é a mesma em qualquer tom), o de Toque a escala guarda (o lugar no braço muda com a tônica).
- Toque a escala: tônicas já marcadas e contadas; o primeiro toque fora da escala encerra a pergunta como errada; uma nota com a mesma altura de outra já encontrada não conta de novo; sem botão "desistir".
- Escala e desenho como ajustes globais compartilhados pelos dois exercícios, padrão pentatônica menor, desenho 1.
- Nada no histórico além do nome do exercício.
- Cor `--root` azul para a tônica.

## Fica a cargo de quem for construir

- Nomes de tipos e funções internas, desde que as chaves, as regras de desenho e de grafia e as tabelas de teste sejam as acima.
- O visual exato de `.mark--scale`, da legenda e da linha "Faltam N notas", seguindo `.mark`, `.legend` e `.swatch`.
- Como o seletor de escala usa `<optgroup>` e onde ficam os textos (`modeLabels.ts` ou um módulo de rótulos de escala).
- Distribuição do sorteio da tônica (qualquer uma sobre 0–11 com o `rng` injetado).
