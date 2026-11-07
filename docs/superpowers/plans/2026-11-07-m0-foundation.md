# M0 Fundação Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer cada modo de estudo ser um registro (um arquivo mais uma entrada), agrupar os modos por trilha no menu e permitir exportar/importar todos os dados em JSON, sem mudar nenhum comportamento dos exercícios.

**Architecture:** Metadados puros dos modos (id, trilha, rótulo, descrição, se grava progresso por posição) vão para `src/domain/exercises.ts`, de onde `modeLabels.ts` e `storage.ts` derivam suas listas. O comportamento (fila, som, componente da pergunta) vai para `src/ui/exercises.tsx`, e `Study.tsx` passa a delegar ao exercício ativo em vez de ramificar por modo. Exportar/importar é um módulo puro `src/state/backup.ts` mais um método `importData` no `AppProvider`, usado por uma seção "Dados" em Ajustes.

**Tech Stack:** React 19, TypeScript, Vite, Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-11-07-m0-foundation-design.md`

## Global Constraints

- Texto da interface em português. Nenhuma biblioteca nova.
- O formato `guitar-mapper:v2` não muda; sem migração; `AppData.version` continua `2`.
- A importação usa o `sanitizeV2` já existente (não um segundo sanitizador) e exige `version === 2` e `instruments` como objeto, o mesmo critério de `loadData`.
- Cópia de segurança antes de importar: chave `guitar-mapper:v2:backup` (`BACKUP_KEY`).
- Nome do arquivo exportado: `guitar-mapper-AAAA-MM-DD.json`.
- Trilhas: **Braço** (`position-to-note`, `note-to-position`, `flashcard`), **Ouvido** (`ear`), **Teoria** (`interval`).
- Os 424 testes atuais passam sem mudança de comportamento. Um teste só pode ser editado se testava a estrutura interna removida, e o commit explica por quê.
- Nenhum exercício muda: mesma ordem de perguntas, mesmo registro de progresso (só posição nos três modos de posição; nada em Ouvido e Intervalos), mesmo histórico, mesmos atalhos.
- Confirmação reaproveita `useConfirm` (`src/ui/ConfirmDialog.tsx`).

## Review Focus

Entradas e condições que o spec implica mas não detalha; cada uma tem teste na tarefa dona do código.

1. Arquivo com `version: 2` e `instruments` objeto, mas conteúdo lixo (`{"guitar": 5}`, `settings` ausente): importa com os padrões, sem erro (Task 3).
2. Arquivo vazio, não-JSON, array, `null`, `version: 1` ou `version: 3`: rejeitado com mensagem, dados atuais intactos, backup não escrito (Task 3).
3. Armazenamento indisponível (`storage={null}`) ou que falha ao escrever: a importação não lança e os dados novos aparecem na tela (Task 3).
4. Escolher o mesmo arquivo duas vezes seguidas: o segundo `change` também dispara (Task 4).
5. Importar um arquivo cujo `settings.instrument` é o baixo: a tela passa a mostrar o baixo, sem recarregar (Task 4).

---

### Task 1: Metadados dos modos em um só lugar

**Files:**
- Create: `src/domain/exercises.ts`
- Create: `src/domain/exercises.test.ts`
- Modify: `src/ui/modeLabels.ts` (derivar `MODES` e `MODE_DESCRIPTIONS`)
- Modify: `src/state/storage.ts:150` (usar a lista do domínio em vez de `MODES` local)

**Interfaces:**
- Consumes: `QuizMode` de `src/domain/quiz.ts`.
- Produces (usados pelas Tasks 2 e 3):
  - `type TrackId = 'braco' | 'ouvido' | 'teoria'`
  - `interface ExerciseMeta { mode: QuizMode; track: TrackId; label: string; description: string; recordsPositionProgress: boolean }`
  - `const EXERCISE_META: Record<QuizMode, ExerciseMeta>` (exaustivo em compilação)
  - `const QUIZ_MODES: QuizMode[]` (ordem: braço, ouvido, teoria; `position-to-note, note-to-position, flashcard, ear, interval`)
  - `const TRACKS: { id: TrackId; label: string; modes: QuizMode[] }[]` (Braço, Ouvido, Teoria, nessa ordem)

- [ ] **Step 1: Write the failing test** em `src/domain/exercises.test.ts`:
  - `QUIZ_MODES` é exatamente `['position-to-note','note-to-position','flashcard','ear','interval']`.
  - cada modo de `QUIZ_MODES` tem `EXERCISE_META[mode].mode === mode`.
  - `TRACKS.map(t => t.label)` é `['Braço','Ouvido','Teoria']` e `TRACKS.flatMap(t => t.modes)` é igual a `QUIZ_MODES` (cada modo em exatamente uma trilha).
  - `recordsPositionProgress` é `true` para `position-to-note`, `note-to-position`, `flashcard` e `false` para `ear` e `interval`.
  - rótulos: `EXERCISE_META['position-to-note'].label === 'Posição → nota'`, `…'interval'.label === 'Intervalos'`.
- [ ] **Step 2: Run** `npx vitest run src/domain/exercises.test.ts`. Expected: FAIL (módulo não existe).
- [ ] **Step 3: Implement** `src/domain/exercises.ts` com os tipos e constantes acima. Os rótulos e as descrições são copiados literalmente de `MODES` e `MODE_DESCRIPTIONS` atuais em `src/ui/modeLabels.ts` (não reescreva o texto).
- [ ] **Step 4: Derive** em `modeLabels.ts`: `MODES` passa a ser `QUIZ_MODES.map(mode => ({ mode, label: EXERCISE_META[mode].label }))`; `MODE_DESCRIPTIONS` passa a ser derivado de `EXERCISE_META`; `modeLabel` e `EAR_LEVELS` ficam como estão. Em `storage.ts`, trocar a constante local `MODES` por `QUIZ_MODES` importado de `../domain/exercises` (usada em `sanitizeSettings` e `sanitizeHistory`).
- [ ] **Step 5: Run** `npx vitest run`. Expected: toda a suíte passa (mesmo número de testes de antes mais os novos).
- [ ] **Step 6: Commit**

```bash
git add src/domain/exercises.ts src/domain/exercises.test.ts src/ui/modeLabels.ts src/state/storage.ts
git commit -m "refactor: single source of truth for quiz modes (domain/exercises)"
```

---

### Task 2: Registro de exercícios e `Study` genérico

**Files:**
- Create: `src/ui/exercises.tsx`
- Create: `src/ui/exercises.test.tsx`
- Modify: `src/ui/screens/Study.tsx` (remover ramos por modo)

**Interfaces:**
- Consumes (Task 1): `EXERCISE_META`, `ExerciseMeta`. Do app: `buildQueue` e `makeHistoryEntry` (`domain/session`), `uniquePitchPositions` (`domain/pitch`), `buildIntervalQueue`, `intervalById`, `intervalPitches`, `IntervalItem` (`domain/intervals`), `positionKey`/`Position` (`domain/fretboard`), `ALL_NOTES`/`NATURAL_NOTES`, `useSound` (tipo do retorno), `Settings` e `ChoiceQuiz`/`EarQuiz`/`Flashcard`/`FindQuiz`/`IntervalQuiz` e `QuizProps`/`IntervalQuizProps`.
- Produces (Task 3 usa só `EXERCISE_META`; esta tarefa fecha o resto):
  - `type QuizItem = Position | IntervalItem`
  - `interface ExerciseContext { settings: Settings; instrument: Instrument; candidates: Position[]; rng: () => number }`
  - `interface Exercise extends ExerciseMeta` com:
    - `itemKey(item: QuizItem): string` (posição → `positionKey`; intervalo → `"<root>:<interval>"`; ainda sem uso, é o gancho do M1)
    - `questionCount(ctx: ExerciseContext): number` (Ouvido: posições únicas por altura; Intervalos: nº de notas do foco × nº de intervalos; demais: `candidates.length`)
    - `startBlockers(ctx: ExerciseContext): string[]` (mensagens que desabilitam Iniciar; textos literais abaixo)
    - `startsFromPosition(ctx: ExerciseContext): boolean` (posição vinda do Progresso inicia a sessão: modos de posição `true`; Ouvido `settings.soundEnabled`; Intervalos `false`)
    - `Options?: ComponentType` (controles de início; só Ouvido: barra de nível + descrição do nível, extraídas de `Study.tsx` como estão)
    - `buildQueue(ctx: ExerciseContext, forced?: Position | null): QuizItem[]`
    - `prepareSound(sound: ReturnType<typeof useSound>, items: QuizItem[], instrument: Instrument): void`
    - `Quiz: ComponentType<{ item: QuizItem; settings: Settings; onAnswer(correct: boolean): void; onNext(): void }>`
  - `const EXERCISES: Record<QuizMode, Exercise>` e `function exerciseFor(mode: QuizMode): Exercise`
- Textos literais de `startBlockers` (os de hoje): sem posição nos modos de posição e Ouvido: `"Nenhuma posição no foco atual. Abra o Foco abaixo e selecione ao menos uma corda ou inclua notas com acidentais."`; Ouvido sem som: `"Ligue o Som em Ajustes para treinar de ouvido."` (vem antes da outra, como hoje); Intervalos sem intervalo no foco: `"Nenhum intervalo no foco. Abra o Foco e marque ao menos um intervalo."`.

- [ ] **Step 1: Write the failing test** em `src/ui/exercises.test.tsx` (sem renderizar `Study`; contexto montado à mão com `createDefaultData`/`activeView` de `state/storage` e `GUITAR`):
  - `Object.keys(EXERCISES)` cobre todos os `QUIZ_MODES`, e `exerciseFor(m).mode === m`.
  - `buildQueue` de `position-to-note` com `rng = mulberry32(1)` devolve uma permutação das `candidates` (mesmo conjunto e tamanho).
  - `buildQueue` de `ear` devolve no máximo uma posição por altura (`uniquePitchPositions`) e nunca duas notas iguais seguidas.
  - `buildQueue` de `ear` com `forced` começa pela posição forçada; `interval` ignora `forced` e devolve `settings.intervals.length * 7` itens com o foco "só naturais" padrão (`DEFAULT_SETTINGS`: 5 intervalos × 7 naturais = 35).
  - `questionCount`: `ear` conta posições únicas por altura (menor que `candidates.length` num foco com cordas repetindo alturas); `interval` = 35 no padrão.
  - `startBlockers`: `ear` com `soundEnabled:false` devolve `["Ligue o Som em Ajustes para treinar de ouvido."]`; `interval` com `intervals: []` devolve a mensagem de intervalo; `position-to-note` com `candidates: []` devolve a mensagem de posição; com tudo preenchido devolve `[]`.
  - `startsFromPosition`: `true` para `flashcard`, `false` para `interval`, e para `ear` depende de `soundEnabled`.
  - `recordsPositionProgress` já testado na Task 1; aqui, `itemKey({string:3,fret:5}) === "3-5"`.
- [ ] **Step 2: Run** `npx vitest run src/ui/exercises.test.tsx`. Expected: FAIL (módulo não existe).
- [ ] **Step 3: Implement** `src/ui/exercises.tsx` com os tipos acima. Cada função copia a lógica que hoje está em `Study.tsx` (`begin`, `positionCount`, `canStart`, `startsRunning`, escolha do componente de pergunta); o corpo é transposição, não redesenho. Dentro de cada exercício, estreitar `QuizItem` por `'string' in item` ou pelo tipo do exercício; `Options` do Ouvido recebe/usa `useAppState` para `earLevel`/`updateSettings`.
- [ ] **Step 4: Run** o teste do Step 1. Expected: PASS.
- [ ] **Step 5: Refactor `Study.tsx`** para uma fila única `queue: QuizItem[]` e o exercício ativo `const exercise = exerciseFor(settings.mode)`:
  - Remover `isInterval`, `intervalQueue`, `earWithoutSound`, `positionCount` e a escolha do componente por `settings.mode`; usar `exercise.questionCount`, `exercise.startBlockers`, `exercise.startsFromPosition`, `exercise.buildQueue`, `exercise.prepareSound` (dentro de `begin()`, depois de `sound.unlock()`, como hoje) e `<exercise.Quiz key={index} item={queue[index]} {...quizProps} />`.
  - `canStart = exercise.startBlockers(ctx).length === 0`. O parágrafo de descrição vem de `exercise.description`; `exercise.Options` é renderizado entre a descrição e as mensagens de bloqueio; cada mensagem de `startBlockers` é um `<p className="empty">`.
  - `handleAnswer`: `if (exercise.recordsPositionProgress) recordAnswer(queue[index] as Position, correct)`.
  - `useIntervalFocus()` continua chamado em `Study` apenas se ainda for necessário para a contagem; preferir calcular a contagem dentro de `exercise.questionCount` (sem hook), pois o hook só lê o estado do app.
- [ ] **Step 6: Run** `npx vitest run` e depois `npx tsc -b --noEmit` (ou o script de typecheck do `package.json`). Expected: a suíte inteira passa sem edição de nenhum teste existente; sem erros de tipo.
- [ ] **Step 7: Verify** que `Study.tsx` não ramifica mais por modo: `grep -nE "settings\.mode|isInterval|=== 'ear'|=== 'interval'" src/ui/screens/Study.tsx`. Expected: nenhuma linha (exceto `updateSettings({ mode })` em `changeMode`, que é troca de modo, não ramo).
- [ ] **Step 8: Commit**

```bash
git add src/ui/exercises.tsx src/ui/exercises.test.tsx src/ui/screens/Study.tsx
git commit -m "refactor: exercise registry; Study delegates to the active exercise"
```

---

### Task 3: Importar e exportar (núcleo de dados)

**Files:**
- Create: `src/state/backup.ts`
- Create: `src/state/backup.test.ts`
- Modify: `src/state/storage.ts` (exportar `sanitizeV2` e `isRecord` se ainda não forem exportados)
- Modify: `src/state/AppState.tsx` (novo `importData`)
- Test: `src/state/AppState.test.tsx` (se existir; senão criar) para `importData`

**Interfaces:**
- Consumes: `AppData`, `STORAGE_KEY`, `BACKUP_KEY`, `sanitizeV2`, `createDefaultData`, `StorageLike` (`state/storage`).
- Produces (Task 4):
  - `serializeData(data: AppData): string` (`JSON.stringify(data, null, 2)`)
  - `exportFilename(now: Date): string` → `guitar-mapper-AAAA-MM-DD.json` com data **local**
  - `type ImportResult = { ok: true; data: AppData } | { ok: false; error: string }`
  - `parseImport(text: string): ImportResult`; `error` é sempre `"Arquivo não reconhecido. Escolha um arquivo exportado pelo Guitar Mapper."`
  - em `AppStateValue`: `importData(next: AppData): void`, que grava os dados atuais em `BACKUP_KEY` (ignorando falha de escrita) e então faz `commit(next)`.

- [ ] **Step 1: Write the failing tests** em `backup.test.ts`:
  - ida e volta: `parseImport(serializeData(d))` devolve `ok: true` e dados iguais a `d` para um `seededStorage` com progresso, histórico e `settings.instrument = 'bass'`.
  - `exportFilename(new Date(2026, 10, 7, 23, 30))` é `guitar-mapper-2026-11-07.json` (data local, mês 10 = novembro).
  - rejeita (`ok:false` com a mensagem literal): `''`, `'não é json'`, `'[]'`, `'null'`, `'{"version":1,"instruments":{}}'`, `'{"version":3,"instruments":{}}'`, `'{"version":2}'`, `'{"version":2,"instruments":[]}'`.
  - lixo dentro de estrutura válida (Review Focus 1): `'{"version":2,"instruments":{"guitar":5}}'` devolve `ok:true` com os padrões (`createDefaultData()` em todos os campos).
  - progresso com chave inválida é descartado (reaproveita o sanitizador): `'{"version":2,"instruments":{"guitar":{"progress":{"x":{}}}}}'` → `progress` `{}`.
- [ ] **Step 2: Run** `npx vitest run src/state/backup.test.ts`. Expected: FAIL (módulo não existe).
- [ ] **Step 3: Implement** `backup.ts`. `parseImport`: `JSON.parse` em `try/catch`; aceita só `isRecord(parsed) && parsed.version === 2 && isRecord(parsed.instruments)`, e devolve `{ ok: true, data: sanitizeV2(parsed) }`.
- [ ] **Step 4: Run** o teste do Step 1. Expected: PASS.
- [ ] **Step 5: Write the failing tests de `importData`** (render do `AppProvider` com um componente de teste que chama `useAppState().importData`):
  - com `createMemoryStorage` semeado: depois de `importData(novo)`, `readSaved(storage)` é o novo e `storage.getItem(BACKUP_KEY)` é o JSON anterior.
  - `storage={null}`: não lança e `data` do contexto reflete o novo (Review Focus 3).
  - `createThrowingStorage('write')`: não lança; o estado em memória é o novo; `storageAvailable` vira `false`.
  - importar dados com `settings.instrument: 'bass'` faz `useAppState().instrument.id === 'bass'` (Review Focus 5, nível do estado).
- [ ] **Step 6: Run**. Expected: FAIL (`importData` não existe).
- [ ] **Step 7: Implement `importData`** em `AppState.tsx`: lê `dataRef.current`, tenta `init.storage?.setItem(BACKUP_KEY, JSON.stringify(atual))` dentro de `try/catch`, depois `commit(next)`. Adicionar ao valor do contexto e às dependências do `useMemo`.
- [ ] **Step 8: Run** `npx vitest run`. Expected: tudo passa.
- [ ] **Step 9: Commit**

```bash
git add src/state
git commit -m "feat(state): export/import core (parseImport, importData with backup copy)"
```

---

### Task 4: Seção "Dados" em Ajustes

**Files:**
- Modify: `src/ui/screens/Settings.tsx`
- Modify: `src/ui/screens/Settings.test.tsx`
- Modify: `src/styles.css` (só se a seção precisar de espaçamento; reaproveitar `hint` e `primary`)

**Interfaces:**
- Consumes (Task 3): `serializeData`, `exportFilename`, `parseImport`, `importData`; `useConfirm`; `useAppState().data` não basta para exportar o `AppData` inteiro, então expor também `exportData(): AppData` no contexto (devolve `dataRef.current`) e usá-lo aqui.
- Produces: nada além da UI.

Comportamento da seção (título `Dados`, `<section aria-labelledby>` como a de Créditos, posicionada antes de Créditos):
- Botão **Exportar dados**: cria `Blob` (`application/json`) com `serializeData(exportData())`, `URL.createObjectURL`, `<a download={exportFilename(new Date())}>` clicado por código, e `URL.revokeObjectURL`.
- Botão **Importar dados** que aciona um `<input type="file" accept="application/json,.json" hidden>` (rótulo acessível "Importar dados"). Ao escolher o arquivo: ler o texto, `parseImport`; se `ok:false`, mostrar o erro em um `<p role="alert" className="empty">`; se `ok:true`, `await confirm({ title: 'Importar dados?', message: 'Isto substitui todo o progresso, histórico e ajustes atuais. Uma cópia dos dados atuais fica guardada no aparelho.', confirmLabel: 'Importar' })` e só então `importData`; depois mostrar `<p role="status" className="hint">Dados importados.</p>`.
- Depois de qualquer escolha (inclusive cancelada ou inválida), zerar `input.value` para o mesmo arquivo poder ser escolhido de novo (Review Focus 4).
- Um dica `hint` abaixo: "Guarde o arquivo exportado: se o navegador limpar os dados do site, é por ele que você recupera o progresso."

- [ ] **Step 1: Write the failing tests** em `Settings.test.tsx` (usar `setup()` existente, que já tem `ConfirmProvider`; criar `File` com `new File([texto], 'x.json', { type: 'application/json' })` e `fireEvent.change(input, { target: { files: [file] } })`; se o jsdom não tiver `File.prototype.text`, ler com `FileReader` na implementação em vez de `file.text()`):
  - exportar: com `URL.createObjectURL`/`revokeObjectURL` stubados (`vi.stubGlobal`) e `HTMLAnchorElement.prototype.click` espionado, clicar em "Exportar dados" chama `createObjectURL` com um `Blob` cujo texto, lido de volta, faz `parseImport` dar `ok:true` com o progresso `'6-0'` semeado; o `download` do âncora casa `/^guitar-mapper-\d{4}-\d{2}-\d{2}\.json$/`.
  - importar válido: escolher um arquivo exportado de outros dados abre o diálogo "Importar dados?"; clicar "Importar" salva (`readSaved`) os dados do arquivo, grava `BACKUP_KEY` com os dados anteriores e mostra "Dados importados.".
  - cancelar o diálogo: nada muda em `readSaved` e `BACKUP_KEY` não existe.
  - arquivo inválido (`'não é json'`): aparece o alerta com a mensagem literal da Task 3, nenhum diálogo abre, `readSaved` inalterado.
  - o mesmo arquivo duas vezes: depois da primeira escolha, `input.value === ''`.
  - importar arquivo com `settings.instrument: 'bass'` muda o radio "Baixo" para marcado sem recarregar (Review Focus 5, nível da tela).
- [ ] **Step 2: Run** `npx vitest run src/ui/screens/Settings.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** `exportData` no contexto (`AppState.tsx`) e a seção em `Settings.tsx` conforme o comportamento acima.
- [ ] **Step 4: Run** `npx vitest run` e `npm run build`. Expected: suíte inteira passa; build sem erros.
- [ ] **Step 5: Manual** (não automatizável; registrar o resultado no commit ou ao entregar): no navegador, exportar, apagar os dados do site, importar e conferir progresso e histórico; **no iPhone (Safari e PWA instalado)**, conferir se o download do `.json` funciona e se o seletor de arquivo abre. Se o download direto não funcionar no iOS, a alternativa é `navigator.share({ files })` quando `navigator.canShare` aceitar; registrar o que foi ou não verificado.
- [ ] **Step 6: Commit**

