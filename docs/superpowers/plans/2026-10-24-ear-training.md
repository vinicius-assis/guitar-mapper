# Exercício de percepção musical (Ouvido) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quarta aba "Ouvido": o app toca uma nota e o aluno a identifica, em três níveis (Fácil 2 opções, Médio 4, Difícil todas as notas do foco), com sessão, resumo e histórico.

**Architecture:** `domain/quiz.ts` ganha `buildEarQuestion` e o modo `'ear'`; `domain/session.ts` ganha a fila que evita a mesma nota em sequência e o nível no histórico; `state/storage.ts` valida `earLevel` e `level`; `ui/screens/EarQuiz.tsx` é a pergunta (som, opções, braço depois de responder); `Study.tsx` ganha a aba, o seletor de nível e as regras (sem progresso por posição, sem som = sem iniciar).

**Tech Stack:** React + TypeScript, Vitest/Testing Library (mesmos do projeto).

**Spec:** `docs/superpowers/specs/2026-10-24-ear-training-design.md`

## Global Constraints

- Níveis: **Fácil** = 2 opções (a errada a ≥ 3 semitons da certa, distância circular); **Médio** = as 4 opções de `buildChoiceQuestion`; **Difícil** = todo o conjunto de notas do foco (7 naturais ou 12) em ordem cromática.
- Ordem aleatória em todos os níveis; **a mesma nota não toca duas vezes seguidas** quando existe alternativa na fila.
- A pergunta é só o som; o braço só aparece depois de responder. O som toca sozinho ao aparecer a pergunta; botão "Ouvir de novo" sem limite.
- Ouvido **não** chama `recordAnswer` (não mexe no mapa de progresso) e grava no histórico com o nível.
- Com `soundEnabled === false`: modo Ouvido não inicia (Iniciar desabilitado + "Ligue o Som em Ajustes"); posição vinda do Progresso não inicia sessão de Ouvido sem som.
- Textos dos níveis (exatos): Fácil "2 opções, com notas bem diferentes. Para começar a reconhecer o som."; Médio "4 opções, incluindo notas vizinhas. Pede mais atenção ao ouvir."; Difícil "Sem dicas: todas as notas do seu foco são opções."
- `Settings.earLevel` padrão `'easy'`; valores inválidos viram `'easy'`; histórico de `mode: 'ear'` sem `level` válido vira `'easy'`.
- TypeScript estrito; interface em português; commits com as linhas `Co-Authored-By` / `Claude-Session` da sessão.

## Review Focus

- Fila do Ouvido com poucas posições (1, 2 ou todas na mesma nota): nunca trava nem repete posição; com só uma nota possível ela toca.
- Fácil sempre tem exatamente 2 opções distintas, inclusive só com naturais (7 notas) e para qualquer nota resposta.
- Difícil com 12 notas cabe em 390px sem estourar a largura (botões em grade).
- Trocar de nível ou de modo na tela de início nunca inicia nada; mudar o Som em Ajustes e voltar libera/bloqueia o Iniciar.
- Dados salvos antes (sem `earLevel`, histórico sem `level`) carregam sem erro.

---

### Task 1: Domínio — modo, nível, pergunta de ouvido, fila sem nota repetida, histórico com nível

**Files:**
- Modify: `src/domain/quiz.ts`, `src/domain/session.ts`, `src/ui/modeLabels.ts`
- Test: `src/domain/quiz.test.ts`, `src/domain/session.test.ts`

