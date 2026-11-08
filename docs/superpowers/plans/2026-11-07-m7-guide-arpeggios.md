# M7 Notas-guia, arpejos e ii–V–I Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Três exercícios novos em trilhas existentes — "Notas-guia" (tocar a 3ª e a 7ª num desenho de sétima do M6, só violão), "Arpejo no desenho" (tocar o arpejo do acorde da tônica dentro de um desenho do M4, violão e baixo) e "ii–V–I" (tocar as notas-guia do acorde seguinte por condução de vozes, voicings shell curados em C, F, G, D, só violão) — com revisão espaçada por item.

**Architecture:** Três módulos puros novos que só consomem o que existe: `src/domain/guideTones.ts` (sobre `chordVoicing` do M6), `src/domain/arpeggio.ts` (sobre `scaleBox` do M4) e `src/domain/progressions.ts` (tabela curada do ii–V–I, conferida contra `spellChord` do M5). Cada um traz itens, chaves, validador, fila e um classificador puro de toque; `storage.ts` só aceita as chaves novas. O `Fretboard` ganha só a marca `guide`; três telas novas seguem `ChordPlayQuiz`/`ScalePlayQuiz`, e o registro liga tudo nas trilhas Escalas e Acordes.

**Tech Stack:** React 19, TypeScript, Vite, Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-11-07-m7-guide-arpeggios-design.md`

## Global Constraints

- Texto da interface em português. Nenhuma biblioteca nova. Celular primeiro: braço sempre com `fit` e `minFretWidth={40}`; nada passa de 360 px nem provoca rolagem horizontal.
- **Sem reformatação:** não rode formatador nem mude aspas, vírgulas finais ou quebras em código que a tarefa não precisa mudar. Arquivos novos: aspas simples, 2 espaços, `;`. O diff de cada arquivo existente contém só as linhas da tarefa.
- **Não mudam:** `src/domain/{chords,chordItems,scales,scaleItems,harmony,spelling}.ts`, `src/ui/chordText.ts`, as telas existentes e seus testes. Os testes atuais de `Fretboard.test.tsx` não mudam.
- Os 14 exercícios atuais não mudam; só mudam asserções de **lista exata**: `src/domain/exercises.test.ts` (`QUIZ_MODES`, modos das trilhas) e `src/ui/screens/Study.test.tsx` (`'lists the 14 exercises…'`/`'shows the 14 exercises as buttons…'` viram "17", listas das trilhas Escalas e Acordes, contagem de `aria-checked`).
- Ids e rótulos: `guide-tones` = "Notas-guia"; `arpeggio` = "Arpejo no desenho"; `ii-v-i` = "ii–V–I" (travessão U+2013). `QUIZ_MODES` = os 14 atuais + `'guide-tones', 'arpeggio', 'ii-v-i'`. `TRACKS`: Escalas `['scale-degree', 'scale-play', 'arpeggio']`, Acordes `['chord-name', 'chord-play', 'guide-tones', 'ii-v-i']`; nenhuma `TrackId` nova.
- Chaves: `guide:<shape>:<0–11>` (shape de sétima; aberto só com a própria fundamental); `arp:<escala>:<0–11>:<desenho>`; `iivi:<0|2|5|7>:<1|2>:<ii-v|v-i>`; sem zeros à esquerda. Aditivo em `guitar-mapper:v2`, sem trocar `version`, sem migração, sem ajuste novo, sem regravar ao carregar. Histórico sem `level`.
- Baixo: Notas-guia e ii–V–I usam a constante existente `BASS_NO_CHORDS` (`'Acordes são só para violão. Troque para Violão em Ajustes.'`) e `questionCount` 0; suas telas usam `GUITAR`. Arpejo no desenho usa o instrumento ativo e não tem bloqueio.
- Acerto por posição (Notas-guia) ou altura (Arpejo, ii–V–I); a grafia é só exibição. Sorteios só pelo `rng` injetado.
- Som só com `playPitches`/`playSequence`; desmontar a tela chama `playPitches([])`.
- Cor `--guide`: escuro `#c792ea` (rótulo `--guide-text: #111`), claro `#6d28d9` (rótulo `#fff`).
- Tabelas de teste coladas literalmente (geradas e conferidas por script Python independente na escrita deste plano); nunca recalculadas com o código testado.
- **TDD estrito com checagem de mutação:** em toda lógica de acerto (classificadores de toque, conjuntos de notas-guia/arpejo/alvos, validadores de chave), depois do verde, introduza à mão cada mutação listada no passo "Mutation check" da tarefa, rode o teste, confirme que **falha**, e desfaça (`git diff` limpo dessas mutações antes do commit).

## Review Focus

1. **Encaixe a 360 px:** as três telas passam `fit` e `minFretWidth={40}` ao `Fretboard` (teste com o `Fretboard` envolvido por `vi.mock`, como em `ChordPlayQuiz.test.tsx`, em cada tela — Tasks 4 e 5); conferência manual com Notas-guia num aberto (janela 0–4 + coluna ×), ii–V–I `iivi:2:2` (casas 10–14) e Arpejo em escala de 7 notas (Task 6).
2. **Baixo:** com o baixo ativo e `mode` `guide-tones` ou `ii-v-i` salvo, a tela de início mostra o aviso, Iniciar desabilitado, sem "Sessão de N"; um `forced` não inicia; `arpeggio` no baixo inicia e usa o braço de 4 cordas (Task 6).
3. **Nada revelado antes de terminar:** Notas-guia sem `.mark--guide`, `.mark--root`, `text` em `.mark` nem `.mark--hint` antes do fim; ii–V–I sem `line.link` e sem marca em casa do acorde de destino que não seja do de origem; nenhum `aria-label`/`title`/`data-*` com função ou nome de nota nas marcas ou casas (Tasks 4 e 5).
4. **Som parado ao desmontar:** em cada tela, terminar a pergunta (som agendado), desmontar a tela com o `SoundProvider` ainda montado e avançar 2000 ms → `player.play` não é chamado (Tasks 4 e 5).
5. **Sem formatação acidental:** `git diff main --stat` só lista arquivos dos **Files**; diffs de `Fretboard.tsx`, `storage.ts`, `exercises.tsx`, `styles.css`, `quiz.ts`, `exercises.ts` sem linhas só de estilo (Task 6).

---

### Task 1: Domínio das notas-guia e do arpejo + chaves

**Files:**
- Create: `src/domain/guideTones.ts`, `src/domain/guideTones.test.ts`, `src/domain/arpeggio.ts`, `src/domain/arpeggio.test.ts`
- Modify: `src/state/storage.ts` (uma linha em `isItemKey`, comentário de `InstrumentData.items`)
- Test: `src/state/storage.test.ts`, `src/state/backup.test.ts`

