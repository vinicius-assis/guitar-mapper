# M3 Ouvido de intervalos e funcional Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dois exercícios novos na trilha Ouvido: "Ouvir intervalos" (duas notas melódicas, 0–12 semitons, sobe/desce) e "Ouvir graus" (referência da tônica + nota, graus 1–7 da maior), com revisão espaçada por item, níveis, atalhos e alturas sempre dentro da faixa segura do violão e do baixo.

**Architecture:** Um módulo puro novo, `src/domain/earTraining.ts`, define tabelas, níveis, pools de itens, chaves, faixa de ouvido, sorteio de oitava e sequências de som. `SoundProvider` ganha `playSequence` (notas com instante próprio). Duas telas novas (`EarIntervalQuiz`, `DegreeQuiz`) declaram atalhos nos botões (`data-shortcut`), que `useQuizShortcuts` passa a respeitar. O registro (`exercises.ts`/`exercises.tsx`) liga tudo; `storage.ts` aceita os campos, chaves e histórico novos de forma aditiva.

**Tech Stack:** React 19, TypeScript, Vite, Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-11-07-m3-interval-functional-ear-design.md`

## Global Constraints

- Texto da interface em português. Nenhuma biblioteca nova. Celular primeiro.
- O Intervalos escrito (`interval`, `INTERVALS`, `IntervalId`, `DEFAULT_INTERVALS`, chaves `interval:<raiz>:<id>`, `IntervalQuiz`, Foco de intervalos) não muda, nem seus testes.
- `EAR_RANGE`: violão `[45, 76]`, baixo `[33, 60]` (MIDI, inclusivo). Toda altura tocada ou pré-carregada pelos modos novos cai nela.
- Ids e rótulos: `ear-interval` = "Ouvir intervalos"; `ear-degree` = "Ouvir graus". `QUIZ_MODES` = `['position-to-note', 'note-to-position', 'flashcard', 'ear', 'ear-interval', 'ear-degree', 'interval']`; trilha Ouvido = `['ear', 'ear-interval', 'ear-degree']`.
- Chaves por item: `earint:<raiz 0–11>:<semitons 0–12>:<up|down>` (uníssono só `up`); `func:<tônica 0–11>:<grau 1–7>`; sem zeros à esquerda.
- Níveis de intervalo (semitons): `easy [4, 7, 12]`, `medium [2, 3, 4, 5, 7, 9, 12]`, `hard [0..12]`. Níveis de grau: `easy [1, 3, 5]`, `medium [1, 2, 3, 4, 5]`, `hard [1..7]`. Escala maior: `[0, 2, 4, 5, 7, 9, 11]`.
- Tempos: intervalo 0 ms e 900 ms; graus Fácil/Médio tônica 0, 3ª M 400, 5ª J 800, alvo 1800; Difícil tônica 0, alvo 1000.
- Ajustes globais novos: `earIntervalLevel: EarLevel` (padrão `'easy'`), `earIntervalDirection: 'up' | 'down' | 'both'` (padrão `'up'`), `degreeLevel: EarLevel` (padrão `'easy'`). Aditivo em `guitar-mapper:v2`, sem trocar `version`, sem migração, sem regravar ao carregar.
- Histórico: `level` só para `ear`, `ear-interval`, `ear-degree` (padrão `'easy'`).
- Acerto por semitons / grau; a grafia (M2) é só exibição. Sorteios só pelo `rng` injetado.
- Os testes atuais passam; só mudam as asserções de lista exata de modos/trilhas em `src/domain/exercises.test.ts` (o commit diz isso).

## Review Focus

1. Tocar "Ouvir de novo" no meio da sequência: a segunda nota não pode soar duas vezes nem no horário antigo (Task 3 e Task 4).
2. Finalizar ou passar de pergunta antes da nota-alvo: a nota pendente não soa depois (Task 4).
3. Teclado nas telas novas: A–G e o 1–9 posicional antigo não agem nelas; no Ouvido e no Intervalos escrito continuam iguais (Task 4).
4. Histórico salvo com `ear-interval`/`ear-degree` e `level` ausente ou lixo: carrega com `'easy'`, sem perder a entrada (Task 5).
5. Computador (painel de Foco fixo) num modo sem Foco: a tela de início continua com opções, frase da sessão e Iniciar habilitado (Task 5).

---

### Task 1: Domínio `earTraining.ts`

**Files:**
- Create: `src/domain/earTraining.ts`
- Create: `src/domain/earTraining.test.ts`

**Interfaces:**
- Consumes: `INTERVALS` (`intervals.ts`, só leitura de `label`/`name`), `instrumentRange` (`intervals.ts`), `Instrument`, `InstrumentId`, `GUITAR`, `BASS`, `EarLevel` (type, `quiz.ts`), `NoteIndex`.
- Produces (Tasks 2–5):
  - `type EarDirection = 'up' | 'down'`; `type EarDirectionSetting = 'up' | 'down' | 'both'`; `EAR_DIRECTIONS: readonly EarDirectionSetting[] = ['up', 'down', 'both']`
  - `interface EarInterval { semitones: number; label: string; name: string }`; `EAR_INTERVALS: readonly EarInterval[]` (13, índice = semitons); `earInterval(semitones: number): EarInterval`
  - `EAR_INTERVAL_LEVELS: Record<EarLevel, readonly number[]>`; `DEGREE_LEVELS: Record<EarLevel, readonly number[]>`; `MAJOR_SEMITONES: readonly number[]`
  - `interface EarIntervalItem { root: NoteIndex; semitones: number; direction: EarDirection }`; `interface EarIntervalQuestion extends EarIntervalItem { pitches: [number, number] }`
  - `interface DegreeItem { tonic: NoteIndex; degree: number }`; `interface DegreeQuestion extends DegreeItem { tonicMidi: number }`
  - `interface SoundStep { midi: number; atMs: number }`
  - `EAR_RANGE: Record<InstrumentId, [number, number]>`; `earRange(instrument: Instrument): [number, number]`
  - `earIntervalPool(level: EarLevel, direction: EarDirectionSetting): EarIntervalItem[]`
  - `earIntervalKey(item: EarIntervalItem): string`; `isEarIntervalKey(key: string): boolean`
  - `earIntervalPitches(item: EarIntervalItem, instrument: Instrument, rng: () => number): [number, number]`
  - `earIntervalSequence(question: EarIntervalQuestion): SoundStep[]`
  - `degreePool(level: EarLevel): DegreeItem[]`
  - `degreeKey(item: DegreeItem): string`; `isDegreeKey(key: string): boolean`
  - `degreeTonicMidi(tonic: NoteIndex, instrument: Instrument, rng: () => number): number`
  - `degreeTarget(question: DegreeQuestion): number` (= `tonicMidi + MAJOR_SEMITONES[degree - 1]`)
  - `degreeSequence(question: DegreeQuestion, level: EarLevel): SoundStep[]`
  - `shuffled<T>(items: readonly T[], rng: () => number): T[]`
  - `buildEarIntervalQueue(items: readonly EarIntervalItem[], instrument: Instrument, rng: () => number): EarIntervalQuestion[]` (embaralha, depois sorteia as alturas)
  - `buildDegreeQueue(items: readonly DegreeItem[], instrument: Instrument, rng: () => number): DegreeQuestion[]`

Regras:
- `EAR_INTERVALS[0] = { semitones: 0, label: 'Uníssono', name: 'uníssono' }`; `[1..11]` = `label`/`name` de `INTERVALS[i-1]`; `[12] = { semitones: 12, label: '8ª J', name: 'oitava justa' }`. `earInterval(s)` = `EAR_INTERVALS[s]`.
- Pool de intervalo: para raiz 0..11, para semitons do nível em ordem, para direção em `up` antes de `down` (`both` = as duas; `down` = só `down`); semitons 0 gera só `up`, em qualquer ajuste.
- Pool de grau: tônica 0..11 × graus do nível.
- Sorteio de oitava: lista crescente das alturas válidas com a classe pedida; escolhe `cands[Math.min(n - 1, Math.floor(rng() * n))]`. Intervalo `up`: primeira ∈ `[lo, hi − s]`; `down`: primeira ∈ `[lo + s, hi]`; pitches = `[primeira, primeira ± s]`. Tônica ∈ `[lo, hi − 11]`.
- `isEarIntervalKey`: `/^earint:(\d|1[01]):(\d|1[0-2]):(up|down)$/` e rejeita semitons `0` com `down`. `isDegreeKey`: `/^func:(\d|1[01]):([1-7])$/`.

- [ ] **Step 1: Write the failing tests** em `earTraining.test.ts` (use `mulberry32` e `sequence` de `src/test-utils.ts`; `lowRng = () => 0`, `highRng = () => 0.999`):
  - `EAR_INTERVALS` tem 13; rótulos `[0] 'Uníssono'`, `[6] 'Trítono'`, `[12] '8ª J'`; `earInterval(4).name === 'terça maior'`; `INTERVALS` continua com 11 (`INTERVALS.length === 11`).
  - `EAR_RANGE` está dentro de `instrumentRange` para `GUITAR` e `BASS`; `earRange(BASS)` = `[33, 60]`.
  - Tamanho dos pools (`it.each`):

    | nível | up | down | both |
    |---|---|---|---|
    | easy | 36 | 36 | 72 |
    | medium | 84 | 84 | 168 |
    | hard | 156 | 156 | 300 |

    e `degreePool`: easy 36, medium 60, hard 84.
  - Ordem: `earIntervalPool('easy','up').slice(0, 4)` = `[{0,4,up},{0,7,up},{0,12,up},{1,4,up}]`; `earIntervalPool('easy','both').slice(0, 3)` = `[{0,4,up},{0,4,down},{0,7,up}]`; `earIntervalPool('hard','down')[0]` = `{root:0, semitones:0, direction:'up'}`; `degreePool('easy').slice(0, 4)` = `[{0,1},{0,3},{0,5},{1,1}]`.
  - Chaves únicas em cada pool; `earIntervalKey({root:3, semitones:7, direction:'down'}) === 'earint:3:7:down'`; `degreeKey({tonic:11, degree:7}) === 'func:11:7'`.
  - `isEarIntervalKey` true: `'earint:0:0:up'`, `'earint:11:12:down'`, `'earint:3:7:up'`; false: `'earint:12:4:up'`, `'earint:0:13:up'`, `'earint:0:0:down'`, `'earint:01:4:up'`, `'earint:0:4:sobe'`, `'earint:0:4'`, `'interval:0:3M'`. `isDegreeKey` true: `'func:0:1'`, `'func:11:7'`; false: `'func:12:1'`, `'func:0:0'`, `'func:0:8'`, `'func:00:1'`, `'func:-1:3'`, `'func:0:1:x'`. Toda chave de todo pool passa no validador.
  - `earIntervalPitches` (`it.each`):

    | inst | raiz | s | dir | rng 0 | rng 0.999 |
    |---|---|---|---|---|---|
    | GUITAR | 0 | 4 | up | `[48, 52]` | `[72, 76]` |
    | GUITAR | 9 | 7 | down | `[57, 50]` | `[69, 62]` |
    | GUITAR | 4 | 12 | up | `[52, 64]` | `[64, 76]` |
    | BASS | 0 | 12 | up | `[36, 48]` | `[48, 60]` |
    | BASS | 4 | 12 | down | `[52, 40]` | `[52, 40]` |
    | BASS | 7 | 0 | up | `[43, 43]` | `[55, 55]` |
    | BASS | 9 | 7 | up | `[33, 40]` | `[45, 52]` |

  - `degreeTonicMidi` (`it.each`): GUITAR 0 → 48 / 60; GUITAR 9 → 45 / 57; BASS 0 → 36 / 48; BASS 2 → 38 / 38; BASS 9 → 33 / 45 (rng 0 / 0.999).
  - `degreeSequence`: `({tonic:0, degree:5, tonicMidi:48}, 'easy')` = `[{48,0},{52,400},{55,800},{55,1800}]`; `({0,7,45}, 'medium')` = `[{45,0},{49,400},{52,800},{56,1800}]`; `({0,3,48}, 'hard')` = `[{48,0},{52,1000}]`; `({2,7,38}, 'hard')` = `[{38,0},{49,1000}]`. `earIntervalSequence({…, pitches:[57,50]})` = `[{57,0},{50,900}]`.
  - **Faixa (exaustivo):** para `GUITAR` e `BASS`, todo item de `earIntervalPool(level, 'both')` dos 3 níveis com rng `0`, `0.5` e `0.999`: as duas alturas em `earRange`, `pitches[0] % 12 === root`, diferença = `±semitons` conforme a direção; todo item de `degreePool('hard')` × os mesmos rngs: tônica % 12 === tônica, toda altura de `degreeSequence(q, level)` para os 3 níveis dentro da faixa.
  - `buildEarIntervalQueue(pool, GUITAR, mulberry32(3))`: mesmo tamanho, mesmo conjunto de chaves, cada pergunta com `pitches` válidos; `buildDegreeQueue` idem.
- [ ] **Step 2: Run tests to verify they fail**
  Run: `npx vitest run src/domain/earTraining.test.ts`
  Expected: FAIL (módulo inexistente).
- [ ] **Step 3: Implement** `src/domain/earTraining.ts` com as assinaturas e regras acima. `EarLevel` entra como `import type` (evita ciclo com `quiz.ts`).
- [ ] **Step 4: Run tests to verify they pass**
  Run: `npx vitest run src/domain`
  Expected: PASS, inclusive `intervals.test.ts` intacto.
- [ ] **Step 5: Commit**
  ```bash
  git add src/domain/earTraining.ts src/domain/earTraining.test.ts
  git commit -m "feat(domain): ear interval and degree items, keys, safe ranges and sequences"
  ```

---

### Task 2: Armazenamento (ajustes novos e chaves por item)

**Files:**
- Modify: `src/state/storage.ts` (`GlobalSettings`, `DEFAULT_SETTINGS`, `sanitizeSettings`, `isItemKey`, comentário de `InstrumentData.items`)
- Test: `src/state/storage.test.ts`, `src/state/backup.test.ts`

**Interfaces:**
- Consumes: `EarDirectionSetting`, `EAR_DIRECTIONS`, `isEarIntervalKey`, `isDegreeKey` (Task 1); `EarLevel`.
- Produces (Tasks 4–5): `GlobalSettings.earIntervalLevel: EarLevel`, `earIntervalDirection: EarDirectionSetting`, `degreeLevel: EarLevel`, logo em `Settings`.

- [ ] **Step 1: Write the failing tests**
  - `storage.test.ts`, `describe('M3 ear settings (additive v2 fields)')`:
    - `DEFAULT_SETTINGS` tem `earIntervalLevel: 'easy'`, `earIntervalDirection: 'up'`, `degreeLevel: 'easy'`.
    - Save v2 antigo sem os campos (mesmo formato do teste `loads an old v2 save without the new fields`) → os três padrões e `storage.dump()[STORAGE_KEY]` igual ao texto original.
    - `v2Raw({ earIntervalLevel: 'hard', earIntervalDirection: 'both', degreeLevel: 'medium' })` mantém os valores; `it.each(['Hard', 1, null, 'sobe', {}])` em cada campo → padrão.
  - `describe('M3 item keys')`: `v2Raw({}, { items: { [k]: entry } })` com `entry` válida (como os testes de `items` do M1): mantém `'earint:0:0:up'`, `'earint:11:12:down'`, `'func:0:1'`, `'func:11:7'`, e também as antigas `'ear:52'`, `'interval:0:3M'`; descarta `'earint:0:0:down'`, `'earint:12:4:up'`, `'func:0:8'`, `'func:00:1'`, `'earint:0:4'`.
  - `backup.test.ts`: `parseImport(serializeData(d))` com `d.settings.earIntervalDirection = 'down'` e `d.instruments.bass.items = { 'func:3:5': entry }` → `{ ok: true, data: d }`.
- [ ] **Step 2: Run tests to verify they fail**
  Run: `npx vitest run src/state`
  Expected: FAIL nos testes novos.
- [ ] **Step 3: Implement** os três campos (no estilo de `earLevel` em `sanitizeSettings`, com `EAR_DIRECTIONS.includes` para a direção) e `isItemKey` aceitando também `isEarIntervalKey(key) || isDegreeKey(key)`; comentário de `items` passa a citar `earint:` e `func:`.
- [ ] **Step 4: Run tests to verify they pass**
  Run: `npx vitest run src/state`
  Expected: PASS, todos os antigos inclusos.
- [ ] **Step 5: Commit**
  ```bash
  git add src/state/storage.ts src/state/storage.test.ts src/state/backup.test.ts
  git commit -m "feat(storage): M3 ear settings and earint/func item keys"
  ```

---

### Task 3: Som em sequência (`playSequence`)

**Files:**
- Modify: `src/audio/SoundProvider.tsx`
- Test: `src/audio/SoundProvider.test.tsx`

**Interfaces:**
- Consumes: `SoundStep` (Task 1).
- Produces (Task 4): `SoundApi.playSequence(steps: SoundStep[]): void`. `playPitches(midis, gapMs = 700)` passa a chamar `playSequence(midis.map((midi, i) => ({ midi, atMs: i * gapMs })))`.

Comportamento: cancela os timers pendentes; som desligado não toca nada; passo com `atMs <= 0` toca na hora, os outros por `setTimeout(atMs)`; cada nota passa pelo `run` (erro não derruba).

- [ ] **Step 1: Write the failing tests** em `describe('playSequence')` (fake timers, mesmo `mount` do `describe('playPitches / preparePitches')`, probe com botões `arp` → `playSequence([{midi:48,atMs:0},{midi:52,atMs:400},{midi:55,atMs:800},{midi:55,atMs:1800}])`, `two` → `[{60,0},{64,900}]` e `stop` → `playSequence([])`):
  - `arp`: `play` chamado com 48 na hora; após `advanceTimersByTime(399)` 1 chamada; em 400 → 52; em 1800 → chamadas `[48, 52, 55, 55]`.
  - Recomeçar no meio: `arp`, avançar 500 ms, `arp` de novo, avançar 2000 ms → chamadas `[48, 52, 48, 52, 55, 55]` (os 55 da primeira nunca tocam).
  - `two`, avançar 300 ms, `stop`, avançar 1000 ms → só `[60]`.
  - Som desligado: `arp` + 2000 ms → nenhuma chamada.
  - Os testes antigos de `playPitches` passam sem mudança.
- [ ] **Step 2: Run tests to verify they fail**
  Run: `npx vitest run src/audio/SoundProvider.test.tsx`
  Expected: FAIL (`playSequence` não existe).
- [ ] **Step 3: Implement** `playSequence` em `SoundApi` e reescreva `playPitches` sobre ela.
- [ ] **Step 4: Run tests to verify they pass**
  Run: `npx vitest run src/audio`
  Expected: PASS.
- [ ] **Step 5: Commit**
  ```bash
  git add src/audio/SoundProvider.tsx src/audio/SoundProvider.test.tsx
  git commit -m "feat(audio): playSequence with per-note timing"
  ```

---

### Task 4: Telas `EarIntervalQuiz` e `DegreeQuiz`, atalhos declarados

**Files:**
- Create: `src/ui/screens/EarIntervalQuiz.tsx`, `src/ui/screens/EarIntervalQuiz.test.tsx`
- Create: `src/ui/screens/DegreeQuiz.tsx`, `src/ui/screens/DegreeQuiz.test.tsx`
- Modify: `src/ui/useQuizShortcuts.ts`, `src/styles.css` (`.answer-grid`, `.ear-detail`)
- Modify: `src/ui/modeLabels.ts` (textos de nível e direção)

**Interfaces:**
- Consumes: Task 1 (`EAR_INTERVALS`, `earInterval`, `EAR_INTERVAL_LEVELS`, `DEGREE_LEVELS`, `MAJOR_SEMITONES`, `earIntervalSequence`, `degreeSequence`, `degreeTarget`, tipos), Task 2 (settings), Task 3 (`playSequence`), `noteLabel`, `spellInterval`, `spellingLabel`, `intervalById`, `useAutoAdvance`.
- Produces (Task 5):
  - `EarIntervalQuiz(props: { question: EarIntervalQuestion; settings: Settings; onAnswer(correct: boolean): void; onNext(): void })`
  - `DegreeQuiz(props: { question: DegreeQuestion; settings: Settings; onAnswer…; onNext… })`
  - em `modeLabels.ts`: `EAR_INTERVAL_LEVEL_TEXT: Record<EarLevel, string>`, `DEGREE_LEVEL_TEXT: Record<EarLevel, string>`, `EAR_DIRECTION_LABELS: { value: EarDirectionSetting; label: string }[]` = `up 'Sobe'`, `down 'Desce'`, `both 'Os dois'`; `INTERVAL_SHORTCUTS = ['1','2','3','4','5','6','7','8','9','0','q','w','e']`.

Copy exata (`modeLabels.ts`):
- Intervalos: easy `'Três intervalos bem diferentes: 3ª maior, 5ª justa e oitava.'`; medium `'Sete intervalos, os mais comuns em melodias.'`; hard `'Todos os 13, do uníssono à oitava.'`
- Graus: easy `'Graus 1, 3 e 5, depois do arpejo da tônica.'`; medium `'Graus 1 a 5, depois do arpejo da tônica.'`; hard `'Os 7 graus, só com a tônica como referência.'`

Telas (as duas):
- Montar: `sound.playSequence(seq)` uma vez; desmontar: `playSequence([])`. Botão `.ear-play` "Ouvir de novo" (ícone igual ao do `EarQuiz`) toca `seq` de novo, sempre habilitado. `useAutoAdvance(correct, onNext)` (700 ms); errou → `.quiz-actions` com `button.primary` "Próxima".
- Botões de resposta: `div.answer-grid` (4 colunas; 7 no ≥ 768 px para graus fica a cargo do CSS), cada um `button.option` com `data-shortcut`, desabilitado depois de responder, `option--correct`/`option--wrong` como no `EarQuiz`.
- Dica `p.keyboard-hint` só antes de responder.
- Intervalos: título `'Qual é o intervalo?'`; `seq = earIntervalSequence(question)`; botões = `EAR_INTERVAL_LEVELS[settings.earIntervalLevel]` com texto `earInterval(s).label` e `data-shortcut = INTERVAL_SHORTCUTS[i]`; dica `'Teclado: 1–N · R = ouvir de novo'` para N ≤ 9, `'Teclado: 1–9, 0, Q, W, E · R = ouvir de novo'` para 13. Depois de responder: `p.ear-detail` = `` `${nome(p0)} → ${nome(p1)}` `` + (`' · subindo'` | `' · descendo'`, nada no uníssono), `nome = noteLabel(midi % 12, notation, accidentals)`; status `'Correto!'` ou `` `Errado. Era ${name}, subindo.` `` / `descendo` / `'Errado. Era uníssono.'`.
- Graus: título `'Qual grau da escala maior?'`; `seq = degreeSequence(question, settings.degreeLevel)`; botões = `DEGREE_LEVELS[level]`, texto `` `${d}` ``, `aria-label` `` `Grau ${d}` ``, `data-shortcut` `` `${d}` ``; dica `` `Teclado: ${graus.join(', ')} · R = ouvir de novo` ``. Depois: `p.ear-detail` = `` `Tônica ${t} · grau ${d} = ${alvo}` ``, `t = noteLabel(tonic, …)`; `alvo` = no `'auto'` e grau ≥ 2, `spellingLabel(spellInterval(tonic, intervalById(['2M','3M','4J','5J','6M','7M'][d-2]), 'auto'), notation)`, senão `noteLabel(degreeTarget(q) % 12, notation, accidentals)`; status `'Correto!'` ou `` `Errado. Era o grau ${degree}.` ``.

`useQuizShortcuts`: no início do handler (depois das guardas), se o documento tem `[data-shortcut]` e a tecla não é `Enter` nem `r`/`R`: procura `[data-shortcut="${event.key.toLowerCase()}"]`, clica se estiver habilitado, `preventDefault` se clicou, e **retorna** (A–G e o 1–9 posicional não rodam). Atualize o comentário do hook.

Padrão dos testes: `setup` como em `EarQuiz.test.tsx` (`AppProvider` + `SoundProvider player={fakePlayer()}`, `notation = 'cifra'`, `accidentals` opcional), mais um `Harness` que chama `useQuizShortcuts(true)` e renderiza a tela; `vi.useFakeTimers()` nos testes com tempo. `played = () => player.play.mock.calls.map(c => c[0])`.

- [ ] **Step 1: Write the failing tests** em `EarIntervalQuiz.test.tsx` (`UP = { root: 0, semitones: 4, direction: 'up', pitches: [48, 52] }`):
  - `'plays both notes, 900 ms apart'`: `played()` = `[48]`; após 899 ms ainda `[48]`; após 900 → `[48, 52]`.
  - `'shows only the level intervals'`: easy → textos `['3ª M','5ª J','8ª J']`; medium → `['2ª M','3ª m','3ª M','4ª J','5ª J','6ª M','8ª J']`; hard → 13, primeiro `'Uníssono'`, sétimo `'Trítono'`, último `'8ª J'`.
  - `'reveals nothing before answering'`: `queryByText(/C → E/)` e `queryByRole('status')` nulos.
  - `'right answer'`: clicar `'3ª M'` → `onAnswer(true)`, status `'Correto!'`, `getByText('C → E · subindo')`; 700 ms → `onNext` 1 vez.
  - `'wrong answer'`: clicar `'5ª J'` → `onAnswer(false)`, status `'Errado. Era terça maior, subindo.'`, botão `'Próxima'`; 2000 ms → `onNext` não chamado.
  - `'descending, flats'`: `{root:9, semitones:7, direction:'down', pitches:[57,50]}`, medium, `accidentals:'flat'`, clicar `'4ª J'` → `'Errado. Era quinta justa, descendo.'` e `'A → D · descendo'`.
  - `'unison has no direction'`: `{7, 0, 'up', [55,55]}`, hard, clicar `'2ª m'` → `'Errado. Era uníssono.'`, `getByText('G → G')`.
  - `'replay mid-sequence restarts it'`: avançar 500, clicar `'Ouvir de novo'`, avançar 2000 → `played()` = `[48, 48, 52]`.
  - `'unmounting cancels the pending note'`: avançar 300, `unmount()`, avançar 2000 → `[48]`.
  - `'keyboard'`: easy, `keyDown(document, {key:'2'})` → `onAnswer(false)` e `'5ª J'` com `option--wrong`; hard com `{…, semitones:12, pitches:[48,60]}`, `key:'e'` → `onAnswer(true)`; hard, `key:'q'` → o botão `'7ª m'` ficou `option--wrong`; `key:'c'` e `key:'C', shiftKey` não chamam `onAnswer`; `key:'r'` toca de novo (48 mais uma vez).
  - `'hint'`: easy `'Teclado: 1–3 · R = ouvir de novo'`, medium `'Teclado: 1–7 · R = ouvir de novo'`, hard `'Teclado: 1–9, 0, Q, W, E · R = ouvir de novo'`; sumiu depois de responder.
- [ ] **Step 2: Write the failing tests** em `DegreeQuiz.test.tsx` (`Q5 = { tonic: 0, degree: 5, tonicMidi: 48 }`):
  - `'plays the arpeggio and the target'`: easy, após 1800 ms `played()` = `[48, 52, 55, 55]` e após 1799 eram 3; hard com `{0, 3, 48}` → `[48]` em 0 e `[48, 52]` em 1000.
  - `'shows the level degrees'`: easy textos `['1','3','5']` com `getByRole('button', {name:'Grau 3'})`; medium 5; hard 7.
  - `'right answer'`: clicar `'Grau 5'` → `'Correto!'`, `getByText('Tônica C · grau 5 = G')`, `onNext` após 700 ms.
  - `'wrong answer'`: clicar `'Grau 3'` → `'Errado. Era o grau 5.'`, `'Próxima'`; antes do clique, `queryByText(/Tônica/)` nulo.
  - `'names the target'` (`it.each`, grau no nível hard, clicar `'Grau 1'` ou qualquer outro):

    | tônica | grau | acidentais | notação | detalhe |
    |---|---|---|---|---|
    | 6 | 3 | auto | cifra | `Tônica F# · grau 3 = A#` |
    | 6 | 7 | auto | cifra | `Tônica F# · grau 7 = F` |
    | 2 | 7 | auto | cifra | `Tônica D · grau 7 = C#` |
    | 10 | 1 | auto | cifra | `Tônica Bb · grau 1 = Bb` |
    | 6 | 3 | auto | solfejo | `Tônica Fá# · grau 3 = Lá#` |
    | 3 | 3 | sharp | cifra | `Tônica D# · grau 3 = G` |
    | 3 | 3 | flat | cifra | `Tônica Eb · grau 3 = G` |

    (`tonicMidi` = qualquer altura da classe, ex. `48 + tonic`.)
  - `'keyboard'`: easy com `Q5`, `key:'3'` → `onAnswer(false)`; `key:'2'` → nada; `key:'5'` numa pergunta nova → `onAnswer(true)`; dica easy `'Teclado: 1, 3, 5 · R = ouvir de novo'`, hard `'Teclado: 1, 2, 3, 4, 5, 6, 7 · R = ouvir de novo'`.
  - `'unmounting cancels the target'`: easy, avançar 1000, `unmount`, avançar 2000 → `[48, 52, 55]`.
