# Contrabaixo como segundo instrumento Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar o baixo de 4 cordas (E-A-D-G, 24 trastes, sons próprios, progresso e Foco separados) como segundo instrumento, escolhido em Ajustes, com todos os exercícios funcionando como hoje.

**Architecture:** Um objeto `Instrument` (`GUITAR`, `BASS`) substitui os valores fixos de violão (`STRING_COUNT`, `STANDARD_TUNING`, `OPEN_STRING_MIDI`, pasta `nylon`). As funções de domínio ganham um último parâmetro `instrument: Instrument = GUITAR`, então os testes atuais continuam valendo. O armazenamento passa a v2 (`settings` globais + `instruments: { guitar, bass }` com `filter`, `progress` e `history`); `AppState` expõe uma visão plana do instrumento ativo (`data.settings.filter`, `data.progress`, `data.history`), então as telas quase não mudam.

**Tech Stack:** React 19 + TypeScript, Vite (PWA), Vitest + Testing Library, samples MP3 do FluidR3 via midi-js-soundfonts.

**Spec:** `docs/superpowers/specs/2026-11-04-bass-instrument-design.md`

## Global Constraints

- Baixo: 4 cordas, afinação da corda 1 à 4 = G D A E, MIDI das cordas soltas `[43, 38, 33, 28]`, `MAX_FRET = 24`, `FIRST_QUIZ_FRET = 1` (compartilhados). Violão inalterado: `[64, 59, 55, 50, 45, 40]`.
- Samples do baixo: `public/sounds/bass/<midi>.mp3`, MIDI 28 a 67 (40 arquivos), de `electric_bass_finger-mp3.js` (FluidR3, midi-js-soundfonts). Violão continua em `public/sounds/nylon/`.
- Por instrumento: `filter`, `progress`, `history`. Global: `notation`, `leftHanded`, `mode`, `soundEnabled`, `earLevel`, `instrument`.
- Armazenamento: chave `guitar-mapper:v2` (`version: 2`), backup `guitar-mapper:v2:backup`; a chave `guitar-mapper:v1` nunca é apagada nem alterada.
- Padrão do filtro do baixo: cordas `[1, 2, 3, 4]`, casas 1–5, só naturais. Padrão do instrumento: `guitar`.
- A troca de instrumento fica só em Ajustes, grupo "Instrumento" (Violão, Baixo), no estilo do grupo "Notação". Texto em português.
- Etiqueta com o nome do instrumento ativo ("Violão" ou "Baixo"), só informativa (sem atalho, sem troca): no cabeçalho do Estudar (celular e tablet), no topo da barra lateral (computador) e ao lado do título de Progresso e de Foco.
- Dados do violão existentes nunca se perdem; o progresso de um instrumento nunca aparece no outro.
- Commits com as linhas `Co-Authored-By` e `Claude-Session` da sessão. Rodar `npm test` e `npm run build` ao final de cada tarefa que mexe em código.

## Review Focus

- Migração v1 → v2 com filtro/progresso/histórico válidos: tudo vira `guitar`, `bass` nasce com os padrões, e a chave v1 continua idêntica (Task 3).
- Progresso salvo em v2 com posição de corda 5 ou 6 dentro de `bass` é descartado; `4-24` é aceito no baixo e `5-3` não (Task 3).
- v2 corrompido ou de outra versão: backup em `guitar-mapper:v2:backup`, dados limpos e `recovered: true`, sem re-migrar a v1 (Task 3).
- Trocar para o baixo com uma sessão em andamento não pode manter a fila de posições de violão: o Estudar reinicia ao mudar de instrumento (Task 7).
- Ouvido no baixo: todo som usado (MIDI 28–67) existe em `bass/`, e o som do violão não toca no modo baixo (Tasks 2 e 5).
- A etiqueta aparece em todos os lugares previstos e muda na hora ao trocar em Ajustes (Task 9).
- Mão esquerda e atalhos de teclado seguem funcionando com 4 cordas (o atalho `1`–`9` não depende do número de cordas) (Task 7).

---

### Task 1: Modelo de instrumento e domínio parametrizado

**Files:**
- Create: `src/domain/instruments.ts`
- Modify: `src/domain/tuning.ts`, `src/domain/pitch.ts`, `src/domain/fretboard.ts`, `src/domain/quiz.ts`, `src/domain/session.ts`
- Test: `src/domain/instruments.test.ts` (novo), mais casos de baixo em `fretboard.test.ts`, `pitch.test.ts`, `quiz.test.ts`, `session.test.ts`