**Interfaces:**
- Consumes: `CHORD_SHAPE_IDS`, `CHORD_SHAPES`, `isChordShapeId`, `isTriad`, `shapeRoots`, `chordVoicing`, `chordSemitones`, `type Voicing`, `type VoicingNote` (`chords.ts`); `type ChordItem`, `type ChordShapeSetting` (`chordItems.ts`); `scaleBox`, `SCALES`, `isScaleId`, `type ScaleId`, `type ScaleBox`, `type BoxNote` (`scales.ts`); `type ScalePlayItem` (`scaleItems.ts`); `shuffled` (`earTraining.ts`); `pitchOf` (`pitch.ts`); `positionKey`, `type Position` (`fretboard.ts`).
- Produces (Tasks 3–6):
  - `guideTones.ts`: `GUIDE_SHAPE_IDS: readonly ChordShapeId[]` (os de `CHORD_SHAPE_IDS` com qualidade não-tríade, na mesma ordem: `g7 c7 d7 a7 e7 am7 em7 dm7 cmaj7 fmaj7 bm7b5 e-7 e-m7 a-7 a-m7 a-maj7 a-m7b5`); `isGuideFunc(func: string): boolean` (`'3' '♭3' '7' '♭7'`); `guideNotes(v: Voicing): VoicingNote[]` (em `v.notes`, ordem 6ª→1ª); `guideWindow(v: Voicing): { fretMin: number; fretMax: number }` (aberto `0..4`, móvel `v.fretMin..v.fretMax`); `guidePool(shapes: ChordShapeSetting): ChordItem[]` (ids em ordem × `shapeRoots`); `guideKey(item: ChordItem): string`; `isGuideKey(key: string): boolean`; `buildGuideQueue(items, rng): ChordItem[]` (= `shuffled`); `type GuideTap = 'guide' | 'other' | 'outside'`; `classifyGuideTap(v: Voicing, p: Position): GuideTap` (por corda e casa em `v.notes`).
  - `arpeggio.ts`: `TONIC_CHORD: Record<ScaleId, ChordQuality>` (tabela da spec, seção 4); `interface Arpeggio { box: ScaleBox; quality: ChordQuality; notes: BoxNote[] /* notas do desenho no acorde */; pitches: ReadonlySet<number>; rootPitches: ReadonlySet<number> }`; `arpeggioOf(scale: ScaleId, box: number, root: NoteIndex, instrument: Instrument): Arpeggio`; `isArpeggioTap(a: Arpeggio, p: Position, instrument: Instrument): boolean` (altura em `a.pitches`); `arpeggioKey(item: ScalePlayItem): string`; `isArpeggioKey(key: string): boolean`; `buildArpeggioQueue(items, rng): ScalePlayItem[]` (= `shuffled`). O pool é o `scalePlayPool` do M4.

Regras: validadores `/^guide:([a-z0-9-]+):(\d|1[01])$/` + `isChordShapeId` + não-tríade + `shapeRoots(shape).includes(root)`; `/^arp:([a-z-]+):(\d|1[01]):([1-9])$/` + `isScaleId` + desenho ≤ `boxCount`. Nota do acorde no arpejo: `(pitch - root) mod 12` ∈ `chordSemitones(TONIC_CHORD[scale])`.

- [ ] **Step 1: Write the failing tests** em `guideTones.test.ts`. Helper `fmt = (ns) => ns.map(n => `${n.position.string}-${n.position.fret}`).join(' ')`.

  ```ts
  const OPEN_GUIDES: Record<string, string> = { g7: '5-2 2-0 1-1', c7: '4-2 3-3 1-0', d7: '2-1 1-2', a7: '3-0 2-2', e7: '4-0 3-1', am7: '3-0 2-1', em7: '4-0 3-0', dm7: '2-1 1-1', cmaj7: '4-2 2-0 1-0', fmaj7: '3-2 1-0', bm7b5: '3-2 2-3' };
  /** Índice = fundamental 0..11. */
  const MOVABLE_GUIDES: Record<string, string[]> = {
    'e-7': ['4-8 3-9', '4-9 3-10', '4-10 3-11', '4-11 3-12', '4-12 3-13', '4-1 3-2', '4-2 3-3', '4-3 3-4', '4-4 3-5', '4-5 3-6', '4-6 3-7', '4-7 3-8'],
    'e-m7': ['4-8 3-8', '4-9 3-9', '4-10 3-10', '4-11 3-11', '4-12 3-12', '4-1 3-1', '4-2 3-2', '4-3 3-3', '4-4 3-4', '4-5 3-5', '4-6 3-6', '4-7 3-7'],
    'a-7': ['3-3 2-5', '3-4 2-6', '3-5 2-7', '3-6 2-8', '3-7 2-9', '3-8 2-10', '3-9 2-11', '3-10 2-12', '3-11 2-13', '3-12 2-14', '3-1 2-3', '3-2 2-4'],
    'a-m7': ['3-3 2-4', '3-4 2-5', '3-5 2-6', '3-6 2-7', '3-7 2-8', '3-8 2-9', '3-9 2-10', '3-10 2-11', '3-11 2-12', '3-12 2-13', '3-1 2-2', '3-2 2-3'],
    'a-maj7': ['3-4 2-5', '3-5 2-6', '3-6 2-7', '3-7 2-8', '3-8 2-9', '3-9 2-10', '3-10 2-11', '3-11 2-12', '3-12 2-13', '3-13 2-14', '3-2 2-3', '3-3 2-4'],
    'a-m7b5': ['3-3 2-4', '3-4 2-5', '3-5 2-6', '3-6 2-7', '3-7 2-8', '3-8 2-9', '3-9 2-10', '3-10 2-11', '3-11 2-12', '3-12 2-13', '3-1 2-2', '3-2 2-3'],
  };
  ```
  - `GUIDE_SHAPE_IDS` igual à lista das Interfaces; `it.each` abertos: `fmt(guideNotes(chordVoicing(id, 0))) === OPEN_GUIDES[id]`; móveis × 0..11: `=== MOVABLE_GUIDES[id][r]`. Funções: `guideNotes(chordVoicing('g7', 0)).map(n => n.func)` = `['3','3','♭7']`; `('cmaj7')` = `['3','7','3']`.
  - Para todo item de `guidePool('all')`: ao menos uma nota com func `3`/`♭3` e uma com `7`/`♭7`; toda nota de `v.notes` dentro de `guideWindow(v)`.
  - `isGuideFunc`: true `'3' '♭3' '7' '♭7'`; false `'1' '5' '♭5' ''`.
  - `guideWindow(chordVoicing('g7', 0))` = `{ fretMin: 0, fretMax: 4 }`; `(chordVoicing('e-7', 9))` = `{ fretMin: 4, fretMax: 8 }`.
  - `guidePool('open').length === 11`, `('barre')` 72, `('all')` 83; `guidePool('open')[0]` = `{ shape: 'g7', root: 7 }`; `guidePool('barre')[0]` = `{ shape: 'e-7', root: 0 }`.
  - `classifyGuideTap(chordVoicing('g7', 0), …)`: `{string:2,fret:0}` `'guide'`, `{string:1,fret:1}` `'guide'`, `{string:5,fret:2}` `'guide'`, `{string:6,fret:3}` `'other'` (fundamental), `{string:4,fret:0}` `'other'` (5ª), `{string:3,fret:2}` `'outside'`, `{string:2,fret:1}` `'outside'`. `chordVoicing('a-m7b5', 0)`: `{string:3,fret:3}` `'guide'`, `{string:4,fret:4}` `'other'` (♭5), `{string:1,fret:3}` `'outside'` (corda abafada).
  - Chaves: `guideKey({ shape: 'a-maj7', root: 0 }) === 'guide:a-maj7:0'`. `isGuideKey` true: `'guide:g7:7'`, `'guide:a-m7b5:11'`, `'guide:e-7:0'`; false: `'guide:c:0'`, `'guide:g7:0'`, `'guide:e-7:12'`, `'guide:e-7:01'`, `'guide:zz:0'`, `'guide:g7'`, `'chordname:g7:7'`. Toda chave de `guidePool('all')` passa e é única.

  Em `arpeggio.test.ts` (helper `pos = (ns) => new Set(ns.map(n => `${n.position.string}-${n.position.fret}`))`; compare com `new Set([...])` das listas abaixo):
  - `TONIC_CHORD` = `{ 'pent-minor': 'min7', 'pent-major': 'major', blues: 'min7', major: 'maj7', minor: 'min7', dorian: 'min7', phrygian: 'min7', lydian: 'maj7', mixolydian: 'dom7', locrian: 'half-dim' }`.
  - Literais (violão salvo indicado), `pos(arpeggioOf(...).notes)` =
    - `('pent-minor', 1, 9, GUITAR)`: `['6-5','6-8','5-7','4-5','4-7','3-5','2-5','2-8','1-5','1-8']`; `rootPitches` = `{45, 57, 69}`; `pitches.size` 10.
    - `('blues', 1, 9, GUITAR)`: o mesmo conjunto (a ♭5 não entra).
    - `('pent-major', 1, 0, GUITAR)`: `['6-8','5-7','5-10','4-10','3-9','2-8','1-8']`.
    - `('pent-minor', 1, 9, BASS)`: `['4-5','4-8','3-7','2-5','2-7','1-5']`; `rootPitches.size` 2.
    - `('mixolydian', 2, 7, GUITAR)`: `['6-7','5-5','5-8','4-5','4-9','3-7','2-6','2-8','1-7','1-10']`.
  - Tamanhos `pitches.size - rootPitches.size` ("Faltam") por desenho 1..n, para qualquer tônica (teste em 0..11):
    - violão: pent-minor `7 7 7 8 7`; pent-major `4 5 6 5 4`; blues `7 7 7 8 7`; todas as de 7 notas `7 8 8 8 8 7 8`.
    - baixo: pent-minor `4 5 5 5 5`; pent-major `3 4 4 3 2`; blues `4 5 5 5 5`; todas as de 7 notas `5 5 6 5 5 5 5`.
  - Propriedade, toda escala × desenho × tônica × instrumento: o conjunto das classes de `notes` é igual a `chordSemitones(TONIC_CHORD[scale])` deslocado pela tônica; e toda casa (corda × casa da janela `box.fretMin..fretMax`) cuja classe é do acorde tem altura em `pitches`.
  - `isArpeggioTap(arpeggioOf('pent-minor',1,9,GUITAR), …, GUITAR)`: `6-8` true, `5-5` false (D), `5-6` false (fora da escala); `arpeggioOf('major',1,0,GUITAR)`: `1-8` true (mesma altura que `2-13`).
  - Chaves: `arpeggioKey({ scale: 'pent-minor', root: 9, box: 1 }) === 'arp:pent-minor:9:1'`. `isArpeggioKey` true: `'arp:pent-minor:9:1'`, `'arp:major:0:7'`, `'arp:blues:11:5'`; false: `'arp:blues:0:6'`, `'arp:major:12:1'`, `'arp:major:01:1'`, `'arp:foo:0:1'`, `'arp:major:0:0'`, `'scaleplay:major:0:1'`.