- [ ] **Step 3: Run tests to verify they fail**
  Run: `npx vitest run src/ui/screens/EarIntervalQuiz.test.tsx src/ui/screens/DegreeQuiz.test.tsx`
  Expected: FAIL (telas inexistentes).
- [ ] **Step 4: Implement** as duas telas, as constantes de `modeLabels.ts`, o ramo de `data-shortcut` em `useQuizShortcuts` e o CSS (`.answer-grid` grid de 4 colunas com `gap: 8px; margin-top: 16px`, botões `.option` com `min-height: 48px`; `.ear-detail` centralizado).
- [ ] **Step 5: Run tests to verify they pass**
  Run: `npx vitest run src/ui`
  Expected: PASS, inclusive os atalhos antigos de `EarQuiz.test.tsx`, `IntervalQuiz.test.tsx` e `Study.test.tsx`.
- [ ] **Step 6: Commit**
  ```bash
  git add src/ui/screens/EarIntervalQuiz.tsx src/ui/screens/EarIntervalQuiz.test.tsx src/ui/screens/DegreeQuiz.tsx src/ui/screens/DegreeQuiz.test.tsx src/ui/useQuizShortcuts.ts src/ui/modeLabels.ts src/styles.css
  git commit -m "feat(ui): ear interval and degree quiz screens with declared shortcuts"
  ```