**Interfaces:**
- Produces (`src/domain/instruments.ts`):
  - `type InstrumentId = 'guitar' | 'bass'`
  - `interface Instrument { id: InstrumentId; label: string; stringCount: number; tuning: readonly NoteIndex[]; openMidi: readonly number[]; soundFolder: string }`
  - `GUITAR` (label `'Violão'`, `tuning = STANDARD_TUNING`, `openMidi = [64,59,55,50,45,40]`, `soundFolder = 'nylon'`), `BASS` (label `'Baixo'`, `stringCount 4`, `tuning [7, 2, 9, 4]`, `openMidi [43,38,33,28]`, `soundFolder 'bass'`)
  - `INSTRUMENTS: readonly Instrument[]` (ordem: `GUITAR`, `BASS`), `instrumentById(id: InstrumentId): Instrument`
- Produces (domínio, último parâmetro `instrument: Instrument = GUITAR`, substituindo o antigo `tuning`):
  - `noteAt(pos, instrument)`, `positionsInFilter(filter, instrument)`, `positionsOfNote(note, filter, instrument)`, `allPositions(instrument)`, `parsePositionKey(key, instrument)` (aceita corda `1..instrument.stringCount`, casa `0..MAX_FRET`)
  - `pitchOf(position, instrument)` (usa `instrument.openMidi`), `uniquePitchPositions(positions, instrument)`
  - `buildChoiceQuestion(position, naturalsOnly, rng, instrument)`, `buildEarQuestion(position, level, naturalsOnly, rng, instrument)`, `buildFindQuestion(position, filter, instrument)`
  - `buildQueue(positions, rng, first, options)` com `options.instrument?: Instrument`
- `STRING_COUNT` e `OPEN_STRING_MIDI` continuam exportados por enquanto (removidos na Task 10).

- [ ] **Step 1: Write the failing tests**
  - `instruments.test.ts`: `BASS.openMidi` é `[43, 38, 33, 28]`; `BASS.tuning` é `[7, 2, 9, 4]` e `BASS.tuning[i] === BASS.openMidi[i] % 12`; `GUITAR.tuning[i] === GUITAR.openMidi[i] % 12` para as 6 cordas; `instrumentById('bass')` é `BASS`; `INSTRUMENTS.map(i => i.id)` é `['guitar', 'bass']`.
  - `fretboard.test.ts`: `noteAt({string:4, fret:0}, BASS)` = 4 (E); `noteAt({string:1, fret:5}, BASS)` = 0 (C); `allPositions(BASS)` tem `4 * 25` itens e nenhuma corda 5; `parsePositionKey('4-24', BASS)` devolve `{string:4, fret:24}`; `parsePositionKey('5-3', BASS)` e `parsePositionKey('0-3', BASS)` devolvem `null`; `parsePositionKey('5-3')` (violão) continua válido; `positionsInFilter({strings:[1,2,3,4,5,6], fretMin:1, fretMax:3, naturalsOnly:false}, BASS)` ignora cordas 5 e 6.
  - `pitchOf({string:4, fret:0}, BASS)` = 28; `pitchOf({string:1, fret:24}, BASS)` = 67; `uniquePitchPositions` no baixo trata `{string:4, fret:5}` e `{string:3, fret:0}` como o mesmo som (33).
  - `quiz.test.ts`: `buildChoiceQuestion({string:4, fret:3}, true, rng, BASS).answer` = 7 (G) e nenhuma `options` repete nota; vizinhos nunca usam corda 5 (rng fixo: `options` tem 4 itens); `buildFindQuestion({string:2, fret:2}, filter, BASS)` tem `target` 4 (E) e `validPositions` só na corda 2.
  - `session.test.ts`: `buildQueue(positionsInFilter(f, BASS), rng, null, {avoidSameNote: true, instrument: BASS})` não repete a mesma nota em sequência do baixo (compara `noteAt(p, BASS)`).

- [ ] **Step 2: Run to verify failures**
  Run: `npx vitest run src/domain`
  Expected: FAIL (`instruments` não existe, funções ignoram o 2º/3º parâmetro de instrumento).

- [ ] **Step 3: Implement**
  - `instruments.ts` com os exports acima; `GUITAR.openMidi` reaproveita o `OPEN_STRING_MIDI` atual (mova a definição para cá e deixe `pitch.ts` reexportando `OPEN_STRING_MIDI = GUITAR.openMidi`).
  - `fretboard.ts`: trocar `tuning` por `instrument`, trocar `STRING_COUNT` por `instrument.stringCount` nas funções, `parsePositionKey` usa regex `^(\d{1,2})-(\d{1,2})$` e valida `1..stringCount` e `0..MAX_FRET`.
  - `quiz.ts`: o filtro de vizinhos usa `instrument.stringCount`; `noteAt` recebe `instrument`.
  - `session.ts`: `arrangeWithoutRepeats(items, start, rng, instrument)` chama `noteAt(p, instrument)`; `buildQueue` repassa `options.instrument ?? GUITAR` a `uniquePitchPositions`, `pitchOf` e `noteAt`.
  - `tuning.ts` fica como está (`STANDARD_TUNING`), usado por `GUITAR.tuning`.

