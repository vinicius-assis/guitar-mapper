# M7 Notas-guia, arpejos e ii–V–I — Design

Data: 2026-11-07. Oitavo marco do plano de 12 meses; depende do M0 (registro de exercícios), do M1 (revisão espaçada por item), do M2 (grafia), do M4 (desenhos de escala, `scaleBox`, `spellScale`, o padrão "toque as notas" de Toque a escala), do M5 (`spellChord`, `phrase`, `QUALITY_SYMBOL`) e do M6 (desenhos curados de acorde, `chordVoicing`, funções `1 ♭3 3 5 ♭7 7`, marca `chord`, coluna ○/×, pestana, bloqueio no baixo). O dono do produto delegou as decisões de design deste marco; as escolhas abaixo que não vieram da definição do marco são minhas e estão marcadas como tal.

## Origem e motivo

O M6 ensinou a tocar os desenhos de acorde; o M4, os desenhos de escala. O passo seguinte, o que separa "saber acordes" de "tocar sobre acordes", é enxergar **dentro** deles:

- as **notas-guia** (a 3ª e a 7ª), que dizem a qualidade do acorde e são o que o improviso e o acompanhamento procuram;
- o **arpejo** do acorde dentro do desenho de escala que o aluno já sabe (Am7 dentro da pentatônica menor de Lá): é o mapa de "notas seguras" para improvisar;
- a **condução de vozes** no ii–V–I, a cadência mais comum do jazz e da MPB: a 7ª de um acorde desce meio tom e vira a 3ª do próximo; a 3ª fica parada e vira a 7ª.

O app já tem tudo o que é preciso para isso: desenhos de acorde com função de cada nota (M6), desenhos de escala com o grau de cada nota (M4), grafia em tonalidade (M5), o braço com `links` tracejados (do exercício de Intervalos) e o progresso por item. Este marco acrescenta três módulos pequenos de domínio, uma marca nova no braço (`guide`) e três exercícios em trilhas que já existem.

## Objetivos

1. **Notas-guia** (`guide-tones`, trilha Acordes, só violão): o braço mostra um desenho de acorde de sétima do M6 e o nome dele; o aluno toca as notas-guia (3ª e 7ª) do desenho.
2. **Arpejo no desenho** (`arpeggio`, trilha Escalas, violão e baixo): o app pede o arpejo do acorde da tônica dentro de um desenho de escala do M4 (Am7 na pentatônica menor de Lá, desenho 1) e marca as tônicas; o aluno toca as outras notas do acorde no desenho.
3. **ii–V–I** (`ii-v-i`, trilha Acordes, só violão): o braço mostra um acorde de um ii–V–I em voicing de três notas (fundamental, 3ª e 7ª) com as notas-guia marcadas; o aluno toca as notas-guia do acorde seguinte que a condução de vozes alcança (7ª → 3ª meio tom abaixo, 3ª → 7ª parada). Voicings curados em 4 tonalidades (Dó, Fá, Sol, Ré), duas digitações cada. Ao responder, linhas tracejadas (`links`) ligam cada voz ao seu destino.
4. **Som** sem motor polifônico: rasgueado/arpejo com `playPitches`/`playSequence`, só depois de responder, e cancelado ao sair da pergunta.
5. **Os três entram na revisão espaçada do M1** (progresso por item do instrumento ativo, sessão de até 20).

## Não objetivos

- Notas-guia de tríades (só a 3ª), tensões (9, 11, 13), notas-guia de acordes fora da tabela do M6, notas-guia "em qualquer lugar do braço".
- Arpejos dos outros graus do campo (o ii ou o V dentro do desenho de Dó maior), arpejos de tríade nas escalas de 7 notas, arpejos fora de um desenho (braço inteiro, sweep), tocar o arpejo em ordem ou em tempo.
- ii–V–I menor (iiø–V7–i), outras cadências (I–vi–ii–V, ii–V sem resolver, substituição de trítono), outras tonalidades além das 4 curadas, voicings de 4 notas (drop 2/drop 3), escolher tonalidade ou digitação na tela de início.
- Polifonia (`playChord`), ritmo, metrônomo, acompanhamento.
- Mapa de domínio desses itens no Progresso e nível no histórico.
- Ajustes globais novos; mudar `chords.ts`, `scales.ts`, `harmony.ts`, `spelling.ts`, os exercícios atuais, seus testes ou suas chaves.

