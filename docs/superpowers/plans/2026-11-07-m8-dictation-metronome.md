# M8 Ditado melódico e metrônomo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Um exercício novo na trilha Ouvido — "Ditado melódico" (o app toca 4, 6 ou 8 notas de uma escala dentro de um desenho do M4 e da faixa de ouvido do M3; o aluno toca as notas no braço, na ordem, acerto pela altura exata em qualquer corda, violão e baixo, revisão espaçada por item) — e um metrônomo em Ajustes (40–220 BPM, acento opcional, clique sintetizado agendado no relógio do `AudioContext`, para ao esconder a aba e ao sair da tela).

**Architecture:** `src/domain/dictation.ts` (puro) gera a melodia a partir de `scaleBox` + `EAR_RANGE` e traz itens, chaves, fila, sequência de som e o classificador de toque; `storage.ts` só aceita as chaves e os ajustes novos. O metrônomo tem três camadas: `src/audio/metronomeClock.ts` (a função pura `scheduleWindow`), `src/audio/metronome.ts` (motor com `AudioContext` e timer injetados, clique por oscilador) e `src/ui/Metronome.tsx` (seção em Ajustes, `visibilitychange`, desmonte). A tela `DictationQuiz` segue `ScalePlayQuiz`/`EarIntervalQuiz`, e o registro liga o modo na trilha Ouvido.

**Tech Stack:** React 19, TypeScript, Vite (PWA), Vitest + Testing Library (jsdom), Web Audio.

**Spec:** `docs/superpowers/specs/2026-11-07-m8-dictation-metronome-design.md`

## Global Constraints

- Texto da interface em português. Nenhuma biblioteca nova. Celular primeiro: braço sempre com `fit` e `minFretWidth={40}`; nada passa de 360 px nem provoca rolagem horizontal; botões do metrônomo com `min-height: 48px`.
- **Sem reformatação:** não rode formatador nem mude aspas, vírgulas finais ou quebras em código que a tarefa não precisa mudar. Arquivos novos: aspas simples, 2 espaços, `;`. O diff de cada arquivo existente contém só as linhas da tarefa.
- **Não mudam:** `src/domain/{scales,scaleItems,earTraining,pitch,fretboard}.ts`, `src/audio/player.ts`, `src/audio/SoundProvider.tsx`, `src/ui/{Fretboard,useQuizShortcuts,useAutoAdvance,scaleText}.ts(x)`, `vite.config.ts`, `public/`, as telas existentes e seus testes (exceto `Settings.tsx`, que só ganha a seção).
- Os 17 exercícios atuais não mudam; só mudam asserções de **lista exata**: `src/domain/exercises.test.ts` (`QUIZ_MODES`, trilha Ouvido) e `src/ui/screens/Study.test.tsx` (`'lists the 17 exercises…'`/`'shows the 17 exercises as buttons…'` viram "18", listas com `'Ditado melódico'` depois de `'Ouvir graus'`, `labels('Ouvido')`, contagem de `aria-checked`).
- Id e rótulo: `dictation` = "Ditado melódico". `QUIZ_MODES` = os 17 atuais + `'dictation'` no fim. `TRACKS` Ouvido = `['ear', 'ear-interval', 'ear-degree', 'dictation']`; nenhuma `TrackId` nova. `LEVELED_MODES` = `['ear', 'ear-interval', 'ear-degree', 'dictation']`.
- Níveis (`DICTATION_LEVELS`): `easy` = `{ scales: ['pent-major', 'pent-minor'], length: 4, maxStep: 2 }`; `medium` = `{ scales: ['major', 'minor'], length: 6, maxStep: 2 }`; `hard` = `{ scales: ['major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian'], length: 8, maxStep: 3 }`. Pools (script): 24, 24, 84.
- Chave `dict:<escala>:<0–11>:<4|6|8>`, escala do nível daquele tamanho, sem zeros à esquerda. Ajustes novos: `dictationLevel` (padrão `'easy'`), `metronomeBpm` (inteiro 40–220, padrão 80), `metronomeBeats` (1|2|3|4|6, padrão 4). Aditivo em `guitar-mapper:v2`, sem trocar `version`, sem migração, sem regravar ao carregar.
- Som do ditado: `DICTATION_GAP_MS = 600`; avanço `dictationAdvanceMs(n) = (n − 1) × 600 + 1000` (4 → 2800, 6 → 4000, 8 → 5200). Desmontar a tela chama `playSequence([])`.
- Metrônomo: `TICK_MS = 25`, `LOOK_AHEAD_S = 0.1`, `START_DELAY_S = 0.05`, `LATE_S = 0.05`, `BPM_MIN = 40`, `BPM_MAX = 220`, `BPM_DEFAULT = 80`, `BEATS_OPTIONS = [1, 2, 3, 4, 6]`, `BEATS_DEFAULT = 4`; clique 1600 Hz (acento) / 1000 Hz, ganho 0.0001 → pico (1 acento, 0.6 normal) em +2 ms → 0.0001 em +50 ms, `stop` em +60 ms. Independente do ajuste Som; `AudioContext` próprio.
- Mensagens: `'Ligue o Som em Ajustes para treinar de ouvido.'` (constante `EAR_WITHOUT_SOUND` existente); `'Este navegador não toca o metrônomo.'`.
- Nenhuma cor nova. Se surgir uma, ela vai nos dois temas (`:root` escuro e `@media (prefers-color-scheme: light)`) com contraste ≥ 4,5:1 calculado por script e registrado no commit.
- Nenhum `data-shortcut` novo (o `useQuizShortcuts` continua achando atalhos via `dataset`); nenhum botão do metrônomo usa a classe `start`.
- Tabelas de teste coladas literalmente (geradas por script Python independente na escrita deste plano, que reimplementa `scaleBox` e a geração); nunca recalculadas com o código testado.
- **TDD estrito com checagem de mutação:** em toda lógica de acerto, geração e agendamento, depois do verde, introduza à mão cada mutação listada no passo "Mutation check", rode o teste, confirme que **falha**, e desfaça (`git diff` limpo dessas mutações antes do commit).

## Review Focus