- [ ] **Step 2: Write the failing storage tests**
  - `storage.test.ts`, `describe('M7 item keys')`: mantém `'guide:g7:7'`, `'arp:dorian:2:3'` e as antigas `'chordplay:e-7:4'`, `'scaleplay:blues:3:2'`; descarta `'guide:c:0'`, `'arp:blues:0:6'`. Um save v2 sem chaves novas continua com `storage.dump()[STORAGE_KEY]` igual ao texto original após carregar.
  - `backup.test.ts`: `parseImport(serializeData(d))` com `d.instruments.guitar.items = { 'guide:a-7:2': entry }` e `d.instruments.bass.items = { 'arp:pent-minor:9:1': entry }` → `{ ok: true, data: d }`.
- [ ] **Step 3: Run tests to verify they fail**
  Run: `npx vitest run src/domain/guideTones.test.ts src/domain/arpeggio.test.ts src/state`
  Expected: FAIL (módulos inexistentes; chaves descartadas).
- [ ] **Step 4: Implement** os dois módulos; em `storage.ts`, acrescente uma linha em `isItemKey` com `isGuideKey(key) || isArpeggioKey(key)` e cite `guide:`/`arp:` no comentário de `items`. Só acrescente linhas.
- [ ] **Step 5: Run tests to verify they pass**
  Run: `npx vitest run src/domain src/state`
  Expected: PASS, antigos inclusos.
- [ ] **Step 6: Mutation check** (cada uma deve fazer falhar um teste; depois desfaça): `isGuideFunc` aceitando `'5'`; `isGuideFunc` sem `'♭7'`; `classifyGuideTap` comparando só a corda; `guideWindow` aberto começando em 1; `arpeggioOf` usando `SCALES[scale].semitones` em vez das do acorde; `isArpeggioTap` por classe de altura em vez de altura; `isGuideKey` sem checar não-tríade; `isArpeggioKey` sem checar `boxCount`.
- [ ] **Step 7: Commit**
  ```bash
  git add src/domain/guideTones.ts src/domain/guideTones.test.ts src/domain/arpeggio.ts src/domain/arpeggio.test.ts src/state/storage.ts src/state/storage.test.ts src/state/backup.test.ts
  git commit -m "feat(domain): guide tones in chord shapes and tonic arpeggios in scale boxes"
  ```

---

### Task 2: Domínio do ii–V–I (voicings curados, passos, chaves)

**Files:**
- Create: `src/domain/progressions.ts`, `src/domain/progressions.test.ts`
- Modify: `src/state/storage.ts` (uma linha em `isItemKey`, comentário)
- Test: `src/state/storage.test.ts`

**Interfaces:**
- Consumes: `type ChordQuality`, `spellChord`, `chordRootClass`, `degreeQuality` (`harmony.ts`, os dois últimos só no teste); `chordSemitones`, `functionLabel` (`chords.ts`); `GUITAR`; `shuffled`; `pitchOf`.
- Produces (Tasks 3, 5, 6):
  - `II_V_I_KEYS: readonly NoteIndex[] = [0, 5, 7, 2]`; `type IiViGrip = 1 | 2`; `type IiViStep = 'ii-v' | 'v-i'`
  - `interface IiViItem { key: NoteIndex; grip: IiViGrip; step: IiViStep }`
  - `interface ShellNote { position: Position; pitch: number; func: string; isRoot: boolean }`
  - `interface ShellChord { degree: 2 | 5 | 1; root: NoteIndex; quality: ChordQuality; notes: ShellNote[] /* grave → agudo */ }`
  - `iiViChords(key: NoteIndex, grip: IiViGrip): [ShellChord, ShellChord, ShellChord]` (ii m7, V 7, I 7M)
  - `iiViWindow(key, grip): { fretMin: number; fretMax: number }` (`lo` = menor casa dos três, `hi = lo + 4`)
  - `interface IiViMove { from: ShellNote; to: ShellNote; semitones: number }`
  - `interface IiViQuestion { item: IiViItem; from: ShellChord; to: ShellChord; targets: ShellNote[] /* notas-guia do destino: 3ª, 7ª */; moves: [IiViMove, IiViMove] /* [7ª→3ª, 3ª→7ª] */; fretMin: number; fretMax: number }`
  - `iiViQuestion(item: IiViItem): IiViQuestion`
  - `iiViPool(): IiViItem[]` (ordem: chaves de `II_V_I_KEYS` × grip 1, 2 × `'ii-v'`, `'v-i'`; 16)
  - `iiViKey(item): string`; `isIiViKey(key): boolean`; `buildIiViQueue(items, rng): IiViItem[]` (= `shuffled`)
  - `isIiViTarget(q: IiViQuestion, pitch: number): boolean`

Regras: a tabela da spec, seção 5, é a fonte (literal ou duas digitações relativas, à escolha); altura = `GUITAR.openMidi[corda - 1] + casa`; `func = functionLabel((pitch - root) mod 12)`. Validador `/^iivi:(\d|1[01]):([12]):(ii-v|v-i)$/` + chave em `II_V_I_KEYS`.