- [ ] **Step 4: Run to verify pass**
  Run: `npx vitest run src/domain && npx tsc --noEmit`
  Expected: PASS (toda a suíte de domínio atual continua passando sem alteração).

- [ ] **Step 5: Commit**
  `git add src/domain && git commit -m "feat(domain): instrument model (guitar, bass) and instrument-aware fretboard, pitch, quiz and queue"`

---

### Task 2: Samples de baixo

**Files:**
- Create: `scripts/extract-bass.mjs`, `public/sounds/bass/28.mp3 … 67.mp3`, `public/sounds/bass/LICENSE.txt`
- Modify: `src/audio/assets.test.ts`

**Interfaces:**
- Consumes: `allPositions(BASS)`, `pitchOf(p, BASS)` da Task 1.
- Produces: `public/sounds/bass/<midi>.mp3` para MIDI 28–67 e `LICENSE.txt` com os mesmos avisos do de nylon (FluidR3, MIT, Creative Commons Attribution 3.0).

- [ ] **Step 1: Write the failing test**
  Em `assets.test.ts`, um segundo `describe('bass assets')` espelhando o de nylon: listar `/public/sounds/bass/*.mp3` e `LICENSE.txt` com `import.meta.glob`; `it('has an MP3 for every pitch on the bass fretboard')` com `new Set(allPositions(BASS).map((p) => pitchOf(p, BASS)))`; `it('ships the license notices')` com as três asserções do nylon; `it('has exactly the 28-67 range')` afirmando `mp3.length === 40`.

- [ ] **Step 2: Run to verify failure**
  Run: `npx vitest run src/audio/assets.test.ts`
  Expected: FAIL (pasta `bass` inexistente).

- [ ] **Step 3: Implement**
  - `scripts/extract-bass.mjs`: cópia de `scripts/extract-nylon.mjs` com `URL = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/electric_bass_finger-mp3.js'`, `OUT = 'public/sounds/bass'` e faixa `28 <= midi <= 67`; cabeçalho de comentário atualizado.
  - Rodar uma vez: `node scripts/extract-bass.mjs` (requer rede; imprime `40 notes written to public/sounds/bass`).
  - `LICENSE.txt`: copiar `public/sounds/nylon/LICENSE.txt` trocando instrumento (`electric_bass_finger`), faixa (E1 a G4) e o nome do script.

- [ ] **Step 4: Run to verify pass**
  Run: `npx vitest run src/audio/assets.test.ts && ls public/sounds/bass | wc -l`
  Expected: PASS; contagem 41 (40 mp3 + LICENSE.txt).

- [ ] **Step 5: Commit**
  `git add scripts/extract-bass.mjs public/sounds/bass src/audio/assets.test.ts && git commit -m "feat(audio): FluidR3 electric bass finger samples E1-G4 with license notices"`

---

### Task 3: Armazenamento v2 e migração

**Files:**
- Modify: `src/state/storage.ts`, `src/test-utils.ts`
- Test: `src/state/storage.test.ts`

**Interfaces:**
- Consumes: `Instrument`, `InstrumentId`, `GUITAR`, `BASS`, `INSTRUMENTS`, `instrumentById` (Task 1).
- Produces (`storage.ts`):
  - `interface InstrumentData { filter: Filter; progress: ProgressMap; history: HistoryEntry[] }`
  - `interface GlobalSettings { notation; leftHanded; mode; soundEnabled; earLevel; instrument: InstrumentId }`
  - `type Settings = GlobalSettings & { filter: Filter }` (visão do instrumento ativo)
  - `interface AppData { version: 2; settings: GlobalSettings; instruments: Record<InstrumentId, InstrumentData> }`
  - `interface ActiveData { settings: Settings; progress: ProgressMap; history: HistoryEntry[] }`
  - `activeView(data: AppData): ActiveData` e `withActive(data: AppData, patch: Partial<InstrumentData>): AppData`
  - `STORAGE_KEY = 'guitar-mapper:v2'`, `BACKUP_KEY = 'guitar-mapper:v2:backup'`, `LEGACY_STORAGE_KEY = 'guitar-mapper:v1'`
  - `defaultFilterFor(instrument: Instrument): Filter` (cordas `1..stringCount`, casas 1–5, naturais); `DEFAULT_FILTER` continua exportado = `defaultFilterFor(GUITAR)`
  - `loadData`/`saveData`/`createDefaultData` com a nova forma; `loadData` devolve `LoadResult` igual ao atual.