1. **Som final cortado pelo avanço (bug do M7):** depois do acerto, todas as notas da melodia final tocam antes de `onNext`; teste por tique em `dictationAdvanceMs(n) − 1` e `dictationAdvanceMs(n)` para 4 e 8 notas (Task 5).
2. **Nada revelado antes de terminar:** antes do fim, só `.mark--root` sem `text` e casas tocadas como `.mark--scale` sem `text`; nenhum `aria-label`/`title`/`data-*` com altura, nome ou grau; o texto da tela não contém os nomes da melodia (Task 5).
3. **Som parado ao sair:** desmontar o ditado com o `SoundProvider` montado não toca mais nada; desmontar a seção do metrônomo, esconder a aba ou trocar de aba do app chamam `stop()` e param os osciladores pendentes (Tasks 3, 4, 5).
4. **Encaixe e baixo:** `DictationQuiz` passa `fit` + `minFretWidth={40}` (espião do `Fretboard`); no baixo usa o braço de 4 cordas e `EAR_RANGE` 33–60, sem bloqueio (Tasks 1, 5, 6).
5. **Relógio:** sem cliques duplicados entre chamadas, troca de andamento no próximo clique, cliques atrasados pulados sem rajada e com o acento no lugar; o resto é a conferência manual no iPhone e no Android (Tasks 2, 6).

---

### Task 1: Domínio do ditado + chave + ajuste de nível

**Files:**
- Create: `src/domain/dictation.ts`, `src/domain/dictation.test.ts`
- Modify: `src/state/storage.ts` (uma linha em `isItemKey`; `dictationLevel` em `GlobalSettings`, `DEFAULT_SETTINGS`, `sanitizeSettings`; `dict:` no comentário de `items`)
- Test: `src/state/storage.test.ts`, `src/state/backup.test.ts`

**Interfaces:**
- Consumes: `scaleBox`, `SCALES`, `isScaleId`, `scaleDegreeOf`, `type ScaleId` (`scales.ts`); `earRange`, `shuffled`, `type SoundStep` (`earTraining.ts`); `pitchOf` (`pitch.ts`); `type Instrument`, `GUITAR`, `BASS`; `type EarLevel` (`quiz.ts`); `type Position`.
- Produces (Tasks 5–6):
  - `DICTATION_GAP_MS = 600`
  - `interface DictationLevelDef { scales: readonly ScaleId[]; length: 4 | 6 | 8; maxStep: 2 | 3 }`; `DICTATION_LEVELS: Record<EarLevel, DictationLevelDef>` (Global Constraints)
  - `interface DictationItem { scale: ScaleId; root: NoteIndex; length: number }`; `interface DictationQuestion extends DictationItem { box: number; pitches: number[] }`
  - `dictationPool(level: EarLevel): DictationItem[]` (escalas do nível na ordem × tônica 0..11)
  - `dictationKey(item): string`; `isDictationKey(key: string): boolean`
  - `dictationNotes(scale, box, root, instrument): number[]` (alturas distintas do `scaleBox` dentro de `earRange`, crescente)
  - `dictationMelody(item: DictationItem, box: number, instrument, rng): number[]`
  - `dictationQuestion(item, instrument, rng): DictationQuestion` (sorteia o desenho, depois a melodia)
  - `buildDictationQueue(items, instrument, rng): DictationQuestion[]` (`shuffled`, depois `dictationQuestion`)
  - `dictationSequence(q): SoundStep[]` (nota i em `i × 600`)
  - `dictationAdvanceMs(length: number): number`
  - `isDictationTap(q: DictationQuestion, index: number, p: Position, instrument): boolean` (`pitchOf(p, instrument) === q.pitches[index]`)

Regras: todo sorteio é `arr[Math.min(arr.length - 1, Math.floor(rng() * arr.length))]`. Ordem dos sorteios em `dictationQuestion`: desenho em `1..boxCount`, depois em `dictationMelody` a primeira nota entre os índices de `dictationNotes` cuja classe é a tônica, depois, para cada nota seguinte, entre os índices `j` (crescentes) com `1 ≤ |j − atual| ≤ maxStep` dentro da lista. `maxStep` vem do nível cujo `length` é `item.length`. Validador `/^dict:([a-z-]+):(\d|1[01]):([468])$/` + existe nível com esse `length` cuja lista contém a escala.

