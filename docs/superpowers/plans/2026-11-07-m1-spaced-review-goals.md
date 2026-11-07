# M1 Revisão espaçada e metas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Montar cada sessão (até 20 perguntas) pela revisão espaçada em todos os modos, guardar progresso por item em Ouvido e Intervalos, e mostrar constância (dias seguidos, meta semanal em dias, tempo médio).

**Architecture:** Três peças puras em `src/domain/` (`review.ts`: seleção por vencidos/novos/resto; `stats.ts`: estatística por dia local, sequência, semana, média) alimentadas pelo armazenamento v2 com campos aditivos (`items` por instrumento, `stats` e `settings.weeklyGoal` globais). Os exercícios do registro (M0) passam a montar a fila com a seleção; `Study` grava o progresso do item e o dia estudado; Progresso e Ajustes exibem e configuram a constância.

**Tech Stack:** React 19, TypeScript, Vite, Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-11-07-m1-spaced-review-goals-design.md`

## Global Constraints

- Texto da interface em português. Nenhuma biblioteca nova.
- Formato `guitar-mapper:v2` **aditivo**: campos novos opcionais com padrão seguro quando ausentes ou inválidos; sem trocar `version`; sem migração; `sanitizeV2` valida os campos novos.
- O progresso por posição (`progress`) já gravado não muda; os três modos de posição continuam usando-o, compartilhado.
- Sessão fixa de **20** perguntas; pesos **50% vencidos / 30% novos / 20% resto**; `BOX_INTERVALS_MS` não muda.
- Chaves de item: Ouvido `ear:<altura MIDI>`; Intervalos `interval:<nota de partida>:<id do intervalo>`.
- Dia = data **local** do aparelho em `AAAA-MM-DD`; semana de **segunda a domingo**; dia estudado = sessão terminada com **ao menos uma resposta**; registro diário global, entradas com mais de **400 dias** descartadas ao gravar.
- Dias seguidos: terminam hoje, ou ontem se hoje ainda não foi estudado.
- Tempo médio: respostas dos **últimos 7 dias** (incluindo hoje); sem respostas, não mostra o valor.
- Meta semanal: `settings.weeklyGoal`, inteiro de **1 a 7**, padrão **5**, global.
- `now` e `rng` injetáveis; os testes atuais continuam passando. Só podem mudar testes que assumiam a sessão com todas as posições do foco acima de 20, e o commit explica.
- Textos fixos: início da sessão `Sessão de N perguntas`; vazio do bloco `Termine uma sessão para começar a contar.`

## Review Focus

1. Pool com 0, 1, exatamente 20 e mais de 20 itens, e posição forçada: sem erro, sem repetição, tamanho certo (Task 1 e 4).
2. Dia seguido atravessando virada de mês/ano e horário de verão; hoje ainda sem estudo com ontem estudado não zera a sequência (Task 2).
3. Sessão finalizada com 0 respostas não conta como dia estudado nem cria entrada (Task 2 e 5).
4. Arquivo/dados antigos sem `items`, `stats` ou `weeklyGoal`, ou com lixo nesses campos (chave inválida, entrada incompleta, `weeklyGoal: 99`), carregam com os padrões (Task 3).
5. Itens não vistos de Ouvido em foco grande (mais de 20 alturas) e uma sessão só de itens dominados quando há vencidos: a seleção ainda prioriza os vencidos (Task 1 e 4).

---

### Task 1: Seleção para revisão (`domain/review.ts`)

**Files:**
- Create: `src/domain/review.ts`
- Create: `src/domain/review.test.ts`

**Interfaces:**
- Consumes: `ProgressMap` de `src/domain/scheduler.ts`.
- Produces (Task 4):
  - `const SESSION_SIZE = 20`
  - `function selectForReview<T>(items: T[], options: { keyOf(item: T): string; progress: ProgressMap; now: number; rng: () => number; limit: number }): T[]`

Regras de `selectForReview`:
- Se `items.length <= limit`, devolve todos, na ordem original, **sem consumir `rng`**.
- Classificação (a mesma de `pickNext`): sem entrada em `progress` = novo; `nextReview <= now` = vencido; senão = resto.
- Cotas: `fresh = floor(limit*0.3)`, `rest = floor(limit*0.2)`, `due = limit - fresh - rest`. Cada grupo entrega até a sua cota, escolhendo ao acaso sem reposição com `rng`; a sobra de cota é redistribuída na ordem vencidos, novos, resto, até completar `limit` ou acabarem os itens.
- Devolve exatamente `limit` itens distintos (por posição na entrada), em ordem qualquer.

- [ ] **Step 1: Write the failing tests** em `review.test.ts` (itens como chaves `'a1'…`; `keyOf = x => x`; `rng = mulberry32(7)` de `src/test-utils`):
  - `SESSION_SIZE === 20`.
  - 0 itens devolve `[]`; 1 item devolve esse item; exatamente 20 itens devolve os 20 na mesma ordem e `rng` não é chamado (usar `vi.fn`).
  - 50 itens todos novos: devolve 20 distintos, todos do conjunto de entrada.
  - 50 itens: 30 vencidos, 10 novos, 10 resto → o resultado tem exatamente 10 vencidos, 6 novos e 4 resto (as cotas).
  - 50 itens: 3 vencidos, 40 novos, 7 resto → resultado com exatamente 3 vencidos, 13 novos e 4 resto (os 3 vencidos entram sempre; a cota de vencidos que sobrou, 7, vai para os novos primeiro).
  - sobram só itens dominados (todos `nextReview` no futuro) e há vencidos: com 30 resto e 25 vencidos, os vencidos aparecem 10 vezes (cota) e nunca ficam de fora por causa de sorteio entre grupos.
  - determinismo: mesma `rng` com mesma semente dá o mesmo resultado; não repete item.
  - `limit` menor que as cotas somadas arredondadas (ex.: `limit = 4`, 10 itens): devolve 4 itens distintos.
- [ ] **Step 2: Run** `npx vitest run src/domain/review.test.ts`. Expected: FAIL (módulo não existe).
- [ ] **Step 3: Implement** `review.ts` conforme as regras. Escolha ao acaso sem reposição: embaralhar uma cópia do grupo (Fisher-Yates com `rng`) e pegar os primeiros.
- [ ] **Step 4: Run** o teste do Step 1. Expected: PASS.
- [ ] **Step 5: Run** `npx vitest run`. Expected: toda a suíte passa.
- [ ] **Step 6: Commit**

```bash
git add src/domain/review.ts src/domain/review.test.ts
git commit -m "feat(domain): review selection for sessions (due/new/rest, 20 per session)"
```

---

### Task 2: Estatística diária (`domain/stats.ts`)

**Files:**
- Create: `src/domain/stats.ts`
- Create: `src/domain/stats.test.ts`

**Interfaces:**
- Consumes: `SessionResult` de `src/domain/session.ts`.
- Produces (Tasks 3, 5, 6):
  - `interface DayStats { sessions: number; answered: number; correct: number; ms: number }`
  - `type StatsMap = Record<string, DayStats>` (chave `AAAA-MM-DD`)
  - `const STATS_RETENTION_DAYS = 400`
  - `dayKey(date: Date): string` (data local)
  - `addSessionToStats(stats: StatsMap, results: SessionResult[], now: Date): StatsMap` (devolve `stats` inalterado, mesmo objeto, se `results` está vazio; soma sessão, respostas, acertos e `ms` no dia local de `now`; descarta chaves anteriores a `dayKey(now − 400 dias)`)
  - `currentStreak(stats: StatsMap, today: Date): number`
  - `daysStudiedThisWeek(stats: StatsMap, today: Date): number` (segunda a domingo local, contando dias com `sessions > 0`)
  - `averageResponseMs(stats: StatsMap, today: Date): number | null` (soma de `ms` / soma de `answered` nos 7 dias terminando hoje; `null` se não há respostas)

- [ ] **Step 1: Write the failing tests** em `stats.test.ts` (datas locais com `new Date(ano, mês, dia, hora)`):
  - `dayKey(new Date(2026, 10, 7, 23, 59))` é `'2026-11-07'` e `dayKey(new Date(2026, 0, 1, 0, 0))` é `'2026-01-01'`.
  - `addSessionToStats({}, [], now)` devolve o mesmo objeto (`toBe`); com 3 resultados (2 acertos, `ms` 1000/2000/3000) cria `{ '2026-11-07': { sessions: 1, answered: 3, correct: 2, ms: 6000 } }`; uma segunda sessão no mesmo dia soma (`sessions: 2`).
  - retenção: uma chave `'2025-01-01'` com `now` em 2026-11-07 (mais de 400 dias) é descartada; uma de `2025-10-10` (menos de 400 dias) fica.
  - `currentStreak` (hoje = 2026-11-07): vazio = 0; dias 5, 6 e 7 estudados → 3; dias 5 e 6 estudados e hoje sem estudo → 2 (a sequência não zera antes de acabar hoje); dias 4 e 6 estudados, hoje sem estudo → 1 (o dia 5 falta); só o dia 5 estudado → 0 (ontem não foi estudado).
  - virada de mês e de ano: estudados `2026-12-30`, `2026-12-31`, `2027-01-01` com hoje = `2027-01-01` → 3.
  - horário de verão: com os dias consecutivos `2026-10-17` a `2026-10-19` (período em que uma troca de relógio costuma ocorrer em vários fusos) estudados, hoje `2026-10-19`, o resultado é 3 independentemente do fuso (a conta usa aritmética de calendário, `new Date(y, m, d - 1)`, não subtração de 24 h).
  - `daysStudiedThisWeek`: hoje quarta 2026-11-04 (segunda = 11-02): estudados 11-02 e 11-04 → 2; um dia de domingo anterior (11-01) não conta; hoje domingo 2026-11-08 (semana de 11-02 a 11-08) com estudos em 11-02, 11-05 e 11-08 → 3.
  - `averageResponseMs`: sem dados = `null`; 7 dias: estudos hoje (`answered 2, ms 3000`) e 6 dias atrás (`answered 2, ms 5000`) → `2000`; um estudo 7 dias atrás (fora da janela) não entra → só os dentro.
- [ ] **Step 2: Run** `npx vitest run src/domain/stats.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `stats.ts`. Dias vizinhos por `new Date(y, m, d ± n)` (aritmética de calendário local), nunca por milissegundos.
- [ ] **Step 4: Run** o teste do Step 1. Expected: PASS.
- [ ] **Step 5: Run** `npx vitest run`. Expected: tudo passa.
- [ ] **Step 6: Commit**