**Interfaces:**
- Consumes: `noteAt`, `Position`, `ALL_NOTES`, `NATURAL_NOTES`, `buildChoiceQuestion`, `ChoiceQuestion`.
- Produces:
  - `quiz.ts`: `QuizMode` inclui `'ear'`; `type EarLevel = 'easy' | 'medium' | 'hard'`; `buildEarQuestion(position, level, naturalsOnly, rng): ChoiceQuestion`.
  - `session.ts`: `buildQueue(positions, rng, first?, options?: { avoidSameNote?: boolean })`; `HistoryEntry.level?: EarLevel`; `makeHistoryEntry(mode, at, results, level?)` (só guarda `level` quando `mode === 'ear'`, padrão `'easy'`).
  - `modeLabels.ts`: modo `'ear'` ("Ouvido") em `MODES` e `MODE_DESCRIPTIONS`; `EAR_LEVELS: { level: EarLevel; label: 'Fácil' | 'Médio' | 'Difícil'; description: string }[]`; `earLevelLabel(level)`.

- [ ] **Step 1: Write the failing tests**

`quiz.test.ts` (acrescentar):

```ts
import { buildEarQuestion } from './quiz';
import { mulberry32 } from '../test-utils';
import { ALL_NOTES, NATURAL_NOTES } from './notes';
import { noteAt } from './fretboard';

describe('buildEarQuestion', () => {
  const circ = (a: number, b: number) => Math.min((a - b + 12) % 12, (b - a + 12) % 12);

  it('easy: exactly 2 distinct options, the wrong one at least 3 semitones away', () => {
    for (const naturalsOnly of [true, false]) {
      const pool = naturalsOnly ? NATURAL_NOTES : ALL_NOTES;
      for (const answer of pool) {
        const position = { string: 6, fret: (answer - 4 + 12) % 12 || 12 }; // nota `answer` na corda 6
        for (let seed = 1; seed <= 20; seed++) {
          const q = buildEarQuestion(position, 'easy', naturalsOnly, mulberry32(seed));
          expect(q.answer).toBe(noteAt(position));
          expect(q.options).toHaveLength(2);
          expect(new Set(q.options).size).toBe(2);
          expect(q.options).toContain(q.answer);
          const wrong = q.options.find((n) => n !== q.answer)!;
          expect(circ(wrong, q.answer)).toBeGreaterThanOrEqual(3);
          expect(pool).toContain(wrong);
        }
      }
    }
  });

  it('easy: the correct answer lands on both sides across seeds', () => {
    const position = { string: 6, fret: 12 };
    const sides = new Set<number>();
    for (let seed = 1; seed <= 30; seed++) {
      const q = buildEarQuestion(position, 'easy', true, mulberry32(seed));
      sides.add(q.options.indexOf(q.answer));
    }
    expect(sides).toEqual(new Set([0, 1]));
  });

  it('medium: 4 distinct options with the answer, like the multiple choice', () => {
    const q = buildEarQuestion({ string: 3, fret: 5 }, 'medium', true, mulberry32(3));
    expect(q.options).toHaveLength(4);
    expect(new Set(q.options).size).toBe(4);
    expect(q.options).toContain(q.answer);
  });

  it('hard: every note of the focus in chromatic order (7 naturals or 12)', () => {
    const position = { string: 5, fret: 3 };
    expect(buildEarQuestion(position, 'hard', true, mulberry32(1)).options).toEqual([...NATURAL_NOTES]);
    expect(buildEarQuestion(position, 'hard', false, mulberry32(1)).options).toEqual([...ALL_NOTES]);
  });
});
```

`session.test.ts` (acrescentar):