- [ ] **Step 1: Write the failing tests** em `dictation.test.ts` (`const C = (v: number) => () => v;` e um `mulberry32(seed)` local para o gerador semeado):
  - `DICTATION_LEVELS` igual às Global Constraints; `dictationPool('easy').length === 24`, `('medium')` 24, `('hard')` 84; `dictationPool('easy')[0]` = `{ scale: 'pent-major', root: 0, length: 4 }`; `dictationPool('hard')[83]` = `{ scale: 'locrian', root: 11, length: 8 }`.
  - Literais de `dictationNotes`: `('pent-minor', 1, 9, GUITAR)` = `[45, 48, 50, 52, 55, 57, 60, 62, 64, 67, 69, 72]`; `('pent-major', 3, 1, BASS)` = `[34, 37, 39, 41, 44, 46]`; `('major', 1, 0, GUITAR)` = `[48, 50, 52, 53, 55, 57, 59, 60, 62, 64, 65, 67, 69, 71, 72, 74, 76]` (sem o 77).
  - Literais de `dictationMelody(item, box, inst, C(v))`:

    | item | desenho | inst | `v = 0` | `v = 0.999999` |
    |---|---|---|---|---|
    | pent-minor, 9, 4 | 1 | GUITAR | `[45, 48, 45, 48]` | `[69, 72, 69, 72]` |
    | pent-minor, 9, 4 | 1 | BASS | `[33, 36, 33, 36]` | `[45, 50, 48, 50]` |
    | major, 0, 6 | 1 | GUITAR | `[48, 50, 48, 50, 48, 50]` | `[72, 76, 74, 76, 74, 76]` |
    | dorian, 2, 8 | 2 | GUITAR | `[62, 57, 52, 53, 52, 53, 52, 53]` | `[74, 76, 74, 76, 74, 76, 74, 76]` |
    | pent-major, 1, 4 | 3 | BASS | `[37, 34, 37, 34]` | `[37, 41, 46, 44]` |

    e `dictationMelody({ scale: 'pent-minor', root: 9, length: 4 }, 1, GUITAR, C(0.5))` = `[57, 60, 62, 64]`.
  - **Exaustivo** (`describe.each` instrumento × nível; dentro, escala × tônica × desenho `1..boxCount` × `v ∈ {0, 0.5, 0.999999}`, 5256 casos, e mais 50 sorteios de `mulberry32(1)` por instrumento × nível): `m.length === length`; toda nota em `[lo, hi]` de `earRange`; `scaleDegreeOf(m % 12, root, scale) >= 0`; toda nota em `dictationNotes(...)`; `m[0] % 12 === root`; `m[i] !== m[i + 1]`; distância de índice em `dictationNotes` entre vizinhas ≤ `maxStep`. Também: todo desenho tem `dictationNotes(...).length >= 10` no violão e `>= 6` no baixo, e ao menos 1 tônica.
  - `dictationQuestion({ scale: 'major', root: 0, length: 8 }, GUITAR, C(0)).box === 1`; com `C(0.999999)` `=== 7`; `pent-minor` com `C(0.999999)` `=== 5`.
  - `buildDictationQueue(dictationPool('easy'), BASS, mulberry32(7))`: 24 perguntas, chaves distintas, toda nota em `[33, 60]`.
  - `dictationSequence({ ..., pitches: [57, 60, 62, 64] })` = `[{midi:57,atMs:0},{midi:60,atMs:600},{midi:62,atMs:1200},{midi:64,atMs:1800}]`; `dictationAdvanceMs(4) === 2800`, `(6) === 4000`, `(8) === 5200`; para todo n, `dictationAdvanceMs(n) > dictationSequence(...).at(-1).atMs`.
  - **Independente da corda:** `q = { scale: 'major', root: 0, length: 6, box: 1, pitches: [60, 64, 65, 69, 72, 71] }`: `isDictationTap(q, 4, {string:1,fret:8}, GUITAR)` e `({string:2,fret:13})` true; `(q, 4, {string:3,fret:5})` false (60, outra nota); `(q, 0, {string:4,fret:10})` e `(q, 0, {string:2,fret:1})` true (60 em duas cordas); `(q, 0, {string:5,fret:3})` false (48, mesma classe em outra oitava).
  - Chaves: `dictationKey({ scale: 'pent-minor', root: 9, length: 4 }) === 'dict:pent-minor:9:4'`. `isDictationKey` true: `'dict:pent-minor:9:4'`, `'dict:major:0:6'`, `'dict:major:0:8'`, `'dict:locrian:11:8'`; false: `'dict:pent-minor:9:6'`, `'dict:dorian:0:6'`, `'dict:blues:0:4'`, `'dict:major:12:6'`, `'dict:major:01:6'`, `'dict:major:0:5'`, `'dict:major:0'`, `'dictation:major:0:6'`. Toda chave dos três pools passa e é única.
- [ ] **Step 2: Write the failing storage tests**
  - `storage.test.ts`, `describe('M8')`: mantém `'dict:major:0:6'` e uma antiga `'arp:dorian:2:3'`; descarta `'dict:dorian:0:6'`. `v2Raw({ dictationLevel: 'hard' })` → `'hard'`; `'x'` e ausente → `'easy'`. Um save v2 sem campos novos continua com `storage.dump()[STORAGE_KEY]` igual ao texto original após carregar.
  - `backup.test.ts`: `parseImport(serializeData(d))` com `d.instruments.bass.items = { 'dict:pent-minor:9:4': entry }` e `d.settings.dictationLevel = 'medium'` → `{ ok: true, data: d }`.
- [ ] **Step 3: Run tests to verify they fail**
  Run: `npx vitest run src/domain/dictation.test.ts src/state`
  Expected: FAIL (módulo inexistente; chave descartada; campo ausente).
- [ ] **Step 4: Implement** `dictation.ts`; em `storage.ts` acrescente `if (isDictationKey(key)) return true;` em `isItemKey` e o campo `dictationLevel` (com `EAR_LEVELS`, como `degreeLevel`). Só acrescente linhas.
- [ ] **Step 5: Run tests to verify they pass**
  Run: `npx vitest run src/domain src/state`
  Expected: PASS, antigos inclusos.
- [ ] **Step 6: Mutation check:** filtro de faixa removido de `dictationNotes`; primeira nota sem exigir tônica; candidatos incluindo `j === atual`; `maxStep` fixo em 3; `isDictationTap` comparando `% 12`; `isDictationKey` aceitando qualquer tamanho para qualquer escala; sorteio do desenho com `boxCount − 1`. Cada uma deve falhar; desfaça.
- [ ] **Step 7: Commit**
  ```bash
  git add src/domain/dictation.ts src/domain/dictation.test.ts src/state/storage.ts src/state/storage.test.ts src/state/backup.test.ts
  git commit -m "feat(domain): melodic dictation inside scale boxes and the ear range"
  ```

---

### Task 2: Agendador puro do metrônomo (`scheduleWindow`)

**Files:**
- Create: `src/audio/metronomeClock.ts`, `src/audio/metronomeClock.test.ts`

**Interfaces:**
- Produces (Tasks 3–4): constantes das Global Constraints (`TICK_MS`, `LOOK_AHEAD_S`, `START_DELAY_S`, `LATE_S`, `BPM_MIN`, `BPM_MAX`, `BPM_DEFAULT`, `BEATS_OPTIONS`, `BEATS_DEFAULT`); `interface ClockState { last: number | null; startAt: number; beat: number }`; `interface Click { time: number; accent: boolean }`; `interface WindowInput { now: number; lookAhead: number; bpm: number; beatsPerBar: number }`; `scheduleWindow(state: ClockState, input: WindowInput): { clicks: Click[]; state: ClockState }`; `clampBpm(value: unknown): number` (não-número/NaN → 80; `Math.round`, depois limites 40–220).

Algoritmo (não determinado pelos testes sozinho):

```ts
const spb = 60 / bpm;
let t = last === null ? startAt : last + spb;
while (t < now - LATE_S) { last = t; beat++; t = last + spb; }      // pulados, contam no compasso
while (t < now + lookAhead) { clicks.push({ time: t, accent: beatsPerBar > 1 && beat % beatsPerBar === 0 }); last = t; beat++; t = last + spb; }
```