```bash
git add src/ui/screens/Settings.tsx src/ui/screens/Settings.test.tsx src/state/AppState.tsx src/styles.css
git commit -m "feat(ui): export and import data from Ajustes"
```

---

### Task 5: Trilhas no menu de exercícios

**Files:**
- Modify: `src/ui/screens/StudyHeader.tsx`
- Modify: `src/ui/screens/Study.test.tsx` (só adicionar testes)
- Modify: `src/styles.css` (título de grupo no `.menu`)

**Interfaces:**
- Consumes (Task 1): `TRACKS`, `EXERCISE_META`; `MODES`/`modeLabel` de `modeLabels.ts` podem ser trocados pelos mesmos dados.
- Produces: nada.

Comportamento: no layout `compact`, dentro de `.menu` cada trilha vira `<div role="group" aria-label="{Braço|Ouvido|Teoria}">` com um título visível (`<p className="menu__group">`) e seus `menuitemradio` na ordem das trilhas. O layout `tabs` (computador) mantém a fileira de botões, agora na ordem de `TRACKS`. Abrir, fechar (botão, backdrop, Esc) e trocar de modo não mudam.

- [ ] **Step 1: Write the failing tests** em `Study.test.tsx` (usando o helper do arquivo para abrir o menu):
  - no celular, o menu tem três grupos com nomes `Braço`, `Ouvido`, `Teoria`; `within(grupo Braço).getAllByRole('menuitemradio')` tem os rótulos `Posição → nota`, `Nota → posição`, `Flashcard`, nessa ordem; Ouvido tem `Ouvido`; Teoria tem `Intervalos`.
  - os 5 `menuitemradio` seguem existindo no total (o teste atual da linha ~657 continua válido).
  - no computador, os botões do grupo "Exercício" aparecem na mesma ordem das trilhas.