```ts
import { noteAt } from './fretboard';

describe('buildQueue avoidSameNote', () => {
  const noteOf = (p: { string: number; fret: number }) => noteAt(p);
  const positions = [
    { string: 6, fret: 12 }, { string: 6, fret: 24 }, { string: 5, fret: 7 }, { string: 4, fret: 2 },
    { string: 3, fret: 9 }, { string: 2, fret: 5 }, { string: 1, fret: 12 }, { string: 1, fret: 24 },
  ]; // várias notas repetidas (E aparece 4 vezes)

  it('keeps every position once and never puts the same note twice in a row when it can', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const queue = buildQueue(positions, mulberry32(seed), null, { avoidSameNote: true });
      expect(queue.map(positionKey).sort()).toEqual(positions.map(positionKey).sort());
      for (let i = 1; i < queue.length; i++) expect(noteOf(queue[i])).not.toBe(noteOf(queue[i - 1]));
    }
  });

  it('still returns everything when only one note is possible', () => {
    const same = [{ string: 6, fret: 12 }, { string: 6, fret: 24 }, { string: 1, fret: 12 }];
    const queue = buildQueue(same, mulberry32(1), null, { avoidSameNote: true });
    expect(queue).toHaveLength(3);
  });

  it('does not change the default behaviour', () => {
    const a = buildQueue(positions, mulberry32(5));
    const b = buildQueue(positions, mulberry32(5), null, { avoidSameNote: false });
    expect(a).toEqual(b);
  });
});

describe('history level', () => {
  it('stores the level only for ear sessions (default easy)', () => {
    const results = [{ correct: true, ms: 1000 }];
    expect(makeHistoryEntry('ear', 1, results, 'hard')?.level).toBe('hard');
    expect(makeHistoryEntry('ear', 1, results)?.level).toBe('easy');
    expect(makeHistoryEntry('flashcard', 1, results, 'hard')).not.toHaveProperty('level');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/domain`
Expected: FAIL (`buildEarQuestion`/`avoidSameNote`/`level` não existem)

- [ ] **Step 3: Write the implementation**

`quiz.ts`: `export type QuizMode = 'position-to-note' | 'note-to-position' | 'flashcard' | 'ear';` `export type EarLevel = 'easy' | 'medium' | 'hard';`

```ts
const EASY_MIN_DISTANCE = 3;
const circularDistance = (a: NoteIndex, b: NoteIndex) => Math.min((a - b + 12) % 12, (b - a + 12) % 12);

export function buildEarQuestion(
  position: Position,
  level: EarLevel,
  naturalsOnly: boolean,
  rng: () => number,
  tuning: readonly NoteIndex[] = STANDARD_TUNING,
): ChoiceQuestion {
  if (level === 'medium') return buildChoiceQuestion(position, naturalsOnly, rng, tuning);
  const answer = noteAt(position, tuning);
  const pool = naturalsOnly ? NATURAL_NOTES : ALL_NOTES;
  if (level === 'hard') return { position, answer, options: [...pool] };
  const far = pool.filter((n) => circularDistance(n, answer) >= EASY_MIN_DISTANCE);
  const wrong = far[Math.floor(rng() * far.length)];
  return { position, answer, options: shuffle([answer, wrong], rng) };
}
```

`session.ts`: importar `noteAt`, `EarLevel`; `HistoryEntry` ganha `level?: EarLevel`; `buildQueue` ganha o 4º parâmetro e, depois do embaralhamento (e do `first`), faz uma passada gulosa: para cada `i ≥ 1` cuja nota é igual à de `i-1`, troca com o primeiro `j > i` de nota diferente (se não houver, deixa). `makeHistoryEntry(mode, at, results, level)` devolve `{ mode, at, total, correct, averageMs, ...(mode === 'ear' ? { level: level ?? 'easy' } : {}) }`.