- [ ] **Step 1: Write the failing tests** em `progressions.test.ts`. Helper `fmt(c: ShellChord)` = casas da 6ª à 1ª com `x`, separadas por `-`.

  ```ts
  const TABLE: Record<string, [string, string, string]> = {
    '0:1': ['x-5-3-5-x-x', '3-x-3-4-x-x', 'x-3-2-4-x-x'], '0:2': ['10-x-10-10-x-x', 'x-10-9-10-x-x', '8-x-9-9-x-x'],
    '5:1': ['x-10-8-10-x-x', '8-x-8-9-x-x', 'x-8-7-9-x-x'], '5:2': ['3-x-3-3-x-x', 'x-3-2-3-x-x', '1-x-2-2-x-x'],
    '7:1': ['x-12-10-12-x-x', '10-x-10-11-x-x', 'x-10-9-11-x-x'], '7:2': ['5-x-5-5-x-x', 'x-5-4-5-x-x', '3-x-4-4-x-x'],
    '2:1': ['x-7-5-7-x-x', '5-x-5-6-x-x', 'x-5-4-6-x-x'], '2:2': ['12-x-12-12-x-x', 'x-12-11-12-x-x', '10-x-11-11-x-x'],
  };
  const WINDOW: Record<string, [number, number]> = { '0:1': [2, 6], '0:2': [8, 12], '5:1': [7, 11], '5:2': [1, 5], '7:1': [9, 13], '7:2': [3, 7], '2:1': [4, 8], '2:2': [10, 14] };
  /** Alvos `corda-casa:func` (3ª, 7ª) por item. */
  const TARGETS: Record<string, string> = {
    'iivi:0:1:ii-v': '3-4:3 4-3:♭7', 'iivi:0:1:v-i': '4-2:3 3-4:7', 'iivi:0:2:ii-v': '4-9:3 3-10:♭7', 'iivi:0:2:v-i': '3-9:3 4-9:7',
    'iivi:5:1:ii-v': '3-9:3 4-8:♭7', 'iivi:5:1:v-i': '4-7:3 3-9:7', 'iivi:5:2:ii-v': '4-2:3 3-3:♭7', 'iivi:5:2:v-i': '3-2:3 4-2:7',
    'iivi:7:1:ii-v': '3-11:3 4-10:♭7', 'iivi:7:1:v-i': '4-9:3 3-11:7', 'iivi:7:2:ii-v': '4-4:3 3-5:♭7', 'iivi:7:2:v-i': '3-4:3 4-4:7',
    'iivi:2:1:ii-v': '3-6:3 4-5:♭7', 'iivi:2:1:v-i': '4-4:3 3-6:7', 'iivi:2:2:ii-v': '4-11:3 3-12:♭7', 'iivi:2:2:v-i': '3-11:3 4-11:7',
  };
  ```
  - `it.each` tom × forma: `iiViChords(k, g).map(fmt)` = `TABLE[`${k}:${g}`]`; `iiViWindow` = `WINDOW`; qualidades `['min7','dom7','maj7']`, graus `[2,5,1]`.
  - **Contra o M5**, cada acorde: o conjunto de classes de `notes` = classes de `spellChord('major', k, grau, true, 'auto').tones` (letra natural + sinal, mod 12) menos `(root + 7) % 12`; `notes[0].isRoot` e `notes[0].pitch % 12 === root`; funcs contêm uma de `3/♭3` e uma de `7/♭7`; casas em `1..14` e na janela.
  - Por item de `iiViPool()`: `targets` em `corda-casa:func` = `TARGETS[iiViKey(item)]`; `moves[0]` vai da 7ª da origem à 3ª do destino com `semitones === -1` e mesma corda; `moves[1]` da 3ª à 7ª com `semitones === 0` e mesma posição.
  - Alturas-alvo únicas na janela: para cada item, as casas da janela (cordas 1–6) com altura em `targets` são exatamente as posições de `targets`.
  - `isIiViTarget(iiViQuestion({ key: 0, grip: 1, step: 'ii-v' }), …)`: 59 true, 53 true, 47 false (B em outra oitava, casa 5-2), 65 false (F em 2-6), 43 false (G, fundamental do destino), 50 false.
  - `iiViPool().length === 16`; `iiViPool()[0]` = `{ key: 0, grip: 1, step: 'ii-v' }`. `iiViKey({ key: 7, grip: 2, step: 'v-i' }) === 'iivi:7:2:v-i'`. `isIiViKey` true: `'iivi:0:1:ii-v'`, `'iivi:2:2:v-i'`, `'iivi:5:1:v-i'`, `'iivi:7:2:ii-v'`; false: `'iivi:1:1:ii-v'`, `'iivi:0:3:ii-v'`, `'iivi:0:1:i-v'`, `'iivi:00:1:ii-v'`, `'iivi:0:1'`, `'iivi:12:1:ii-v'`. Toda chave do pool passa e é única.
- [ ] **Step 2: Write the failing storage test** em `describe('M7 item keys')`: mantém `'iivi:5:2:v-i'`; descarta `'iivi:1:1:ii-v'`.
- [ ] **Step 3: Run tests to verify they fail**
  Run: `npx vitest run src/domain/progressions.test.ts src/state/storage.test.ts`
  Expected: FAIL.
- [ ] **Step 4: Implement** `progressions.ts`; em `storage.ts`, acrescente `isIiViKey(key)` à linha de M7 em `isItemKey` e `iivi:` no comentário.
- [ ] **Step 5: Run tests to verify they pass**
  Run: `npx vitest run src/domain src/state`
  Expected: PASS.
- [ ] **Step 6: Mutation check:** trocar uma casa da tabela (`G7 3-x-3-4` → `3-x-3-5`); `moves[0]` ligando a 3ª à 3ª; `isIiViTarget` por classe de altura; `iiViWindow` com `hi = lo + 3`; `isIiViKey` aceitando qualquer tom 0–11. Cada uma deve falhar; desfaça.
- [ ] **Step 7: Commit**
  ```bash
  git add src/domain/progressions.ts src/domain/progressions.test.ts src/state/storage.ts src/state/storage.test.ts
  git commit -m "feat(domain): curated ii-V-I shell voicings with guide-tone voice leading"
  ```

---

### Task 3: Marca `guide`, legendas e textos

**Files:**
- Modify: `src/ui/Fretboard.tsx` (só `'guide'` no fim de `MarkKind`)
- Modify: `src/styles.css` (variáveis nos dois blocos `:root` e regras no fim)
- Test: `src/ui/Fretboard.test.tsx` (só um teste novo, no fim)
- Create: `src/ui/GuideLegend.tsx`, `src/ui/ArpeggioLegend.tsx`, `src/ui/m7Text.ts`, `src/ui/m7Text.test.ts`

**Interfaces:**
- Consumes: Tasks 1–2; `spellChordTones`, `CHORD_SHAPES` (`chords.ts`); `chordSymbol` (`chordText.ts`); `phrase` (`harmonyText.ts`); `spellChord`, `QUALITY_SYMBOL` (`harmony.ts`); `spellScale` (`spelling.ts`); `scaleTitle` (`scaleText.ts`).
- Produces (Tasks 4–5):
  - `MarkKind` com `'guide'`
  - `GuideLegend(): JSX` — `ul.legend`: "Fundamental" (`swatch--root`), "Nota do acorde" (`swatch--chord`), "Nota-guia (3ª e 7ª)" (`swatch--guide`), "× Corda abafada"
  - `ArpeggioLegend(): JSX` — "Tônica" (`swatch--root`), "Nota do arpejo" (`swatch--chord`), "Outra nota da escala" (`swatch--scale`)
  - `guideNames(v: Voicing, notation, accidentals): string` — nomes da 3ª e da 7ª (de `spellChordTones`, índices 1 e 3) com a função: `'B (3) e F (♭7)'`
  - `functionName(func: string): string` — `'1'` → `'a fundamental'`, `'5'` → `'a 5ª'`, `'♭5'` → `'a ♭5'`
  - `arpeggioSymbol(scale, root, notation, accidentals): string` — `phrase(spellScale(root, SCALES[scale], acc)[0], notation, QUALITY_SYMBOL[TONIC_CHORD[scale]])`
  - `arpeggioTitle(item: ScalePlayItem, notation, accidentals): string` — `` `${arpeggioSymbol} em ${scaleTitle(...)}` ``
  - `arpeggioToneNames(scale, root, notation, accidentals): string` — notas da escala (grafia da escala) cujos semitons estão no acorde, separadas por espaço
  - `iiViChordSymbol(key: NoteIndex, chord: ShellChord, notation, accidentals): string` — tônica de `spellChord('major', key, chord.degree, true, acc).root` + `QUALITY_SYMBOL`
  - `iiViTitle(q: IiViQuestion, notation, accidentals): string` — `` `${de} → ${para} · ii–V–I em ${tom}` ``
  - `iiViTargetNames(q, notation, accidentals): string` — `'B e F'` (3ª, 7ª do destino)
  - `iiViDetail(q, notation, accidentals): string` — `` `${n7} (${f7}) desce meio tom para ${n3} (${f3}) · ${m3} (${g3}) fica e vira a ${g7}` ``