- [ ] **Step 2: Run** `npx vitest run src/ui/screens/Study.test.tsx`. Expected: os novos testes FALHAM, os antigos passam.
- [ ] **Step 3: Implement** em `StudyHeader.tsx` e `styles.css` (`.menu__group`: texto pequeno, discreto, sem borda, com o mesmo recuo horizontal dos itens; ajustar `.menu button:last-child` para o último item de cada grupo não perder a borda inferior onde convém).
- [ ] **Step 4: Run** `npx vitest run` e `npm run build`. Expected: tudo passa.
- [ ] **Step 5: Manual** no celular: abrir o menu em Estudar, ver os três grupos, trocar de modo e iniciar uma sessão de cada trilha.
- [ ] **Step 6: Commit**

```bash
git add src/ui/screens/StudyHeader.tsx src/ui/screens/Study.test.tsx src/styles.css
git commit -m "feat(ui): group exercises by track in the Estudar menu"
```

---

## Verificação final do marco

- [ ] `npx vitest run` passa (os 424 atuais mais os novos) e `npm run build` termina sem erro.
- [ ] `git diff main --stat -- 'src/**/*.test.*'` mostra só testes **adicionados**, sem linhas removidas em testes existentes (qualquer remoção precisa de justificativa no commit).
- [ ] Teste manual: uma sessão completa de cada um dos 5 modos, exportar → limpar dados do site → importar, no celular.