## Anti-objetivos (falha, mesmo que "funcione")

- Uma nota-guia errada (ou faltando) em qualquer desenho × fundamental; um arpejo com nota fora do acorde ou faltando nota do acorde dentro do desenho; um voicing do ii–V–I com nota fora do acorde, sem a 3ª ou a 7ª, com baixo que não é a fundamental, ou cuja condução não seja 7ª → 3ª (−1 semitom) e 3ª → 7ª (0) em toda tonalidade × digitação × passo.
- Acerto decidido por rótulo ou grafia: acerto é por posição (Notas-guia) e por altura (Arpejo, ii–V–I), nunca pelo texto.
- Revelar a resposta antes de terminar: rótulos de função, marca `guide`, `root` ou `hint` nas notas da resposta, `links`, o acorde de destino (ii–V–I), em DOM, `aria-label`, `title` ou `data-*` (o `aria-label` das casas é sempre só "Corda N, casa F").
- O braço cortar notas ou exigir rolagem horizontal num celular de 360 px (só com `fit` e `minFretWidth={40}`).
- Notas-guia ou ii–V–I iniciarem no baixo, ou o baixo ver um braço de 4 cordas com desenho de violão; Arpejo no desenho deixar de funcionar no baixo.
- Som continuar depois de sair da pergunta (desmontar a tela cancela o que estiver agendado).
- Um dado salvo ou exportado antes do M7 deixar de carregar ou ser regravado ao carregar; chaves `guide:`/`arp:`/`iivi:` válidas descartadas ao carregar.
- Uma cor nova com rótulo abaixo de 4,5:1 de contraste em qualquer tema.
- Mexer no comportamento ou nos testes dos 14 exercícios atuais (só mudam asserções de lista exata de modos/trilhas/abas e os títulos "14 exercises").

## Comportamento

### 1. Registro: três modos em trilhas existentes

- Modos `guide-tones` (**Notas-guia**), `arpeggio` (**Arpejo no desenho**) e `ii-v-i` (**ii–V–I**, com travessão), registrados como os outros: `QuizMode`, `EXERCISE_META`, `QUIZ_MODES`, `TRACKS` (`domain/exercises.ts`) e `EXERCISES` (`ui/exercises.tsx`).
- **Sem trilha nova.** `TRACKS` continua Braço, Ouvido, Teoria, Escalas, Harmonia, Acordes; Escalas passa a `['scale-degree', 'scale-play', 'arpeggio']`, Acordes a `['chord-name', 'chord-play', 'guide-tones', 'ii-v-i']`. `QUIZ_MODES` termina com `'chord-name', 'chord-play', 'guide-tones', 'arpeggio', 'ii-v-i'`. No computador as abas mostram os 17 exercícios (na ordem das trilhas); no celular o menu agrupa por trilha.
- Descrições (tela de início):
  - Notas-guia: "O braço mostra o desenho de um acorde de sétima e o nome dele. Toque as notas-guia: a 3ª e a 7ª. Tocar a fundamental ou a 5ª encerra a pergunta. Só no violão."
  - Arpejo no desenho: "O app pede o arpejo do acorde da tônica num desenho da escala, como Am7 na pentatônica menor de Lá, e marca as tônicas. Toque as outras notas do acorde no desenho. Uma nota fora do acorde encerra a pergunta."
  - ii–V–I: "O braço mostra um acorde do ii–V–I com as notas-guia marcadas. Toque as notas-guia do acorde seguinte, as mais perto: a 7ª desce meio tom e vira a 3ª; a 3ª fica e vira a 7ª. Só no violão."