```bash
git add src/domain/stats.ts src/domain/stats.test.ts
git commit -m "feat(domain): daily study stats (streak, week, average response time)"
```

---

### Task 3: Armazenamento e estado: `items`, `stats`, `weeklyGoal`

**Files:**
- Modify: `src/state/storage.ts`
- Modify: `src/state/AppState.tsx`
- Modify: `src/test-utils.ts` (só se `seededStorage` precisar aceitar `items`/`stats`)
- Test: `src/state/storage.test.ts`, `src/state/AppState.test.tsx` (adicionar casos; criar o arquivo de storage se não existir)

**Interfaces:**
- Consumes (Task 2): `StatsMap`, `DayStats`, `addSessionToStats`; `PositionProgress`, `Box`, `ProgressMap` (`domain/scheduler`); `isIntervalId` (`domain/intervals`).
- Produces (Tasks 4, 5, 6):
  - `InstrumentData` ganha `items: ProgressMap` (padrão `{}`); `AppData` ganha `stats: StatsMap` (padrão `{}`); `GlobalSettings` ganha `weeklyGoal: number` (padrão `5`, em `DEFAULT_SETTINGS`).
  - `ActiveData` ganha `itemProgress: ProgressMap` (o `items` do instrumento ativo) e `stats: StatsMap`.
  - Em `AppStateValue`: `recordItemAnswer(key: string, correct: boolean): void` e `recordStudyDay(results: SessionResult[]): void`.