- [ ] **Step 1: Write the failing tests** (`toBeCloseTo(x, 9)` para tempos):
  - `'first click'`: `scheduleWindow({ last: null, startAt: 1, beat: 0 }, { now: 1, lookAhead: 0.1, bpm: 120, beatsPerBar: 4 })` → clicks `[{ time: 1, accent: true }]`, state `{ last: 1, startAt: 1, beat: 1 }`.
  - `'no duplicates across calls'`: com o state devolvido, `now: 1` → `[]`; `now: 1.3` → `[]`; `now: 1.45` → `[{ time: 1.5, accent: false }]`; de novo `now: 1.45` → `[]`.
  - `'wide window and accent pattern'`: `{ last: null, startAt: 1, beat: 0 }`, `{ now: 1, lookAhead: 2, bpm: 120, beatsPerBar: 3 }` → tempos `[1, 1.5, 2, 2.5]`, acentos `[true, false, false, true]`, state `{ last: 2.5, beat: 4 }`.
  - `'no accent'`: o mesmo com `beatsPerBar: 1` → todos `accent: false`.
  - `'tempo change applies to the next click'`: de `{ last: 1.5, startAt: 1, beat: 2 }`, `bpm: 60`, `now: 2.45` → `[2.5]`; `bpm: 240`, `now: 1.7` → `[1.75]`.
  - `'late clicks are skipped, bar kept'`: `{ last: 1, startAt: 1, beat: 1 }`, `{ now: 3, lookAhead: 0.1, bpm: 120, beatsPerBar: 4 }` → `[{ time: 3, accent: true }]`, `state.beat === 5`. Tolerância: `{ last: null, startAt: 1, beat: 0 }`, `now: 1.03` → `[{ time: 1, accent: true }]`.
  - `'simulated run'`: `startAt: 0.05`, `now = i * 0.025` para `i = 0..399`, `lookAhead 0.1`, `bpm 120`, `beatsPerBar 4`: 21 cliques, de `0.05` a `10.05`, estritamente crescentes, diferenças `≈ 0.5`, acentos a cada 4. Com `bpm = now < 5 ? 120 : 60`: 16 cliques, tempos `[0.05, 0.55, 1.05, 1.55, 2.05, 2.55, 3.05, 3.55, 4.05, 4.55, 5.05, 6.05, 7.05, 8.05, 9.05, 10.05]`.
  - `clampBpm`: `39 → 40`, `221 → 220`, `80.4 → 80`, `80.5 → 81`, `NaN → 80`, `'120' → 80`, `undefined → 80`.
- [ ] **Step 2: Run tests to verify they fail**
  Run: `npx vitest run src/audio/metronomeClock.test.ts`
  Expected: FAIL (módulo inexistente).
- [ ] **Step 3: Implement** `metronomeClock.ts`.
- [ ] **Step 4: Run tests to verify they pass**
  Run: `npx vitest run src/audio/metronomeClock.test.ts`
  Expected: PASS.
- [ ] **Step 5: Mutation check:** `<=` em vez de `<` no laço de agendamento; próximo calculado de `startAt + beat * spb` (ignora troca de andamento); laço de atrasados sem `beat++`; atrasados agendados em vez de pulados; acento com `beat % beatsPerBar === 1`. Cada uma deve falhar; desfaça.
- [ ] **Step 6: Commit**
  ```bash
  git add src/audio/metronomeClock.ts src/audio/metronomeClock.test.ts
  git commit -m "feat(audio): pure look-ahead metronome scheduler"
  ```

---

### Task 3: Motor do metrônomo (clique sintetizado)

**Files:**
- Create: `src/audio/metronome.ts`, `src/audio/metronome.test.ts`

**Interfaces:**
- Consumes: Task 2.
- Produces (Task 4):
  - `interface OscillatorLike { frequency: { value: number }; connect(node: unknown): void; start(when: number): void; stop(when?: number): void }`
  - `interface GainLike { gain: { setValueAtTime(v: number, t: number): void; exponentialRampToValueAtTime(v: number, t: number): void }; connect(node: unknown): void }`
  - `interface ClickContextLike { currentTime: number; state: string; destination: unknown; resume(): Promise<void>; createOscillator(): OscillatorLike; createGain(): GainLike }`
  - `interface MetronomeDeps { createContext(): ClickContextLike; setInterval(fn: () => void, ms: number): unknown; clearInterval(id: unknown): void }`
  - `interface Metronome { start(): boolean; stop(): void; setBpm(bpm: number): void; setBeatsPerBar(n: number): void; isRunning(): boolean }`
  - `createMetronome(deps: MetronomeDeps, initial: { bpm: number; beatsPerBar: number }): Metronome`
  - `browserMetronomeDeps(): MetronomeDeps` (`window.AudioContext ?? webkitAudioContext`, lança se ausente — como `SoundProvider`; `window.setInterval`/`clearInterval`)

Comportamento: `start()` cria o contexto uma vez (exceção → devolve `false`, sem lançar), chama `resume()` se `state !== 'running'` (erro engolido), zera o relógio em `{ last: null, startAt: currentTime + START_DELAY_S, beat: 0 }`, roda um tique na hora e agenda `setInterval(tick, TICK_MS)`; devolve `true`. Já rodando → `true` sem efeito. `tick` agenda cada clique de `scheduleWindow` em `Math.max(time, currentTime)` com o envelope das Global Constraints e guarda o oscilador até `time + 0.06`. `stop()` limpa o intervalo, chama `stop()` nos osciladores pendentes (try/catch) e esvazia a lista. `setBeatsPerBar` zera `beat` (o próximo clique é acentuado). `setBpm` passa por `clampBpm`.