- Os três: `recordsPositionProgress: false`, `usesFocus: false`, sem bloqueio por som, uma posição vinda do Progresso não inicia, sem nível no histórico (`LEVELED_MODES` não muda).

### 2. Baixo

- Notas-guia e ii–V–I usam **o mesmo mecanismo do M6**: continuam no menu, a tela de início mostra o aviso `p.empty` (via `startBlockers`) **"Acordes são só para violão. Troque para Violão em Ajustes."** (a mesma constante `BASS_NO_CHORDS`), Iniciar desabilitado, `questionCount` 0. As telas usam sempre `GUITAR`.
- Arpejo no desenho funciona nos dois instrumentos, como as escalas do M4: desenho do instrumento ativo, progresso no mapa do instrumento ativo.

### 3. Notas-guia (`guide-tones`)

- **Notas-guia** = as notas do desenho cuja função é `3`, `♭3`, `7` ou `♭7` (função do M6, pelo intervalo até a fundamental). A fundamental e a 5ª (`1`, `5`, `♭5`) não são.
- **Desenhos:** só os de sétima do M6 — abertos `g7 c7 d7 a7 e7 am7 em7 dm7 cmaj7 fmaj7 bm7b5` (11) e móveis `e-7 e-m7 a-7 a-m7 a-maj7 a-m7b5` (6 × 12). Conferido por script: todo desenho × fundamental tem ao menos uma 3ª e uma 7ª.
- **Item:** `{ shape, root }` (o `ChordItem` do M6). Chave `guide:<shape>:<root 0–11>`. Pool pelo ajuste **Formas** do M6 (`chordShapes`, compartilhado): Abertas 11, Pestana 72, Todas 83. O ajuste Acordes (`chordKinds`) não se aplica (sempre tétrades) e não aparece.
- **Tabela das notas-guia** (corda-casa; abertos, 6ª → 1ª):

  | desenho | notas-guia | desenho | notas-guia |
  |---|---|---|---|
  | G7 | 5-2 (3), 2-0 (3), 1-1 (♭7) | Am7 | 3-0 (♭7), 2-1 (♭3) |
  | C7 | 4-2 (3), 3-3 (♭7), 1-0 (3) | Em7 | 4-0 (♭7), 3-0 (♭3) |
  | D7 | 2-1 (♭7), 1-2 (3) | Dm7 | 2-1 (♭7), 1-1 (♭3) |
  | A7 | 3-0 (♭7), 2-2 (3) | C7M | 4-2 (3), 2-0 (7), 1-0 (3) |
  | E7 | 4-0 (♭7), 3-1 (3) | F7M | 3-2 (3), 1-0 (7) |
  | | | Bm7(♭5) | 3-2 (♭7), 2-3 (♭3) |

  Móveis: sempre 2 notas-guia, nas cordas 4 e 3 (forma de Mi) ou 3 e 2 (forma de Lá); ex.: A7 forma de Mi (casa 5) = 4-5 (♭7), 3-6 (3); C7M forma de Lá (casa 3) = 3-4 (7), 2-5 (3). A tabela completa (6 × 12) fica como teste literal gerado por script.
- **Janela:** abertos mostram as **casas 0–4** (a coluna da casa 0, antes do traste zero, mostra as cordas soltas como notas tocáveis, porque várias notas-guia são cordas soltas: o B do G7, o G e o D do Em7); móveis usam a janela do M6 (`lo = max(1, r − 1)` até `lo + 4`). Sempre 5 colunas.
- **Pergunta:** "Toque as notas-guia" e o título do M6 ("G7 · forma aberta", `chordTitle`). O braço mostra todas as notas do desenho como `chord` **sem rótulo**, a pestana (se houver) e a coluna ○/× **só com ×** (abafadas; as soltas já aparecem como nota na casa 0). Nada destaca a fundamental. Linha "Faltam N notas" (`aria-live`), N = número de notas-guia do desenho.
- **Cada toque** (toca a altura da casa no violão):
  - nota do desenho que é nota-guia ainda não encontrada → vira `guide` (sem rótulo), conta;
  - nota-guia já encontrada → nada;
  - nota do desenho que não é nota-guia → `wrong`, a pergunta acaba errada;
  - casa fora do desenho → nada (neutra; toca o som).