---

### Task 5: Registro dos modos, sessão, histórico e tela de início

**Files:**
- Modify: `src/domain/quiz.ts` (`QuizMode` + `'ear-interval' | 'ear-degree'`)
- Modify: `src/domain/exercises.ts` (`ExerciseMeta.usesFocus`, metas novas, `QUIZ_MODES`, `TRACKS`)
- Modify: `src/domain/session.ts` (`LEVELED_MODES`, `makeHistoryEntry`)
- Modify: `src/state/storage.ts` (`sanitizeHistory` usa `LEVELED_MODES`)
- Modify: `src/ui/exercises.tsx` (`QuizItem`, `Exercise.historyLevel`, exercícios novos e `Options`)
- Modify: `src/ui/screens/Study.tsx` (sem `FocusSheet` quando `!exercise.usesFocus`; nível do histórico por `exercise.historyLevel?.(settings)`)
- Test: `src/domain/exercises.test.ts`, `src/domain/session.test.ts`, `src/state/storage.test.ts`, `src/ui/exercises.test.tsx`, `src/ui/screens/Study.test.tsx`, `src/ui/screens/Progress.test.tsx`

**Interfaces:**
- Consumes: tudo das Tasks 1–4.
- Produces: `ExerciseMeta.usesFocus: boolean` (true nos 5 antigos, false nos novos); `Exercise.historyLevel?(settings: Settings): EarLevel` (`ear` → `earLevel`, `ear-interval` → `earIntervalLevel`, `ear-degree` → `degreeLevel`); `LEVELED_MODES: readonly QuizMode[] = ['ear', 'ear-interval', 'ear-degree']`; `makeHistoryEntry(mode, at, results, level?)` põe `level: level ?? 'easy'` só se `LEVELED_MODES.includes(mode)`.