- [ ] **Step 1: Write the failing tests** com `fakeCtx()` (grava osciladores com `frequency.value`, `start`/`stop`, e chamadas de ganho; `currentTime` mutável; `state: 'suspended'`; `resume` espião) e `fakeTimer()` (guarda `fn`, `ids`, `cleared`); `vi.spyOn(globalThis, 'fetch')`:
  - `'starts on the audio clock'`: `currentTime = 10`, `start()` → `true`; `createContext` 1×; `resume` 1×; 1 oscilador com `start(10.05)`, `stop(10.11)`, `frequency.value === 1600`; ganho `setValueAtTime(0.0001, 10.05)`, `exponentialRampToValueAtTime(1, 10.052)`, `exponentialRampToValueAtTime(0.0001, 10.1)`; `setInterval` com 25.
  - `'ticks schedule the next click'`: `currentTime = 10.5`, `timer.fn()` → oscilador em `10.55`, `1000` Hz, pico `0.6`; `timer.fn()` de novo sem mudar o tempo → nenhum oscilador novo.
  - `'tempo change mid-run'`: depois do clique em `10.55`, `setBpm(60)`, `currentTime = 11.5`, `fn()` → oscilador em `11.55`. `setBpm(500)` → próximo intervalo 60/220.
  - `'beats per bar restart the bar'`: rodando com 4, depois de um clique não acentuado `setBeatsPerBar(3)` → o próximo clique é 1600 Hz.
  - `'stop cancels pending clicks'`: com um oscilador agendado em `11.55` e `currentTime = 11.5`, `stop()` → `clearInterval` com o id; esse oscilador recebeu `stop()` sem argumento; `isRunning() === false`; `fn()` depois não cria oscilador.
  - `'restart reuses the context'`: `start()` de novo → `createContext` continua 1×, `resume` 2×, primeiro clique acentuado.
  - `'no Web Audio'`: `createContext` lança → `start() === false`, nada lança, `isRunning() === false`.
  - `'synthesized, no assets'`: em todos os testes `fetch` não foi chamado.
- [ ] **Step 2: Run tests to verify they fail**
  Run: `npx vitest run src/audio/metronome.test.ts`
  Expected: FAIL.
- [ ] **Step 3: Implement** `metronome.ts`.
- [ ] **Step 4: Run tests to verify they pass**
  Run: `npx vitest run src/audio`
  Expected: PASS (inclui `player.test.ts`, `SoundProvider.test.tsx`, `assets.test.ts` inalterados).
- [ ] **Step 5: Mutation check:** `stop()` sem parar os pendentes; `start()` criando um contexto novo a cada vez; sem `resume()`; `setBeatsPerBar` sem zerar `beat`; `osc.start(currentTime)` em vez do tempo do clique. Cada uma deve falhar; desfaça.
- [ ] **Step 6: Commit**
  ```bash
  git add src/audio/metronome.ts src/audio/metronome.test.ts
  git commit -m "feat(audio): oscillator-click metronome engine on the AudioContext clock"
  ```

---

### Task 4: Seção Metrônomo em Ajustes

**Files:**
- Create: `src/ui/Metronome.tsx`, `src/ui/Metronome.test.tsx`
- Modify: `src/ui/screens/Settings.tsx` (import e `<Metronome />` entre o hint da Meta semanal e `<section aria-labelledby="data-title">`)
- Modify: `src/state/storage.ts` (`metronomeBpm`, `metronomeBeats` em `GlobalSettings`, `DEFAULT_SETTINGS`, `sanitizeSettings`)
- Modify: `src/styles.css` (regras novas no fim, só `.metronome*`)
- Test: `src/state/storage.test.ts`, `src/ui/screens/Settings.test.tsx` (um teste novo no fim)

**Interfaces:**
- Consumes: Tasks 2–3; `useAppState().data.settings`/`updateSettings`.
- Produces: `Metronome(props: { createEngine?: (initial: { bpm: number; beatsPerBar: number }) => Metronome })` (padrão `(i) => createMetronome(browserMetronomeDeps(), i)`; o motor é criado preguiçosamente no primeiro Iniciar, dentro do clique).

Marcação: `<section className="metronome" aria-labelledby="metronome-title">`, `h3#metronome-title` "Metrônomo"; `p.metronome-bpm` com `{bpm} BPM`; `div[role=group][aria-label="Ajustar andamento"]` com botões `−5 −1 +1 +5` (`aria-label` `Diminuir 5 BPM`, `Diminuir 1 BPM`, `Aumentar 1 BPM`, `Aumentar 5 BPM`); `input type="range" min=40 max=220 step=1 aria-label="Andamento (BPM)"`; `div.level-bar[role=group][aria-label="Compasso"]` com `Sem acento`, `2`, `3`, `4`, `6` (`aria-pressed`); `button.primary.metronome-toggle` com `aria-pressed={running}` e texto `Iniciar`/`Parar`; `p.empty` com a mensagem sem Web Audio quando `start()` devolve `false`; `p.hint` "Para sozinho quando você sai desta tela ou do app.". Efeitos: `bpm`/`beats` → `setBpm`/`setBeatsPerBar` no motor (se existir); `visibilitychange` com `document.visibilityState === 'hidden'` → `stop()` e `running = false`; desmonte → `stop()`. CSS: `.metronome button, .metronome-toggle { min-height: 48px; }`, `.metronome-toggle { width: 100%; }`, `.metronome-bpm` com fonte grande; grade de 4 colunas para os passos; sem cores novas.

- [ ] **Step 1: Write the failing tests** (`Metronome.test.tsx` com `AppProvider` + `memoryStorage`, `fakeEngine()` = `{ start: vi.fn(() => true), stop, setBpm, setBeatsPerBar, isRunning }` e `createEngine = vi.fn(() => engine)`):
  - `'shows the saved tempo and bar'`: `'80 BPM'`, `Compasso` com `4` pressionado, botão `Iniciar` com `aria-pressed="false"`; `createEngine` não chamado antes do toque.
  - `'steps and clamps the tempo'`: `+5` → `'85 BPM'` e `readRawSettings(storage).metronomeBpm === 85`; com 218 salvo, `+5` → 220; com 42, `−5` → 40; `−1`/`+1` mudam 1; o range com `fireEvent.change(…, { target: { value: '150' } })` → 150.
  - `'starts and stops'`: `Iniciar` → `createEngine` com `{ bpm: 80, beatsPerBar: 4 }`, `start` 1×, botão `Parar` `aria-pressed="true"`; `Parar` → `stop` 1×, `Iniciar`. Segundo `Iniciar` não cria outro motor.
  - `'changes apply while running'`: rodando, `+1` → `setBpm(81)`; `3` → `setBeatsPerBar(3)` e `metronomeBeats === 3`.
  - `'pauses when the tab is hidden'`: rodando; `Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })` e `document.dispatchEvent(new Event('visibilitychange'))` → `stop` 1×, botão `Iniciar`; voltando a `'visible'` + evento → `start` continua 1×.
  - `'stops on unmount'`: rodando, `unmount()` → `stop` chamado.
  - `'no Web Audio'`: `start` devolve `false` → `'Este navegador não toca o metrônomo.'`, botão `Iniciar`.
  - `'no shortcut hooks'`: nenhum `[data-shortcut]` e nenhum `.start` dentro da seção.
  - `Settings.test.tsx` (novo, no fim): a seção `Metrônomo` aparece depois do hint da Meta semanal e antes do `h3` "Dados".
  - `storage.test.ts`, `describe('M8 metronome settings')`: `metronomeBpm` 150 mantém; 39, 221, 80.5, `'90'` → 80; `metronomeBeats` 3 e 6 mantêm, 5 e 0 → 4; ausentes → 80 e 4.