- **Fim:** todas encontradas → "Correto! As notas-guia de G7 são B (3) e F (♭7)." (nomes pelas notas de `spellChordTones` no ajuste Acidentais e pela Notação; cada nome uma vez, na ordem 3ª, 7ª), rasgueado, avança sozinho. Errou → "Errado. D é a 5ª de G7, não nota-guia." (`1` → "a fundamental", `5` → "a 5ª", `♭5` → "a ♭5"); notas-guia que faltavam como `hint`. Nos dois casos, todas as notas ganham o rótulo da função, a fundamental vira `root`, as notas-guia encontradas ficam `guide`; detalhe "G7: G B D F · forma aberta"; botão "Ouvir o acorde" (`.ear-play`, R); errou → Próxima.
- Acerto por posição (corda e casa); a grafia é só exibição.

### 4. Arpejo no desenho (`arpeggio`)

- **Acorde da tônica** de cada escala (tétrade quando a escala tem 7ª; a pentatônica maior não tem, então tríade):

  | escala | acorde | | escala | acorde |
  |---|---|---|---|---|
  | pentatônica menor | m7 | | dórico | m7 |
  | pentatônica maior | maior (tríade) | | frígio | m7 |
  | blues | m7 | | lídio | 7M |
  | maior | 7M | | mixolídio | 7 |
  | menor natural | m7 | | lócrio | m7(♭5) |

- **Arpejo** = as notas do desenho (`scaleBox` do M4, instrumento ativo) cuja classe de altura é nota do acorde. Conferido por script em toda escala × desenho × tônica × instrumento: as classes do arpejo são exatamente as do acorde, e toda casa da janela cuja nota é do acorde tem a altura de alguma nota do arpejo (propriedade do M4 herdada).
- **Item:** `{ scale, root, box }` (o `ScalePlayItem` do M4). Chave `arp:<escala>:<tônica 0–11>:<desenho>`. Pool pelos ajustes **Escala** e **Desenho** do M4 (compartilhados, mesmo componente `ScaleOptions`): 12 com um desenho, 60 ou 84 com "Todos".
- **Pergunta:** "Toque o arpejo" e o título "Am7 em A pentatônica menor · desenho 1" (nome do acorde = tônica pela grafia da escala + `QUALITY_SYMBOL`, para bater com o nome da escala; depois `scaleTitle` do M4). O braço mostra a janela do desenho com `fit`, todas as casas tocáveis; as tônicas do desenho já aparecem como `root` e contam como encontradas. "Faltam N notas" (`aria-live`), N = alturas do arpejo − alturas da tônica no desenho.
- **Cada toque** (por altura, como no Toque a escala; toca o som da casa):
  - altura do arpejo ainda não encontrada → casa `chord` (sem rótulo), conta;
  - altura já encontrada (inclusive outra casa com o mesmo som, ou uma tônica) → a casa fica marcada, nada muda;
  - qualquer outra nota (da escala mas fora do acorde, ou fora da escala) → `wrong`, a pergunta acaba errada.
- **Fim:** todas → "Correto! Arpejo completo.", arpejo soa, avança sozinho. Errou → "Errado. D não está em Am7." (nota por `noteLabel`, como o M4). Nos dois casos: notas do arpejo com o rótulo do grau (`SCALES[escala].degrees`), as que faltavam como `hint`, as outras notas do desenho como `scale` com rótulo do grau (para ver o arpejo dentro da escala); detalhe "Am7: A C E G" (notas pela grafia da escala); botão "Ouvir o arpejo" (`.ear-play`, R); errou → Próxima.
- Referências (violão): A pentatônica menor desenho 1 (casas 5–8) → arpejo 6-5 6-8 5-7 4-5 4-7 3-5 2-5 2-8 1-5 1-8; fora do acorde 5-5 e 3-7 (o D); tônicas 6-5 4-7 1-5; "Faltam 7 notas". C maior desenho 1 (8–13) → 10 alturas, tônicas 3, "Faltam 7". Baixo, A pentatônica menor desenho 1 → 4-5 4-8 3-7 2-5 2-7 1-5, tônicas 4-5 2-7, "Faltam 4".