CSS: em `:root` (escuro) `--guide: #c792ea; --guide-text: #111;`; no bloco claro `--guide: #6d28d9; --guide-text: #fff;`. No fim: `.mark--guide circle { fill: var(--guide); }`, `.mark--guide text { fill: var(--guide-text); }`, `.swatch--guide { background: var(--guide); }`.

- [ ] **Step 1: Write the failing tests**
  - `Fretboard.test.tsx` (novo, no fim): marca `{ position: { string: 3, fret: 2 }, kind: 'guide', label: '3' }` → `g.mark--guide[data-pos="3-2"]` com texto `'3'`.
  - `m7Text.test.ts`: `guideNames(chordVoicing('g7', 0), 'cifra', 'auto') === 'B (3) e F (♭7)'`; `(chordVoicing('am7', 0), 'cifra', 'auto') === 'C (♭3) e G (♭7)'`; `(chordVoicing('a-maj7', 10), 'solfejo', 'flat') === 'Ré (3) e Lá (7)'`; `functionName('5') === 'a 5ª'`, `('1') === 'a fundamental'`, `('♭5') === 'a ♭5'`; `arpeggioSymbol('pent-minor', 9, 'cifra', 'auto') === 'Am7'`; `arpeggioSymbol('pent-major', 0, 'cifra', 'auto') === 'C'`; `arpeggioSymbol('locrian', 11, 'cifra', 'auto') === 'Bm7(b5)'`; `arpeggioTitle({ scale: 'pent-minor', root: 9, box: 1 }, 'cifra', 'auto') === 'Am7 em A pentatônica menor · desenho 1'`; `arpeggioToneNames('pent-minor', 9, 'cifra', 'auto') === 'A C E G'`; `arpeggioToneNames('mixolydian', 7, 'cifra', 'auto') === 'G B D F'`; com `q = iiViQuestion({ key: 0, grip: 1, step: 'ii-v' })`: `iiViTitle(q, 'cifra', 'auto') === 'Dm7 → G7 · ii–V–I em C'`, `iiViTargetNames(q, 'cifra', 'auto') === 'B e F'`, `iiViDetail(q, 'cifra', 'auto') === 'C (♭7) desce meio tom para B (3) · F (♭3) fica e vira a ♭7'`; com `{ key: 0, grip: 1, step: 'v-i' }`: título `'G7 → C7M · ii–V–I em C'`, detalhe `'F (♭7) desce meio tom para E (3) · B (3) fica e vira a 7'`; `{ key: 5, grip: 2, step: 'ii-v' }` → título `'Gm7 → C7 · ii–V–I em F'`, alvos `'E e Bb'`; `{ key: 2, grip: 1, step: 'v-i' }`, `'ambos'` → título `'A7 (Lá7) → D7M (Ré7M) · ii–V–I em D (Ré)'`.
- [ ] **Step 2: Run tests to verify they fail**
  Run: `npx vitest run src/ui/Fretboard.test.tsx src/ui/m7Text.test.ts`
  Expected: FAIL nos novos; os antigos do `Fretboard` passam.
- [ ] **Step 3: Implement** os acréscimos acima.
- [ ] **Step 4: Run tests to verify they pass**
  Run: `npx vitest run src/ui`
  Expected: PASS.
- [ ] **Step 5: Commit**
  ```bash
  git add src/ui/Fretboard.tsx src/ui/Fretboard.test.tsx src/styles.css src/ui/GuideLegend.tsx src/ui/ArpeggioLegend.tsx src/ui/m7Text.ts src/ui/m7Text.test.ts
  git commit -m "feat(ui): guide-tone mark, M7 legends and texts"
  ```

---

### Task 4: Telas Notas-guia e Arpejo no desenho

**Files:**
- Create: `src/ui/screens/GuideToneQuiz.tsx`, `src/ui/screens/GuideToneQuiz.test.tsx`, `src/ui/screens/ArpeggioQuiz.tsx`, `src/ui/screens/ArpeggioQuiz.test.tsx`

**Interfaces:**
- Consumes: Tasks 1, 3; `chordVoicing`, `voicingPitches`, `spellChordTones`; `chordTitle`, `chordSymbol`, `chordToneNames`, `shapeName` (`chordText.ts`); `useSound`, `useAppState`, `useAutoAdvance`, `stringLabels`, `noteLabel`, `noteAt`, `pitchOf`, `SCALES`.
- Produces (Task 6): `GuideToneQuiz(props: { question: ChordItem; settings; onAnswer; onNext })`; `ArpeggioQuiz(props: { question: ScalePlayItem; settings; onAnswer; onNext })`.

Comum: `<Fretboard fit minFretWidth={40} leftHanded={leftHanded} stringLabels={…} …/>`; `useAutoAdvance(correct, onNext)`; `useEffect(() => () => playPitches([]), [playPitches])`; depois do fim `.feedback.quiz-actions` com `p[role=status]`, `p.ear-detail`, `button.ear-play` e, se errou, `button.primary` "Próxima"; `onTap` só antes do fim; `p.scale-remaining` (`aria-live="polite"`) `` `Faltam ${n} ${n === 1 ? 'nota' : 'notas'}` `` só antes do fim.

GuideToneQuiz (`instrument={GUITAR}`, `v = chordVoicing`, janela `guideWindow(v)`, `<GuideLegend />`): `p.prompt` `'Toque as notas-guia'`; `p.scale-title` `chordTitle(question, …)`; `stringMarks` = `v.stringMarks` com `'open'` → `null`; `barres` = `v.barre ? [v.barre] : []` sempre. Antes: toda nota de `v.notes` `chord` sem rótulo, exceto encontradas = `guide` sem rótulo. Toque: `playPitches([pitchOf(p, GUITAR)])` em `'outside'` e em nota-guia já encontrada ou ainda não-última; `classifyGuideTap` decide (spec, seção 3); última encontrada ou `'other'` → fim + rasgueado `playPitches(voicingPitches(v), 40)`. Depois: cada nota com `label = func`, `kind` `root` se `isRoot`, `guide` se nota-guia encontrada, `hint` se nota-guia não encontrada, senão `chord`; a tocada errada vira `wrong`. Status `` `Correto! As notas-guia de ${símbolo} são ${guideNames}.` `` / `` `Errado. ${noteLabel(noteAt(p, GUITAR), notation, accidentals)} é ${functionName(func)} de ${símbolo}, não nota-guia.` ``; detalhe `` `${símbolo}: ${chordToneNames} · ${shapeName}` ``; botão "Ouvir o acorde".

