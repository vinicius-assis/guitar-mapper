# Exercício de Intervalos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar o exercício "Intervalos" (nota de partida + intervalo → escolher a nota entre as 12), com braço, Foco de intervalos, avanço manual/3 s/5 s e som, para violão e baixo.

**Architecture:** Um módulo de domínio `intervals.ts` (intervalos, fila de perguntas, alturas de som, ligação no braço) alimenta uma tela `IntervalQuiz`. O Estudar ganha uma fila própria de perguntas de intervalo ao lado da fila de posições. Os novos ajustes (`intervals`, `intervalAdvance`) são globais e opcionais no armazenamento v2, sem migração. `Fretboard` ganha `links` (linha tracejada); `SoundProvider` ganha reprodução de alturas em sequência.

**Tech Stack:** React 19 + TypeScript, Vite (PWA), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-04-intervals-exercise-design.md`

## Global Constraints

- Intervalos (id, rótulo, semitons): `2m` "2ª m" 1; `2M` "2ª M" 2; `3m` "3ª m" 3; `3M` "3ª M" 4; `4J` "4ª J" 5; `4A` "Trítono" 6 (sigla "4A/5d"); `5J` "5ª J" 7; `6m` "6ª m" 8; `6M` "6ª M" 9; `7m` "7ª m" 10; `7M` "7ª M" 11. Sempre ascendentes.
- Padrão do Foco: `['3m', '3M', '5J', '7m', '7M']`. Padrão de avanço: `'manual'`. Valores de avanço: `'manual' | '3s' | '5s'`.
- Opções de resposta: sempre as 12 notas (0 a 11), com os rótulos do app (acidentais com sustenido, notação do usuário: cifra, solfejo ou "C · Dó").
- Notas de partida: `filter.naturalsOnly` (naturais por padrão). Cordas e casas do Foco não se aplicam e ficam ocultas no modo Intervalos.
- Braço do exercício: casas 0 a 12, cordas do instrumento ativo, com `fit` e `minFretWidth={26}` em todos os tamanhos (sem `expand`).
- Alturas de som dentro da faixa do instrumento: `[min(openMidi), max(openMidi) + MAX_FRET]` (baixo 28–67, violão 40–88); a nota de partida é a mais grave possível dentro da faixa e a de chegada fica `semitons` acima.
- Dados: sem migração; `intervals` e `intervalAdvance` são opcionais no armazenamento e recebem padrões quando faltam; ids de intervalo inválidos são descartados. `mode: 'interval'` é válido no histórico.
- As 12 notas não usam os atalhos numéricos `1`–`9` (não usar as classes `options`/`option`); Enter e Esc seguem como hoje.
- Texto da interface em português; commits com as linhas `Co-Authored-By` e `Claude-Session` da sessão. Rodar `npm test` e `npm run build` ao final de cada tarefa que mexe em código.

## Review Focus

- Abrir o Estudar vindo do Progresso (posição forçada) com o modo Intervalos ativo não pode iniciar uma sessão com uma posição: a posição é ignorada e a tela começa parada (Task 7).
- Dados salvos antes desta mudança, sem `intervals`/`intervalAdvance`, abrem com os padrões; ids inválidos em `intervals` são descartados; lista vazia é permitida, mas "Iniciar" fica desabilitado com aviso (Tasks 2, 5 e 7).
- Com avanço de 3 s ou 5 s, encerrar a sessão ou sair da pergunta antes do tempo não dispara a próxima pergunta depois (Task 6).
- Todas as 12 notas de partida × 11 intervalos × os dois instrumentos produzem alturas dentro da faixa dos samples (nenhum som silencioso por falta de arquivo) (Task 1).
- O braço do baixo (4 cordas), a casa 0, o modo mão esquerda e o som desligado funcionam sem erro (Tasks 4, 6 e 7).
- Os outros exercícios, o histórico atual e os atalhos de teclado continuam como antes (Task 7).

---

### Task 1: Domínio de intervalos

**Files:**
- Create: `src/domain/intervals.ts`
- Modify: `src/domain/fretboard.ts` (nova função `notePositions`)
- Test: `src/domain/intervals.test.ts` (novo), `src/domain/fretboard.test.ts`

**Interfaces:**
- Consumes: `Instrument`, `BASS`, `GUITAR` (`src/domain/instruments.ts`); `pitchOf`, `MAX_FRET`, `Position` (`fretboard.ts`/`pitch.ts`); `NoteIndex`, `ALL_NOTES`, `NATURAL_NOTES` (`notes.ts`).
- Produces (`intervals.ts`):
  - `type IntervalId = '2m' | '2M' | '3m' | '3M' | '4J' | '4A' | '5J' | '6m' | '6M' | '7m' | '7M'`
  - `interface Interval { id: IntervalId; semitones: number; label: string; name: string; abbr: string }`
  - `INTERVALS: readonly Interval[]` (ordem crescente de semitons), `intervalById(id: IntervalId): Interval`, `DEFAULT_INTERVALS: readonly IntervalId[]`, `isIntervalId(value: unknown): value is IntervalId`
  - `interface IntervalItem { root: NoteIndex; interval: IntervalId }`
  - `intervalAnswer(item: IntervalItem): NoteIndex`
  - `buildIntervalQueue(roots: readonly NoteIndex[], intervals: readonly IntervalId[], rng: () => number): IntervalItem[]` (todas as combinações uma vez, embaralhadas)
  - `instrumentRange(instrument: Instrument): [number, number]`
  - `intervalPitches(root: NoteIndex, interval: Interval, instrument: Instrument): [number, number]`
  - `intervalLink(root: NoteIndex, interval: Interval, instrument: Instrument, fretMin?: number, fretMax?: number): { from: Position; to: Position } | null` (padrões 0 e 12)
- Produces (`fretboard.ts`): `notePositions(note: NoteIndex, instrument?: Instrument, fretMin?: number, fretMax?: number): Position[]` (padrões `GUITAR`, 0 e `MAX_FRET`; inclui a casa 0; ordenado por corda e casa).

- [ ] **Step 1: Write the failing tests**
  - `fretboard.test.ts`: `notePositions(0, BASS, 0, 12)` é exatamente `[{string:1,fret:5},{string:2,fret:10},{string:3,fret:3},{string:4,fret:8}]`; `notePositions(7, BASS, 0, 12)` é `[{1,0},{1,12},{2,5},{3,10},{4,3}]` (inclui a corda solta e a casa 12); `notePositions(7, GUITAR, 1, 12)` não contém casa 0; todas as posições devolvidas têm `noteAt(p, instrument) === note`.
  - `intervals.test.ts`: `INTERVALS.length === 11` com semitons `1..11` em ordem; `intervalAnswer({root:0, interval:'5J'}) === 7`, `({root:11, interval:'2m'}) === 0`, `({root:0, interval:'4A'}) === 6`; `DEFAULT_INTERVALS` igual a `['3m','3M','5J','7m','7M']`; `isIntervalId('5J')` verdadeiro e `isIntervalId('9M')` falso.
  - `buildIntervalQueue(NATURAL_NOTES, ['3m','5J'], mulberry32(1))` tem 14 itens, todos distintos (`root-interval`), é determinístico para a mesma semente e muda de ordem com outra semente; `buildIntervalQueue(ALL_NOTES, [], rng)` é `[]`.
  - `instrumentRange(BASS)` = `[28, 67]` e `instrumentRange(GUITAR)` = `[40, 88]`; `intervalPitches(0, intervalById('5J'), BASS)` = `[36, 43]` e com `GUITAR` = `[48, 55]`; `intervalPitches(4, intervalById('5J'), BASS)` = `[28, 35]`.
  - Propriedade: para os 2 instrumentos × 12 notas × 11 intervalos, `intervalPitches` devolve `[a, b]` com `b - a === semitons`, `a % 12 === root` e ambos dentro de `instrumentRange(instrument)`.
  - `intervalLink(0, intervalById('5J'), BASS)` = `{from:{string:3,fret:3}, to:{string:2,fret:5}}`; propriedade: todo link devolvido tem `pitchOf(to) - pitchOf(from) === semitons`, ambos dentro das casas pedidas, e nunca corda acima de `stringCount`; com `fretMax` pequeno que não permita o intervalo, devolve `null`.

- [ ] **Step 2: Run to verify failures**
  Run: `npx vitest run src/domain`
  Expected: FAIL (módulo e funções inexistentes).

- [ ] **Step 3: Implement**
  - `notePositions`: percorre `1..instrument.stringCount` e `fretMin..fretMax` com `noteAt`.
  - `INTERVALS` com os 11 intervalos (rótulos e siglas do Global Constraints; `name` por extenso, ex.: "quinta justa").
  - `buildIntervalQueue`: produto `roots × intervals`, embaralhamento Fisher-Yates com `rng` (mesmo padrão de `quiz.ts`).
  - `instrumentRange` e `intervalPitches` (menor altura `a >= faixa[0]` com `a % 12 === root` e `a + semitons <= faixa[1]`).
  - `intervalLink`: entre as posições de `root` e de `intervalAnswer` (via `notePositions` na janela de casas), considera só pares com `pitchOf(to) - pitchOf(from) === semitons`; escolhe a menor distância `|Δcorda| + |Δcasa|`, desempate pela menor casa de partida e depois pela menor corda de partida; `null` se não houver par.

- [ ] **Step 4: Run to verify pass**
  Run: `npx vitest run src/domain && npx tsc --noEmit`
  Expected: PASS.

- [ ] **Step 5: Commit**
  `git add src/domain && git commit -m "feat(domain): intervals, interval queue, pitches and board link; notePositions"`

---

### Task 2: Modo Intervalos nos dados e nos ajustes

**Files:**
- Modify: `src/domain/quiz.ts` (`QuizMode`), `src/state/storage.ts`, `src/ui/modeLabels.ts` (somente `MODE_DESCRIPTIONS`)
- Test: `src/state/storage.test.ts`, `src/state/AppState.test.tsx`

**Interfaces:**
- Consumes: `IntervalId`, `DEFAULT_INTERVALS`, `isIntervalId` (Task 1).
- Produces:
  - `QuizMode` ganha `'interval'`.
  - `type IntervalAdvance = 'manual' | '3s' | '5s'` (exportado de `storage.ts`).
  - `GlobalSettings`/`Settings` ganham `intervals: IntervalId[]` e `intervalAdvance: IntervalAdvance`; `DEFAULT_SETTINGS` usa `[...DEFAULT_INTERVALS]` e `'manual'`.
  - `MODE_DESCRIPTIONS.interval`: `'Veja uma nota e um intervalo e escolha a nota de chegada entre as 12. O braço mostra onde ela está.'`
  - `MODES` (a lista de botões de `modeLabels.ts`) **não** muda nesta tarefa (a Task 7 liga o botão).

- [ ] **Step 1: Write the failing tests**
  - Padrão: `createDefaultData().settings.intervals` é `['3m','3M','5J','7m','7M']` e `intervalAdvance` é `'manual'`.
  - Dados v2 salvos sem os dois campos abrem com os padrões; `intervals: ['5J', '9M', '3m']` vira `['5J','3m']` (ordem preservada, inválidos descartados, sem duplicatas); `intervals: []` permanece `[]`; `intervalAdvance: '7s'` vira `'manual'`; `intervalAdvance: '5s'` é mantido.
  - `settings.mode: 'interval'` é aceito ao carregar; uma entrada de histórico com `mode: 'interval'` sobrevive à sanitização (sem campo `level`).
  - `AppState`: `updateSettings({ intervals: ['5J'], intervalAdvance: '3s' })` persiste nas configurações globais e vale nos dois instrumentos; trocar de instrumento não altera `intervals`.

- [ ] **Step 2: Run to verify failures**
  Run: `npx vitest run src/state`
  Expected: FAIL.

- [ ] **Step 3: Implement**
  Estender `QuizMode`, `MODES`/`EAR_LEVELS` internos de `storage.ts` (`MODES` com `'interval'`), `GlobalSettings`, `DEFAULT_SETTINGS`, `sanitizeSettings` (filtra com `isIntervalId`, remove duplicatas) e `updateSettings` já roteia campos globais (conferir que `intervals`/`intervalAdvance` não vão para o bucket do instrumento). Adicionar `MODE_DESCRIPTIONS.interval`.

- [ ] **Step 4: Run to verify pass**
  Run: `npx vitest run && npx tsc --noEmit`
  Expected: PASS (suíte inteira).

- [ ] **Step 5: Commit**
  `git add src && git commit -m "feat(state): interval mode, intervals and intervalAdvance settings with safe defaults"`

---

### Task 3: Som de intervalos em sequência

**Files:**
- Modify: `src/audio/SoundProvider.tsx`
- Test: `src/audio/SoundProvider.test.tsx`

**Interfaces:**
- Consumes: `NotePlayer` (`play(midi)`, `prepare(midis)`, `unlock()`), instrumento ativo (já existe).
- Produces: `SoundApi` ganha `playPitches(midis: number[], gapMs?: number): void` (toca cada altura na ordem, a primeira agora e as seguintes a cada `gapMs`, padrão 700) e `preparePitches(midis: number[]): void`. Mudar de pergunta ou desmontar o provider cancela os agendamentos pendentes. Som desligado ou erro do player: não faz nada e não lança.

- [ ] **Step 1: Write the failing tests**
  Com player fake e `vi.useFakeTimers()`: `playPitches([36, 43])` chama `player.play(36)` na hora e `player.play(43)` após 700 ms (e não antes); uma segunda chamada `playPitches([40, 47])` antes dos 700 ms cancela o `43` pendente; `preparePitches([36, 43])` chama `player.prepare([36, 43])`; com `soundEnabled = false` nenhuma das duas chama o player; desmontar o provider antes dos 700 ms não chama `play(43)`.

- [ ] **Step 2: Run to verify failures**
  Run: `npx vitest run src/audio/SoundProvider.test.tsx`
  Expected: FAIL.

- [ ] **Step 3: Implement**
  `playPitches` guarda os `setTimeout` pendentes numa ref e os limpa a cada chamada nova e no efeito de limpeza do provider; usa o mesmo `run(...)` que protege `playPosition`.

- [ ] **Step 4: Run to verify pass**
  Run: `npx vitest run src/audio && npx tsc --noEmit`
  Expected: PASS.

- [ ] **Step 5: Commit**
  `git add src/audio && git commit -m "feat(audio): play pitches in sequence for intervals"`

---

### Task 4: Ligação tracejada no braço

**Files:**
- Modify: `src/ui/Fretboard.tsx`, `src/styles.css`
- Test: `src/ui/Fretboard.test.tsx`

**Interfaces:**
- Consumes: `Position`.
- Produces: `FretboardProps.links?: { from: Position; to: Position }[]`. Cada ligação é uma `<line className="link">` tracejada entre os centros das duas posições (usa o mesmo `cx`/`cy`, então respeita mão esquerda e casa 0), desenhada **abaixo** das marcas e sem capturar toques; só aparece se as duas casas estiverem dentro da janela exibida. Não altera nada sem a prop.

- [ ] **Step 1: Write the failing tests**
  `<Fretboard fretMin={0} fretMax={12} instrument={BASS} links={[{from:{string:3,fret:3}, to:{string:2,fret:5}}]} marks={[]} />` renderiza exatamente 1 elemento `.link` com os atributos `x1/y1/x2/y2` iguais aos centros das células `cell-3-3` e `cell-2-5` (derivados da geometria do componente: `x2 > x1` e `y2 < y1`); em mão esquerda `x2 < x1`; sem `links` não há `.link`; com `fretMin={0}` a posição `{string:1,fret:0}` recebe marca (`mark--target`) sem erro (casa 0 funciona); uma ligação com uma casa fora da janela não é desenhada.

- [ ] **Step 2: Run to verify failures**
  Run: `npx vitest run src/ui/Fretboard.test.tsx`
  Expected: FAIL.

- [ ] **Step 3: Implement**
  Linha SVG com `stroke="currentColor"` (cor de destaque via classe `.link` em `styles.css`, `stroke-dasharray` e `pointer-events: none`), inserida antes do bloco de marcas.

- [ ] **Step 4: Run to verify pass**
  Run: `npx vitest run src/ui && npx tsc --noEmit`
  Expected: PASS.

- [ ] **Step 5: Commit**
  `git add src && git commit -m "feat(ui): fretboard links (dashed line between two positions)"`

---

### Task 5: Foco de intervalos

**Files:**
- Create: `src/ui/useIntervalFocus.ts`
- Modify: `src/ui/screens/FocusSheet.tsx`, `src/ui/screens/Focus.tsx`, `src/ui/focusSummary.ts`
- Test: `src/ui/useIntervalFocus.test.tsx` (novo), `src/ui/focusSummary.test.ts`, `src/ui/screens/Focus.test.tsx`

**Interfaces:**
- Consumes: `useAppState()` (`data.settings.intervals`, `intervalAdvance`, `filter.naturalsOnly`, `updateSettings`), `INTERVALS`, `NATURAL_NOTES`, `ALL_NOTES`.
- Produces:
  - `useIntervalFocus()` devolve `{ intervals: IntervalId[]; advance: IntervalAdvance; count: number; toggleInterval(id: IntervalId): void; selectAllIntervals(): void; setAdvance(value: IntervalAdvance): void }`, com `count = (naturalsOnly ? 7 : 12) × intervals.length` e `toggleInterval` mantendo a ordem de `INTERVALS`. (`naturalsOnly` continua sendo editado por `useFocusFilter().setNaturalsOnly`.)
  - `describeIntervalFocus(intervals: readonly IntervalId[], naturalsOnly: boolean, advance: IntervalAdvance): { intervals: string; notes: string; advance: string }` — `intervals` lista os rótulos ("3ª m, 3ª M, 5ª J"), "Todos" quando os 11 estão marcados, "Nenhum" quando vazio; `notes` é "Naturais" ou "Com acidentais"; `advance` é "Manual", "3 s" ou "5 s".
  - `FocusSheet` e `Focus` mostram, quando `settings.mode === 'interval'`, em vez de cordas e casas: Perguntas, **Intervalos** (botão "Todos" + um botão por intervalo com `aria-pressed`, rótulo do intervalo), **Notas** (Naturais / Com acidentais) e **Próxima pergunta** (Manual / 3 s / 5 s). O resumo do cartão fechado usa `describeIntervalFocus`. Nos outros modos nada muda.

- [ ] **Step 1: Write the failing tests**
  - Hook: com os padrões, `count` = 7 × 5 = 35; marcar `'2m'` dá 42; `selectAllIntervals()` dá 7 × 11 = 77; com `naturalsOnly = false` o `count` usa 12; `toggleInterval('5J')` duas vezes volta ao estado inicial e a ordem segue `INTERVALS`; `setAdvance('3s')` persiste.
  - `describeIntervalFocus(DEFAULT_INTERVALS, true, 'manual')` = `{ intervals: '3ª m, 3ª M, 5ª J, 7ª m, 7ª M', notes: 'Naturais', advance: 'Manual' }`; os 11 → `'Todos'`; `[]` → `'Nenhum'`.
  - `Focus.test.tsx` com modo `interval`: aparecem os botões "Todos" e os 11 intervalos (`getByRole('button', { name: '5ª J' })` com `aria-pressed="true"` por padrão), "Naturais", "Manual", "3 s", "5 s"; não existem "Corda 1" nem "Casa inicial"; clicar em "3 s" persiste `intervalAdvance: '3s'` (ler do armazenamento); no modo `position-to-note` as cordas e casas seguem como antes. Teste equivalente para `FocusSheet` aberto (via Estudar).

- [ ] **Step 2: Run to verify failures**
  Run: `npx vitest run src/ui`
  Expected: FAIL.

- [ ] **Step 3: Implement**
  Hook fino sobre `useAppState`; ramificação por modo em `FocusSheet` (corpo aberto e resumo fechado) e em `Focus`, reaproveitando as classes de chips/badges existentes (`badge badge--button` no cartão, `chip` na aba).

- [ ] **Step 4: Run to verify pass**
  Run: `npx vitest run && npx tsc --noEmit`
  Expected: PASS.

- [ ] **Step 5: Commit**
  `git add src && git commit -m "feat(ui): Foco for intervals (interval chips, naturals, advance)"`

---

### Task 6: Tela da pergunta de intervalo

**Files:**
- Create: `src/ui/screens/IntervalQuiz.tsx`
- Modify: `src/styles.css`
- Test: `src/ui/screens/IntervalQuiz.test.tsx` (novo)

**Interfaces:**
- Consumes: `IntervalItem`, `intervalById`, `intervalAnswer`, `intervalPitches`, `intervalLink` (Task 1); `notePositions`; `useSound().playPitches`; `Fretboard` com `links` (Task 4); `useAppState().instrument`; `Settings` (`notation`, `leftHanded`, `intervalAdvance`); `useAutoAdvance(active, onNext, delayMs)`; `noteLabel`, `stringLabels(instrument)`, `useBreakpoint`.
- Produces: `IntervalQuiz({ item, settings, onAnswer, onNext }: { item: IntervalItem; settings: Settings; onAnswer(correct: boolean): void; onNext(): void })`. Mostra "Qual é a nota?", a equação "nota + intervalo → ?" (a nota de partida e o rótulo do intervalo com o nome por extenso pequeno), **12 botões** (um por nota, na ordem 0 a 11, classe `note-option`, nunca `option`) e o braço (casas 0–12, `fit`, `minFretWidth={26}`, todas as posições da nota de partida como `target` com a letra em cifra). Ao responder: marca a resposta certa e, se errada, a escolhida; os botões ficam desabilitados; a casa de chegada vira `?` → nota; o braço marca todas as posições da resposta como `correct` e a ligação `intervalLink`; chama `onAnswer(correct)`; toca `sound.playPitches(intervalPitches(root, interval, instrument))`; mostra feedback ("Correto!" ou "Errou. {intervalo} de {partida} é {resposta}.") e o botão `Próxima` (classe `primary` dentro de `.quiz-actions`, para o atalho Enter). Avanço: `manual` → só o botão; `3s`/`5s` → `useAutoAdvance(answered, onNext, 3000 | 5000)` (certo ou errado), cancelado ao desmontar.

- [ ] **Step 1: Write the failing tests**
  Com baixo ativo, player fake e `item = { root: 0, interval: '5J' }`:
  - Antes de responder: existem 12 botões de nota (`getAllByRole('button', { name: /^C/ })` etc.; nomes seguem a notação do usuário), "5ª J" visível, o braço tem 4 linhas de corda e marcas `target` nas 4 posições de C ({1,5},{2,10},{3,3},{4,8}) e nenhuma `correct`; nenhuma marca na casa 0 além das de C (C não está na casa 0 no baixo).
  - Responder certo (G): o botão G fica com a classe de acerto, `onAnswer(true)` uma vez, as 5 posições de G ({1,0},{1,12},{2,5},{3,10},{4,3}) viram `correct`, existe 1 `.link`, aparece "Correto!" e o botão "Próxima"; `player.play(36)` na hora e `play(43)` após 700 ms (timers falsos).
  - Responder errado (E): `onAnswer(false)`, o E fica com a classe de erro e o G de acerto, texto contém "Errou" e "G" (mensagem com a resposta certa), os botões ficam desabilitados e um segundo clique não chama `onAnswer` de novo.
  - Avanço: com `intervalAdvance: 'manual'`, `onNext` não é chamado sozinho; com `'3s'`, é chamado uma vez após 3000 ms (não antes, 2999 ms); com `'5s'`, após 5000 ms; desmontar antes do prazo não chama `onNext`.
  - Teclado: pressionar `1` não escolhe nenhuma nota (nenhum `onAnswer`); Enter depois de responder aciona "Próxima" (atalho `.quiz-actions .primary`, via `useQuizShortcuts` montado no teste).
  - Violão (6 cordas): 6 linhas de corda e `player.play(48)` / `play(55)` para C + 5ª J; baixo com `leftHanded`: o braço espelha (ligação com `x2 < x1`).

- [ ] **Step 2: Run to verify failures**
  Run: `npx vitest run src/ui/screens/IntervalQuiz.test.tsx`
  Expected: FAIL.

- [ ] **Step 3: Implement**
  Segue o formato de `ChoiceQuiz.tsx` (estado `picked`, `useMemo` das posições e da ligação, `useSound`, `useAutoAdvance`). A grade das 12 notas e a equação reaproveitam o estilo dos botões de opção (novas classes `note-grid` e `note-option` em `styles.css`, 4 colunas no celular, 6 a partir do tablet).

- [ ] **Step 4: Run to verify pass**
  Run: `npx vitest run src/ui/screens && npx tsc --noEmit`
  Expected: PASS.

- [ ] **Step 5: Commit**
  `git add src && git commit -m "feat(ui): IntervalQuiz screen with 12 note options, fretboard answer and sequential sound"`

---

### Task 7: Intervalos no Estudar

**Files:**
- Modify: `src/ui/screens/Study.tsx`, `src/ui/modeLabels.ts` (`MODES`), `src/ui/screens/StudyHeader.tsx` (se necessário), `src/styles.css` (faixa de 5 botões no computador)
- Test: `src/ui/screens/Study.test.tsx`, `src/App.test.tsx`, `src/ui/screens/Progress.test.tsx`

**Interfaces:**
- Consumes: Tasks 1–6 (`buildIntervalQueue`, `intervalPitches`, `IntervalQuiz`, `useIntervalFocus`, `FocusSheet` por modo, `SoundApi.preparePitches`).
- Produces:
  - `MODES` ganha `{ mode: 'interval', label: 'Intervalos' }` como 5º item; `modeLabel('interval')` = "Intervalos". Faixa de exercícios do computador comporta 5 botões (`grid-template-columns: repeat(5, 1fr)` ou equivalente); o menu do celular lista 5 itens.
  - `Study` mantém uma segunda fila `intervalQueue: IntervalItem[]` usada só quando `settings.mode === 'interval'`: `questionCount` = `useIntervalFocus().count`; `canStart` exige `intervals.length > 0`; `begin()` monta `buildIntervalQueue(settings.filter.naturalsOnly ? NATURAL_NOTES : ALL_NOTES, settings.intervals, Math.random)`, chama `sound.unlock()` e `sound.preparePitches(...)` com as alturas de todas as perguntas; a pergunta atual vira `<IntervalQuiz key={index} item={...} {...quizProps} />`; o total da barra de progresso usa o tamanho da fila ativa; `handleAnswer` **não** chama `recordAnswer` no modo intervalo; `finish()` grava `makeHistoryEntry('interval', ...)` no histórico do instrumento ativo (sem `level`).
  - Posição forçada vinda do Progresso (`forced`) com o modo `interval` é **ignorada**: a tela começa parada (`phase = 'idle'`).
  - Sem intervalos marcados: aviso "Nenhum intervalo no foco. Abra o Foco e marque ao menos um intervalo." e "Iniciar" desabilitado.

- [ ] **Step 1: Write the failing tests**
  - Cabeçalho: o menu do celular tem "Intervalos"; no computador (`mockViewport(1280)`) a faixa tem 5 botões com `getByRole('button', { name: 'Intervalos' })`; escolher "Intervalos" mostra a descrição do exercício e o Foco com chips de intervalo (sem "Corda 1").
  - Sessão completa (baixo, `intervals: ['5J']`, naturais): "Iniciar" → "Pergunta 1 de 7" (7 notas naturais × 1 intervalo) com 12 botões de nota; responder todas as perguntas (certas e erradas) mostra o resumo "Acertos: X de 7", e o histórico do baixo ganha 1 entrada `mode: 'interval'` (ler do armazenamento); o histórico do violão e o progresso por posição **não** mudam; avançar com o botão "Próxima".
  - Contagem do Foco: `intervals` padrão + naturais mostra "35 perguntas" no resumo; com acidentais, 60.
  - Sem intervalos (`intervals: []`): aviso aparece e "Iniciar" fica desabilitado.
  - Progresso → posição forçada com `mode: 'interval'` salvo: `App` abre o Estudar parado (sem pergunta de posição e sem erro); com outro modo a posição forçada segue funcionando como hoje.
  - Trocar para o violão e voltar: a fila de intervalos é descartada (o Estudar reinicia parado).
  - Regressão: os 4 exercícios antigos funcionam como antes (suíte atual).

- [ ] **Step 2: Run to verify failures**
  Run: `npx vitest run src/ui/screens src/App.test.tsx`
  Expected: FAIL.

- [ ] **Step 3: Implement**
  Ramificar `Study` por modo sem mexer na fila de posições existente; `FocusSheet` já recebe `questionCount` (Task 5). O renderizador da pergunta ganha o ramo `settings.mode === 'interval'`. Ajustar o CSS da faixa de exercícios do computador (5 botões) e conferir que o menu do celular não corta.

- [ ] **Step 4: Run to verify pass**
  Run: `npx vitest run && npx tsc --noEmit`
  Expected: PASS (suíte inteira, incluindo layouts e atalhos).

- [ ] **Step 5: Commit**
  `git add src && git commit -m "feat(ui): Intervalos exercise in Estudar (queue, session, history, 5-button header)"`

---

### Task 8: Verificação final

**Files:**
- Modify: apenas o que a verificação exigir.
- Test: suíte inteira.

**Interfaces:** consome tudo acima; não produz API nova.

- [ ] **Step 1: Full verification**
  Run: `npm test && npm run build`
  Expected: todos os testes passam; `tsc --noEmit` e `vite build` sem erros.

- [ ] **Step 2: Manual check in the browser**
  Skill `run` (`npm run dev`) com as ferramentas do Claude in Chrome. Conferir no baixo e no violão: o botão "Intervalos" (celular e computador, 5 botões sem quebrar); Foco de intervalos (chips, Todos, naturais/acidentais, avanço); uma sessão inteira (pergunta, resposta certa e errada, braço com todas as posições, tracejado, casa 0, rótulos de corda do instrumento), o resumo e o histórico em Progresso; mão esquerda; avanço de 3 s; som ligado (se o ambiente permitir ouvir, as duas notas em sequência; se não, dizer que não foi verificado); dados antigos sem `intervals` no `localStorage` abrem com os padrões.

- [ ] **Step 3: Commit**
  `git add -A && git commit -m "chore: verification fixes for the intervals exercise"` (somente se houve alterações).