### 5. ii–V–I (`ii-v-i`)

- **Voicings curados** (shell: fundamental, 3ª e 7ª, sem a 5ª), de três notas nas cordas 6/5, 4 e 3. Duas digitações: **forma 1** = ii e I com fundamental na 5ª corda, V na 6ª; **forma 2** = ii e I na 6ª, V na 5ª. Notação da 6ª para a 1ª corda:

  | tom | forma | ii | V | I | janela |
  |---|---|---|---|---|---|
  | C | 1 | Dm7 x-5-3-5-x-x | G7 3-x-3-4-x-x | C7M x-3-2-4-x-x | 2–6 |
  | C | 2 | Dm7 10-x-10-10-x-x | G7 x-10-9-10-x-x | C7M 8-x-9-9-x-x | 8–12 |
  | F | 1 | Gm7 x-10-8-10-x-x | C7 8-x-8-9-x-x | F7M x-8-7-9-x-x | 7–11 |
  | F | 2 | Gm7 3-x-3-3-x-x | C7 x-3-2-3-x-x | F7M 1-x-2-2-x-x | 1–5 |
  | G | 1 | Am7 x-12-10-12-x-x | D7 10-x-10-11-x-x | G7M x-10-9-11-x-x | 9–13 |
  | G | 2 | Am7 5-x-5-5-x-x | D7 x-5-4-5-x-x | G7M 3-x-4-4-x-x | 3–7 |
  | D | 1 | Em7 x-7-5-7-x-x | A7 5-x-5-6-x-x | D7M x-5-4-6-x-x | 4–8 |
  | D | 2 | Em7 12-x-12-12-x-x | A7 x-12-11-12-x-x | D7M 10-x-11-11-x-x | 10–14 |

- **Propriedades conferidas por teste** (toda tonalidade × forma × acorde): as classes de altura do voicing são as notas de `spellChord('major', tom, grau, true)` do M5 menos a 5ª; a nota mais grave é a fundamental; tem uma 3ª e uma 7ª; casas entre 1 e 14; dentro da janela. Em cada passo (ii → V, V → I): a 7ª do acorde de origem desce **1 semitom** até a 3ª do destino, na mesma corda; a 3ª da origem fica (**0 semitom**, mesma casa) e vira a 7ª do destino.
- **Janela:** `lo` = menor casa dos três voicings da linha, `hi = lo + 4` (5 casas, coluna da tabela acima). A mesma janela nos dois passos da linha.
- **Item:** `{ key, grip, step }` com `key` ∈ {0 (C), 5 (F), 7 (G), 2 (D)}, `grip` 1 ou 2, `step` `'ii-v'` ou `'v-i'`. Chave `iivi:<key>:<grip>:<step>`. Pool fixo de **16** (4 × 2 × 2); sem opções na tela de início.
- **Pergunta:** "Toque as notas-guia de G7" e o título "Dm7 → G7 · ii–V–I em C" (nomes por `spellChord` e `phrase`, tom pela grafia do M5). O braço mostra só o acorde de origem: fundamental `root` com rótulo `1`, notas-guia `guide` com o rótulo da função (`♭3`, `♭7`); sem `links`, sem nada do acorde de destino. "Faltam 2 notas".
- **Cada toque** (por altura; toca a altura no violão): altura de uma nota-guia do destino ainda não encontrada → `guide` sem rótulo, conta; já encontrada → nada; qualquer outra (inclusive a mesma nota em outra oitava, ou a fundamental do destino) → `wrong`, acaba errada. Na janela de cada item, cada altura-alvo só existe numa casa (conferido por script), então altura e posição dão o mesmo resultado.
- **Fim:** acertou → "Correto!" e avança sozinho; errou → "Errado. As notas-guia de G7 mais perto são B e F." e Próxima. Nos dois casos: o acorde de origem passa a `scale` (contorno, sem rótulo), o de destino aparece com `root` (`1`), notas-guia `guide` (encontradas) ou `hint` (faltavam), com rótulo da função; `links` tracejados da 7ª da origem para a 3ª do destino (a voz que anda; a voz parada não tem traço de comprimento zero); detalhe "C (♭7) desce meio tom para B (3) · F (♭3) fica e vira a ♭7"; botão "Ouvir a troca" (`.ear-play`, R) toca o acorde de origem e depois o de destino.
- Referência: `iivi:0:1:ii-v` → origem Dm7 (5-5 `1`, 4-3 `♭3`, 3-5 `♭7`), alvos B em 3-4 e F em 4-3; mesma classe em outra oitava na janela: 5-2 (B) e 2-6 (F) são erros.