ArpeggioQuiz (instrumento ativo de `useAppState`, `a = arpeggioOf(scale, box, root, instrument)`, janela `a.box.fretMin..fretMax`, `<ArpeggioLegend />`): segue `ScalePlayQuiz` com `found` iniciando em `a.rootPitches`; `p.prompt` `'Toque o arpejo'`; `p.scale-title` `arpeggioTitle`. Toque: `sound.playPosition(p)`; `!isArpeggioTap` → fim errado; altura nova → conta, casa `chord`; já encontrada → só marca a casa. Antes: tônicas `root`, tocadas `chord`, sem rótulo. Depois: notas de `a.notes` com rótulo `SCALES[scale].degrees[degree]` — `root` (tônica), `chord` (encontrada), `hint` (faltou); demais notas do desenho `scale` com rótulo do grau; errada `wrong`. Som do fim: `playPitches([...a.pitches].sort((x, y) => x - y), 150)`. Status `'Correto! Arpejo completo.'` / `` `Errado. ${noteLabel(...)} não está em ${arpeggioSymbol}.` ``; detalhe `` `${arpeggioSymbol}: ${arpeggioToneNames}` ``; botão "Ouvir o arpejo".

- [ ] **Step 1: Write the failing tests** (setup como `ChordPlayQuiz.test.tsx`: `vi.mock('../Fretboard')` envolvendo o real e gravando `fit`/`minFretWidth`, `AppProvider` + `SoundProvider player={fakePlayer()}`, `notation 'cifra'`, `accidentals 'sharp'`, `ui(q, key)`, `withoutScreen()`, `tap('s-f')`, `mark(kind, pos)`, timers falsos):
  - `GuideToneQuiz.test.tsx`, `G7 = { shape: 'g7', root: 7 }`:
    - `'asks without revealing'`: `'Toque as notas-guia'`, `'G7 · forma aberta'`, `'Faltam 3 notas'`; `.mark--chord` em `6-3 5-2 4-0 3-0 2-0 1-1`; nenhuma `.mark--guide`, `.mark--root`, `.mark--hint`, nenhum `text` dentro de `.mark`; `cell-1-0` existe e `cell-1-5` não; `string-mark-1`…`6` vazios (G7 sem abafadas); todo `[aria-label]` dentro de `.fretboard-frame` casa com `/^(Corda \d, casa \d+|Corda \d abafada|Braço da guitarra|Cordas soltas e abafadas)$/`, nenhum `[title]`, e nenhum `data-*` além de `data-pos`/`data-testid`/`data-fret`; sem `role="status"`.
    - `'mutes only with ×'` (`{ shape: 'd7', root: 2 }`): `string-mark-6` e `string-mark-5` `'×'`, `string-mark-1` vazio.
    - `'finds the guide tones'`: `tap('2-0')` → `'Faltam 2 notas'`, `mark('guide','2-0')`; `tap('2-0')` de novo → continua 2; `tap('3-2')` (fora) → `player.play` com 57, sem fim; `tap('5-2')`, `tap('1-1')` → `onAnswer(true)` uma vez, `'Correto! As notas-guia de G7 são B (3) e F (♭7).'`, `'G7: G B D F · forma aberta'`; `mark('root','6-3')` com texto `'1'`, `mark('guide','1-1')` com `'♭7'`, `mark('chord','4-0')` com `'5'`; 700 ms → `onNext` 1 vez.
    - `'a non-guide note of the shape ends'`: `tap('4-0')` → `onAnswer(false)`, `'Errado. D é a 5ª de G7, não nota-guia.'`, `mark('wrong','4-0')`, `mark('hint','5-2')`, `mark('hint','2-0')`, `mark('hint','1-1')`, `'Próxima'`; outro toque não chama `onAnswer`. `tap('6-3')` noutro setup → `'Errado. G é a fundamental de G7, não nota-guia.'`.
    - `'barre shape'` (`{ shape: 'e-7', root: 9 }`): `rect.barre[data-fret="5"]` já antes; `cell-6-4` e `cell-6-8` existem, `cell-6-9` não; `'Faltam 2 notas'`.
    - `'fits the fretboard to the viewport'`: `fretboardProps.calls[0]` = `{ fit: true, minFretWidth: 40 }`.
    - `'strums after the end and R replays'`: depois do acerto, `player.play` com 43 e, após 200 ms, 47, 50, 55, 59, 65; tecla `'r'` (com `useQuizShortcuts` num `Harness`) toca 43 de novo.
    - `'stops the strum when the screen unmounts mid-strum'`: `tap('4-0')`; `advance(40)`; `player.play.mockClear()`; `rerender(withoutScreen())`; `advance(2000)` → `player.play` não chamado.
    - `'resets state when remounted under a new key'`: errar, `rerender(ui({ shape: 'am7', root: 9 }, 1))` → sem `status`, `'Faltam 2 notas'`, nenhuma `.mark--guide`.
  - `ArpeggioQuiz.test.tsx`, `AM = { scale: 'pent-minor', root: 9, box: 1 }` (violão; um caso com `instrument: 'bass'` nos dados do `AppProvider`):
    - `'asks without revealing'`: `'Toque o arpejo'`, `'Am7 em A pentatônica menor · desenho 1'`, `'Faltam 7 notas'`; `.mark--root` só em `6-5 4-7 1-5`, sem rótulo; nenhuma outra `.mark`.
    - `'complete arpeggio'`: tocar `6-8 5-7 4-5 3-5 2-5 2-8 1-8` → `'Faltam 1 nota'` antes do último; tocar `6-5` (tônica) não muda a contagem; no fim `onAnswer(true)`, `'Correto! Arpejo completo.'`, `'Am7: A C E G'`; `mark('scale','5-5')` e `mark('scale','3-7')` com texto `'4'`; `mark('chord','5-7')` com `'5'`; `player.play` com 45 e, após 1500 ms, também 72; 700 ms depois do fim → `onNext`.
    - `'a scale note outside the chord ends'`: `tap('5-5')` → `onAnswer(false)`, `'Errado. D não está em Am7.'`, `mark('wrong','5-5')`, `.mark--hint` em `6-8`; `'Próxima'`.
    - `'same pitch on another string counts once'` (`{ scale: 'major', root: 0, box: 1 }`): `'Faltam 7 notas'`; `tap('1-8')` → continua 7, sem `wrong`.
    - `'bass'`: com baixo ativo, `AM` → `'Faltam 4 notas'`, `.mark--root` em `4-5` e `2-7`, `cell-5-5` não existe; `tap('4-8')` → `player.play` com 36.
    - `'fits the fretboard to the viewport'` e `'stops the arpeggio when the screen unmounts'` (terminar com erro, `advance(150)`, `mockClear`, desmontar, `advance(2000)` → nada) e `'resets state when remounted under a new key'`, como acima.
- [ ] **Step 2: Run tests to verify they fail**
  Run: `npx vitest run src/ui/screens/GuideToneQuiz.test.tsx src/ui/screens/ArpeggioQuiz.test.tsx`
  Expected: FAIL.
- [ ] **Step 3: Implement** as duas telas.
- [ ] **Step 4: Run tests to verify they pass**
  Run: `npx vitest run src/ui`
  Expected: PASS.
- [ ] **Step 5: Mutation check:** em `GuideToneQuiz`, tratar `'outside'` como erro; esquecer o `playPitches([])` do desmonte; mostrar `label` antes do fim; em `ArpeggioQuiz`, iniciar `found` vazio; usar `GUITAR` em vez do instrumento ativo. Cada uma deve falhar; desfaça.
- [ ] **Step 6: Commit**
  ```bash
  git add src/ui/screens/GuideToneQuiz.tsx src/ui/screens/GuideToneQuiz.test.tsx src/ui/screens/ArpeggioQuiz.tsx src/ui/screens/ArpeggioQuiz.test.tsx
  git commit -m "feat(ui): guide-tone and box-arpeggio quiz screens"
  ```

