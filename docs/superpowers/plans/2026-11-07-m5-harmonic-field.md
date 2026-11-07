# M5 Campo harmônico Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trilha nova "Harmonia" com três exercícios de botões ("Acorde do grau", "Grau do acorde", "Qualidade do acorde") sobre o campo harmônico maior e menor natural nas 12 tonalidades, em tríades e tétrades, com grafia correta da tonalidade e revisão espaçada por item.

**Architecture:** Um módulo puro novo, `src/domain/harmony.ts`, deriva o campo (qualidades, algarismos, grafia dos acordes via `spellScale` do M4, armaduras e níveis de tonalidade, alturas para o som). Um segundo módulo puro, `src/domain/harmonyItems.ts`, define itens, chaves, pools e filas; `storage.ts` aceita os ajustes e chaves novos de forma aditiva. Três telas novas de botões usam um módulo de textos (`src/ui/harmonyText.ts`), e o registro liga tudo numa trilha nova. `useQuizShortcuts` ganha uma busca segura de `data-shortcut`.

**Tech Stack:** React 19, TypeScript, Vite, Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-11-07-m5-harmonic-field-design.md`

## Global Constraints

- Texto da interface em português. Nenhuma biblioteca nova. Celular primeiro: nenhum botão de resposta passa de 360 px nem provoca rolagem horizontal.
- **Sem reformatação:** não rode formatador nem mude aspas, vírgulas finais ou quebras de linha em código que a tarefa não precisa mudar. `spelling.ts` usa aspas duplas; o resto do projeto, simples. Arquivos novos seguem o estilo do vizinho (aspas simples, 2 espaços, `;`). O diff de cada arquivo existente deve conter só as linhas da tarefa.
- Os nove exercícios atuais não mudam; só mudam asserções de **lista exata** de modos/trilhas/abas: `src/domain/exercises.test.ts` (`QUIZ_MODES`, rótulos de `TRACKS`) e `src/ui/screens/Study.test.tsx` (`'lists the 9 exercises…'`, `'groups the exercises by track…'`, `'shows the 9 exercises as buttons…'`). Única outra mudança em código existente de comportamento: a busca de `data-shortcut` em `useQuizShortcuts` (Task 3).
- Ids e rótulos: `harmony-chord` = "Acorde do grau"; `harmony-degree` = "Grau do acorde"; `harmony-quality` = "Qualidade do acorde"; trilha `{ id: 'harmonia', label: 'Harmonia', modes: ['harmony-chord', 'harmony-degree', 'harmony-quality'] }`. `QUIZ_MODES` = os 9 atuais + `'harmony-chord', 'harmony-degree', 'harmony-quality'`.
- Chaves por item: `hchord:<major|minor>:<0–11>:<2–7>`, `hdeg:<major|minor>:<0–11>:<2–7>`, `hqual:<major|minor>:<triad|seventh>:<1–7>`; sem zeros à esquerda.
- Ajustes globais novos: `harmonyField: 'major' | 'minor' | 'both'` (padrão `'major'`), `harmonySevenths: boolean` (padrão `false`), `harmonyKeys: 'easy' | 'medium' | 'all'` (padrão `'easy'`). Aditivo em `guitar-mapper:v2`, sem trocar `version`, sem migração, sem regravar ao carregar. Histórico dos modos novos sem `level` (`LEVELED_MODES` não muda).
- Acerto por classe de altura, número do grau ou qualidade; a grafia é só exibição. Sorteios só pelo `rng` injetado.
- Algarismos com `♭` Unicode (`'♭VII'`, `'IIm7(♭5)'`); símbolos de acorde com os nomes ASCII do M2 e sufixos `''`, `'m'`, `'°'`, `'7M'`, `'7'`, `'m7'`, `'m7(b5)'`.
- Tabelas de teste coladas literalmente (geradas por script independente); nunca recalculadas com o código testado.

## Review Focus

1. **Encaixe no celular a 360 px:** 12 notas em "Ambos" (`'Bb · Sib'`, `'E# · Mi#'`), 7 algarismos (`'♭VII'`) e as 4 qualidades de tétrade com o nome em segunda linha cabem sem rolagem horizontal nem texto cortado (Task 4 fixa as classes; Task 6 confere à mão).
2. **Grafia em Sustenidos/Bemóis:** o IV de Fá é `Bb` nos três ajustes; tônica 3 maior em Sustenidos é `Eb` (não D#); Fá# maior mostra `E#°` e o botão da classe 5 vira `E#` (Tasks 1 e 3).
3. **Teclado:** `"` e `\` numa tela com `data-shortcut` não lançam erro nem respondem; no Acorde do grau, `1`–`9` não respondem e A–G/Shift sim (Task 3).
4. **"Os dois" + "Todas" com sevenths:** fila de 20 sem chaves repetidas, tônicas do Qualidade do acorde sempre dentro do nível do campo do item (Task 5).
5. **Sem formatação acidental:** `git diff main --stat` só lista os arquivos dos **Files** de cada tarefa, e os diffs de `spelling.ts`, `storage.ts`, `exercises.tsx`, `useQuizShortcuts.ts` e `styles.css` não trazem linhas só de estilo (Task 6).

---

### Task 1: Domínio `harmony.ts` (campo, qualidades, grafia, armadura, alturas)

**Files:**
- Create: `src/domain/harmony.ts`, `src/domain/harmony.test.ts`

**Interfaces:**
- Consumes: `SCALES` (`scales.ts`), `spellScale`, `Spelling` (`spelling.ts`), `Accidentals`, `NoteIndex` (`notes.ts`), `EAR_RANGE` (`earTraining.ts`), `Instrument`.
- Produces (Tasks 2–5):
  - `type HarmonyField = 'major' | 'minor'`; `HARMONY_FIELDS: readonly HarmonyField[] = ['major', 'minor']`
  - `type HarmonyFieldSetting = HarmonyField | 'both'`; `HARMONY_FIELD_SETTINGS = ['major', 'minor', 'both']`; `fieldsOf(setting): HarmonyField[]` (`'both'` → `['major','minor']`)
  - `type HarmonyKeyLevel = 'easy' | 'medium' | 'all'`; `HARMONY_KEY_LEVELS = ['easy', 'medium', 'all']`
  - `type ChordQuality = 'major' | 'minor' | 'dim' | 'maj7' | 'dom7' | 'min7' | 'half-dim'`
  - `TRIAD_QUALITIES: readonly ChordQuality[] = ['major', 'minor', 'dim']`; `SEVENTH_QUALITIES = ['maj7', 'dom7', 'min7', 'half-dim']`
  - `QUALITY_SYMBOL: Record<ChordQuality, string>` = `'' 'm' '°' '7M' '7' 'm7' 'm7(b5)'`
  - `degreeQuality(field, degree: number /*1–7*/, sevenths: boolean): ChordQuality`
  - `chordRootClass(field, key: NoteIndex, degree): NoteIndex`
  - `romanNumeral(field, degree): string` (puro); `degreeNumeral(field, degree, sevenths): string` (completo)
  - `interface ChordSpelling { root: Spelling; tones: Spelling[]; quality: ChordQuality }`; `spellChord(field, key, degree, sevenths, accidentals): ChordSpelling`
  - `keySpelling(field, key, accidentals): Spelling[]` (= `spellScale(key, SCALES[field], accidentals)`)
  - `keySignatureCount(field, key): number`; `harmonyKeys(field, level): NoteIndex[]` (crescente)
  - `chordPitches(field, key, degree, sevenths, instrument): number[]`

Regras (o que as assinaturas não fixam):
- Qualidade: semitons acima da fundamental dos graus `g+2`, `g+4`, `g+6` (índices mod 7 em `SCALES[field].semitones`): (4,7) major, (3,7) minor, (3,6) dim; com sétima: major+11 maj7, major+10 dom7, minor+10 min7, dim+10 half-dim.
- Algarismo puro: maior `I II III IV V VI VII`; menor `I II ♭III IV V ♭VI ♭VII`. Completo = puro + sufixo de algarismo: `''`, `'m'`, `'°'`, `'7M'`, `'7'`, `'m7'`, `'m7(♭5)'`.
- `spellChord`: `tones[k] = keySpelling(...)[(degree - 1 + 2k) % 7]`, k = 0..2 (ou 0..3); `root = tones[0]`.
- `keySignatureCount` = quantos `accidental !== 0` em `keySpelling(field, key, 'auto')`. Níveis: easy ≤ 1, medium ≤ 3, all ≤ 7.
- `chordPitches`: fundamental = menor altura ≥ `EAR_RANGE[instrument.id][0]` com a classe `chordRootClass`; as outras sobem pelos semitons do acorde (cada uma acima da anterior).

- [ ] **Step 1: Write the failing tests** em `harmony.test.ts`. Helper `sym = (f, k, d, s, acc) => { const c = spellChord(f, k, d, s, acc); return spellingLabel(c.root, 'cifra') + QUALITY_SYMBOL[c.quality]; }` e `row = (f, k, s, acc) => [1..7].map(d => sym(f, k, d, s, acc)).join(' ')`. Tabelas (índice = tônica 0..11):

  ```ts
  const MAJOR_TRIADS = ['C Dm Em F G Am B°', 'Db Ebm Fm Gb Ab Bbm C°', 'D Em F#m G A Bm C#°', 'Eb Fm Gm Ab Bb Cm D°', 'E F#m G#m A B C#m D#°', 'F Gm Am Bb C Dm E°', 'F# G#m A#m B C# D#m E#°', 'G Am Bm C D Em F#°', 'Ab Bbm Cm Db Eb Fm G°', 'A Bm C#m D E F#m G#°', 'Bb Cm Dm Eb F Gm A°', 'B C#m D#m E F# G#m A#°'];
  const MAJOR_SEVENTHS = ['C7M Dm7 Em7 F7M G7 Am7 Bm7(b5)', 'Db7M Ebm7 Fm7 Gb7M Ab7 Bbm7 Cm7(b5)', 'D7M Em7 F#m7 G7M A7 Bm7 C#m7(b5)', 'Eb7M Fm7 Gm7 Ab7M Bb7 Cm7 Dm7(b5)', 'E7M F#m7 G#m7 A7M B7 C#m7 D#m7(b5)', 'F7M Gm7 Am7 Bb7M C7 Dm7 Em7(b5)', 'F#7M G#m7 A#m7 B7M C#7 D#m7 E#m7(b5)', 'G7M Am7 Bm7 C7M D7 Em7 F#m7(b5)', 'Ab7M Bbm7 Cm7 Db7M Eb7 Fm7 Gm7(b5)', 'A7M Bm7 C#m7 D7M E7 F#m7 G#m7(b5)', 'Bb7M Cm7 Dm7 Eb7M F7 Gm7 Am7(b5)', 'B7M C#m7 D#m7 E7M F#7 G#m7 A#m7(b5)'];
  const MINOR_TRIADS = ['Cm D° Eb Fm Gm Ab Bb', 'C#m D#° E F#m G#m A B', 'Dm E° F Gm Am Bb C', 'Ebm F° Gb Abm Bbm Cb Db', 'Em F#° G Am Bm C D', 'Fm G° Ab Bbm Cm Db Eb', 'F#m G#° A Bm C#m D E', 'Gm A° Bb Cm Dm Eb F', 'G#m A#° B C#m D#m E F#', 'Am B° C Dm Em F G', 'Bbm C° Db Ebm Fm Gb Ab', 'Bm C#° D Em F#m G A'];
  const MINOR_SEVENTHS = ['Cm7 Dm7(b5) Eb7M Fm7 Gm7 Ab7M Bb7', 'C#m7 D#m7(b5) E7M F#m7 G#m7 A7M B7', 'Dm7 Em7(b5) F7M Gm7 Am7 Bb7M C7', 'Ebm7 Fm7(b5) Gb7M Abm7 Bbm7 Cb7M Db7', 'Em7 F#m7(b5) G7M Am7 Bm7 C7M D7', 'Fm7 Gm7(b5) Ab7M Bbm7 Cm7 Db7M Eb7', 'F#m7 G#m7(b5) A7M Bm7 C#m7 D7M E7', 'Gm7 Am7(b5) Bb7M Cm7 Dm7 Eb7M F7', 'G#m7 A#m7(b5) B7M C#m7 D#m7 E7M F#7', 'Am7 Bm7(b5) C7M Dm7 Em7 F7M G7', 'Bbm7 Cm7(b5) Db7M Ebm7 Fm7 Gb7M Ab7', 'Bm7 C#m7(b5) D7M Em7 F#m7 G7M A7'];
  /** Tríades nas tônicas pretas. */
  const SHARP = { major: { 1: 'C# D#m E#m F# G# A#m B#°', 3: 'Eb Fm Gm Ab Bb Cm D°', 6: 'F# G#m A#m B C# D#m E#°', 8: 'Ab Bbm Cm Db Eb Fm G°', 10: 'Bb Cm Dm Eb F Gm A°' },
                  minor: { 1: 'C#m D#° E F#m G#m A B', 3: 'D#m E#° F# G#m A#m B C#', 6: 'F#m G#° A Bm C#m D E', 8: 'G#m A#° B C#m D#m E F#', 10: 'A#m B#° C# D#m E#m F# G#' } };
  const FLAT = { major: { 1: 'Db Ebm Fm Gb Ab Bbm C°', 3: 'Eb Fm Gm Ab Bb Cm D°', 6: 'Gb Abm Bbm Cb Db Ebm F°', 8: 'Ab Bbm Cm Db Eb Fm G°', 10: 'Bb Cm Dm Eb F Gm A°' },
                 minor: { 1: 'C#m D#° E F#m G#m A B', 3: 'Ebm F° Gb Abm Bbm Cb Db', 6: 'F#m G#° A Bm C#m D E', 8: 'Abm Bb° Cb Dbm Ebm Fb Gb', 10: 'Bbm C° Db Ebm Fm Gb Ab' } };
  ```

  - `it.each` 0..11: `row('major', k, false, 'auto') === MAJOR_TRIADS[k]`, idem `MAJOR_SEVENTHS`, `MINOR_TRIADS`, `MINOR_SEVENTHS`. Tônicas naturais (0 2 4 5 7 9 11): `'sharp'` e `'flat'` dão a mesma linha do `'auto'` (tríades e tétrades). Pretas 1 3 6 8 10: `row(f, k, false, 'sharp') === SHARP[f][k]` e `'flat'` → `FLAT[f][k]`.
  - Aceitação: `sym('major', 5, 4, false, acc) === 'Bb'` para `acc` em `sharp`, `flat`, `auto`.
  - Qualidades: `[1..7].map(d => degreeQuality('major', d, false))` = `['major','minor','minor','major','major','minor','dim']`; com sétima `['maj7','min7','min7','maj7','dom7','min7','half-dim']`; menor `['minor','dim','major','minor','minor','major','major']` e `['min7','half-dim','maj7','min7','min7','maj7','dom7']`.
  - Algarismos: `romanNumeral` maior `['I','II','III','IV','V','VI','VII']`, menor `['I','II','♭III','IV','V','♭VI','♭VII']`; `degreeNumeral` maior tríade `['I','IIm','IIIm','IV','V','VIm','VII°']`, tétrade `['I7M','IIm7','IIIm7','IV7M','V7','VIm7','VIIm7(♭5)']`; menor tríade `['Im','II°','♭III','IVm','Vm','♭VI','♭VII']`, tétrade `['Im7','IIm7(♭5)','♭III7M','IVm7','Vm7','♭VI7M','♭VII7']`.
  - Notas: `spellChord('major', 5, 4, true, 'auto').tones` em cifra = `['Bb','D','F','A']`; `spellChord('major', 2, 7, false, 'auto').tones` = `['C#','E','G']`.
  - Invariantes (2 campos × 0..11 × tríade/tétrade × 3 ajustes): `tones.length` 3/4; classe de cada nota = `chordRootClass + semitons da qualidade` mod 12 (maj `0 4 7 11`, dom7 `0 4 7 10`, min `0 3 7 10`, dim `0 3 6 10`); sinais em −1..1; as letras das notas avançam de 2 em 2 (terças).
  - Armaduras: `[0..11].map(k => keySignatureCount('major', k))` = `[0,5,2,3,4,1,6,1,4,3,2,5]`; menor `[3,4,1,6,1,4,3,2,5,0,5,2]`. `harmonyKeys('major','easy')` = `[0,5,7]`, `('major','medium')` = `[0,2,3,5,7,9,10]`, `('minor','easy')` = `[2,4,9]`, `('minor','medium')` = `[0,2,4,6,7,9,11]`, `('major','all')` = 0..11.
  - Alturas: `chordPitches('major', 5, 4, true, GUITAR)` = `[46,50,53,57]`; `(…, BASS)` = `[34,38,41,45]`; `chordPitches('major', 2, 4, false, GUITAR)` = `[55,59,62]`. Para todo campo × tônica × grau × tamanho × instrumento: todas dentro de `EAR_RANGE`, estritamente crescentes.
  - `fieldsOf('both')` = `['major','minor']`; `fieldsOf('minor')` = `['minor']`.
- [ ] **Step 2: Run tests to verify they fail**
  Run: `npx vitest run src/domain/harmony.test.ts`
  Expected: FAIL (módulo inexistente).
- [ ] **Step 3: Implement** `src/domain/harmony.ts` com as assinaturas e regras acima. Não mexa em `spelling.ts` nem `scales.ts`.
- [ ] **Step 4: Run tests to verify they pass**
  Run: `npx vitest run src/domain`
  Expected: PASS, todos os antigos inclusos.
- [ ] **Step 5: Commit**
  ```bash
  git add src/domain/harmony.ts src/domain/harmony.test.ts
  git commit -m "feat(domain): harmonic field for major and natural minor keys"
  ```

---

### Task 2: Itens, chaves, filas e armazenamento

**Files:**
- Create: `src/domain/harmonyItems.ts`, `src/domain/harmonyItems.test.ts`
- Modify: `src/state/storage.ts` (`GlobalSettings`, `DEFAULT_SETTINGS`, `sanitizeSettings`, `isItemKey`, comentário de `InstrumentData.items`)
- Test: `src/state/storage.test.ts`, `src/state/backup.test.ts`

**Interfaces:**
- Consumes: Task 1 (`HarmonyField`, `HarmonyFieldSetting`, `HarmonyKeyLevel`, `HARMONY_FIELD_SETTINGS`, `HARMONY_KEY_LEVELS`, `fieldsOf`, `harmonyKeys`), `shuffled` (`earTraining.ts`).
- Produces (Tasks 3–5):
  - `interface HarmonyItem { field: HarmonyField; key: NoteIndex; degree: number }` (Acorde do grau e Grau do acorde)
  - `harmonyPool(setting: HarmonyFieldSetting, level: HarmonyKeyLevel): HarmonyItem[]` — campos em `fieldsOf`, tônicas de `harmonyKeys` em ordem, graus 2..7
  - `harmonyChordKey(item): string` (`hchord:…`), `harmonyDegreeKey(item): string` (`hdeg:…`); `isHarmonyChordKey(key)`, `isHarmonyDegreeKey(key)`
  - `buildHarmonyQueue(items: readonly HarmonyItem[], rng): HarmonyItem[]` (= `shuffled`)
  - `interface QualityItem { field: HarmonyField; sevenths: boolean; degree: number }`; `interface QualityQuestion extends QualityItem { key: NoteIndex }`
  - `qualityPool(setting: HarmonyFieldSetting, sevenths: boolean): QualityItem[]` — campos em ordem, graus 1..7
  - `qualityKey(item): string` (`hqual:<field>:<triad|seventh>:<degree>`); `isQualityKey(key)`
  - `buildQualityQueue(items: readonly QualityItem[], level: HarmonyKeyLevel, rng): QualityQuestion[]` — `shuffled` e depois, em ordem, `key = keys[Math.min(keys.length - 1, Math.floor(rng() * keys.length))]` com `keys = harmonyKeys(item.field, level)`
  - `GlobalSettings.harmonyField`, `.harmonySevenths`, `.harmonyKeys`

Validadores: `/^hchord:(major|minor):(\d|1[01]):([2-7])$/`, `/^hdeg:(major|minor):(\d|1[01]):([2-7])$/`, `/^hqual:(major|minor):(triad|seventh):([1-7])$/`.

- [ ] **Step 1: Write the failing tests** em `harmonyItems.test.ts`:
  - Tamanhos de `harmonyPool`: `('major','easy')` 18, `('major','medium')` 42, `('major','all')` 72, `('minor','easy')` 18, `('both','easy')` 36, `('both','medium')` 84, `('both','all')` 144. `harmonyPool('major','easy')[0]` = `{ field:'major', key:0, degree:2 }`, `[6]` = `{ field:'major', key:5, degree:2 }`; nenhum `degree: 1`.
  - `qualityPool('major', false)` 7 itens, graus 1..7; `('both', true)` 14, todos `sevenths: true`, os 7 primeiros `major`.
  - Chaves: `harmonyChordKey({ field:'major', key:5, degree:4 }) === 'hchord:major:5:4'`; `harmonyDegreeKey({ field:'minor', key:9, degree:7 }) === 'hdeg:minor:9:7'`; `qualityKey({ field:'minor', sevenths:true, degree:2 }) === 'hqual:minor:seventh:2'`, `sevenths:false` → `'…:triad:…'`.
  - Validadores true: `'hchord:major:0:2'`, `'hchord:minor:11:7'`, `'hdeg:major:10:5'`, `'hqual:major:triad:1'`, `'hqual:minor:seventh:7'`; false: `'hchord:major:0:1'`, `'hchord:major:12:2'`, `'hchord:major:01:2'`, `'hchord:dorian:0:2'`, `'hdeg:major:0:8'`, `'hqual:major:triad:0'`, `'hqual:major:tetrad:1'`, `'hqual:Major:triad:1'`, `'hchord:major:0'`. Toda chave de todo pool (os 3 campos × 3 níveis × os dois tamanhos) passa no seu validador e são únicas dentro de cada pool.
  - `buildQualityQueue(qualityPool('both', false), 'easy', rng)`: mesmo conjunto de chaves; toda `key` em `harmonyKeys(item.field, 'easy')`; com `() => 0.999` toda maior tem `key 7` e toda menor `key 9`.
- [ ] **Step 2: Write the failing storage tests**
  - `storage.test.ts`, `describe('M5 harmony settings (additive v2 fields)')`: `DEFAULT_SETTINGS` com `harmonyField: 'major'`, `harmonySevenths: false`, `harmonyKeys: 'easy'`; save v2 antigo sem os campos → padrões e `storage.dump()[STORAGE_KEY]` igual ao texto original; `v2Raw({ harmonyField: 'both', harmonySevenths: true, harmonyKeys: 'all' })` mantém; inválidos (`harmonyField: 'Major'`, `harmonySevenths: 'true'`, `harmonyKeys: 'hard'`, `null`) → padrões.
  - `describe('M5 item keys')`: mantém `'hchord:major:5:4'`, `'hdeg:minor:9:7'`, `'hqual:major:seventh:7'` e as antigas `'scaledeg:pent-minor:1:6:1'`, `'func:0:1'`; descarta `'hchord:major:5:1'`, `'hdeg:major:12:2'`, `'hqual:major:triad:8'`.
  - `backup.test.ts`: `parseImport(serializeData(d))` com `d.settings.harmonyField = 'minor'`, `harmonySevenths = true`, `harmonyKeys = 'medium'` e `d.instruments.bass.items = { 'hdeg:minor:4:6': entry }` → `{ ok: true, data: d }`.
- [ ] **Step 3: Run tests to verify they fail**
  Run: `npx vitest run src/domain/harmonyItems.test.ts src/state`
  Expected: FAIL nos testes novos.
- [ ] **Step 4: Implement** `harmonyItems.ts`; em `storage.ts`, os três campos (com `HARMONY_FIELD_SETTINGS` / `typeof === 'boolean'` / `HARMONY_KEY_LEVELS`) e `isItemKey` aceitando `isHarmonyChordKey(key) || isHarmonyDegreeKey(key) || isQualityKey(key)`; comentário de `items` cita `hchord:`, `hdeg:`, `hqual:`. Só acrescente linhas.
- [ ] **Step 5: Run tests to verify they pass**
  Run: `npx vitest run src/domain src/state`
  Expected: PASS.
- [ ] **Step 6: Commit**
  ```bash
  git add src/domain/harmonyItems.ts src/domain/harmonyItems.test.ts src/state/storage.ts src/state/storage.test.ts src/state/backup.test.ts
  git commit -m "feat: harmony exercise items, keys and additive harmony settings"
  ```

---

### Task 3: Textos, atalho seguro e a tela Acorde do grau

**Files:**
- Create: `src/ui/harmonyText.ts`, `src/ui/harmonyText.test.ts`
- Modify: `src/ui/useQuizShortcuts.ts` (só a busca de `data-shortcut`)
- Create: `src/ui/useQuizShortcuts.test.tsx`
- Create: `src/ui/screens/HarmonyChordQuiz.tsx`, `src/ui/screens/HarmonyChordQuiz.test.tsx`

**Interfaces:**
- Consumes: Tasks 1–2, `spellingLabel`, `noteLabel`, `useAutoAdvance`, `useSound().playPitches`, `useAppState().instrument`.
- Produces (Tasks 4–5):
  - `phrase(spelling: Spelling, notation: Notation, suffix = ''): string` — cifra `Bb7M`, solfejo `Sib7M`, ambos `Bb7M (Sib7M)`
  - `keyName(field, key, notation, accidentals): string` — `'F maior'`, `'Fá maior'`, `'F maior (Fá maior)'`, `'A menor'`
  - `chordName(field, key, degree, sevenths, notation, accidentals): string` — `phrase(root, notation, QUALITY_SYMBOL[q])`
  - `chordTones(field, key, degree, sevenths, notation, accidentals): string` — notas por `phrase` separadas por espaço
  - `chordDetail(...mesmos): string` = `` `${chordName}: ${chordTones}` ``
  - `QUALITY_TEXT: Record<ChordQuality, { label: string; name: string }>` = major `Maior`/`maior`, minor `Menor`/`menor`, dim `Diminuto`/`diminuto`, maj7 `7M`/`maior com 7ª maior`, dom7 `7`/`dominante`, min7 `m7`/`menor com 7ª`, half-dim `m7(♭5)`/`meio-diminuto`
  - `HARMONY_KEY_TEXT: Record<HarmonyKeyLevel, string>` = os três textos da spec, seção 4
  - `HarmonyChordQuiz(props: { item: HarmonyItem; settings: Settings; onAnswer(correct: boolean): void; onNext(): void })`

HarmonyChordQuiz:
- `p.prompt` `` `Qual é o ${romanNumeral(field, degree)} de ${keyName(...)}?` ``.
- `div.note-grid` com 12 `button.note-option` (classe 0..11, sem `data-shortcut`); texto: se a classe está na escala da tonalidade, `spellingLabel(keySpelling(field, key, accidentals)[i], notation)`, senão `noteLabel(pc, notation, accidentals)`. `option--correct`/`option--wrong` e `disabled` depois. `p.keyboard-hint` `'Teclado: A–G · Shift = ♯'` só antes.
- Responder: `onAnswer(pc === chordRootClass(...))`; `sound.playPitches(chordPitches(field, key, degree, settings.harmonySevenths, instrument), 150)`; ao desmontar, `playPitches([])`.
- Depois: `role="status"` `` `Correto! O ${romano} de ${tonalidade} é ${phrase(root, notation)}.` `` ou `` `Errado. O ${romano} de ${tonalidade} é ${…}.` ``; `p.ear-detail` com `chordDetail`; `useAutoAdvance(correct, onNext)`; errou → `.quiz-actions` + `button.primary` "Próxima".

Atalho: em `useQuizShortcuts`, troque `document.querySelector(`[data-shortcut="${event.key.toLowerCase()}"]`)` por `Array.from(document.querySelectorAll<HTMLElement>('[data-shortcut]')).find((el) => el.dataset.shortcut === event.key.toLowerCase())`. Nada mais muda no arquivo.

- [ ] **Step 1: Write the failing tests**
  - `harmonyText.test.ts`: `keyName('major', 5, 'cifra', 'sharp') === 'F maior'`; `('major', 5, 'solfejo', 'auto') === 'Fá maior'`; `('major', 5, 'ambos', 'auto') === 'F maior (Fá maior)'`; `('minor', 3, 'cifra', 'auto') === 'Eb menor'`; `chordName('major', 5, 4, true, 'solfejo', 'auto') === 'Sib7M'`; `chordName('major', 7, 7, true, 'cifra', 'auto') === 'F#m7(b5)'`; `chordName('major', 2, 2, false, 'ambos', 'auto') === 'Em (Mim)'`; `chordDetail('major', 5, 4, false, 'cifra', 'sharp') === 'Bb: Bb D F'`.
  - `useQuizShortcuts.test.tsx` (componente de teste com `useQuizShortcuts(true)` e botões `data-shortcut="1"`, `data-shortcut="2"`, `data-shortcut='"'`): `fireEvent.keyDown(document, { key: '\\' })` e `{ key: '[' }` não lançam (`expect(() => …).not.toThrow()`, e um `window` `error` listener não recebe nada) e não clicam; `{ key: '"' }` clica o botão `"`; `'2'` clica o botão 2; botão desabilitado não é clicado.
  - `HarmonyChordQuiz.test.tsx` (setup como `ScaleDegreeQuiz.test.tsx`: `AppProvider` + `SoundProvider player={fakePlayer()}`, `Harness` com `useQuizShortcuts(true)`, `notation 'cifra'`, `accidentals` por parâmetro, padrão `'auto'`, timers falsos):
    - `'asks the IV of F'` (`{ field:'major', key:5, degree:4 }`, `accidentals:'sharp'`): `getByText('Qual é o IV de F maior?')`; textos dos 12 botões = `['C','C#','D','D#','E','F','F#','G','G#','A','Bb','B']`; sem `role="status"`.
    - `'labels by the key'` (`{ field:'major', key:6, degree:7 }`, auto): botões `['C','C#','D','D#','E','E#','F#','G','G#','A','A#','B']`; prompt `'Qual é o VII de F# maior?'`.
    - `'right answer'`: clicar `'Bb'` → `onAnswer(true)`, `'Correto! O IV de F maior é Bb.'`, `'Bb: Bb D F'`, botão `Bb` com `option--correct`; `player.play` chamado com 46 logo e, após 300 ms, com 50 e 53; 700 ms → `onNext` 1 vez.
    - `'wrong answer'`: clicar `'A'` → `onAnswer(false)`, `'Errado. O IV de F maior é Bb.'`, `A` com `option--wrong`, `'Próxima'`; 2000 ms → `onNext` não chamado.
    - `'keyboard'`: `Shift+A` (`{ key: 'A', shiftKey: true }`) → `onAnswer(true)`; numa pergunta nova, `'4'` não chama `onAnswer`; dica some depois de responder.
    - `'minor and sevenths'` (`{ field:'minor', key:9, degree:6 }`, `settings.harmonySevenths = true`): prompt `'Qual é o ♭VI de A menor?'`; clicar `'F'` → `'F7M: F A C E'`.