### 6. Braço: marca nova (aditiva)

- `MarkKind` ganha `guide` (nota-guia). Cor nova `--guide`: tema escuro `#c792ea` com rótulo `#111` (7,85:1; 5,59:1 contra `--wood`); tema claro `#6d28d9` com rótulo `#fff` (7,1:1; 5,14:1 contra `--wood`). Variável `--guide-text` para o rótulo. Contrastes calculados por script (WCAG).
- Nenhuma prop nova: `links`, `stringMarks`, `barres` e `fretMin = 0` já existem e funcionam sem mudança.
- Legendas: `GuideLegend` ("Fundamental" `swatch--root`, "Nota do acorde" `swatch--chord`, "Nota-guia (3ª e 7ª)" `swatch--guide`, "× Corda abafada") nas telas Notas-guia e ii–V–I; `ArpeggioLegend` ("Tônica" `swatch--root`, "Nota do arpejo" `swatch--chord`, "Outra nota da escala" `swatch--scale`) no Arpejo.
- As três telas usam `fit` com `minFretWidth={40}`; janelas de 5 colunas (Notas-guia, ii–V–I) cabem em 360 px como no M6; o Arpejo usa a janela do M4.

### 7. Som e teclado

- Toque numa casa: `playPitches([altura])` (Notas-guia, ii–V–I, no violão) ou `playPosition` (Arpejo, instrumento ativo).
- Ao terminar: Notas-guia = rasgueado do M6 (`playPitches(alturas 6ª → 1ª, 40)`); Arpejo = `playPitches(alturas do arpejo em ordem crescente, 150)`; ii–V–I = `playSequence` com a origem em 0/40/80 ms e o destino em 900/940/980 ms (grave → agudo).
- Só com Som ligado; não bloqueia o início. **Desmontar a tela cancela** o que estiver agendado (`playPitches([])` no cleanup), como no M6. `prepareSound` carrega as alturas da fila.
- Teclado: Enter = Próxima; R = botão `.ear-play` (já no `useQuizShortcuts`). Sem `data-shortcut` novos.

### 8. Dados

- Aditivo em `guitar-mapper:v2`, sem trocar a versão, sem migração, **sem ajuste novo**:
  - `mode` aceita os modos novos (via `QUIZ_MODES`).
  - Mapa por item (`isItemKey`): aceita `guide:<shape>:<0–11>` (shape de sétima da tabela; aberto só com a própria fundamental), `arp:<escala>:<0–11>:<desenho>` (desenho de 1 ao número de desenhos da escala) e `iivi:<0|2|5|7>:<1|2>:<ii-v|v-i>`, sem zeros à esquerda; o resto é descartado, como hoje.
  - Histórico: aceita os modos novos, sem `level`.
- A importação (M0) passa pelos mesmos sanitizadores.

## Restrições