---

### Task 5: Tela ii–V–I

**Files:**
- Create: `src/ui/screens/IiViQuiz.tsx`, `src/ui/screens/IiViQuiz.test.tsx`

**Interfaces:**
- Consumes: Tasks 2–3; `useSound().playPitches`/`playSequence`; `useAutoAdvance`; `stringLabels`; `pitchOf`; `positionKey`.
- Produces (Task 6): `IiViQuiz(props: { question: IiViItem; settings; onAnswer; onNext })`.

Tela: `q = iiViQuestion(question)`; `<Fretboard instrument={GUITAR} fit minFretWidth={40} fretMin={q.fretMin} fretMax={q.fretMax} leftHanded stringLabels={stringLabels(GUITAR)} links={done ? links : undefined} …/>` sem `stringMarks`/`barres`; `<GuideLegend />`. `p.prompt` `` `Toque as notas-guia de ${para}` ``; `p.scale-title` `iiViTitle`; "Faltam N notas". Antes: notas de `q.from` com rótulo `func`, `root` se `isRoot`, senão `guide`; encontradas `guide` sem rótulo (depois das de origem no array). Toque: `isIiViTarget(q, pitchOf(p, GUITAR))` e altura nova → conta (última → fim certo); já encontrada → nada; outra → fim errado com a casa `wrong`; todo toque não final `playPitches([altura])`. Depois: `q.from.notes` como `scale` sem rótulo, depois `q.to.notes` com rótulo `func`: `root`, `guide` (encontrada) ou `hint` (faltou); `links` = `q.moves.filter(m => m.semitones !== 0).map(m => ({ from: m.from.position, to: m.to.position }))`. Som do fim e "Ouvir a troca": `playSequence` com `q.from.notes` em 0/40/80 ms e `q.to.notes` em 900/940/980 ms. Status `'Correto!'` / `` `Errado. As notas-guia de ${para} mais perto são ${iiViTargetNames}.` ``; detalhe `iiViDetail`.

- [ ] **Step 1: Write the failing tests** (setup de `ChordPlayQuiz.test.tsx`; `C_IIV = { key: 0, grip: 1, step: 'ii-v' }`):
  - `'shows the source chord only'`: `'Toque as notas-guia de G7'`, `'Dm7 → G7 · ii–V–I em C'`, `'Faltam 2 notas'`; `mark('root','5-5')` com `'1'`, `mark('guide','4-3')` com `'♭3'`, `mark('guide','3-5')` com `'♭7'`; exatamente 3 `.mark`; nenhuma `line.link`; nenhuma marca em `3-4`; `cell-6-2` e `cell-6-6` existem, `cell-6-7` não.
  - `'right answer'`: `tap('3-4')` → `'Faltam 1 nota'`, `player.play` com 59; `tap('3-4')` de novo → continua 1; `tap('4-3')` → `onAnswer(true)` uma vez, `'Correto!'`, `'C (♭7) desce meio tom para B (3) · F (♭3) fica e vira a ♭7'`; `mark('root','6-3')` com `'1'`, `mark('guide','3-4')` com `'3'`, `mark('guide','4-3')` com `'♭7'`, `mark('scale','5-5')`; exatamente uma `line.link`; `player.play` com 50 logo e, após 1000 ms, também 43, 53, 59; 700 ms → `onNext`.
  - `'other octave is wrong'`: `tap('5-2')` → `onAnswer(false)`, `'Errado. As notas-guia de G7 mais perto são B e F.'`, `mark('wrong','5-2')`, `mark('hint','3-4')`, `mark('hint','4-3')`; `'Próxima'`; 2000 ms → `onNext` não chamado; tecla `'r'` toca 50 de novo.
  - `'V to I'` (`{ key: 0, grip: 1, step: 'v-i' }`): título `'G7 → C7M · ii–V–I em C'`; `mark('root','6-3')`, `mark('guide','4-3')` `'♭7'`, `mark('guide','3-4')` `'3'`; `tap('4-2')`, `tap('3-4')` → `'Correto!'`.
  - `'fits the fretboard to the viewport'`: `{ fit: true, minFretWidth: 40 }`.
  - `'stops the sound when the screen unmounts'`: `tap('5-2')`; `advance(40)`; `mockClear`; desmontar com `withoutScreen()`; `advance(2000)` → `player.play` não chamado.
  - `'resets state when remounted under a new key'`: errar, `rerender(ui({ key: 2, grip: 2, step: 'v-i' }, 1))` → sem `status`, sem `line.link`, `'A7 → D7M · ii–V–I em D'`.
- [ ] **Step 2: Run tests to verify they fail**
  Run: `npx vitest run src/ui/screens/IiViQuiz.test.tsx`
  Expected: FAIL.
- [ ] **Step 3: Implement** a tela.
- [ ] **Step 4: Run tests to verify they pass**
  Run: `npx vitest run src/ui`
  Expected: PASS.
- [ ] **Step 5: Mutation check:** passar `links` antes do fim; incluir o traço de comprimento zero; aceitar a classe de altura (5-2) como certa; esquecer o cancelamento ao desmontar. Cada uma deve falhar; desfaça.
- [ ] **Step 6: Commit**
  ```bash
  git add src/ui/screens/IiViQuiz.tsx src/ui/screens/IiViQuiz.test.tsx
  git commit -m "feat(ui): ii-V-I guide-tone voice-leading screen"
  ```

---

### Task 6: Registro dos modos, bloqueio no baixo e verificação final

**Files:**
- Modify: `src/domain/quiz.ts` (`QuizMode` + três modos)
- Modify: `src/domain/exercises.ts` (metas, `QUIZ_MODES`, modos de `TRACKS` Escalas e Acordes)
- Modify: `src/ui/exercises.tsx` (`QuizItem`, três exercícios, `GuideOptions`)
- Test: `src/domain/exercises.test.ts`, `src/ui/exercises.test.tsx`, `src/ui/screens/Study.test.tsx`, `src/ui/screens/Progress.test.tsx`, `src/state/storage.test.ts`

**Interfaces:**
- Consumes: Tasks 1–5; `reviewSubset`, `ScaleOptions`, `BASS_NO_CHORDS`, `SHAPE_OPTIONS` (já em `exercises.tsx`); `scalePlayPool`.
- Produces: `EXERCISES['guide-tones' | 'arpeggio' | 'ii-v-i']`.

Exercícios, todos com `startsFromPosition: () => false`, sem `historyLevel`, metas com `recordsPositionProgress: false`, `usesFocus: false` e as descrições exatas da spec, seção 1 (`track: 'acordes'` para `guide-tones`/`ii-v-i`, `'escalas'` para `arpeggio`):
- `guide-tones`: `itemKey` `guideKey`; `questionCount` baixo 0, senão `guidePool(chordShapes).length`; `startBlockers` baixo `[BASS_NO_CHORDS]`; `Options: GuideOptions` (só o grupo `aria-label="Formas"` com `SHAPE_OPTIONS` → `chordShapes`); `buildQueue` `buildGuideQueue(reviewSubset(ctx, pool, guideKey), ctx.rng)`; `prepareSound` alturas de `voicingPitches(chordVoicing(...))`; `Quiz` → `GuideToneQuiz`.
- `arpeggio`: `itemKey` `arpeggioKey`; `questionCount` `scalePlayPool(scale, scaleBox).length`; `startBlockers: () => []`; `Options: ScaleOptions`; `buildQueue` `buildArpeggioQueue(reviewSubset(ctx, pool, arpeggioKey), ctx.rng)`; `prepareSound` = o de `scale-play`; `Quiz` → `ArpeggioQuiz`.
- `ii-v-i`: `itemKey` `iiViKey`; `questionCount` baixo 0, senão 16 (`iiViPool().length`); `startBlockers` baixo `[BASS_NO_CHORDS]`; sem `Options`; `buildQueue` `buildIiViQueue(reviewSubset(ctx, iiViPool(), iiViKey), ctx.rng)`; `prepareSound` alturas de `from` e `to` de cada `iiViQuestion`; `Quiz` → `IiViQuiz`.
- `QuizItem` ganha `IiViItem` (`ChordItem` e `ScalePlayItem` já estão).