- [ ] **Step 2: Run tests to verify they fail**
  Run: `npx vitest run src/ui/Metronome.test.tsx src/ui/screens/Settings.test.tsx src/state/storage.test.ts`
  Expected: FAIL nos novos; os antigos de Ajustes passam.
- [ ] **Step 3: Implement** o componente, os ajustes e o CSS.
- [ ] **Step 4: Run tests to verify they pass**
  Run: `npx vitest run src/ui src/state`
  Expected: PASS.
- [ ] **Step 5: Mutation check:** remover o listener de `visibilitychange`; remover o `stop()` do cleanup; criar o motor no render em vez do clique; `+5` sem `clampBpm`. Cada uma deve falhar; desfaça.
- [ ] **Step 6: Commit**
  ```bash
  git add src/ui/Metronome.tsx src/ui/Metronome.test.tsx src/ui/screens/Settings.tsx src/ui/screens/Settings.test.tsx src/state/storage.ts src/state/storage.test.ts src/styles.css
  git commit -m "feat(ui): metronome section in Ajustes, paused on hidden tab and unmount"
  ```

---

### Task 5: Tela do ditado

**Files:**
- Create: `src/ui/screens/DictationQuiz.tsx`, `src/ui/screens/DictationQuiz.test.tsx`, `src/ui/dictationText.ts`, `src/ui/dictationText.test.ts`

**Interfaces:**
- Consumes: Task 1; `scaleBox`, `SCALES`, `scaleDegreeOf`; `scaleTitle`, `scaleNoteName` (`scaleText.ts`); `noteAt`, `positionKey`; `noteLabel`; `pitchOf`; `useSound` (`playSequence`, `playPosition`); `useAppState().instrument`; `useAutoAdvance`; `stringLabels`; `ScaleLegend`.
- Produces (Task 6): `DictationQuiz(props: { question: DictationQuestion; settings: Settings; onAnswer(correct: boolean): void; onNext(): void })`; `dictationNames(q, notation, accidentals): string` (`'A C D E'`, grafia da escala, separados por espaço); `dictationDegrees(q): string` (`'1 ♭3 4 5'`); `ordinalNote(i: number): string` (`0 → '1ª'`).

Tela (spec, seção 4): `box = scaleBox(scale, q.box, root, instrument)`; montagem: `playSequence(dictationSequence(q))`, cleanup `playSequence([])` (`useEffect(..., [])`); `useAutoAdvance(correct, onNext, dictationAdvanceMs(q.length))`. Toque com `index = acertos`: `isDictationTap` → guarda a casa; se não for a última, `playPosition(p)`; a última → `done`, `onAnswer(true)`, `playSequence(seq)`. Senão → `wrong = p`, `done`, `onAnswer(false)`, `playSequence(seq)`. Marcas antes: tônicas (`degree === 0`) `root` sem rótulo + casas certas `scale` sem rótulo. Depois: tônicas `root` sem rótulo; cada nota da melodia (índice i) na casa tocada se certa (`scale`) ou na casa do `box.notes` com aquela altura (`hint`), `label = SCALES[scale].degrees[scaleDegreeOf(pitch % 12, root, scale)]`; `wrong` por último; uma marca por casa (a última vale, como `IiViQuiz`). Status `'Correto! Melodia completa.'` / `` `Errado. A ${ordinalNote(i)} nota era ${esperada}, não ${noteLabel(noteAt(wrong, instrument), notation, accidentals)}.` `` (esperada por `scaleNoteName`); `p.ear-detail` `` `Melodia: ${dictationNames} · ${dictationDegrees}` ``; `.ear-play` "Ouvir de novo" sempre visível; Próxima se errou.