Exercícios novos (`ui/exercises.tsx`):
- `itemKey`: `earIntervalKey` / `degreeKey` sobre o item.
- `questionCount`: tamanho de `earIntervalPool(earIntervalLevel, earIntervalDirection)` / `degreePool(degreeLevel)`.
- `startBlockers`: `[EAR_WITHOUT_SOUND]` se o som está desligado, senão `[]`. `startsFromPosition: () => false`.
- `buildQueue(ctx)`: `reviewSubset(ctx, pool, key)` e então `buildEarIntervalQueue`/`buildDegreeQueue(selecionados, ctx.instrument, ctx.rng)`.
- `prepareSound`: `sound.preparePitches` com todas as alturas da fila: intervalos, os dois `pitches` de cada pergunta; graus, as quatro alturas `tonicMidi`, `tonicMidi + 4`, `tonicMidi + 7`, `degreeTarget(q)` de cada pergunta (o `prepareSound` não recebe o nível; o Difícil usa um subconjunto delas).
- `Options`: `EarIntervalOptions` = `.level-bar` "Nível" (rótulos de `EAR_LEVELS`) → `updateSettings({ earIntervalLevel })`, `p.mode-description` com `EAR_INTERVAL_LEVEL_TEXT`, e `.level-bar` `aria-label="Direção"` com `EAR_DIRECTION_LABELS` → `earIntervalDirection`; `DegreeOptions` = nível + `DEGREE_LEVEL_TEXT`.
- `Quiz`: adaptadores que passam `item` como `question`.
- Descrições de `EXERCISE_META` exatamente as da spec, seção 1.