- Produces (`test-utils.ts`): `seededStorage({ settings?, progress?, history?, instrument? })` grava v2 (overrides de `filter`, `progress`, `history` vão para o instrumento `instrument`, padrão `'guitar'`; o restante de `settings` é global); `readSaved(storage, instrument = 'guitar'): ActiveData` devolve a visão plana do instrumento pedido (mantém as asserções atuais dos testes); novo `seededLegacyStorage(v1Data)` para o teste de migração.

- [ ] **Step 1: Write the failing tests**
  - Padrão: `createDefaultData()` tem `version: 2`, `settings.instrument === 'guitar'`, `instruments.guitar.filter.strings` com 6 cordas e `instruments.bass.filter.strings` igual a `[1,2,3,4]`.
  - Migração: com só a chave v1 contendo `settings.filter = {strings:[2,5], fretMin:3, fretMax:9, naturalsOnly:false}`, `notation:'solfejo'`, `progress` com `'5-3'` válido e `history` com 1 entrada: `loadData` devolve `instruments.guitar.filter` igual ao do v1, `progress['5-3']` e a entrada de histórico preservados, `settings.notation === 'solfejo'`, `instruments.bass` com os padrões, `recovered: false`; a chave v2 passa a existir no storage; o valor da chave v1 continua byte a byte igual ao original.
  - Prioridade: com v1 e v2 válidos ao mesmo tempo, vale o v2.
  - Sanitização do baixo: v2 com `instruments.bass.progress = {'4-24': {…válido…}, '5-3': {…válido…}}` mantém só `'4-24'`; `instruments.bass.filter.strings = [1,5,6,2]` vira `[1,2]`; fretMin/fretMax são limitados a 1..24 como hoje; `settings.instrument` inválido vira `'guitar'`.
  - Corrompido: v2 com JSON inválido ou `version: 3` → `recovered: true`, dados padrão, o texto bruto salvo em `guitar-mapper:v2:backup`, e v1 não é migrado de novo nem alterado.
  - Sem storage / storage que lança na leitura: mesmos retornos de hoje (`storageAvailable: false`).
  - `activeView`: com `settings.instrument = 'bass'` devolve `settings.filter` do baixo, `progress` e `history` do baixo; `withActive` altera só o instrumento ativo.