- [ ] **Step 1: Write the failing tests**
  - `dictationText.test.ts` com `AM = { scale: 'pent-minor', root: 9, length: 4, box: 1, pitches: [57, 60, 62, 64] }`: `dictationNames(AM, 'cifra', 'auto') === 'A C D E'`; `dictationDegrees(AM) === '1 ♭3 4 5'`; `dictationNames({ scale: 'major', root: 0, length: 6, box: 1, pitches: [60, 64, 65, 69, 72, 71] }, 'solfejo', 'auto') === 'Dó Mi Fá Lá Dó Si'`; `ordinalNote(1) === '2ª'`.
  - `DictationQuiz.test.tsx` (setup de `ArpeggioQuiz.test.tsx`: `vi.mock('../Fretboard')` espião de `fit`/`minFretWidth`, `AppProvider` + `SoundProvider player={fakePlayer()}`, `notation 'cifra'`, `accidentals 'auto'`, `ui(q, key)`, `withoutScreen()`, `tap('s-f')`, `mark(kind, pos)`, timers falsos), com `AM` acima:
    - `'plays the melody on open'`: `player.play` com 57 já; `advance(1800)` → também 60, 62, 64.
    - `'asks without revealing'`: `'Toque a melodia'`, `'A pentatônica menor · desenho 1'`, `'Faltam 4 notas'`, botão `'Ouvir de novo'`; `.mark--root` exatamente em `6-5 4-7 1-5`, nenhuma outra `.mark`, nenhum `text` em `.mark`; o `textContent` da tela não contém `'C'`, `'D'`, `'E'` fora do título nem `'♭3'`; todo `[aria-label]` em `.fretboard-frame` casa com `/^(Corda \d, casa \d+|Braço da guitarra|Braço do baixo)$/`; nenhum `[title]`; nenhum `data-*` além de `data-pos`/`data-testid`/`data-fret`; sem `role="status"`.
    - `'right melody'`: `tap('4-7')` → `'Faltam 3 notas'`, `mark('scale','4-7')` sem texto, `player.play` com 57; `tap('3-5')`, `tap('3-7')`; `player.play.mockClear()`; `tap('2-5')` → `onAnswer(true)` 1×, `'Correto! Melodia completa.'`, `'Melodia: A C D E · 1 ♭3 4 5'`, `mark('scale','2-5')` com `'5'`, `mark('root','6-5')`.
    - `'waits for the closing melody before advancing'` (`it.each` de `AM` e da melodia de 8 notas `{ scale: 'dorian', root: 2, length: 8, box: 2, pitches: [62, 57, 52, 53, 52, 53, 52, 53] }`, tocando as casas certas pelas alturas): após o último toque, `advance(dictationAdvanceMs(n) − 1)` → `player.play` recebeu todas as notas da melodia final e `onNext` não foi chamado; `advance(1)` → `onNext` 1×.
    - `'a wrong note ends'`: `tap('4-7')`, `tap('3-7')` → `onAnswer(false)`, `'Errado. A 2ª nota era C, não D.'`, `mark('wrong','3-7')`, `mark('hint','3-5')` com `'♭3'`, `mark('hint','2-5')` com `'5'`, `mark('scale','4-7')` com `'1'`; `'Próxima'`; `advance(10000)` → `onNext` não chamado; outro toque não chama `onAnswer`.
    - `'same pitch on another string counts'` (`{ scale: 'major', root: 0, length: 6, box: 1, pitches: [60, 64, 65, 69, 72, 71] }`): `tap('4-10')`, `tap('3-9')`, `tap('3-10')`, `tap('2-10')`, `tap('1-8')` → `'Faltam 1 nota'`; `tap('2-12')` → `'Correto! Melodia completa.'`; `mark('scale','1-8')` com `'1'`. Noutro setup, `tap('6-8')` (48, mesma classe do 60, outra oitava) → errado.
    - `'bass'` (baixo ativo, `{ scale: 'pent-minor', root: 9, length: 4, box: 1, pitches: [45, 48, 50, 48] }`): `cell-5-5` não existe; `.mark--root` em `4-5` e `2-7`; `tap('2-7')` → `player.play` com 45; `tap('1-5')`, `tap('1-7')`, `tap('1-5')` → `'Correto! Melodia completa.'`.
    - `'replays without limit and with R'`: `'Ouvir de novo'` 3× → cada vez `player.play` com 57; com `useQuizShortcuts` num `Harness`, tecla `'r'` → 57.
    - `'fits the fretboard to the viewport'`: `fretboardProps.calls[0]` = `{ fit: true, minFretWidth: 40 }`.
    - `'stops the sound when the screen unmounts'`: `tap('3-5')` (erro); `advance(600)`; `player.play.mockClear()`; `rerender(withoutScreen())`; `advance(5000)` → `player.play` não chamado. O mesmo logo após abrir (antes de tocar).
    - `'resets state when remounted under a new key'`: errar, `rerender(ui({ ...AM, pitches: [69, 67, 64, 62] }, 1))` → sem `status`, `'Faltam 4 notas'`, nenhuma `.mark--scale`, `player.play` com 69.
- [ ] **Step 2: Run tests to verify they fail**
  Run: `npx vitest run src/ui/screens/DictationQuiz.test.tsx src/ui/dictationText.test.ts`
  Expected: FAIL.
- [ ] **Step 3: Implement** a tela e os textos.
- [ ] **Step 4: Run tests to verify they pass**
  Run: `npx vitest run src/ui`
  Expected: PASS.
- [ ] **Step 5: Mutation check:** `useAutoAdvance` com o padrão 700; esquecer o `playSequence([])` do desmonte; rótulos de grau antes do fim; `isDictationTap` trocado por comparação de `positionKey` com a casa do desenho (deve falhar no teste da outra corda); `GUITAR` fixo em vez do instrumento ativo. Cada uma deve falhar; desfaça.
- [ ] **Step 6: Commit**
  ```bash
  git add src/ui/screens/DictationQuiz.tsx src/ui/screens/DictationQuiz.test.tsx src/ui/dictationText.ts src/ui/dictationText.test.ts
  git commit -m "feat(ui): melodic dictation screen played back on the fretboard"
  ```

---

### Task 6: Registro do modo, histórico e verificação final

**Files:**
- Modify: `src/domain/quiz.ts` (`QuizMode` + `'dictation'`)
- Modify: `src/domain/exercises.ts` (meta, `QUIZ_MODES`, trilha Ouvido)
- Modify: `src/domain/session.ts` (`LEVELED_MODES` + `'dictation'`)
- Modify: `src/ui/modeLabels.ts` (`DICTATION_LEVEL_TEXT`, só linhas novas)
- Modify: `src/ui/exercises.tsx` (`QuizItem` + `DictationQuestion`, `DictationOptions`, exercício `dictation`)
- Test: `src/domain/exercises.test.ts`, `src/ui/exercises.test.tsx`, `src/ui/screens/Study.test.tsx`, `src/ui/screens/Progress.test.tsx`, `src/state/storage.test.ts`

**Interfaces:**
- Consumes: Tasks 1, 5; `reviewSubset`, `LevelBar`, `EAR_WITHOUT_SOUND` (já em `exercises.tsx`).
- Produces: `EXERCISES.dictation`.

Exercício: `itemKey` `dictationKey`; `questionCount` `dictationPool(settings.dictationLevel).length`; `startBlockers` som desligado → `[EAR_WITHOUT_SOUND]`; `startsFromPosition: () => false`; `historyLevel: (s) => s.dictationLevel`; `Options: DictationOptions` (`LevelBar` + `p.mode-description` com `DICTATION_LEVEL_TEXT` da spec, seção 2); `buildQueue` `buildDictationQueue(reviewSubset(ctx, pool, dictationKey), ctx.instrument, ctx.rng)`; `prepareSound` `preparePitches(flatMap(q => q.pitches))`; `Quiz` → `DictationQuiz`. Meta com a descrição exata da spec, seção 1, `track: 'ouvido'`, `recordsPositionProgress: false`, `usesFocus: false`.