- [ ] **Step 1: Update/write the failing tests**
  - `src/domain/exercises.test.ts`: `QUIZ_MODES` = a lista das Global Constraints; `TRACKS` Ouvido = `['ear','ear-interval','ear-degree']` e `flatMap` = `QUIZ_MODES`; `EXERCISE_META['ear-interval'].label === 'Ouvir intervalos'`, `['ear-degree'].label === 'Ouvir graus'`; os dois com `recordsPositionProgress: false` e `usesFocus: false`; os 5 antigos com `usesFocus: true`. (Só esta lista exata muda entre os testes antigos.)
  - `session.test.ts`: `makeHistoryEntry('ear-interval', 1, results, 'medium')?.level === 'medium'`; `makeHistoryEntry('ear-degree', 1, results)?.level === 'easy'`; `'interval'` com `'hard'` sem `level`.
  - `storage.test.ts` (`describe('history level')`): `{ mode: 'ear-interval', level: 'hard' }` → `'hard'`; `{ mode: 'ear-degree' }` → `'easy'`; `{ mode: 'ear-degree', level: 'x' }` → `'easy'`; `v2Raw({ mode: 'ear-degree' })` → `settings.mode === 'ear-degree'`.
  - `ui/exercises.test.tsx`, `describe('ouvir intervalos e graus')` com `makeCtx`:
    - `questionCount`: `{earIntervalLevel:'easy', earIntervalDirection:'up'}` 36; `'both'` 72; `{hard, both}` 300; `degreeLevel` easy/medium/hard 36/60/84.
    - `startBlockers` com `soundEnabled: false` = `['Ligue o Som em Ajustes para treinar de ouvido.']`; com som = `[]`; `startsFromPosition` false.
    - `buildQueue({ ...ctx, progress: {}, limit: 20, now: 0 })` para GUITAR e BASS (`instrument: BASS`), níveis hard/both e degree hard: 20 itens, `itemKey` distintos, todos no pool, todas as alturas em `earRange(instrument)`.
    - Revisão prioriza: com `progress` marcando 300 − 5 itens como não vencidos (`nextReview: 10`, `now: 0`) e 5 vencidos (`nextReview: 0`, … `box: 1`), os 5 vencidos estão na fila.
    - `itemKey({root:0, semitones:4, direction:'up', pitches:[48,52]}, GUITAR) === 'earint:0:4:up'`; `itemKey({tonic:0, degree:5, tonicMidi:48}, GUITAR) === 'func:0:5'`.
    - `prepareSound` com `{ preparePitches: vi.fn() }`: intervalo `[[48,52]]` → `[48, 52]`; grau `[{0,5,48}]` → `[48, 52, 55, 55]`.
    - `historyLevel`: `ear` → `settings.earLevel`, `ear-interval` → `earIntervalLevel`, `ear-degree` → `degreeLevel`.
  - `Study.test.tsx`, `describe('ouvir intervalos e graus')` (use os helpers de render/menu do arquivo):
    - Escolher "Ouvir intervalos" no menu: sem `group` "Foco"; texto `'Sessão de 20 perguntas'`; botões de nível e `group` "Direção"; clicar `'Médio'` → `readRawSettings(storage).earIntervalLevel === 'medium'` e a descrição `'Sete intervalos, os mais comuns em melodias.'` aparece; `'Os dois'` → `'both'`.
    - Som desligado (`seededStorage({ settings: { soundEnabled: false, mode: 'ear-degree' } })`): mensagem do som e Iniciar desabilitado.
    - Iniciar em `ear-interval`: `'Pergunta 1 de 20'`, `'Qual é o intervalo?'`; responder → o `items` salvo do instrumento ativo ganha uma chave que começa com `'earint:'`; Finalizar e confirmar → histórico com `{ mode: 'ear-interval', level: 'easy' }`.
    - Mesmo fluxo em `ear-degree` com `degreeLevel: 'hard'` → `'Qual grau da escala maior?'`, chave `'func:'`, histórico `level: 'hard'`.
    - Computador (`mockViewport(1280)`), modo `ear-degree`: sem `group` "Foco", `'Sessão de 20 perguntas'` e Iniciar habilitado.
    - Uma posição vinda do Progresso (`forced`) com modo `ear-interval` não inicia (tela de início).
  - `Progress.test.tsx`: histórico com `{ mode: 'ear-interval', level: 'medium', … }` mostra `'Ouvir intervalos · Médio'`.