- [ ] **Step 1: Update/write the failing tests**
  - `exercises.test.ts`: `QUIZ_MODES` = lista das Global Constraints; modos de Escalas e Acordes; labels; metas sem progresso de posição e sem Foco.
  - `Study.test.tsx`, só listas exatas: menu e abas com 17 itens (os 14 + `'Notas-guia'`, `'Arpejo no desenho'`, `'ii–V–I'`), `labels('Escalas')` = `['Grau no desenho','Toque a escala','Arpejo no desenho']`, `labels('Acordes')` = `['Nome do acorde','Monte o acorde','Notas-guia','ii–V–I']`; títulos "14 exercises" → "17 exercises".
  - `ui/exercises.test.tsx`, `describe('M7')` com `makeCtx`: `questionCount` violão: `guide-tones` 11 (padrão), 72 (`chordShapes: 'barre'`), 83 (`'all'`); `arpeggio` 12 (padrão), 84 (`{ scale: 'major', scaleBox: 'all' }`); `ii-v-i` 16. Baixo (`instrument: BASS`): `guide-tones` e `ii-v-i` 0 e `startBlockers` `['Acordes são só para violão. Troque para Violão em Ajustes.']`; `arpeggio` 12 e `[]`. `buildQueue({ ...ctx, progress: {}, limit: 20, now: 0 })`: `guide-tones` (`'all'`) 20 itens com chaves distintas e válidas; `ii-v-i` 16; revisão: `arpeggio` (`major`, `'all'`, 84) com 79 chaves não vencidas e 5 vencidas → as 5 na fila. `itemKey`: `'guide:g7:7'`, `'arp:pent-minor:9:1'`, `'iivi:0:1:ii-v'`. `prepareSound` do `ii-v-i` com `[{ key: 0, grip: 1, step: 'ii-v' }]` → `preparePitches` com `[50, 53, 60, 43, 53, 59]`.
  - `Study.test.tsx`, `describe('M7')`:
    - Notas-guia no violão: grupo `Formas` com `Abertas` pressionado, sem grupo `Acordes`, sem "Foco", `'Sessão de 11 perguntas'`; clicar `'Pestana'` → `readRawSettings(storage).chordShapes === 'barre'`, `'Sessão de 20 perguntas'`.
    - ii–V–I no violão: sem grupos de opções, `'Sessão de 16 perguntas'`.
    - **Baixo** com `mode` `'guide-tones'` e `'ii-v-i'` (`it.each`): aviso visível, Iniciar desabilitado, sem `'Sessão de'`; `forced` não inicia; trocar para violão libera.
    - Arpejo no baixo: Iniciar habilitado, `'Sessão de 12 perguntas'`; iniciar com som desligado → `'Toque o arpejo'` e o braço com 4 cordas (`cell-4-5` existe, `cell-5-5` não).
    - Iniciar `ii-v-i` com som desligado, tocar a casa de `g.mark--root` (sempre errada) → `items` do violão ganha uma chave `iivi:`; Finalizar e confirmar → histórico `mode: 'ii-v-i'` sem `level`.
    - Remontagem (`it.each` dos três modos, como o teste do M6): `guide-tones` tocando as casas das `g.mark--chord` em ordem até aparecer `status`; `arpeggio` tocando casas tocáveis em ordem até `status`; `ii-v-i` tocando a casa do `g.mark--root` → `'Próxima'` ou espera 800 ms → `'Pergunta 2 de'` e sem `status`.
  - `storage.test.ts`: histórico `{ mode: 'arpeggio', … }` carrega sem `level`; `v2Raw({ mode: 'ii-v-i' })` → `settings.mode === 'ii-v-i'`.
  - `Progress.test.tsx`: histórico com `mode: 'guide-tones'` mostra `'Notas-guia'`.
- [ ] **Step 2: Run tests to verify they fail**
  Run: `npx vitest run src/domain src/state src/ui`
  Expected: FAIL nos novos/atualizados.
- [ ] **Step 3: Implement** as mudanças de **Files** e **Interfaces**.
- [ ] **Step 4: Run the whole suite**
  Run: `npm test`
  Expected: `Tests  N passed (N)`, N maior que no `main`, 0 falhas.
- [ ] **Step 5: Mutation check:** `startBlockers` do `ii-v-i` sem o baixo; `arpeggio` com `BASS_NO_CHORDS`; `questionCount` do `guide-tones` ignorando `chordShapes`. Cada uma deve falhar; desfaça.
- [ ] **Step 6: Existing code untouched**
  Run: `git diff main -- src/domain/chords.ts src/domain/chordItems.ts src/domain/scales.ts src/domain/scaleItems.ts src/domain/harmony.ts src/domain/spelling.ts src/ui/chordText.ts src/ui/useQuizShortcuts.ts src/ui/screens/ChordNameQuiz.tsx src/ui/screens/ChordPlayQuiz.tsx src/ui/screens/ScaleDegreeQuiz.tsx src/ui/screens/ScalePlayQuiz.tsx | grep -E '^[-+]' | grep -vE '^(\+\+\+|---)'`
  Expected: vazio.
- [ ] **Step 7: No formatter churn**
  Run: `git diff main --stat -- src` e `git diff main -- src/ui/Fretboard.tsx src/state/storage.ts src/ui/exercises.tsx src/styles.css src/domain/quiz.ts src/domain/exercises.ts | grep -E '^-' | grep -vE '^---'`
  Expected: `--stat` só com arquivos das tarefas; linhas removidas só as que ganharam itens (`MarkKind`, `QuizMode`, `QUIZ_MODES`, `TRACKS`, `EXERCISES`, `QuizItem`, `isItemKey`, comentário de `items`) — nenhuma só por aspas, vírgula ou quebra.
- [ ] **Step 8: No old assertion removed outside the lists**
  Run: `git diff main -- src | grep -E '^-\s*(expect\(|it\()'`
  Expected: só linhas das listas de modos/trilhas/abas em `exercises.test.ts` e `Study.test.tsx` e os títulos "14 exercises".
- [ ] **Step 9: Types and build**
  Run: `npm run build`
  Expected: `tsc` sem erros e `vite build` concluído.
- [ ] **Step 10: Manual check** com `npm run dev` em **360 px** (e 390 px), notação "Ambos", tema claro e escuro: Notas-guia num aberto (G7, coluna da casa 0 tocável, só ×) e numa pestana alta; Arpejo em C maior desenho 1 (6 casas) e no baixo; ii–V–I `D · forma 2` (casas 10–14) e o título em "Ambos" sem corte; `document.documentElement.scrollWidth <= 360`; rótulo da marca roxa legível nos dois temas; canhoto espelha; trocar para Baixo → Notas-guia e ii–V–I mostram o aviso, Arpejo inicia; som ligado: sair no meio do rasgueado/troca (Finalizar) não deixa som tocando.
- [ ] **Step 11: Commit**
  ```bash
  git add src/domain src/state src/ui
  git commit -m "feat: register guide tones, box arpeggio and ii-V-I exercises

  exercises.test.ts and Study.test.tsx: the exact mode, track and tab lists now include the three new modes."
  ```