Regras de sanitização (em `sanitizeBucket`, `sanitizeV2`, `sanitizeSettings`; `migrateV1` herda os padrões):
- `items`: objeto; mantém só chaves que casam `ear:<inteiro ≥ 0>` ou `interval:<inteiro 0–11>:<id válido por isIntervalId>` e cujo valor seja uma entrada de progresso válida (a mesma validação de `sanitizeProgress`; extrair a validação da entrada para uma função compartilhada).
- `stats`: objeto; mantém só chaves `AAAA-MM-DD` (regex) com valores `{sessions, answered, correct, ms}` de contagens finitas ≥ 0 (`sessions`, `answered`, `correct` inteiros e `correct <= answered`).
- `weeklyGoal`: inteiro entre 1 e 7; qualquer outra coisa vira 5.

- [ ] **Step 1: Write the failing tests**:
  - `storage.test`: dados salvos sem `items`/`stats`/`weeklyGoal` (e um arquivo no formato v1 migrado) carregam com `{}`, `{}` e `5` (Review Focus 4).
  - lixo é descartado: `items` com chaves `'x'`, `'ear:abc'`, `'interval:99:3m'`, `'interval:0:zz'` e uma entrada `ear:60` com `box: 9` somem; uma `ear:60` e uma `interval:0:3m` válidas ficam. `stats` com `'hoje'`, `'2026-11-07'` com `answered: -1` somem; um dia válido fica. `weeklyGoal` 0, 8, 2.5, `'5'` → 5; 3 → 3.
  - ida e volta: `saveData` → `loadData` preserva `items` e `stats` válidos; `activeView` expõe `itemProgress` do instrumento ativo e `stats`.
  - `AppState.test`: `recordItemAnswer('ear:60', true)` grava `box 2` em `items` do instrumento ativo (e **não** em `progress`); numa segunda chamada com `false` volta a `box 1`; com o baixo ativo grava no balde do baixo; `recordAnswer` de posição continua gravando em `progress` (inalterado).
  - `recordStudyDay`: com `now` injetado em 2026-11-07 (local), `recordStudyDay([{correct:true, ms:1000},{correct:false, ms:3000}])` grava `stats['2026-11-07']` com `sessions 1, answered 2, correct 1, ms 4000`; `recordStudyDay([])` não altera `stats` nem escreve no storage (Review Focus 3).
  - `parseImport` (M0) com um arquivo que tem `items` e `stats` válidos os preserva (um teste em `backup.test.ts` basta).