`modeLabels.ts`: adicionar `{ mode: 'ear', label: 'Ouvido' }` a `MODES`; em `MODE_DESCRIPTIONS`: `ear: 'Ouça uma nota de violão e descubra qual é. Treina o ouvido, sem ver o braço até responder.'`; `EAR_LEVELS` com os textos exatos das Global Constraints; `earLevelLabel`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/domain && npx tsc --noEmit`
Expected: PASS e tsc limpo

- [ ] **Step 5: Commit**

```bash
git add src/domain src/ui/modeLabels.ts
git commit -m "feat(domain): ear mode, levels, ear question, no-repeat note queue and level in history"
```

---

### Task 2: Armazenamento e histórico com nível

**Files:**
- Modify: `src/state/storage.ts`, `src/ui/screens/Progress.tsx`
- Test: `src/state/storage.test.ts`, `src/ui/screens/Progress.test.tsx`

**Interfaces:**
- Consumes: `EarLevel`, `QuizMode` com `'ear'` (Task 1), `earLevelLabel`, `modeLabel` (Task 1).
- Produces: `Settings.earLevel: EarLevel` (padrão `'easy'`); entradas do histórico validadas com `level`.

- [ ] **Step 1: Write the failing tests**

`storage.test.ts`:

```ts
describe('earLevel', () => {
  const load = (settings: unknown) =>
    loadData(createMemoryStorage({ [STORAGE_KEY]: JSON.stringify({ version: 1, settings, progress: {} }) })).data.settings.earLevel;
  it('defaults to easy, keeps valid levels and fixes invalid ones', () => {
    expect(DEFAULT_SETTINGS.earLevel).toBe('easy');
    expect(load({})).toBe('easy');
    expect(load({ earLevel: 'hard' })).toBe('hard');
    expect(load({ earLevel: 'impossible' })).toBe('easy');
  });
  it('accepts the ear mode', () => {
    const mode = loadData(createMemoryStorage({ [STORAGE_KEY]: JSON.stringify({ version: 1, settings: { mode: 'ear' }, progress: {} }) })).data.settings.mode;
    expect(mode).toBe('ear');
  });
});

describe('history level', () => {
  const load = (history: unknown) =>
    loadData(createMemoryStorage({ [STORAGE_KEY]: JSON.stringify({ version: 1, settings: {}, progress: {}, history }) })).data.history;
  const base = { at: 5, total: 4, correct: 3, averageMs: 1500 };
  it('keeps a valid level on ear entries and defaults missing or invalid ones to easy', () => {
    expect(load([{ ...base, mode: 'ear', level: 'hard' }])[0].level).toBe('hard');
    expect(load([{ ...base, mode: 'ear' }])[0].level).toBe('easy');
    expect(load([{ ...base, mode: 'ear', level: 'x' }])[0].level).toBe('easy');
  });
  it('drops the level on non-ear entries', () => {
    expect(load([{ ...base, mode: 'flashcard', level: 'hard' }])[0]).not.toHaveProperty('level');
  });
});
```

`Progress.test.tsx` (no `describe('history')`): um histórico com `{ mode: 'ear', level: 'hard', ... }` mostra `Ouvido · Difícil`; um com `mode: 'flashcard'` continua mostrando só `Flashcard`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/state src/ui/screens/Progress.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement**

`storage.ts`: `MODES` inclui `'ear'`; `const EAR_LEVELS: EarLevel[] = ['easy','medium','hard']`; `Settings.earLevel`; `DEFAULT_SETTINGS.earLevel = 'easy'`; `sanitizeSettings` valida; em `sanitizeHistory`, depois de validar o resto: `...(mode === 'ear' ? { level: EAR_LEVELS.includes(level) ? level : 'easy' } : {})`.
`Progress.tsx`: no item do histórico, o título passa a ser `modeLabel(entry.mode)` mais, se `entry.level`, ` · ${earLevelLabel(entry.level)}`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat(state): earLevel setting and ear level in the session history"
```

---

### Task 3: Tela do exercício e integração com a sessão

**Files:**
- Create: `src/ui/screens/EarQuiz.tsx`
- Modify: `src/ui/screens/Study.tsx`, `src/styles.css`
- Test: `src/ui/screens/EarQuiz.test.tsx`, `src/ui/screens/Study.test.tsx`

**Interfaces:**
- Consumes: `buildEarQuestion`, `EarLevel` (T1); `Settings.earLevel` (T2); `useSound`; `QuizProps` de `ChoiceQuiz`; `buildQueue(..., { avoidSameNote })`, `makeHistoryEntry(mode, at, results, level)` (T1); `EAR_LEVELS`, `MODES`, `MODE_DESCRIPTIONS` (T1).
- Produces: `EarQuiz(props: QuizProps)`.

- [ ] **Step 1: Write the failing tests**