- [ ] **Step 1: Update/write the failing tests**
  - `exercises.test.ts`: `QUIZ_MODES` e trilha Ouvido das Global Constraints; meta do `dictation` sem progresso de posição e sem Foco.
  - `Study.test.tsx`, só listas exatas: menu e abas com 18 itens (`'Ditado melódico'` depois de `'Ouvir graus'`), `labels('Ouvido')` = `['Ouvido', 'Ouvir intervalos', 'Ouvir graus', 'Ditado melódico']`; títulos "17 exercises" → "18 exercises".
  - `ui/exercises.test.tsx`, `describe('M8')`: `questionCount` 24 / 24 / 84 por `dictationLevel`, igual no baixo; `startBlockers` com `soundEnabled: false` = `['Ligue o Som em Ajustes para treinar de ouvido.']`, com som `[]`; `buildQueue({ ...ctx, progress: {}, limit: 20, now: 0 })` no `hard` → 20 perguntas, chaves distintas e válidas, alturas em `EAR_RANGE` do instrumento (os dois); revisão: `easy` com 19 chaves não vencidas e 5 vencidas → as 5 na fila; `itemKey` de uma pergunta = `'dict:pent-minor:9:4'`; `historyLevel({ ...settings, dictationLevel: 'medium' }) === 'medium'`; `prepareSound` com `[AM]` → `preparePitches([57, 60, 62, 64])`.
  - `Study.test.tsx`, `describe('M8')`: grupo `Nível` com `Fácil` pressionado, texto do Fácil, sem "Foco", `'Sessão de 20 perguntas'`; `Difícil` → `readRawSettings(storage).dictationLevel === 'hard'`. Som desligado → aviso, Iniciar desabilitado; `forced` não inicia. Baixo com som → Iniciar habilitado, iniciar → `'Toque a melodia'` e `cell-5-5` ausente. Iniciar no violão, pegar o primeiro `g.mark--root` (`data-pos` `s-f`) e tocar `cell-s-(f+1)` (ou `f−1` se não existir) — sempre errado na 1ª nota → `items` do instrumento ativo ganha uma chave `dict:`; `'Próxima'` → `'Pergunta 2 de'`, sem `status`, `'Faltam 4 notas'` (remontagem por `key`); Finalizar e confirmar → histórico `{ mode: 'dictation', level: 'easy' }`.
  - `storage.test.ts`: histórico `{ mode: 'dictation', level: 'hard' }` → `level 'hard'`; `level: 'x'` → `'easy'`; `v2Raw({ mode: 'dictation' })` → `settings.mode === 'dictation'`.
  - `Progress.test.tsx`: histórico `{ mode: 'dictation', level: 'medium' }` mostra `'Ditado melódico'` e `'Médio'`.
- [ ] **Step 2: Run tests to verify they fail**
  Run: `npx vitest run src/domain src/state src/ui`
  Expected: FAIL nos novos/atualizados.
- [ ] **Step 3: Implement** as mudanças de **Files** e **Interfaces**.
- [ ] **Step 4: Run the whole suite**
  Run: `npm test`
  Expected: `Tests  N passed (N)`, N maior que no `main`, 0 falhas.
- [ ] **Step 5: Mutation check:** `startBlockers` sem o som; `historyLevel` ausente (deve falhar no histórico); `questionCount` ignorando o nível; `dictation` fora de `LEVELED_MODES`. Cada uma deve falhar; desfaça.
- [ ] **Step 6: Existing code untouched**
  Run: `git diff main -- src/domain/scales.ts src/domain/scaleItems.ts src/domain/earTraining.ts src/domain/pitch.ts src/audio/player.ts src/audio/SoundProvider.tsx src/ui/Fretboard.tsx src/ui/useQuizShortcuts.ts src/ui/useAutoAdvance.ts src/ui/scaleText.ts vite.config.ts public | grep -E '^[-+]' | grep -vE '^(\+\+\+|---)'`
  Expected: vazio.
- [ ] **Step 7: No formatter churn**
  Run: `git diff main --stat -- src` e `git diff main -- src/state/storage.ts src/ui/exercises.tsx src/ui/screens/Settings.tsx src/styles.css src/domain/quiz.ts src/domain/exercises.ts src/domain/session.ts src/ui/modeLabels.ts | grep -E '^-' | grep -vE '^---'`
  Expected: `--stat` só com arquivos das tarefas; linhas removidas só as que ganharam itens (`QuizMode`, `QUIZ_MODES`, `TRACKS` Ouvido, `LEVELED_MODES`, `QuizItem`, `EXERCISES`, comentário de `items`) — nenhuma só por aspas, vírgula ou quebra.
- [ ] **Step 8: No old assertion removed outside the lists**
  Run: `git diff main -- src | grep -E '^-\s*(expect\(|it\()'`
  Expected: só linhas das listas de modos/trilhas/abas em `exercises.test.ts` e `Study.test.tsx` e os títulos "17 exercises".
- [ ] **Step 9: Types, build and precache**
  Run: `npm run build`
  Expected: `tsc` sem erros e `vite build` concluído; a lista de precache do service worker em `dist/` tem o mesmo número de entradas que um build do `main` (nenhum arquivo novo em `public/`).
- [ ] **Step 10: Manual check** com `npm run dev` (rede local) em **360 px**, tema claro e escuro:
  - Ditado no violão nos três níveis (Difícil com desenho de 6–7 casas) e no baixo: `document.documentElement.scrollWidth <= 360`; nada da melodia aparece antes de responder; o som final toca inteiro antes de avançar; Finalizar no meio da melodia não deixa som tocando.
  - Metrônomo num **iPhone (Safari)** e num **Android (Chrome)**: Iniciar toca já no primeiro toque (contexto retomado no gesto); a 40, 120 e 220 BPM por 2 minutos o pulso fica estável (comparar com um metrônomo de referência ou gravar e conferir); trocar o andamento e o compasso tocando muda no próximo clique, sem tropeço; acento audível no tempo 1; bloquear a tela, trocar de app e trocar de aba do app param o clique, e ao voltar Iniciar funciona; no iPhone, chave de silencioso desligada (hint de Ajustes); ditado e metrônomo um depois do outro sem som travado.
- [ ] **Step 11: Commit**
  ```bash
  git add src/domain src/state src/ui
  git commit -m "feat: register the melodic dictation exercise in the Ouvido track

  exercises.test.ts and Study.test.tsx: the exact mode, track and tab lists now include dictation."
  ```