- Texto da interface em português. Nenhuma biblioteca nova. Celular primeiro (braço com `fit` + `minFretWidth={40}` em 360 px, sem rolagem horizontal).
- Os 14 exercícios atuais não mudam; só mudam as asserções de lista exata (`exercises.test.ts`; em `Study.test.tsx` os títulos "14 exercises" viram "17 exercises" e as listas das trilhas Escalas e Acordes).
- `Fretboard` só ganha `'guide'` em `MarkKind`; os testes dele continuam iguais.
- `chords.ts`, `chordItems.ts`, `scales.ts`, `scaleItems.ts`, `harmony.ts`, `spelling.ts` não mudam: os módulos novos só os consomem.
- Acerto por posição ou altura; a grafia é só exibição. Sorteios com o `rng` injetado.
- Tabelas de teste literais, geradas por script independente (Python, sem importar o TS) e nunca recalculadas pelo código testado.
- Sem reformatar arquivos existentes.

## Decisões minhas (a conferir)

- **Sem trilha nova:** Notas-guia e ii–V–I entram em **Acordes** (que já é só violão, com o mesmo aviso no baixo); Arpejo no desenho entra em **Escalas** (funciona nos dois instrumentos, como as escalas). Nenhuma `TrackId` nova.
- Nomes e ids: "Notas-guia" (`guide-tones`), "Arpejo no desenho" (`arpeggio`, "desenho" como no M4), "ii–V–I" (`ii-v-i`).
- Notas-guia **só em tétrades** (desenhos de sétima do M6: 11 abertos + 6 móveis); o aluno **toca** as notas-guia no desenho mostrado (não escolhe nomes). Fundamental não destacada antes. Toque fora do desenho é neutro; toque em fundamental/5ª do desenho encerra.
- Para Notas-guia, desenhos abertos na **janela 0–4** (cordas soltas tocáveis na coluna da casa 0), em vez da janela 1–4 + coluna ○ do M6, porque metade das notas-guia abertas são cordas soltas. A coluna lateral mostra só ×.
- Reaproveitar os ajustes: Formas (`chordShapes`) do M6 para Notas-guia; Escala e Desenho do M4 para Arpejo. Mudar um muda o outro exercício (como já acontece entre os dois do M4 e os dois do M6). Nenhum ajuste novo.
- Arpejo = **só o acorde da tônica** de cada escala (tabela da seção 4), não os sete graus; pentatônica maior com tríade. Tônicas pré-marcadas e contadas, acerto por altura, nota da escala fora do acorde é erro (é exatamente o que o exercício treina).
- Nome do acorde do arpejo pela grafia da **escala** (não pela regra do `spellChordTones`), para "Am7 em A pentatônica menor" nunca divergir.
- ii–V–I **maior**, com **shells de 3 notas** (1-3-7), 4 tonalidades (Dó, Fá, Sol, Ré — as de violão mais comuns, todas cabendo em 1–14), 2 digitações; 16 itens fixos. O aluno vê a origem e **toca as notas-guia do destino** (as duas, por altura); a nota certa em outra oitava é erro. A tabela é curada e conferida por teste contra o M5, não gerada em tempo de execução.
- Ao terminar o ii–V–I: origem em contorno, destino preenchido, `links` só na voz que anda (meio tom), e o som da troca (origem → destino) em `playSequence`.
- Cor nova `--guide` roxa (escuro `#c792ea`/rótulo `#111`; claro `#6d28d9`/rótulo `#fff`), distinta de alvo (âmbar), tônica (azul), certa (verde), errada (vermelho).
- Telas de Notas-guia e ii–V–I usam sempre `GUITAR`; Arpejo usa o instrumento ativo.

## Fica a cargo de quem for construir

- Nomes de tipos e funções internas, desde que as chaves, as tabelas e as regras acima valham.
- Se a tabela do ii–V–I fica literal ou é gerada a partir de duas digitações relativas (desde que o teste literal da seção 5 passe).
- O visual exato de `.mark--guide` e das legendas, seguindo `.mark`, `.legend` e `.swatch`.
- Onde ficam os textos novos (um `m7Text.ts` ou funções em `chordText.ts`, desde que `chordText.ts` só ganhe linhas).