`EarQuiz.test.tsx` (renderiza `EarQuiz` dentro de `AppProvider` + `SoundProvider` com player falso, `position {string:6,fret:12}` = E3 (MIDI 52), `settings.filter` naturais, notação `'cifra'`):

- toca o som da posição ao aparecer (`player.play` chamado uma vez com 52) e **não** mostra o braço antes de responder (`queryByRole('group', { name: 'Braço da guitarra' })` ausente);
- "Ouvir de novo" (`getByRole('button', { name: 'Ouvir de novo' })`) toca de novo (2 chamadas);
- Fácil mostra 2 opções, Médio 4, Difícil 7 (naturais) — contando os botões `.option`;
- acertar chama `onAnswer(true)`, mostra "Correto!" e o braço aparece; errar chama `onAnswer(false)`, mostra o botão "Próxima" e o braço aparece; responder **não** toca de novo (continua 1 chamada).

`Study.test.tsx` (acrescentar, usando o `setup` com player falso já existente):

- barra de modos tem o botão **Ouvido**; na tela de início do Ouvido aparecem os 3 níveis (`aria-pressed` no atual, padrão Fácil) e o descritivo do nível muda ao tocar em Médio e Difícil (textos exatos das Global Constraints);
- Ouvido com som ligado: Iniciar começa a sessão, `player.play` é chamado ao aparecer a primeira pergunta, e **responder não grava progresso** (`readSaved(storage).progress` continua `{}`) mas ao finalizar a sessão o histórico tem `mode: 'ear'` e o `level` escolhido;
- Ouvido com `soundEnabled: false`: aparece "Ligue o Som em Ajustes" e o Iniciar está desabilitado; uma posição forçada nesse estado **não** inicia a sessão (continua na tela de início);
- as perguntas de uma sessão de Ouvido não repetem a mesma nota em sequência (filtro de 6 cordas casas 1–5, 20 execuções com uma sequência de respostas certas e leitura das notas tocadas via `player.play`: nenhuma chamada seguida com o mesmo `% 12`).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/ui/screens/EarQuiz.test.tsx src/ui/screens/Study.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement**

`EarQuiz.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { useSound } from '../../audio/SoundProvider';
import { noteLabel, type NoteIndex } from '../../domain/notes';
import { buildEarQuestion } from '../../domain/quiz';
import { Fretboard } from '../Fretboard';
import { stringLabels } from '../stringLabels';
import { useAutoAdvance } from '../useAutoAdvance';
import type { QuizProps } from './ChoiceQuiz';
import { windowFor } from './window';

export function EarQuiz({ position, settings, onAnswer, onNext }: QuizProps) {
  const { filter, notation, leftHanded, earLevel } = settings;
  const sound = useSound();
  const question = useMemo(
    () => buildEarQuestion(position, earLevel, filter.naturalsOnly, Math.random),
    [position, earLevel, filter.naturalsOnly],
  );
  const [picked, setPicked] = useState<NoteIndex | null>(null);
  const answered = picked !== null;
  const correct = answered && picked === question.answer;
  useAutoAdvance(correct, onNext);

  // O som é a pergunta: toca sozinho quando ela aparece.
  useEffect(() => {
    sound.playPosition(position);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function choose(note: NoteIndex) {
    if (answered) return;
    setPicked(note);
    onAnswer(note === question.answer);
  }

  const { fretMin, fretMax } = windowFor(filter, position);
  return (
    <div className="quiz">
      <p className="prompt">Qual nota você ouviu?</p>
      <button type="button" className="ear-play" onClick={() => sound.playPosition(position)}>
        <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false">
          <path d="M3 9v6h4l5 4V5L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z" fill="currentColor" />
        </svg>
        Ouvir de novo
      </button>
      <div className={`options${question.options.length > 4 ? ' options--many' : ''}`}>
        {question.options.map((note) => (
          <button
            key={note}
            type="button"
            disabled={answered}
            className={[
              'option',
              answered && note === question.answer ? 'option--correct' : '',
              answered && note === picked && !correct ? 'option--wrong' : '',
            ].join(' ')}
            onClick={() => choose(note)}
          >
            {noteLabel(note, notation)}
          </button>
        ))}
      </div>
      {answered && (
        <>
          <Fretboard
            fretMin={fretMin}
            fretMax={fretMax}
            leftHanded={leftHanded}
            scrollToFret={position.fret}
            stringLabels={stringLabels()}
            marks={[
              {
                position,
                kind: correct ? 'correct' : 'wrong',
                label: noteLabel(question.answer, notation),
              },
            ]}
          />
          <div className="feedback quiz-actions">
            <p role="status" className={correct ? undefined : 'sr-only'}>
              {correct ? 'Correto!' : `Errado. A resposta certa é ${noteLabel(question.answer, notation)}.`}
            </p>
            {!correct && (
              <button type="button" className="primary" onClick={onNext}>
                Próxima
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
```