- [ ] **Step 2: Run** `npx vitest run src/state`. Expected: FAIL.
- [ ] **Step 3: Implement** os campos, a sanitização e os dois métodos. `recordItemAnswer` usa `applyAnswer` (`domain/scheduler`) com `now()`; `recordStudyDay` usa `addSessionToStats(stats, results, new Date(now()))` e só faz `commit` se o mapa mudou. Ajustar `createDefaultData`, `defaultInstrumentData`, `activeView`, `withActive` e o valor/deps do `useMemo` do contexto. Dados guardados antes (sem os campos) não são regravados só por carregar.
- [ ] **Step 4: Run** `npx vitest run`. Expected: toda a suíte passa. Se um teste existente comparava a forma completa dos dados salvos, ajuste **só o campo novo esperado** e explique no commit.
- [ ] **Step 5: Run** `npm run build`. Expected: sem erros de tipo.
- [ ] **Step 6: Commit**

```bash
git add src/state src/test-utils.ts
git commit -m "feat(state): per-item progress, daily stats and weekly goal (additive v2 fields)"
```

---

### Task 4: Fila de revisão nos exercícios

**Files:**
- Modify: `src/ui/exercises.tsx`
- Modify: `src/ui/exercises.test.tsx`
- Modify: `src/domain/intervals.ts` (extrair a enumeração dos itens)
- Test: `src/domain/intervals.test.ts`