- [ ] **Step 2: Run tests to verify they fail**
  Run: `npx vitest run src/domain src/state src/ui`
  Expected: FAIL nos testes novos/atualizados.
- [ ] **Step 3: Implement** as mudanças listadas em **Files** e **Interfaces**. `EXERCISES` ganha `'ear-interval'` e `'ear-degree'`.
- [ ] **Step 4: Run tests to verify they pass**
  Run: `npx vitest run`
  Expected: PASS, todos.
- [ ] **Step 5: Commit**
  ```bash
  git add src/domain src/state src/ui
  git commit -m "feat: register ear interval and degree modes (review, history level, no focus card)

  exercises.test.ts: the exact mode and track lists now include the two new modes."
  ```

---

### Task 6: Verificação final

**Files:** nenhum novo; só corrige o que as verificações apontarem.

- [ ] **Step 1: Suite inteira**
  Run: `npm test`
  Expected: `Tests  N passed (N)`, 0 falhas.
- [ ] **Step 2: Intervalos escrito intocado**
  Run: `git diff main -- src/domain/intervals.ts src/domain/intervals.test.ts src/ui/screens/IntervalQuiz.tsx src/ui/screens/IntervalQuiz.test.tsx src/ui/useIntervalFocus.ts`
  Expected: saída vazia.
- [ ] **Step 3: Nenhuma asserção antiga removida fora da lista de modos**
  Run: `git diff main -- src | grep -E '^-\s*expect\('`
  Expected: só as linhas de `QUIZ_MODES`/`TRACKS` em `src/domain/exercises.test.ts`.
- [ ] **Step 4: Tipos e build**
  Run: `npm run build`
  Expected: `tsc` sem erros e `vite build` concluído.
- [ ] **Step 5: Conferência manual** com `npm run dev` no celular (ou viewport 390 px): Ouvir intervalos Difícil mostra 13 botões em 4 colunas sem rolagem horizontal; trocar para Baixo e ouvir que as notas não ficam embaçadas; Ouvir graus Fácil toca arpejo e alvo.
- [ ] **Step 6: Commit** (só se algo foi corrigido)
  ```bash
  git commit -am "fix: address M3 final checks"
  ```