`Study.tsx`:
- `begin()`: `buildQueue(candidates, Math.random, null, { avoidSameNote: settings.mode === 'ear' })`; `canStart = candidates.length > 0 && !(settings.mode === 'ear' && !settings.soundEnabled)` (usar em `begin` e no `disabled` do Iniciar).
- `handleAnswer`: `if (settings.mode !== 'ear') recordAnswer(position, correct)`.
- `finish`: `makeHistoryEntry(settings.mode, Date.now(), done, settings.earLevel)`.
- Estado inicial: `forced && !(settings.mode === 'ear' && !settings.soundEnabled) ? 'running' : 'idle'`; a fila forçada só é montada quando a fase inicial é `'running'` (e o `useEffect` de `prepare` idem).
- Tela de início: quando `settings.mode === 'ear'`, depois da descrição do modo, o seletor de nível (grupo "Nível", três botões com `aria-pressed`, `onClick={() => updateSettings({ earLevel: level })}`) e o descritivo do nível; se `!settings.soundEnabled`, `<p className="empty">Ligue o Som em Ajustes para treinar de ouvido.</p>`.
- Render da pergunta: o ramo `settings.mode === 'ear'` renderiza `<EarQuiz key={index} position={position} {...quizProps} />`.
- A barra de modos (`MODES`) já traz o botão novo.

`styles.css`:

```css
.ear-play { width: 100%; min-height: 96px; margin: 8px 0; display: flex; align-items: center; justify-content: center; gap: 12px; font-size: 1.125rem; font-weight: 700; border-radius: 16px; border: 1px solid var(--accent); background: var(--surface); color: var(--accent); }
.options--many { grid-template-columns: repeat(3, 1fr); }
.options--many .option { min-height: 48px; font-size: 0.9375rem; padding: 0 4px; }
.level-bar { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 12px 0 4px; }
.level-bar button { min-height: 44px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); }
.level-bar button[aria-pressed='true'] { background: var(--accent); border-color: var(--accent); color: #1a1408; font-weight: 700; }
```

(O seletor de nível usa `className="level-bar"` e `role="group"` com `aria-label="Nível"`.)

- [ ] **Step 4: Run the whole suite, types and build**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: tudo passa

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ui): Ouvido exercise with three levels, level picker and sound-required start"
```

---

### Task 4: Verificação no navegador

**Files:** nenhum.

- [ ] **Step 1:** `npm run build`, `npx vite preview --port 4173`, abrir em iframe de 390px.
- [ ] **Step 2:** Conferir: aba Ouvido na barra de modos; seletor de nível com descritivos; Iniciar começa sem mostrar o braço; os MP3 da fila são pedidos; as opções por nível (2, 4, 7 e, com acidentais, 12 sem estourar a largura de 390px: `scrollWidth <= clientWidth`); após responder o braço aparece; com Som desligado o Iniciar fica desabilitado com o aviso.
- [ ] **Step 3:** Parar o preview e fechar a aba.