**Interfaces:**
- Consumes (Tasks 1 e 3): `selectForReview`, `SESSION_SIZE`; `ProgressMap`.
- Produces (Task 5):
  - `ExerciseContext` ganha **opcionais** `progress?: ProgressMap`, `now?: number`, `limit?: number`. Sem `progress`/`limit`, `buildQueue` se comporta exatamente como hoje (fila com todo o pool); com os dois, a fila tem até `limit` itens escolhidos por `selectForReview` sobre o pool do exercício, depois organizada pelas regras atuais de cada modo.
  - `Exercise.itemKey` passa a `itemKey(item: QuizItem, instrument: Instrument): string`: modos de posição `positionKey(item)` (inalterado); Ouvido `ear:${pitchOf(item, instrument)}`; Intervalos `interval:${root}:${interval}`.
  - `intervalItems(roots: readonly NoteIndex[], intervals: readonly IntervalId[]): IntervalItem[]` em `domain/intervals.ts` (todas as combinações, na ordem nota × intervalo, sem embaralhar); `buildIntervalQueue` passa a usá-la e tem o mesmo resultado de antes.

Regras de montagem com `progress` e `limit`:
- Modos de posição: pool = `candidates` sem a posição forçada; chaves `positionKey`; seleciona `limit - (forced ? 1 : 0)` e passa o subconjunto (mais o forçado) ao `buildQueue` de `domain/session` com as mesmas opções de hoje.
- Ouvido: pool = `uniquePitchPositions(candidates, instrument)` sem as de mesma altura que a forçada; chaves `ear:<MIDI>`; mesma lógica de forçada e organização (`avoidSameNote`, `uniquePitch`).
- Intervalos: pool = `intervalItems(roots, settings.intervals)`; chaves `interval:<root>:<interval>`; o subconjunto é embaralhado com o mesmo embaralhamento de `buildIntervalQueue` (não pode haver ordem determinística por causa da seleção). `forced` é ignorado, como hoje.
- `now` ausente usa `Date.now()`.

- [ ] **Step 1: Write the failing tests**:
  - `intervals.test`: `intervalItems([0,2], ['3m','5J'])` devolve 4 itens na ordem `{0,3m},{0,5J},{2,3m},{2,5J}`; `buildIntervalQueue` com `mulberry32(1)` continua devolvendo uma permutação dos mesmos itens (o teste existente continua passando).
  - `exercises.test`, para os três tipos, com foco grande (violão, todas as cordas, casas 1–12, acidentais; > 20 itens) e `limit: 20`, `rng = mulberry32(3)`, `now = 1_000_000`:
    - `position-to-note`: fila de exatamente 20 posições distintas; com 8 posições marcadas como vencidas (`nextReview <= now`) e as outras vistas e não vencidas ou novas, as 8 vencidas **estão todas na fila** (Review Focus 5).
    - `ear`: 20 itens com alturas distintas (`pitchOf`), nunca a mesma nota em sequência; vencidos (por chave `ear:<MIDI>` no `progress`) todos presentes quando são ≤ 10.
    - `interval`: 20 itens distintos; sem repetição; vencidos (por `interval:<root>:<id>`) presentes.
    - posição forçada: `buildQueue(ctx, forced)` começa pela forçada, tem 20 itens ao todo e a forçada não aparece de novo; no Ouvido, nenhuma outra posição com a mesma altura da forçada.
    - foco com menos de 20 itens: a fila tem todos, sem erro; foco de 1 item: 1 item; 0 candidatos: `[]`.
    - sem `progress`/`limit` no `ctx` o comportamento antigo é mantido (os testes existentes de `buildQueue` seguem sem edição).
    - `itemKey({string:3, fret:5}, GUITAR)` é `"3-5"`; para Ouvido na corda 1 solta do violão (MIDI 64), `"ear:64"`; para `{root: 0, interval: '3m'}`, `"interval:0:3m"`.
- [ ] **Step 2: Run** `npx vitest run src/domain/intervals.test.ts src/ui/exercises.test.tsx`. Expected: FAIL (novos casos).
- [ ] **Step 3: Implement** `intervalItems`, o novo `itemKey` e a montagem com seleção em `exercises.tsx`. Se o teste existente de `itemKey` chamava com um argumento só, atualize essa chamada para passar o instrumento (mudança de assinatura; explique no commit).
- [ ] **Step 4: Run** `npx vitest run`. Expected: tudo passa (nenhum teste de `Study` deve mudar, pois `Study` ainda não passa `progress`/`limit`).
- [ ] **Step 5: Commit**