- [ ] **Step 2: Run to verify failures**
  Run: `npx vitest run src/state/storage.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement**
  - Reescrever os tipos como acima. `sanitizeFilter(raw, instrument)` filtra cordas por `instrument.stringCount` e usa `defaultFilterFor(instrument)` como fallback; `sanitizeProgress(raw, instrument)` usa `parsePositionKey(key, instrument)`; `sanitizeHistory` não muda.
  - `loadData`: ler `STORAGE_KEY`; se existir e for v2 válido, sanitizar `settings` (global + `instrument`) e cada bucket; se não existir, tentar `LEGACY_STORAGE_KEY` (v1 válido): montar `guitar` com os dados v1 sanitizados e `bass` padrão, **gravar o v2 na hora** (falha de escrita é ignorada) e devolver; qualquer outro caso de erro/versão segue o fluxo de recuperação atual (backup em `BACKUP_KEY`, dados limpos, `recovered: true`).
  - `saveData` grava `JSON.stringify(data)` em `STORAGE_KEY`.
  - Atualizar `test-utils.ts` como descrito em Interfaces; atualizar chamadas existentes nos testes se necessário (`App.test.tsx`, `AppState.test.tsx`, telas) apenas na forma de montar o storage, sem mudar o que testam.

- [ ] **Step 4: Run to verify pass**
  Run: `npx vitest run src/state src/test-utils.ts`
  Expected: PASS em `storage.test.ts` (os outros testes de tela ainda podem falhar até a Task 4; não commitar ainda se `AppState` não compila: ver Step 5).

- [ ] **Step 5: Commit**
  Como `AppState.tsx` depende desses tipos, faça esta tarefa e a Task 4 na mesma branch e commite a Task 3 só quando `npx tsc --noEmit` passar (ajuste mínimo em `AppState.tsx` para compilar é permitido aqui).
  `git add src/state src/test-utils.ts && git commit -m "feat(state): storage v2 with per-instrument filter, progress and history; v1 migrated as guitar"`

---

### Task 4: Estado do app com instrumento ativo

**Files:**
- Modify: `src/state/AppState.tsx`
- Test: `src/state/AppState.test.tsx`

**Interfaces:**
- Consumes: `AppData`, `ActiveData`, `Settings`, `activeView`, `withActive`, `loadData`, `saveData` (Task 3); `instrumentById`, `Instrument` (Task 1).
- Produces:
  - `useAppState()` devolve `{ data: ActiveData, instrument: Instrument, storageAvailable, recovered, recordAnswer, updateSettings, resetProgress, recordSession, clearHistory }` (mesmas assinaturas de hoje; `data` agora é a visão plana do instrumento ativo).
  - `updateSettings(patch: Partial<Settings>)`: `filter` vai para o bucket do instrumento ativo; os demais campos (incluindo `instrument`) vão para as configurações globais; um patch com `instrument` troca o instrumento ativo sem perder o filtro/progresso/histórico de nenhum.
  - `recordAnswer`, `resetProgress`, `recordSession`, `clearHistory` agem só no bucket do instrumento ativo.

- [ ] **Step 1: Write the failing tests**
  - Trocar para `bass` com `updateSettings({ instrument: 'bass' })`: `data.settings.filter.strings` é `[1,2,3,4]`, `data.progress` é `{}` mesmo que o violão tenha progresso; `instrument.id === 'bass'`.
  - `recordAnswer({string:4, fret:3}, true)` no baixo grava em `instruments.bass.progress['4-3']` e `readSaved(storage, 'guitar').progress` não muda; voltar ao violão mostra o progresso antigo do violão intacto.
  - `updateSettings({ filter: {...} })` no baixo não altera o filtro do violão; `resetProgress` e `clearHistory` no baixo não tocam o violão (e vice-versa).
  - `recordSession(entry)` no baixo entra só no histórico do baixo.
  - Persistência: após trocar para o baixo e recarregar o `AppProvider` com o mesmo storage, o instrumento ativo continua `bass`.

- [ ] **Step 2: Run to verify failures**
  Run: `npx vitest run src/state/AppState.test.tsx`
  Expected: FAIL.

- [ ] **Step 3: Implement**
  Guardar o `AppData` v2 em `dataRef`/`useState`; `data` e `instrument` são derivados (`activeView`, `instrumentById(settings.instrument)`) com `useMemo`; cada mutação monta o próximo `AppData` com `withActive` ou alterando `settings` global e chama `commit`. Sem outras mudanças de comportamento (mesmo tratamento de storage indisponível).

- [ ] **Step 4: Run to verify pass**
  Run: `npx vitest run && npx tsc --noEmit`
  Expected: PASS (a suíte inteira, já que `data` mantém a forma que as telas usam).

- [ ] **Step 5: Commit**
  `git add src/state && git commit -m "feat(state): active instrument view over per-instrument data; instrument is a global setting"`

---

### Task 5: Som por instrumento

**Files:**
- Modify: `src/audio/SoundProvider.tsx`
- Test: `src/audio/SoundProvider.test.tsx`

**Interfaces:**
- Consumes: `useAppState().instrument` (Task 4), `pitchOf(p, instrument)` (Task 1).
- Produces: `SoundProvider({ player?: NotePlayer; children })` — com `player` fornecido (testes), ele é usado para qualquer instrumento; sem `player`, um `NotePlayer` do navegador por instrumento, criado sob demanda e guardado, com `urlFor: (midi) => ${BASE_URL}sounds/${instrument.soundFolder}/${midi}.mp3`. A API `useSound()` (`playPosition`, `prepare`, `unlock`) não muda; as posições recebidas são do instrumento ativo.

- [ ] **Step 1: Write the failing tests**
  - Com `player` fake e instrumento `bass`: `playPosition({string:4, fret:0})` chama `player.play(28)`; `prepare([{string:1,fret:24}])` chama `player.prepare([67])`.
  - Com violão, os valores atuais (`52`, `[88, 41]`) continuam iguais.
  - `urlFor` por instrumento: exportar a função pura `soundUrl(instrument: Instrument, midi: number, base: string): string` e testar `soundUrl(BASS, 28, '/')` = `'/sounds/bass/28.mp3'` e `soundUrl(GUITAR, 52, '/')` = `'/sounds/nylon/52.mp3'`.
  - Sem `player` fornecido, ao trocar de instrumento o provider usa um player diferente (testar via um `createPlayer` injetável: prop opcional `createPlayer?: (instrument: Instrument) => NotePlayer`, chamado uma vez por instrumento e reaproveitado ao voltar).

- [ ] **Step 2: Run to verify failures**
  Run: `npx vitest run src/audio`
  Expected: FAIL.

- [ ] **Step 3: Implement**
  `soundUrl` exportada; `browserPlayer(instrument)` usa `soundUrl`; o provider mantém um `Map<InstrumentId, NotePlayer>` em `useRef`, escolhe `player ?? map.get(id) ?? create(id)` conforme o instrumento atual, e os callbacks usam `pitchOf(p, instrument)`.

- [ ] **Step 4: Run to verify pass**
  Run: `npx vitest run src/audio`
  Expected: PASS.

- [ ] **Step 5: Commit**
  `git add src/audio && git commit -m "feat(audio): one note player per instrument, pitch and sample folder follow the active instrument"`

---

### Task 6: Braço, rótulos e Foco com as cordas do instrumento

**Files:**
- Modify: `src/ui/Fretboard.tsx`, `src/ui/stringLabels.ts`, `src/ui/useFocusFilter.ts`, `src/ui/screens/Focus.tsx`, `src/ui/focusSummary.ts`, e o cartão/painel de Foco em `src/ui/screens/FocusSheet.tsx` se listar cordas
- Test: `src/ui/Fretboard.test.tsx`, `src/ui/stringLabels.test.ts`, `src/ui/focusSummary.test.ts`, `src/ui/screens/Focus.test.tsx`

**Interfaces:**
- Consumes: `Instrument`, `GUITAR`, `BASS` (Task 1); `useAppState().instrument` (Task 4).
- Produces:
  - `Fretboard` ganha a prop `instrument?: Instrument` (padrão `GUITAR`); o número de cordas, a altura e as linhas vêm de `instrument.stringCount` (espaçamento entre cordas inalterado).
  - `stringLabels(instrument: Instrument = GUITAR): string[]` (cifra de `instrument.tuning`; baixo = `['G', 'D', 'A', 'E']`).
  - `describeFocus(filter: Filter, instrument: Instrument = GUITAR)`: "Todas" quando `strings.length === instrument.stringCount`.
  - `useFocusFilter()` usa o instrumento ativo: `ALL_STRINGS` vira `allStrings: number[]` no retorno do hook (`1..stringCount`), `count` usa `positionsInFilter(filter, instrument)`, e `selectAllStrings` seleciona essas cordas; os exports `FRET_PRESETS` e `FRET_OPTIONS` não mudam.
  - `Focus` renderiza um chip por corda do instrumento (`aria-label="Corda N"`).

- [ ] **Step 1: Write the failing tests**
  - `stringLabels(BASS)` = `['G','D','A','E']`; `stringLabels()` continua `['E','B','G','D','A','E']`.
  - `describeFocus({strings:[1,2,3,4], …}, BASS).strings` = `'Todas'`; `describeFocus({strings:[1,2,3,4], …})` (violão) = `'1, 2, 3 e 4'`.
  - `Fretboard` com `instrument={BASS}`: renderiza 4 linhas de corda (contar os elementos de corda como o teste atual faz para 6), a altura do SVG usa 4 cordas e um toque em `{string:4, fret:5}` chama `onTap` com essa posição; sem a prop mantém 6 cordas.
  - `Focus` com baixo ativo: existem os botões "Corda 1" a "Corda 4" e não existe "Corda 5"; o contador de posições bate com `positionsInFilter(filter, BASS).length`; "Todas" selecionado mostra no resumo `Todas`.

- [ ] **Step 2: Run to verify failures**
  Run: `npx vitest run src/ui`
  Expected: FAIL.

- [ ] **Step 3: Implement**
  Em `Fretboard.tsx` trocar `STRING_COUNT` e `STRINGS` por valores derivados de `instrument`; em `Focus.tsx` iterar `allStrings`; `focusSummary` e `stringLabels` recebem o instrumento (chamadores atualizados na Task 7 e no cartão do Foco, que passam `instrument` de `useAppState()`).

- [ ] **Step 4: Run to verify pass**
  Run: `npx vitest run && npx tsc --noEmit`
  Expected: PASS.

- [ ] **Step 5: Commit**
  `git add src/ui && git commit -m "feat(ui): fretboard, string labels and Foco follow the instrument's strings"`

---

### Task 7: Telas de exercício e Progresso usam o instrumento

**Files:**
- Modify: `src/ui/screens/Study.tsx`, `ChoiceQuiz.tsx`, `FindQuiz.tsx`, `EarQuiz.tsx`, `Flashcard.tsx`, `Progress.tsx`, `src/App.tsx`
- Test: `src/ui/screens/Study.test.tsx`, `FindQuiz.test.tsx`, `EarQuiz.test.tsx`, `Progress.test.tsx`, `src/App.test.tsx`

**Interfaces:**
- Consumes: `useAppState().instrument` (Task 4); todas as funções de domínio com `instrument` (Task 1); `Fretboard`/`stringLabels`/`describeFocus` com `instrument` (Task 6).
- Produces: nenhuma API nova. Regra: toda chamada que antes assumia violão passa `instrument` — `positionsInFilter`, `uniquePitchPositions`, `buildQueue({ …, instrument })`, `buildChoiceQuestion`, `buildEarQuestion`, `buildFindQuestion`, `noteAt` (Flashcard), `allPositions` (Progress), `positionsOfNote` e a lista `strings` do `FindQuiz` (`1..instrument.stringCount`), `pitchOf` (EarQuiz) e `<Fretboard instrument={instrument} stringLabels={stringLabels(instrument)} />`. Em `App.tsx`, `Study` e `Progress` são renderizados com `key={instrument.id}` para o estado local da sessão reiniciar ao trocar de instrumento.

- [ ] **Step 1: Write the failing tests**
  - `Study` com baixo ativo (storage com `settings.instrument = 'bass'`, filtro padrão do baixo): a tela inicial mostra "Cordas Todas" no resumo e a contagem de posições igual a `4 cordas × 5 casas` naturais do filtro; em position-to-note a pergunta mostra uma posição com corda ≤ 4 e a resposta correta é `noteAt(p, BASS)`.
  - `FindQuiz` no baixo: o pedido é "na corda N" com N ≤ 4; tocar numa posição de outra corda com a mesma nota não conta como acerto, e as dicas (`hint`) só marcam cordas 1–4.
  - `EarQuiz` no baixo: ao responder toca o MIDI do baixo (`player.play` com 28–67), usando um `SoundProvider` com player fake; `Study` em Ouvido usa `uniquePitchPositions(…, BASS)`.
  - `Progress` no baixo: o mapa tem `4 × 24` marcações (casas 1–24), os rótulos de corda são `G D A E`, e o progresso do violão não aparece (violão com `'6-3'` salvo e baixo vazio → contagem "Nunca vistas: 96").
  - `App`: sessão do violão em andamento (mais de uma pergunta respondida), trocar para Ajustes → Baixo → voltar ao Estudar mostra a tela inicial com o foco do baixo (sem fila antiga).

- [ ] **Step 2: Run to verify failures**
  Run: `npx vitest run src/ui/screens src/App.test.tsx`
  Expected: FAIL.

- [ ] **Step 3: Implement**
  Aplicar a regra acima em cada tela (cada uma obtém `instrument` de `useAppState()`); `Study` mantém a mesma lógica, só repassando o instrumento; `Progress` troca `allPositions()` por `allPositions(instrument)`.

- [ ] **Step 4: Run to verify pass**
  Run: `npx vitest run && npx tsc --noEmit`
  Expected: PASS (suíte inteira, incluindo os testes de violão e de layout responsivo).

- [ ] **Step 5: Commit**
  `git add src && git commit -m "feat(ui): exercises and Progress follow the active instrument; Study restarts on instrument change"`

---

### Task 8: Seletor de instrumento e créditos em Ajustes

**Files:**
- Modify: `src/ui/screens/Settings.tsx`
- Test: `src/ui/screens/Settings.test.tsx`

**Interfaces:**
- Consumes: `INSTRUMENTS`, `Instrument` (Task 1); `useAppState().updateSettings`, `data.settings.instrument`.
- Produces: grupo `<fieldset><legend>Instrumento</legend>` com um `radio` por instrumento (rótulo `instrument.label`, `name="instrument"`), logo antes do grupo "Notação"; Créditos citam os sons de violão de nylon e os de baixo (*Electric Bass (finger)*), ambos FluidR3 GM, mesma licença e empacotador.

- [ ] **Step 1: Write the failing tests**
  - Ajustes mostra os rádios "Violão" (marcado por padrão) e "Baixo"; clicar em "Baixo" chama a troca e `readSaved(storage).settings.instrument` passa a ser `'bass'` (global, visível nos dois buckets); voltar a "Violão" restaura.
  - Trocar de instrumento não altera notação, mão esquerda nem som.
  - Os Créditos contêm "violão de nylon" e "baixo".

- [ ] **Step 2: Run to verify failures**
  Run: `npx vitest run src/ui/screens/Settings.test.tsx`
  Expected: FAIL.

- [ ] **Step 3: Implement**
  Replicar o padrão do grupo "Notação" com `INSTRUMENTS.map`, `onChange={() => updateSettings({ instrument: id })}`; atualizar o texto de créditos.

- [ ] **Step 4: Run to verify pass**
  Run: `npx vitest run src/ui/screens/Settings.test.tsx`
  Expected: PASS.

- [ ] **Step 5: Commit**
  `git add src/ui/screens/Settings.tsx src/ui/screens/Settings.test.tsx && git commit -m "feat(ui): instrument picker in Ajustes and bass sound credits"`

---

### Task 9: Etiqueta do instrumento

**Files:**
- Create: `src/ui/InstrumentBadge.tsx`
- Modify: `src/ui/screens/StudyHeader.tsx` (modo `compact`, ao lado do logo), `src/App.tsx` (`sidebar__brand`), `src/ui/screens/Progress.tsx` e `src/ui/screens/Focus.tsx` (junto do `<h2>`), `src/styles.css`
- Test: `src/ui/InstrumentBadge.test.tsx` (novo), mais casos em `Progress.test.tsx`, `Focus.test.tsx`, `Study.test.tsx`, `App.test.tsx`

**Interfaces:**
- Consumes: `useAppState().instrument` (Task 4).
- Produces: `InstrumentBadge()` sem props, renderiza `<span className="instrument-badge">{instrument.label}</span>` (texto "Violão" ou "Baixo"), não interativo.

- [ ] **Step 1: Write the failing tests**
  - `InstrumentBadge` mostra "Violão" por padrão e "Baixo" com o instrumento `bass` salvo.
  - `App` (largura de computador via `mockViewport(1280)`): a barra lateral contém a etiqueta; (largura de celular): o cabeçalho do Estudar contém a etiqueta e Progresso e Foco mostram-na junto do título.
  - Ao trocar para "Baixo" em Ajustes, a etiqueta passa a "Baixo" sem recarregar; o texto da etiqueta não é um botão (`queryByRole('button', { name: 'Baixo' })` é `null` no cabeçalho).

- [ ] **Step 2: Run to verify failures**
  Run: `npx vitest run src/ui src/App.test.tsx`
  Expected: FAIL.

- [ ] **Step 3: Implement**
  Componente e estilo discreto no mesmo padrão dos chips/badges existentes (`.badge`): texto pequeno, cor de destaque do app, sem tocar a altura do cabeçalho; colocá-lo nos quatro lugares acima.

- [ ] **Step 4: Run to verify pass**
  Run: `npx vitest run && npx tsc --noEmit`
  Expected: PASS.

- [ ] **Step 5: Commit**
  `git add src && git commit -m "feat(ui): instrument badge in the header, sidebar, Progress and Foco"`

---

### Task 10: Limpeza e verificação final

**Files:**
- Modify: `src/domain/fretboard.ts`, `src/domain/pitch.ts` e qualquer arquivo que ainda importe `STRING_COUNT` ou `OPEN_STRING_MIDI`
- Test: suíte inteira

**Interfaces:**
- Consumes: tudo acima. Produces: `STRING_COUNT` e `OPEN_STRING_MIDI` removidos (sem consumidores); `LOWEST_MIDI` e `HIGHEST_MIDI` seguem apenas se ainda forem usados, senão removidos.

- [ ] **Step 1: Verify nothing depends on the old constants**
  Run: `grep -rn "STRING_COUNT\|OPEN_STRING_MIDI\|LOWEST_MIDI\|HIGHEST_MIDI" src`
  Expected: só as definições (e testes que precisem migrar para `GUITAR.stringCount` / `GUITAR.openMidi`).

- [ ] **Step 2: Remove them and migrate remaining references**
  Trocar usos restantes por `GUITAR.stringCount` / `GUITAR.openMidi`; remover constantes sem uso.

- [ ] **Step 3: Full verification**
  Run: `npm test && npm run build`
  Expected: todos os testes passam; `tsc --noEmit` e `vite build` sem erros; o precache da PWA inclui `sounds/bass/*.mp3`.

- [ ] **Step 4: Manual check in the browser**
  Skill `run`: `npm run dev`, abrir o app, Ajustes → Baixo; conferir braço de 4 cordas (rótulos G D A E), Foco com chips 1–4, cada modo de Estudar, Ouvido tocando som grave de baixo, Progresso com mapa 4×24 vazio, mão esquerda, layouts mobile/tablet/desktop; voltar ao Violão e ver o progresso antigo intacto. Com dados v1 existentes no `localStorage`, abrir e confirmar que o violão mantém tudo e que a chave `guitar-mapper:v1` continua lá.

- [ ] **Step 5: Commit**
  `git add -A && git commit -m "refactor: remove guitar-only constants now that instruments carry their own"`