- [ ] **Step 2: Run tests to verify they fail**
  Run: `npx vitest run src/ui/harmonyText.test.ts src/ui/useQuizShortcuts.test.tsx src/ui/screens/HarmonyChordQuiz.test.tsx`
  Expected: FAIL (o teste de `\` falha com o seletor atual; os outros por módulos inexistentes).
- [ ] **Step 3: Implement** os arquivos listados.
- [ ] **Step 4: Run tests to verify they pass**
  Run: `npx vitest run src/ui`
  Expected: PASS, inclusive `DegreeQuiz`, `EarIntervalQuiz`, `ScaleDegreeQuiz`, `IntervalQuiz` e `Study` intactos.
- [ ] **Step 5: Commit**
  ```bash
  git add src/ui/harmonyText.ts src/ui/harmonyText.test.ts src/ui/useQuizShortcuts.ts src/ui/useQuizShortcuts.test.tsx src/ui/screens/HarmonyChordQuiz.tsx src/ui/screens/HarmonyChordQuiz.test.tsx
  git commit -m "feat(ui): harmony texts, chord-of-degree quiz and safe shortcut lookup"
  ```

---

### Task 4: Telas Grau do acorde e Qualidade do acorde

**Files:**
- Create: `src/ui/screens/HarmonyDegreeQuiz.tsx`, `src/ui/screens/HarmonyDegreeQuiz.test.tsx`
- Create: `src/ui/screens/HarmonyQualityQuiz.tsx`, `src/ui/screens/HarmonyQualityQuiz.test.tsx`
- Modify: `src/styles.css` (só acrescentar no fim: `.answer-grid--words`, `.option__name`)

**Interfaces:**
- Consumes: Tasks 1–3 (`romanNumeral`, `degreeNumeral`, `degreeQuality`, `TRIAD_QUALITIES`, `SEVENTH_QUALITIES`, `chordPitches`, `keyName`, `chordName`, `chordDetail`, `QUALITY_TEXT`).
- Produces (Task 5): `HarmonyDegreeQuiz(props: { item: HarmonyItem; settings; onAnswer; onNext })`, `HarmonyQualityQuiz(props: { question: QualityQuestion; settings; onAnswer; onNext })`.

Comum às duas: botões `button.option` em `div.answer-grid`, `data-shortcut` `` `${i + 1}` ``, desabilitados depois, `option--correct`/`option--wrong`; som `playPitches(chordPitches(…, sevenths), 150)` ao responder e `playPitches([])` ao desmontar; `p.ear-detail` com `chordDetail`; `useAutoAdvance(correct, onNext)`; errou → "Próxima". `sevenths` = `settings.harmonySevenths` no Grau do acorde e `question.sevenths` no Qualidade do acorde.

HarmonyDegreeQuiz: `p.prompt` `` `Que grau é ${chordName(…)} em ${keyName(…)}?` ``; 7 botões com `romanNumeral(field, d)`, `aria-label` `` `Grau ${romano}` ``; dica `'Teclado: 1–7'`; status `` `Correto! ${acorde} é o ${degreeNumeral(field, degree, sevenths)} de ${tonalidade}.` `` / `` `Errado. ${acorde} é o … de ….` ``.

HarmonyQualityQuiz: `p.prompt` `` `Como é o acorde do ${romanNumeral(field, degree)} de ${keyName(…)}?` ``; botões = `TRIAD_QUALITIES` ou `SEVENTH_QUALITIES`; grade `div.answer-grid.answer-grid--words`; tríade: texto `QUALITY_TEXT[q].label`; tétrade: `label` + `<small className="option__name">{name}</small>`; `aria-label` = `label` (tríade) ou `` `${label}, ${name}` `` (tétrade); dica `` `Teclado: 1–${n}` ``; status `` `Correto! O ${romano} de ${tonalidade} é ${acorde} (${QUALITY_TEXT[q].name}).` `` / `Errado. …` igual.

CSS (no fim de `styles.css`, depois da regra `@media (min-width: 768px) { .answer-grid … }`):
```css
.answer-grid--words { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.answer-grid--words .option { white-space: normal; line-height: 1.2; padding: 6px 4px; overflow-wrap: anywhere; }
.option__name { display: block; font-size: 0.75rem; font-weight: 400; }
@media (min-width: 768px) {
  .answer-grid--words { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
```

- [ ] **Step 1: Write the failing tests** (mesmo `setup`/`Harness` da Task 3):
  - `HarmonyDegreeQuiz.test.tsx`:
    - `'asks G in D'` (`{ field:'major', key:2, degree:4 }`): `'Que grau é G em D maior?'`; botões `['I','II','III','IV','V','VI','VII']`; clicar `'Grau IV'` → `onAnswer(true)`, `'Correto! G é o IV de D maior.'`, `'G: G B D'`; `player.play` com 55; 700 ms → `onNext`.
    - `'wrong'`: `'Grau V'` → `onAnswer(false)`, `'Errado. G é o IV de D maior.'`, `'Próxima'`.
    - `'sevenths'` (`{ field:'major', key:2, degree:2 }`, `harmonySevenths: true`): `'Que grau é Em7 em D maior?'`; acertar → `'Correto! Em7 é o IIm7 de D maior.'`.
    - `'minor numerals'` (`{ field:'minor', key:9, degree:7 }`): botões `['I','II','♭III','IV','V','♭VI','♭VII']`, prompt `'Que grau é G em A menor?'`.
    - `'keyboard'`: `'4'` → `onAnswer(true)`; numa pergunta nova `'g'` e `'8'` não respondem; dica `'Teclado: 1–7'`.
  - `HarmonyQualityQuiz.test.tsx`:
    - `'triads'` (`{ field:'major', sevenths:false, degree:6, key:0 }`): `'Como é o acorde do VI de C maior?'`; o texto do prompt não contém `m` depois do algarismo nem `°`; botões `['Maior','Menor','Diminuto']`, dentro de `.answer-grid--words`; clicar `'Menor'` → `onAnswer(true)`, `'Correto! O VI de C maior é Am (menor).'`, `'Am: A C E'`.
    - `'sevenths'` (`{ field:'major', sevenths:true, degree:7, key:7 }`): 4 botões com nomes acessíveis `['7M, maior com 7ª maior','7, dominante','m7, menor com 7ª','m7(♭5), meio-diminuto']`; clicar `'7, dominante'` → `onAnswer(false)`, `'Errado. O VII de G maior é F#m7(b5) (meio-diminuto).'`, `'Próxima'`; dica `'Teclado: 1–4'`.
    - `'minor'` (`{ field:'minor', sevenths:false, degree:2, key:4 }`): `'Como é o acorde do II de E menor?'`; tecla `'3'` → `onAnswer(true)` (Diminuto).
- [ ] **Step 2: Run tests to verify they fail**
  Run: `npx vitest run src/ui/screens/HarmonyDegreeQuiz.test.tsx src/ui/screens/HarmonyQualityQuiz.test.tsx`
  Expected: FAIL.
- [ ] **Step 3: Implement** as duas telas e o CSS acima.
- [ ] **Step 4: Run tests to verify they pass**
  Run: `npx vitest run src/ui`
  Expected: PASS.
- [ ] **Step 5: Commit**
  ```bash
  git add src/ui/screens/HarmonyDegreeQuiz.tsx src/ui/screens/HarmonyDegreeQuiz.test.tsx src/ui/screens/HarmonyQualityQuiz.tsx src/ui/screens/HarmonyQualityQuiz.test.tsx src/styles.css
  git commit -m "feat(ui): degree-of-chord and chord-quality quiz screens"
  ```

---

### Task 5: Registro dos modos, trilha Harmonia e tela de início

**Files:**
- Modify: `src/domain/quiz.ts` (`QuizMode` + os três modos)
- Modify: `src/domain/exercises.ts` (`TrackId` + `'harmonia'`, metas, `QUIZ_MODES`, `TRACKS`)
- Modify: `src/ui/exercises.tsx` (`QuizItem`, três exercícios, `HarmonyOptions`)
- Test: `src/domain/exercises.test.ts`, `src/ui/exercises.test.tsx`, `src/ui/screens/Study.test.tsx`, `src/ui/screens/Progress.test.tsx`, `src/state/storage.test.ts`

**Interfaces:**
- Consumes: Tasks 1–4; `reviewSubset` (já em `exercises.tsx`).
- Produces: `EXERCISES['harmony-chord' | 'harmony-degree' | 'harmony-quality']`.

Exercícios (`ui/exercises.tsx`), todos com `startBlockers: () => []`, `startsFromPosition: () => false`, sem `historyLevel`, `Options: HarmonyOptions`:
- `harmony-chord`: `itemKey` = `harmonyChordKey`; `questionCount` = `harmonyPool(harmonyField, harmonyKeys).length`; `buildQueue` = `buildHarmonyQueue(reviewSubset(ctx, pool, harmonyChordKey), ctx.rng)`; `prepareSound` = `preparePitches` de `chordPitches(f, k, d, true, instrument)` de cada item; `Quiz` → `HarmonyChordQuiz`.
- `harmony-degree`: igual com `harmonyDegreeKey` e `HarmonyDegreeQuiz`.
- `harmony-quality`: `itemKey` = `qualityKey`; `questionCount` = `qualityPool(harmonyField, harmonySevenths).length`; `buildQueue` = `buildQualityQueue(reviewSubset(ctx, pool, qualityKey), settings.harmonyKeys, ctx.rng)`; `prepareSound` com a `key` da pergunta; `Quiz` → `HarmonyQualityQuiz`.
- `QuizItem` ganha `HarmonyItem | QualityQuestion`.
- `HarmonyOptions`: três `div.level-bar role="group"` com `aria-pressed`: `aria-label="Campo"` [Maior `'major'`, Menor `'minor'`, Os dois `'both'`] → `harmonyField`; `"Acordes"` [Tríades `false`, Tétrades `true`] → `harmonySevenths`; `"Tonalidades"` [Fáceis `'easy'`, Médias `'medium'`, Todas `'all'`] → `harmonyKeys`; depois `p.mode-description` com `HARMONY_KEY_TEXT[harmonyKeys]`.
- Metas: descrições exatamente as da spec, seção 1; `track: 'harmonia'`, `recordsPositionProgress: false`, `usesFocus: false`.

- [ ] **Step 1: Update/write the failing tests**
  - `exercises.test.ts`: `QUIZ_MODES` = a lista das Global Constraints; `TRACKS` rótulos `['Braço','Ouvido','Teoria','Escalas','Harmonia']`; trilha `harmonia` = os três; labels; os três com `recordsPositionProgress: false`, `usesFocus: false`.
  - `Study.test.tsx`, só as listas exatas: menu com 12 itens (os 9 + `'Acorde do grau'`, `'Grau do acorde'`, `'Qualidade do acorde'`; `aria-checked` com 12 valores), grupos com `'Harmonia'` no fim e `labels('Harmonia')` = os três; abas do computador com os 12. Renomeie os títulos "9 exercises" para "12 exercises".
  - `ui/exercises.test.tsx`, `describe('harmonia')` com `makeCtx`:
    - `questionCount`: chord/degree padrão 18; `{ harmonyField:'both', harmonyKeys:'all' }` 144; quality padrão 7, `{ harmonyField:'both' }` 14.
    - `startBlockers` `[]` também com `soundEnabled: false`; `startsFromPosition` false nos três.
    - `buildQueue({ ...ctx, progress: {}, limit: 20, now: 0 })` com `{ harmonyField:'both', harmonyKeys:'all', harmonySevenths:true }`: chord/degree 20 itens, `itemKey` distintos e válidos (`isHarmonyChordKey`/`isHarmonyDegreeKey`); quality 14 itens, toda `key` em `harmonyKeys(field, 'all')`; com `harmonyKeys:'easy'`, toda `key` em `harmonyKeys(field, 'easy')`.
    - Revisão prioriza: chord `('both','all')` (144) com 139 chaves não vencidas e 5 vencidas → as 5 vencidas estão na fila.
    - `itemKey({ field:'major', key:5, degree:4 }, GUITAR)`: chord `'hchord:major:5:4'`, degree `'hdeg:major:5:4'`; quality `({ field:'minor', sevenths:false, degree:3, key:9 })` → `'hqual:minor:triad:3'`.
    - `prepareSound` com `{ preparePitches: vi.fn() }`: chord `[{ field:'major', key:5, degree:4 }]` → `[[46,50,53,57]]`.
  - `Study.test.tsx`, `describe('harmonia')`:
    - Escolher "Acorde do grau": sem `group` "Foco"; `'Sessão de 18 perguntas'`; grupos `Campo`, `Acordes`, `Tonalidades` com `Maior`, `Tríades`, `Fáceis` em `aria-pressed="true"`; clicar `'Todas'` → `readRawSettings(storage).harmonyKeys === 'all'` e `'Sessão de 20 perguntas'`; texto `'As 12 tonalidades.'`.
    - "Qualidade do acorde" com `'Os dois'` → `'Sessão de 14 perguntas'`; clicar `'Tétrades'` → `harmonySevenths === true`.
    - Iniciar "Grau do acorde" com som desligado: `'Pergunta 1 de 18'`, botões `'Grau I'`…; clicar um → `items` do instrumento ativo ganha uma chave `hdeg:`; Finalizar e confirmar → histórico com `mode: 'harmony-degree'` e sem `level`.
    - Computador (`mockViewport(1280)`), modo `harmony-quality`: sem "Foco", Iniciar habilitado.
    - `forced` com modo `harmony-chord` não inicia.
  - `storage.test.ts`: histórico `{ mode: 'harmony-quality', … }` carrega sem `level`; `v2Raw({ mode: 'harmony-chord' })` → `settings.mode === 'harmony-chord'`.
  - `Progress.test.tsx`: histórico com `mode: 'harmony-chord'` mostra `'Acorde do grau'`.
- [ ] **Step 2: Run tests to verify they fail**
  Run: `npx vitest run src/domain src/state src/ui`
  Expected: FAIL nos testes novos/atualizados.
- [ ] **Step 3: Implement** as mudanças de **Files** e **Interfaces**.
- [ ] **Step 4: Run tests to verify they pass**
  Run: `npx vitest run`
  Expected: PASS, todos.
- [ ] **Step 5: Commit**
  ```bash
  git add src/domain src/state src/ui
  git commit -m "feat: register harmony modes in a new Harmonia track

  exercises.test.ts and Study.test.tsx: the exact mode, track and tab lists now include the three new modes."
  ```

---

### Task 6: Verificação final

**Files:** nenhum novo; só corrige o que as verificações apontarem.

- [ ] **Step 1: Suite inteira**
  Run: `npm test`
  Expected: `Tests  N passed (N)`, N > 1457, 0 falhas.
- [ ] **Step 2: Exercícios atuais intocados**
  Run: `git diff main -- src/domain/intervals.ts src/domain/earTraining.ts src/domain/scales.ts src/domain/scaleItems.ts src/domain/spelling.ts src/ui/screens/IntervalQuiz.tsx src/ui/screens/EarIntervalQuiz.tsx src/ui/screens/DegreeQuiz.tsx src/ui/screens/ScaleDegreeQuiz.tsx src/ui/screens/ScalePlayQuiz.tsx src/ui/screens/ChoiceQuiz.tsx src/ui/screens/FindQuiz.tsx | grep -E '^[-+]' | grep -vE "^(\+\+\+|---)"`
  Expected: vazio.
- [ ] **Step 3: Sem churn de formatação**
  Run: `git diff main --stat -- src` e `git diff main -- src/state/storage.ts src/ui/exercises.tsx src/ui/useQuizShortcuts.ts src/styles.css src/domain/quiz.ts src/domain/exercises.ts | grep -E '^-' | grep -vE '^---'`
  Expected: `--stat` lista só arquivos das tarefas; as linhas removidas são só a do seletor em `useQuizShortcuts.ts`, a de `QuizMode`, as de `TrackId`/`QUIZ_MODES`/`TRACKS`/`EXERCISES`/`QuizItem` que ganharam itens e o comentário de `items` — nenhuma linha removida só por aspas, vírgula ou quebra.
- [ ] **Step 4: Nenhuma asserção antiga removida fora das listas**
  Run: `git diff main -- src | grep -E '^-\s*(expect\(|it\()'`
  Expected: só linhas das listas de modos/trilhas/abas em `exercises.test.ts` e `Study.test.tsx` (e títulos "9 exercises").
- [ ] **Step 5: Tipos e build**
  Run: `npm run build`
  Expected: `tsc` sem erros e `vite build` concluído.
- [ ] **Step 6: Conferência manual** com `npm run dev` em viewport **360 px** (e 390 px), notação "Ambos": Acorde do grau em Fá# maior (botão `E# · Mi#`), Grau do acorde no campo menor (`♭VII`), Qualidade do acorde em Tétrades (quatro botões com nome em duas linhas) — sem rolagem horizontal (`document.documentElement.scrollWidth <= 360` no console) e sem texto cortado; tema claro e escuro; IV de Fá = `Bb` em Sustenidos; som do acorde arpejado com Som ligado.
- [ ] **Step 7: Commit** (só se algo foi corrigido)
  ```bash
  git commit -am "fix: address M5 final checks"
  ```