```bash
git add src/domain/intervals.ts src/domain/intervals.test.ts src/ui/exercises.tsx src/ui/exercises.test.tsx
git commit -m "feat(ui): exercises build review-selected queues (itemKey per exercise)"
```

---

### Task 5: `Study` usa a revisão e registra o dia

**Files:**
- Modify: `src/ui/screens/Study.tsx`
- Modify: `src/ui/screens/Study.test.tsx` (adicionar; editar só os que assumiam a sessão inteira do foco acima de 20)

**Interfaces:**
- Consumes (Tasks 1, 3, 4): `SESSION_SIZE`; `data.progress`, `data.itemProgress`; `recordItemAnswer`, `recordStudyDay`; `Exercise.itemKey(item, instrument)`, `ExerciseContext` com `progress`, `now`, `limit`.
- Produces: nada além da tela.

Comportamento:
- `ctx` passa `progress` = `data.progress` se `exercise.recordsPositionProgress`, senão `data.itemProgress`; `now: Date.now()` no momento de iniciar; `limit: SESSION_SIZE`. Vale para `begin()` e para a fila inicial de `startsRunning`.
- `handleAnswer`: `recordsPositionProgress` → `recordAnswer(posição)`; senão → `recordItemAnswer(exercise.itemKey(item, instrument), correct)`.
- `finish()`: depois de `recordSession(entry)`, chama `recordStudyDay(done)` (não grava nada com 0 respostas).
- Início da sessão: abaixo da contagem do Foco, `<p className="hint">Sessão de {min(SESSION_SIZE, questionCount)} perguntas</p>`.

- [ ] **Step 1: Write the failing tests** em `Study.test.tsx` (usando `seededStorage` e os helpers existentes; foco: todas as cordas do violão, casas 1–12, acidentais ligadas, > 20 posições):
  - o início mostra `Sessão de 20 perguntas`; com foco de 5 posições mostra `Sessão de 5 perguntas`; a sessão iniciada mostra `Pergunta 1 de 20`.
  - Ouvido: responder uma pergunta grava `items['ear:<MIDI>']` do balde ativo (via `readSaved(storage).itemProgress`) e **não** altera `progress`; Intervalos: responder grava `items['interval:<nota>:<id>']`; modo de posição grava só em `progress` (como hoje) e não em `items`.
  - prioriza vencidos: semear `progress` com 8 posições vencidas (`nextReview: 0`) e outras 30 vistas e não vencidas (`nextReview` no futuro) → as 8 vencidas aparecem entre as 20 perguntas (percorrer a sessão respondendo e coletando as posições, ou inspecionar via `data-testid`/rótulos existentes das perguntas; se não houver gancho, afirmar via o progresso gravado depois de responder as 20: cada uma das 8 tem `correct + wrong` aumentado).
  - terminar uma sessão (responder 2 e Finalizar) grava `stats` do dia (`readSaved(...).stats[dayKey]` com `answered: 2`); finalizar sem responder nada não cria entrada em `stats` nem em `history` (Review Focus 3).
  - posição vinda do Progresso (forced) abre a sessão por ela e a sessão tem 20 perguntas.
- [ ] **Step 2: Run** `npx vitest run src/ui/screens/Study.test.tsx`. Expected: os novos FALHAM; os antigos passam.
- [ ] **Step 3: Implement** em `Study.tsx` conforme o comportamento acima.
- [ ] **Step 4: Run** `npx vitest run` e `npm run build`. Expected: tudo passa; quaisquer testes antigos editados estão justificados no commit.
- [ ] **Step 5: Commit**

```bash
git add src/ui/screens/Study.tsx src/ui/screens/Study.test.tsx
git commit -m "feat(ui): sessions of up to 20 review-selected questions; record item progress and study day"
```

---

### Task 6: Constância em Progresso e meta semanal em Ajustes

**Files:**
- Modify: `src/ui/screens/Progress.tsx`
- Modify: `src/ui/screens/Progress.test.tsx`
- Modify: `src/ui/screens/Settings.tsx`
- Modify: `src/ui/screens/Settings.test.tsx`
- Modify: `src/styles.css` (se o bloco precisar de estilo; reaproveitar `hint` e `legend`)

**Interfaces:**
- Consumes (Tasks 2 e 3): `currentStreak`, `daysStudiedThisWeek`, `averageResponseMs`; `data.stats`; `settings.weeklyGoal`; `formatSeconds` (`ui/format`); `updateSettings({ weeklyGoal })`.
- Produces: nada além da tela.

Comportamento:
- **Progresso**, no topo de `progress-main` (acima do braço), seção `<section aria-labelledby>` "Constância":
  - `Dias seguidos: N`;
  - `Esta semana: N de META dias` (`META` = `settings.weeklyGoal`);
  - `Tempo médio (7 dias): X,X s`, só se `averageResponseMs` não for `null`.
  - Sem nenhum dia estudado no registro (mapa vazio): só o texto `Termine uma sessão para começar a contar.`
  - "Hoje" é `new Date()` no momento da renderização.
- **Ajustes:** campo "Meta semanal (dias)" (um `<select>` de 1 a 7, rótulo acessível "Meta semanal (dias)"), valor do `settings.weeklyGoal`, `onChange` chama `updateSettings({ weeklyGoal: Number(valor) })`. Dica abaixo: `Dias por semana em que você quer terminar ao menos uma sessão.`

- [ ] **Step 1: Write the failing tests** (relógio: `vi.useFakeTimers()` + `vi.setSystemTime(new Date(2026, 10, 7, 12, 0))`, restaurado ao fim; semear `stats` em `seededStorage`, estendendo o helper se necessário):
  - Progresso sem dados: aparece `Termine uma sessão para começar a contar.` e não aparecem `Dias seguidos` nem tempo médio.
  - Com estudos em 2026-11-05, 06 e 07 (cada um `sessions 1, answered 2, correct 2, ms 4000`): `Dias seguidos: 3`, `Esta semana: 3 de 5 dias` (semana de 2026-11-02; sábado 11-07), `Tempo médio (7 dias): 2,0 s`.
  - Com `weeklyGoal: 3` semeado, mostra `de 3 dias`.
  - Hoje sem estudo e ontem estudado: `Dias seguidos: 1` aparece (a sequência não zera).
  - Ajustes: o seletor mostra 5 por padrão; escolher 3 grava `readRawSettings(storage).weeklyGoal === 3`; as opções vão de 1 a 7.
  - Os testes existentes de Progresso e Ajustes passam sem edição.
- [ ] **Step 2: Run** `npx vitest run src/ui/screens/Progress.test.tsx src/ui/screens/Settings.test.tsx`. Expected: os novos FALHAM.
- [ ] **Step 3: Implement** o bloco em `Progress.tsx` e o campo em `Settings.tsx` (estilo mínimo em `styles.css` apenas se necessário).
- [ ] **Step 4: Run** `npx vitest run` e `npm run build`. Expected: tudo passa.
- [ ] **Step 5: Manual** (registrar o resultado ao entregar): no celular, estudar uma sessão de cada modo e conferir `Sessão de 20 perguntas`, que erros voltam na sessão seguinte, o bloco Constância no Progresso depois de terminar, e que alterar a meta em Ajustes atualiza o texto.
- [ ] **Step 6: Commit**

```bash
git add src/ui/screens/Progress.tsx src/ui/screens/Progress.test.tsx src/ui/screens/Settings.tsx src/ui/screens/Settings.test.tsx src/styles.css
git commit -m "feat(ui): consistency block in Progresso and weekly goal in Ajustes"
```

---

## Verificação final do marco

- [ ] `npx vitest run` passa e `npm run build` termina sem erro.
- [ ] `git diff main --stat -- 'src/**/*.test.*'` mostra só testes adicionados, exceto os poucos editados com justificativa nos commits (assinatura de `itemKey`; sessões acima de 20).
- [ ] Teste manual no celular, conforme a Task 6, e exportar → importar mantendo `items` e `stats` (aproveitar o exportar do M0).
