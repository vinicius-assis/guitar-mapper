# Guitar Mapper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web app (PWA) responsivo para memorizar as notas do braço da guitarra (casas 0–24, 6 cordas) com quiz de múltipla escolha, toque no braço e flashcard, com repetição espaçada.

**Architecture:** `domain/` em TypeScript puro (notas, afinação, braço, quiz, repetição espaçada) sem dependência de React. `state/` persiste configurações e progresso no `localStorage` e expõe um contexto React. `ui/` tem o componente SVG `Fretboard` e 4 telas (Estudar, Progresso, Foco, Ajustes) sob uma barra de abas inferior.

**Tech Stack:** React 18+, TypeScript, Vite, Vitest + Testing Library (jsdom), vite-plugin-pwa, `@vite-pwa/assets-generator`.

**Spec:** `docs/superpowers/specs/2026-10-24-guitar-mapper-design.md`

## Global Constraints

- Braço: casas **0–24**, cordas **1–6**, **150 posições**. Cada posição tem progresso independente.
- Afinação padrão: E A D G B E. Corda 1 = E agudo, corda 6 = E grave.
- Notação: `cifra` (C D E), `solfejo` (Dó Ré Mi) ou `ambos`, trocável nos Ajustes.
- Notas naturais primeiro; acidentais são um nível opcional (`naturalsOnly`).
- Chave do `localStorage`: `guitar-mapper:v1`. Cópia de segurança de dado inválido em `guitar-mapper:v1:backup`.
- Repetição espaçada: **5 caixas**; acertar sobe uma caixa, errar volta para a caixa 1.
- Múltipla escolha: **4 opções**, exatamente uma correta, sem duplicatas.
- Abas inferiores, nesta ordem e com estes nomes: **Estudar · Progresso · Foco · Ajustes**.
- Layout pensado primeiro para **390px** (iPhone 13 Pro); alvos de toque **≥ 44px**; respeitar `env(safe-area-inset-*)`.
- Sem backend, sem login. Sem push para o GitHub sem o usuário pedir.
- Todo commit usa os trailers abaixo (a flag `--trailer` do git; cada comando de commit deste plano já os inclui):
  - `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`
  - `Claude-Session: https://claude.ai/code/session_01YSPS7fXqt2sVKM4uaawqbi`
- Textos da interface em português (pt-BR).

## Review Focus

Entradas e condições que a spec implica, mas que nenhum requisito testa diretamente. Cada uma tem seu teste na task indicada.

1. **Filtro sem posições** (nenhuma corda marcada, ou só acidentais num trecho sem naturais): o app não pode quebrar; Estudar mostra a mensagem do que falta. (Tasks 3 e 9)
2. **`localStorage` lançando exceção** (Safari em modo privado): o app segue funcionando em memória e avisa. (Tasks 6, 7 e 10)
3. **Dado salvo corrompido ou de versão desconhecida**: começa limpo, guarda cópia, não trava. (Task 6)
4. **Uma única posição candidata**: o sorteio não pode entrar em loop ao evitar repetir a última, e a múltipla escolha com só naturais ainda precisa de 4 opções distintas. (Tasks 4 e 5)
5. **Mesma nota repetida na mesma corda** (casas 0, 12 e 24) e **modo canhoto**: qualquer posição correta vale no modo nota → posição, e o espelhamento do braço não pode trocar a posição tocada. (Tasks 5 e 8)

---

## File Structure

```
package.json, tsconfig.json, vite.config.ts, index.html, .gitignore
pwa-assets.config.ts, public/icon.svg                      (Task 11)
src/
  main.tsx, App.tsx, styles.css, test-setup.ts, test-utils.ts
  domain/
    notes.ts        # NoteIndex, Notation, nomes, naturais, noteLabel
    tuning.ts       # STANDARD_TUNING
    fretboard.ts    # Position, Filter, noteAt, positionsInFilter, ...
    scheduler.ts    # caixas Leitner, applyAnswer, pickNext, masteryOf
    quiz.ts         # perguntas de múltipla escolha e de "encontrar a nota"
  state/
    storage.ts      # Settings/AppData, loadData/saveData, sanitização
    AppState.tsx    # AppProvider + useAppState
  ui/
    Fretboard.tsx   # braço SVG
    useAutoAdvance.ts
    screens/
      window.ts, Study.tsx, ChoiceQuiz.tsx, FindQuiz.tsx, Flashcard.tsx,
      Focus.tsx, Progress.tsx, Settings.tsx
```

Cada arquivo de `src/` tem um `.test.ts(x)` ao lado.

---

### Task 1: Scaffold do projeto

**Files:**
- Create: `package.json` (via npm), `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`
- Create: `src/main.tsx`, `src/App.tsx`, `src/test-setup.ts`, `src/App.test.tsx`

**Interfaces:**
- Produces: scripts `npm test` (vitest run), `npm run dev`, `npm run build`; ambiente de teste jsdom com `@testing-library/jest-dom`.

- [ ] **Step 1: Instalar dependências**

```bash
cd /home/vinicius/estudos/guitar-mapper
npm init -y
npm pkg set name=guitar-mapper private=true type=module
npm pkg delete main
npm pkg set scripts.dev=vite scripts.build="tsc --noEmit && vite build" scripts.preview="vite preview" scripts.test="vitest run" scripts.test:watch=vitest
npm install react react-dom
npm install -D vite @vitejs/plugin-react typescript vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @types/react @types/react-dom
```

- [ ] **Step 2: Criar arquivos de configuração**

`.gitignore`:
```
node_modules
dist
dev-dist
*.local
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["vitest/globals"]
  },
  "include": ["src", "vite.config.ts", "pwa-assets.config.ts"]
}
```

`vite.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
});
```

`index.html`:
```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#14110f" />
    <title>Guitar Mapper</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/test-setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 3: Escrever o teste que falha**

`src/App.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders the app title', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Guitar Mapper' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL (`Failed to resolve import "./App"`).

- [ ] **Step 5: Implementação mínima**

`src/App.tsx`:
```tsx
export function App() {
  return <h1>Guitar Mapper</h1>;
}
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 6: Rodar testes e typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: 1 teste passa, sem erros de tipo.

- [ ] **Step 7: Commit**

```bash
git add .gitignore package.json package-lock.json tsconfig.json vite.config.ts index.html src
git commit -m "chore: scaffold Vite + React + TS + Vitest" \
  --trailer "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" \
  --trailer "Claude-Session: https://claude.ai/code/session_01YSPS7fXqt2sVKM4uaawqbi"
```

---

### Task 2: Notas e afinação

**Files:**
- Create: `src/domain/notes.ts`, `src/domain/tuning.ts`
- Test: `src/domain/notes.test.ts`

**Interfaces:**
- Produces:
  - `type NoteIndex = number` (0–11, 0 = C)
  - `type Notation = 'cifra' | 'solfejo' | 'ambos'`
  - `ALL_NOTES: readonly NoteIndex[]`, `NATURAL_NOTES: readonly NoteIndex[]`
  - `isNatural(note: NoteIndex): boolean`
  - `noteLabel(note: NoteIndex, notation: Notation): string` (`'ambos'` → `'C · Dó'`)
  - `STANDARD_TUNING: readonly NoteIndex[]` (índice 0 = corda 1)

- [ ] **Step 1: Escrever o teste que falha**

`src/domain/notes.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { ALL_NOTES, NATURAL_NOTES, isNatural, noteLabel } from './notes';
import { STANDARD_TUNING } from './tuning';

describe('notes', () => {
  it('has 12 notes and 7 naturals', () => {
    expect(ALL_NOTES).toHaveLength(12);
    expect(NATURAL_NOTES).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });

  it('knows which notes are natural', () => {
    expect(isNatural(0)).toBe(true);
    expect(isNatural(1)).toBe(false);
    expect(isNatural(11)).toBe(true);
  });

  it('formats labels in each notation', () => {
    expect(noteLabel(0, 'cifra')).toBe('C');
    expect(noteLabel(0, 'solfejo')).toBe('Dó');
    expect(noteLabel(0, 'ambos')).toBe('C · Dó');
    expect(noteLabel(1, 'cifra')).toBe('C#');
    expect(noteLabel(7, 'solfejo')).toBe('Sol');
    expect(noteLabel(11, 'ambos')).toBe('B · Si');
  });
});

describe('tuning', () => {
  it('is E A D G B E, string 1 = high E', () => {
    expect(STANDARD_TUNING.map((n) => noteLabel(n, 'cifra'))).toEqual([
      'E', 'B', 'G', 'D', 'A', 'E',
    ]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/domain/notes.test.ts`
Expected: FAIL (módulos não encontrados).

- [ ] **Step 3: Implementação**

`src/domain/notes.ts`:
```ts
export type NoteIndex = number;
export type Notation = 'cifra' | 'solfejo' | 'ambos';

const CIFRA = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const SOLFEJO = ['Dó', 'Dó#', 'Ré', 'Ré#', 'Mi', 'Fá', 'Fá#', 'Sol', 'Sol#', 'Lá', 'Lá#', 'Si'];
const NATURALS = new Set<NoteIndex>([0, 2, 4, 5, 7, 9, 11]);

export const ALL_NOTES: readonly NoteIndex[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
export const NATURAL_NOTES: readonly NoteIndex[] = ALL_NOTES.filter((n) => NATURALS.has(n));

export function isNatural(note: NoteIndex): boolean {
  return NATURALS.has(note);
}

export function noteLabel(note: NoteIndex, notation: Notation): string {
  switch (notation) {
    case 'cifra':
      return CIFRA[note];
    case 'solfejo':
      return SOLFEJO[note];
    case 'ambos':
      return `${CIFRA[note]} · ${SOLFEJO[note]}`;
  }
}
```

`src/domain/tuning.ts`:
```ts
import type { NoteIndex } from './notes';

/** Notas das cordas soltas. Índice 0 = corda 1 (E agudo) … índice 5 = corda 6 (E grave). */
export const STANDARD_TUNING: readonly NoteIndex[] = [4, 11, 7, 2, 9, 4];
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/domain/notes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/notes.ts src/domain/tuning.ts src/domain/notes.test.ts
git commit -m "feat(domain): notes, notation labels and standard tuning" \
  --trailer "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" \
  --trailer "Claude-Session: https://claude.ai/code/session_01YSPS7fXqt2sVKM4uaawqbi"
```

---

### Task 3: Braço (posições e filtro)

**Files:**
- Create: `src/domain/fretboard.ts`
- Test: `src/domain/fretboard.test.ts`

**Interfaces:**
- Consumes: `NoteIndex`, `isNatural` (Task 2); `STANDARD_TUNING` (Task 2).
- Produces:
  - `STRING_COUNT = 6`, `MAX_FRET = 24`
  - `interface Position { string: number; fret: number }` (string 1–6, fret 0–24)
  - `interface Filter { strings: number[]; fretMin: number; fretMax: number; naturalsOnly: boolean }`
  - `noteAt(pos: Position, tuning?: readonly NoteIndex[]): NoteIndex`
  - `positionKey(pos: Position): string` → `"6-0"`
  - `parsePositionKey(key: string): Position | null`
  - `allPositions(): Position[]` (150)
  - `positionsInFilter(filter: Filter, tuning?): Position[]`
  - `positionsOfNote(note: NoteIndex, filter: Filter, tuning?): Position[]`

- [ ] **Step 1: Escrever o teste que falha**

`src/domain/fretboard.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import {
  MAX_FRET,
  allPositions,
  noteAt,
  parsePositionKey,
  positionKey,
  positionsInFilter,
  positionsOfNote,
  type Filter,
} from './fretboard';

const filter = (over: Partial<Filter> = {}): Filter => ({
  strings: [1, 2, 3, 4, 5, 6],
  fretMin: 0,
  fretMax: MAX_FRET,
  naturalsOnly: false,
  ...over,
});

describe('noteAt', () => {
  it('matches known positions', () => {
    expect(noteAt({ string: 6, fret: 0 })).toBe(4); // E
    expect(noteAt({ string: 5, fret: 3 })).toBe(0); // C
    expect(noteAt({ string: 2, fret: 1 })).toBe(0); // C
    expect(noteAt({ string: 4, fret: 0 })).toBe(2); // D
  });

  it('repeats the open string at fret 12 and 24 on every string', () => {
    for (let s = 1; s <= 6; s++) {
      const open = noteAt({ string: s, fret: 0 });
      expect(noteAt({ string: s, fret: 12 })).toBe(open);
      expect(noteAt({ string: s, fret: 24 })).toBe(open);
    }
  });
});

describe('positions', () => {
  it('has 150 unique positions', () => {
    const all = allPositions();
    expect(all).toHaveLength(150);
    expect(new Set(all.map(positionKey)).size).toBe(150);
  });

  it('round-trips keys and rejects invalid ones', () => {
    expect(parsePositionKey('3-12')).toEqual({ string: 3, fret: 12 });
    expect(parsePositionKey('7-1')).toBeNull();
    expect(parsePositionKey('1-25')).toBeNull();
    expect(parsePositionKey('abc')).toBeNull();
  });
});

describe('positionsInFilter', () => {
  it('respects strings and fret range, naturals only', () => {
    // string 6, frets 0..5 → E F F# G G# A → naturals at frets 0,1,3,5
    const result = positionsInFilter(filter({ strings: [6], fretMax: 5, naturalsOnly: true }));
    expect(result.map((p) => p.fret)).toEqual([0, 1, 3, 5]);
  });

  it('returns nothing when no string is selected', () => {
    expect(positionsInFilter(filter({ strings: [] }))).toEqual([]);
  });

  it('returns nothing when naturals-only leaves no natural note (A# on string 5 fret 1)', () => {
    const f = filter({ strings: [5], fretMin: 1, fretMax: 1, naturalsOnly: true });
    expect(positionsInFilter(f)).toEqual([]);
  });

  it('ignores invalid strings and clamps the fret range', () => {
    const f = filter({ strings: [0, 7, 6], fretMin: -3, fretMax: 99 });
    expect(positionsInFilter(f)).toHaveLength(25);
  });
});

describe('positionsOfNote', () => {
  it('finds the repeated E on the low string at frets 0, 12 and 24', () => {
    const result = positionsOfNote(4, filter({ strings: [6] }));
    expect(result.map((p) => p.fret)).toEqual([0, 12, 24]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/domain/fretboard.test.ts`
Expected: FAIL (módulo não encontrado).

- [ ] **Step 3: Implementação**

`src/domain/fretboard.ts`:
```ts
import { isNatural, type NoteIndex } from './notes';
import { STANDARD_TUNING } from './tuning';

export const STRING_COUNT = 6;
export const MAX_FRET = 24;

export interface Position {
  /** 1 (E agudo) … 6 (E grave) */
  string: number;
  /** 0 (solta) … 24 */
  fret: number;
}

export interface Filter {
  strings: number[];
  fretMin: number;
  fretMax: number;
  naturalsOnly: boolean;
}

export function noteAt(pos: Position, tuning: readonly NoteIndex[] = STANDARD_TUNING): NoteIndex {
  return (tuning[pos.string - 1] + pos.fret) % 12;
}

export function positionKey(pos: Position): string {
  return `${pos.string}-${pos.fret}`;
}

export function parsePositionKey(key: string): Position | null {
  const match = /^([1-6])-(\d{1,2})$/.exec(key);
  if (!match) return null;
  const fret = Number(match[2]);
  if (fret > MAX_FRET) return null;
  return { string: Number(match[1]), fret };
}

export function allPositions(): Position[] {
  const out: Position[] = [];
  for (let string = 1; string <= STRING_COUNT; string++) {
    for (let fret = 0; fret <= MAX_FRET; fret++) out.push({ string, fret });
  }
  return out;
}

export function positionsInFilter(
  filter: Filter,
  tuning: readonly NoteIndex[] = STANDARD_TUNING,
): Position[] {
  const strings = [...new Set(filter.strings)]
    .filter((s) => Number.isInteger(s) && s >= 1 && s <= STRING_COUNT)
    .sort((a, b) => a - b);
  const fretMin = Math.max(0, filter.fretMin);
  const fretMax = Math.min(MAX_FRET, filter.fretMax);
  const out: Position[] = [];
  for (const string of strings) {
    for (let fret = fretMin; fret <= fretMax; fret++) {
      const pos = { string, fret };
      if (filter.naturalsOnly && !isNatural(noteAt(pos, tuning))) continue;
      out.push(pos);
    }
  }
  return out;
}

export function positionsOfNote(
  note: NoteIndex,
  filter: Filter,
  tuning: readonly NoteIndex[] = STANDARD_TUNING,
): Position[] {
  return positionsInFilter(filter, tuning).filter((p) => noteAt(p, tuning) === note);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/domain/fretboard.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/fretboard.ts src/domain/fretboard.test.ts
git commit -m "feat(domain): fretboard positions, keys and filters" \
  --trailer "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" \
  --trailer "Claude-Session: https://claude.ai/code/session_01YSPS7fXqt2sVKM4uaawqbi"
```

---

### Task 4: Repetição espaçada

**Files:**
- Create: `src/domain/scheduler.ts`, `src/test-utils.ts`
- Test: `src/domain/scheduler.test.ts`

**Interfaces:**
- Consumes: `Position`, `positionKey` (Task 3).
- Produces:
  - `type Box = 1 | 2 | 3 | 4 | 5`
  - `interface PositionProgress { box: Box; correct: number; wrong: number; lastReview: number; nextReview: number }`
  - `type ProgressMap = Record<string, PositionProgress>`
  - `type Mastery = 'unseen' | 'wrong' | 'learning' | 'mastered'`
  - `BOX_INTERVALS_MS: Record<Box, number>`
  - `applyAnswer(prev: PositionProgress | undefined, correct: boolean, now: number): PositionProgress`
  - `masteryOf(p: PositionProgress | undefined): Mastery`
  - `pickNext(candidates: Position[], progress: ProgressMap, now: number, rng: () => number, avoidKey?: string): Position` (lança erro se `candidates` vazio)
  - `test-utils.ts`: `mulberry32(seed): () => number`, `sequence(...values): () => number`

- [ ] **Step 1: Escrever os helpers e o teste que falha**

`src/test-utils.ts`:
```ts
/** RNG determinístico para testes. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** RNG que devolve os valores dados em ordem (repete o último ao acabar). */
export function sequence(...values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}
```

`src/domain/scheduler.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { sequence, mulberry32 } from '../test-utils';
import type { Position } from './fretboard';
import {
  BOX_INTERVALS_MS,
  applyAnswer,
  masteryOf,
  pickNext,
  type ProgressMap,
  type PositionProgress,
} from './scheduler';

const NOW = 1_000_000;
const pos = (string: number, fret: number): Position => ({ string, fret });
const progress = (over: Partial<PositionProgress>): PositionProgress => ({
  box: 1,
  correct: 0,
  wrong: 0,
  lastReview: 0,
  nextReview: 0,
  ...over,
});

describe('applyAnswer', () => {
  it('moves an unseen position to box 2 on a correct answer', () => {
    const next = applyAnswer(undefined, true, NOW);
    expect(next).toEqual({
      box: 2,
      correct: 1,
      wrong: 0,
      lastReview: NOW,
      nextReview: NOW + BOX_INTERVALS_MS[2],
    });
  });

  it('keeps an unseen position in box 1 on a wrong answer and makes it due now', () => {
    const next = applyAnswer(undefined, false, NOW);
    expect(next.box).toBe(1);
    expect(next.wrong).toBe(1);
    expect(next.nextReview).toBe(NOW);
  });

  it('caps at box 5', () => {
    expect(applyAnswer(progress({ box: 5 }), true, NOW).box).toBe(5);
  });

  it('drops back to box 1 on a wrong answer and accumulates counters', () => {
    const next = applyAnswer(progress({ box: 4, correct: 3, wrong: 1 }), false, NOW);
    expect(next.box).toBe(1);
    expect(next.correct).toBe(3);
    expect(next.wrong).toBe(2);
  });
});

describe('masteryOf', () => {
  it('maps boxes to mastery levels', () => {
    expect(masteryOf(undefined)).toBe('unseen');
    expect(masteryOf(progress({ box: 1 }))).toBe('wrong');
    expect(masteryOf(progress({ box: 2 }))).toBe('learning');
    expect(masteryOf(progress({ box: 3 }))).toBe('learning');
    expect(masteryOf(progress({ box: 4 }))).toBe('mastered');
    expect(masteryOf(progress({ box: 5 }))).toBe('mastered');
  });
});

describe('pickNext', () => {
  const due = pos(1, 0);
  const fresh = pos(1, 1);
  const rest = pos(1, 2);
  const candidates = [due, fresh, rest];
  const map: ProgressMap = {
    '1-0': progress({ box: 1, nextReview: NOW - 1 }),
    '1-2': progress({ box: 4, nextReview: NOW + 1_000_000 }),
  };

  it('throws when there are no candidates', () => {
    expect(() => pickNext([], {}, NOW, Math.random)).toThrow();
  });

  it('returns the only candidate even if it should be avoided', () => {
    expect(pickNext([due], map, NOW, Math.random, '1-0')).toBe(due);
  });

  it('never returns the avoided key when there is another candidate', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 200; i++) {
      expect(pickNext([due, fresh], map, NOW, rng, '1-0')).toBe(fresh);
    }
  });

  it('picks from due / new / rest buckets by weight 0.5 / 0.3 / 0.2', () => {
    expect(pickNext(candidates, map, NOW, sequence(0, 0))).toBe(due);
    expect(pickNext(candidates, map, NOW, sequence(0.6, 0))).toBe(fresh);
    expect(pickNext(candidates, map, NOW, sequence(0.9, 0))).toBe(rest);
  });

  it('works when only one bucket has items', () => {
    expect(pickNext([fresh], {}, NOW, sequence(0.99, 0.99))).toBe(fresh);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/domain/scheduler.test.ts`
Expected: FAIL (módulo não encontrado).

- [ ] **Step 3: Implementação**

`src/domain/scheduler.ts`:
```ts
import { positionKey, type Position } from './fretboard';

export type Box = 1 | 2 | 3 | 4 | 5;
export type Mastery = 'unseen' | 'wrong' | 'learning' | 'mastered';

export interface PositionProgress {
  box: Box;
  correct: number;
  wrong: number;
  lastReview: number;
  nextReview: number;
}

export type ProgressMap = Record<string, PositionProgress>;

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/** Caixa 1 vence imediatamente: o erro volta logo (mas nunca em sequência, ver `pickNext`). */
export const BOX_INTERVALS_MS: Record<Box, number> = {
  1: 0,
  2: 10 * MINUTE,
  3: DAY,
  4: 3 * DAY,
  5: 7 * DAY,
};

export function applyAnswer(
  prev: PositionProgress | undefined,
  correct: boolean,
  now: number,
): PositionProgress {
  const box = prev?.box ?? 1;
  const nextBox = (correct ? Math.min(5, box + 1) : 1) as Box;
  return {
    box: nextBox,
    correct: (prev?.correct ?? 0) + (correct ? 1 : 0),
    wrong: (prev?.wrong ?? 0) + (correct ? 0 : 1),
    lastReview: now,
    nextReview: now + BOX_INTERVALS_MS[nextBox],
  };
}

export function masteryOf(p: PositionProgress | undefined): Mastery {
  if (!p) return 'unseen';
  if (p.box === 1) return 'wrong';
  return p.box >= 4 ? 'mastered' : 'learning';
}

export function pickNext(
  candidates: Position[],
  progress: ProgressMap,
  now: number,
  rng: () => number,
  avoidKey?: string,
): Position {
  if (candidates.length === 0) throw new Error('pickNext: no candidates');

  const pool =
    candidates.length > 1 && avoidKey
      ? candidates.filter((p) => positionKey(p) !== avoidKey)
      : candidates;

  const due: Position[] = [];
  const fresh: Position[] = [];
  const rest: Position[] = [];
  for (const p of pool) {
    const entry = progress[positionKey(p)];
    if (!entry) fresh.push(p);
    else if (entry.nextReview <= now) due.push(p);
    else rest.push(p);
  }

  const buckets = [
    { items: due, weight: 0.5 },
    { items: fresh, weight: 0.3 },
    { items: rest, weight: 0.2 },
  ].filter((b) => b.items.length > 0);

  const total = buckets.reduce((sum, b) => sum + b.weight, 0);
  let r = rng() * total;
  let chosen = buckets[buckets.length - 1];
  for (const bucket of buckets) {
    if (r < bucket.weight) {
      chosen = bucket;
      break;
    }
    r -= bucket.weight;
  }
  const index = Math.min(chosen.items.length - 1, Math.floor(rng() * chosen.items.length));
  return chosen.items[index];
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/domain/scheduler.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/scheduler.ts src/domain/scheduler.test.ts src/test-utils.ts
git commit -m "feat(domain): Leitner-style scheduler with weighted picking" \
  --trailer "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" \
  --trailer "Claude-Session: https://claude.ai/code/session_01YSPS7fXqt2sVKM4uaawqbi"
```

---

### Task 5: Perguntas do quiz

**Files:**
- Create: `src/domain/quiz.ts`
- Test: `src/domain/quiz.test.ts`

**Interfaces:**
- Consumes: `Position`, `Filter`, `noteAt`, `positionsInFilter`, `allPositions`, `STRING_COUNT`, `MAX_FRET` (Task 3); `ALL_NOTES`, `NATURAL_NOTES`, `isNatural`, `NoteIndex` (Task 2); `mulberry32` (Task 4).
- Produces:
  - `type QuizMode = 'position-to-note' | 'note-to-position' | 'flashcard'`
  - `OPTION_COUNT = 4`
  - `interface ChoiceQuestion { position: Position; answer: NoteIndex; options: NoteIndex[] }`
  - `buildChoiceQuestion(position: Position, naturalsOnly: boolean, rng: () => number, tuning?): ChoiceQuestion`
  - `interface FindQuestion { string: number; target: NoteIndex; validPositions: Position[] }`
  - `buildFindQuestion(position: Position, filter: Filter, tuning?): FindQuestion`
  - `isCorrectFind(q: FindQuestion, tapped: Position): boolean`

- [ ] **Step 1: Escrever o teste que falha**

`src/domain/quiz.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../test-utils';
import { allPositions, noteAt, type Filter } from './fretboard';
import { isNatural } from './notes';
import { OPTION_COUNT, buildChoiceQuestion, buildFindQuestion, isCorrectFind } from './quiz';

describe('buildChoiceQuestion', () => {
  it('always has 4 distinct options with exactly one correct (all notes)', () => {
    const rng = mulberry32(1);
    for (const position of allPositions()) {
      const q = buildChoiceQuestion(position, false, rng);
      expect(q.options).toHaveLength(OPTION_COUNT);
      expect(new Set(q.options).size).toBe(OPTION_COUNT);
      expect(q.options.filter((o) => o === q.answer)).toHaveLength(1);
      expect(q.answer).toBe(noteAt(position));
    }
  });

  it('only offers natural notes in naturals-only mode', () => {
    const rng = mulberry32(2);
    for (const position of allPositions().filter((p) => isNatural(noteAt(p)))) {
      const q = buildChoiceQuestion(position, true, rng);
      expect(q.options).toHaveLength(OPTION_COUNT);
      expect(new Set(q.options).size).toBe(OPTION_COUNT);
      expect(q.options.every(isNatural)).toBe(true);
    }
  });

  it('prefers neighbouring notes as distractors', () => {
    // string 3 fret 5 = C; neighbours: fret 4 = B, fret 6 = C#, fret 3 = A#
    const q = buildChoiceQuestion({ string: 3, fret: 5 }, false, mulberry32(3));
    expect(q.options).toEqual(expect.arrayContaining([0, 11, 1, 10]));
  });
});

describe('buildFindQuestion', () => {
  const filter: Filter = { strings: [6], fretMin: 0, fretMax: 24, naturalsOnly: true };

  it('accepts every position of the note on that string (0, 12 and 24)', () => {
    const q = buildFindQuestion({ string: 6, fret: 0 }, filter);
    expect(q.string).toBe(6);
    expect(q.target).toBe(4);
    expect(q.validPositions.map((p) => p.fret)).toEqual([0, 12, 24]);
    expect(isCorrectFind(q, { string: 6, fret: 12 })).toBe(true);
    expect(isCorrectFind(q, { string: 6, fret: 24 })).toBe(true);
  });

  it('rejects other frets and the same note on another string', () => {
    const q = buildFindQuestion({ string: 6, fret: 0 }, filter);
    expect(isCorrectFind(q, { string: 6, fret: 5 })).toBe(false);
    expect(isCorrectFind(q, { string: 5, fret: 7 })).toBe(false); // também é E, outra corda
  });

  it('still accepts the asked position when it lies outside the filter window', () => {
    const narrow: Filter = { strings: [6], fretMin: 0, fretMax: 5, naturalsOnly: true };
    const q = buildFindQuestion({ string: 6, fret: 12 }, narrow);
    expect(isCorrectFind(q, { string: 6, fret: 12 })).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/domain/quiz.test.ts`
Expected: FAIL (módulo não encontrado).

- [ ] **Step 3: Implementação**

`src/domain/quiz.ts`:
```ts
import {
  MAX_FRET,
  STRING_COUNT,
  noteAt,
  positionsInFilter,
  type Filter,
  type Position,
} from './fretboard';
import { ALL_NOTES, NATURAL_NOTES, type NoteIndex } from './notes';
import { STANDARD_TUNING } from './tuning';

export type QuizMode = 'position-to-note' | 'note-to-position' | 'flashcard';

export const OPTION_COUNT = 4;

export interface ChoiceQuestion {
  position: Position;
  answer: NoteIndex;
  options: NoteIndex[];
}

export interface FindQuestion {
  string: number;
  target: NoteIndex;
  validPositions: Position[];
}

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function buildChoiceQuestion(
  position: Position,
  naturalsOnly: boolean,
  rng: () => number,
  tuning: readonly NoteIndex[] = STANDARD_TUNING,
): ChoiceQuestion {
  const answer = noteAt(position, tuning);
  const allowed = naturalsOnly ? NATURAL_NOTES : ALL_NOTES;
  const { string, fret } = position;

  const neighbours: Position[] = [
    { string, fret: fret - 1 },
    { string, fret: fret + 1 },
    { string, fret: fret - 2 },
    { string, fret: fret + 2 },
    { string: string - 1, fret },
    { string: string + 1, fret },
  ].filter((p) => p.string >= 1 && p.string <= STRING_COUNT && p.fret >= 0 && p.fret <= MAX_FRET);

  const distractors: NoteIndex[] = [];
  for (const n of neighbours) {
    const note = noteAt(n, tuning);
    if (note !== answer && allowed.includes(note) && !distractors.includes(note)) {
      distractors.push(note);
    }
  }
  for (const note of shuffle(allowed, rng)) {
    if (distractors.length >= OPTION_COUNT - 1) break;
    if (note !== answer && !distractors.includes(note)) distractors.push(note);
  }

  const options = shuffle([answer, ...distractors.slice(0, OPTION_COUNT - 1)], rng);
  return { position, answer, options };
}

export function buildFindQuestion(
  position: Position,
  filter: Filter,
  tuning: readonly NoteIndex[] = STANDARD_TUNING,
): FindQuestion {
  const target = noteAt(position, tuning);
  // A janela inclui a própria posição sorteada, mesmo que esteja fora do filtro
  // (ex.: aberta a partir do mapa de Progresso).
  const stringOnly: Filter = {
    strings: [position.string],
    fretMin: Math.min(filter.fretMin, position.fret),
    fretMax: Math.max(filter.fretMax, position.fret),
    naturalsOnly: false,
  };
  const validPositions = positionsInFilter(stringOnly, tuning).filter(
    (p) => noteAt(p, tuning) === target,
  );
  return { string: position.string, target, validPositions };
}

export function isCorrectFind(question: FindQuestion, tapped: Position): boolean {
  return question.validPositions.some((p) => p.string === tapped.string && p.fret === tapped.fret);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/domain/quiz.test.ts && npx tsc --noEmit`
Expected: PASS e sem erros de tipo.

- [ ] **Step 5: Commit**

```bash
git add src/domain/quiz.ts src/domain/quiz.test.ts
git commit -m "feat(domain): choice and find-the-note quiz questions" \
  --trailer "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" \
  --trailer "Claude-Session: https://claude.ai/code/session_01YSPS7fXqt2sVKM4uaawqbi"
```

---

### Task 6: Persistência (`state/storage.ts`)

**Files:**
- Create: `src/state/storage.ts`
- Modify: `src/test-utils.ts` (acrescentar helpers de storage)
- Test: `src/state/storage.test.ts`

**Interfaces:**
- Consumes: `Filter`, `parsePositionKey` (Task 3); `Notation` (Task 2); `QuizMode` (Task 5); `ProgressMap` (Task 4).
- Produces:
  - `interface Settings { notation: Notation; leftHanded: boolean; mode: QuizMode; filter: Filter }`
  - `interface AppData { version: 1; settings: Settings; progress: ProgressMap }`
  - `STORAGE_KEY = 'guitar-mapper:v1'`, `BACKUP_KEY = 'guitar-mapper:v1:backup'`
  - `DEFAULT_FILTER` (cordas 1–6, casas 0–5, só naturais), `DEFAULT_SETTINGS` (notation `'ambos'`, destro, modo `'position-to-note'`)
  - `type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>`
  - `getBrowserStorage(): StorageLike | null`
  - `createDefaultData(): AppData`
  - `interface LoadResult { data: AppData; storageAvailable: boolean; recovered: boolean }`
  - `loadData(storage: StorageLike | null): LoadResult`
  - `saveData(storage: StorageLike | null, data: AppData): boolean`
  - `test-utils.ts`: `createMemoryStorage(initial?)` (com `.dump()`), `createThrowingStorage(failOn: 'read' | 'write' | 'all')`, `seededStorage({ settings?, progress? })`, `readSaved(storage): AppData`

- [ ] **Step 1: Acrescentar helpers em `src/test-utils.ts`**

No topo do arquivo, adicionar os imports:
```ts
import {
  STORAGE_KEY,
  createDefaultData,
  type AppData,
  type Settings,
  type StorageLike,
} from './state/storage';
import type { ProgressMap } from './domain/scheduler';
```

No fim do arquivo, adicionar:
```ts
export function createMemoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    dump: () => Object.fromEntries(map),
  };
}

export function createThrowingStorage(failOn: 'read' | 'write' | 'all'): StorageLike {
  const boom = () => {
    throw new Error('storage unavailable');
  };
  return {
    getItem: failOn === 'write' ? () => null : boom,
    setItem: failOn === 'read' ? () => {} : boom,
    removeItem: () => {},
  };
}

export function seededStorage(
  overrides: { settings?: Partial<Settings>; progress?: ProgressMap } = {},
) {
  const base = createDefaultData();
  const data: AppData = {
    version: 1,
    settings: { ...base.settings, ...overrides.settings },
    progress: overrides.progress ?? {},
  };
  return createMemoryStorage({ [STORAGE_KEY]: JSON.stringify(data) });
}

export function readSaved(storage: { dump(): Record<string, string> }): AppData {
  return JSON.parse(storage.dump()[STORAGE_KEY]) as AppData;
}
```

- [ ] **Step 2: Escrever o teste que falha**

`src/state/storage.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createMemoryStorage, createThrowingStorage } from '../test-utils';
import {
  BACKUP_KEY,
  DEFAULT_SETTINGS,
  STORAGE_KEY,
  createDefaultData,
  loadData,
  saveData,
} from './storage';

describe('loadData', () => {
  it('returns defaults and flags unavailable storage when there is none', () => {
    const result = loadData(null);
    expect(result.data).toEqual(createDefaultData());
    expect(result.storageAvailable).toBe(false);
    expect(result.recovered).toBe(false);
  });

  it('returns defaults when nothing was saved', () => {
    const result = loadData(createMemoryStorage());
    expect(result.data).toEqual(createDefaultData());
    expect(result.storageAvailable).toBe(true);
    expect(result.recovered).toBe(false);
  });

  it('round-trips saved data', () => {
    const storage = createMemoryStorage();
    const data = createDefaultData();
    data.settings.leftHanded = true;
    data.progress['6-0'] = { box: 3, correct: 2, wrong: 1, lastReview: 10, nextReview: 20 };
    expect(saveData(storage, data)).toBe(true);
    expect(loadData(storage).data).toEqual(data);
  });

  it('recovers from corrupted JSON, keeping a backup of the raw value', () => {
    const storage = createMemoryStorage({ [STORAGE_KEY]: '{not json' });
    const result = loadData(storage);
    expect(result.recovered).toBe(true);
    expect(result.data).toEqual(createDefaultData());
    expect(storage.dump()[BACKUP_KEY]).toBe('{not json');
  });

  it('recovers from an unknown version, keeping a backup', () => {
    const raw = JSON.stringify({ version: 2, settings: {}, progress: {} });
    const storage = createMemoryStorage({ [STORAGE_KEY]: raw });
    const result = loadData(storage);
    expect(result.recovered).toBe(true);
    expect(storage.dump()[BACKUP_KEY]).toBe(raw);
  });

  it('fills missing or invalid settings with defaults', () => {
    const raw = JSON.stringify({
      version: 1,
      settings: { notation: 'xyz', leftHanded: true, filter: { strings: [6, 9], fretMin: 8, fretMax: 3 } },
      progress: {},
    });
    const { data } = loadData(createMemoryStorage({ [STORAGE_KEY]: raw }));
    expect(data.settings.notation).toBe(DEFAULT_SETTINGS.notation);
    expect(data.settings.leftHanded).toBe(true);
    expect(data.settings.mode).toBe(DEFAULT_SETTINGS.mode);
    expect(data.settings.filter.strings).toEqual([6]);
    expect(data.settings.filter.fretMin).toBe(3);
    expect(data.settings.filter.fretMax).toBe(8);
    expect(data.settings.filter.naturalsOnly).toBe(true);
  });

  it('keeps an explicitly empty string selection', () => {
    const raw = JSON.stringify({
      version: 1,
      settings: { filter: { strings: [], fretMin: 0, fretMax: 5, naturalsOnly: true } },
      progress: {},
    });
    const { data } = loadData(createMemoryStorage({ [STORAGE_KEY]: raw }));
    expect(data.settings.filter.strings).toEqual([]);
  });

  it('drops invalid progress entries', () => {
    const raw = JSON.stringify({
      version: 1,
      settings: {},
      progress: {
        '6-0': { box: 2, correct: 1, wrong: 0, lastReview: 1, nextReview: 2 },
        '9-0': { box: 2, correct: 1, wrong: 0, lastReview: 1, nextReview: 2 },
        '5-0': { box: 9, correct: 1, wrong: 0, lastReview: 1, nextReview: 2 },
        '4-0': 'oops',
      },
    });
    const { data } = loadData(createMemoryStorage({ [STORAGE_KEY]: raw }));
    expect(Object.keys(data.progress)).toEqual(['6-0']);
  });

  it('survives a storage that throws on read', () => {
    const result = loadData(createThrowingStorage('read'));
    expect(result.data).toEqual(createDefaultData());
    expect(result.storageAvailable).toBe(false);
  });
});

describe('saveData', () => {
  it('returns false when storage is missing or throws', () => {
    expect(saveData(null, createDefaultData())).toBe(false);
    expect(saveData(createThrowingStorage('write'), createDefaultData())).toBe(false);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run src/state/storage.test.ts`
Expected: FAIL (módulo `./storage` não encontrado).

- [ ] **Step 4: Implementação**

`src/state/storage.ts`:
```ts
import { MAX_FRET, STRING_COUNT, parsePositionKey, type Filter } from '../domain/fretboard';
import type { Notation } from '../domain/notes';
import type { QuizMode } from '../domain/quiz';
import type { Box, PositionProgress, ProgressMap } from '../domain/scheduler';

export interface Settings {
  notation: Notation;
  leftHanded: boolean;
  mode: QuizMode;
  filter: Filter;
}

export interface AppData {
  version: 1;
  settings: Settings;
  progress: ProgressMap;
}

export const STORAGE_KEY = 'guitar-mapper:v1';
export const BACKUP_KEY = 'guitar-mapper:v1:backup';

export const DEFAULT_FILTER: Filter = {
  strings: [1, 2, 3, 4, 5, 6],
  fretMin: 0,
  fretMax: 5,
  naturalsOnly: true,
};

export const DEFAULT_SETTINGS: Settings = {
  notation: 'ambos',
  leftHanded: false,
  mode: 'position-to-note',
  filter: DEFAULT_FILTER,
};

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function getBrowserStorage(): StorageLike | null {
  try {
    const storage = window.localStorage;
    const probe = 'guitar-mapper:probe';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

export function createDefaultData(): AppData {
  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS, filter: { ...DEFAULT_FILTER, strings: [...DEFAULT_FILTER.strings] } },
    progress: {},
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clampFret(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(MAX_FRET, Math.max(0, Math.round(value)));
}

function sanitizeFilter(raw: unknown): Filter {
  const source = isRecord(raw) ? raw : {};
  const strings = Array.isArray(source.strings)
    ? [...new Set(source.strings)]
        .filter((s): s is number => Number.isInteger(s) && s >= 1 && s <= STRING_COUNT)
        .sort((a, b) => a - b)
    : [...DEFAULT_FILTER.strings];
  let fretMin = clampFret(source.fretMin, DEFAULT_FILTER.fretMin);
  let fretMax = clampFret(source.fretMax, DEFAULT_FILTER.fretMax);
  if (fretMin > fretMax) [fretMin, fretMax] = [fretMax, fretMin];
  const naturalsOnly =
    typeof source.naturalsOnly === 'boolean' ? source.naturalsOnly : DEFAULT_FILTER.naturalsOnly;
  return { strings, fretMin, fretMax, naturalsOnly };
}

const NOTATIONS: Notation[] = ['cifra', 'solfejo', 'ambos'];
const MODES: QuizMode[] = ['position-to-note', 'note-to-position', 'flashcard'];

function sanitizeSettings(raw: unknown): Settings {
  const source = isRecord(raw) ? raw : {};
  return {
    notation: NOTATIONS.includes(source.notation as Notation)
      ? (source.notation as Notation)
      : DEFAULT_SETTINGS.notation,
    leftHanded:
      typeof source.leftHanded === 'boolean' ? source.leftHanded : DEFAULT_SETTINGS.leftHanded,
    mode: MODES.includes(source.mode as QuizMode)
      ? (source.mode as QuizMode)
      : DEFAULT_SETTINGS.mode,
    filter: sanitizeFilter(source.filter),
  };
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function sanitizeProgress(raw: unknown): ProgressMap {
  const out: ProgressMap = {};
  if (!isRecord(raw)) return out;
  for (const [key, entry] of Object.entries(raw)) {
    if (!parsePositionKey(key) || !isRecord(entry)) continue;
    const { box, correct, wrong, lastReview, nextReview } = entry;
    if (
      typeof box === 'number' &&
      Number.isInteger(box) &&
      box >= 1 &&
      box <= 5 &&
      isCount(correct) &&
      isCount(wrong) &&
      isCount(lastReview) &&
      isCount(nextReview)
    ) {
      const valid: PositionProgress = { box: box as Box, correct, wrong, lastReview, nextReview };
      out[key] = valid;
    }
  }
  return out;
}

export interface LoadResult {
  data: AppData;
  storageAvailable: boolean;
  recovered: boolean;
}

export function loadData(storage: StorageLike | null): LoadResult {
  if (!storage) return { data: createDefaultData(), storageAvailable: false, recovered: false };

  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { data: createDefaultData(), storageAvailable: false, recovered: false };
  }
  if (raw === null) return { data: createDefaultData(), storageAvailable: true, recovered: false };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (isRecord(parsed) && parsed.version === 1) {
      return {
        data: {
          version: 1,
          settings: sanitizeSettings(parsed.settings),
          progress: sanitizeProgress(parsed.progress),
        },
        storageAvailable: true,
        recovered: false,
      };
    }
  } catch {
    // cai para a recuperação abaixo
  }

  try {
    storage.setItem(BACKUP_KEY, raw);
  } catch {
    // sem backup possível; segue com dados limpos
  }
  return { data: createDefaultData(), storageAvailable: true, recovered: true };
}

export function saveData(storage: StorageLike | null, data: AppData): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/state/storage.test.ts && npx tsc --noEmit`
Expected: PASS e sem erros de tipo.

- [ ] **Step 6: Commit**

```bash
git add src/state/storage.ts src/state/storage.test.ts src/test-utils.ts
git commit -m "feat(state): versioned localStorage persistence with recovery" \
  --trailer "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" \
  --trailer "Claude-Session: https://claude.ai/code/session_01YSPS7fXqt2sVKM4uaawqbi"
```

---

### Task 7: Contexto do app (`state/AppState.tsx`)

**Files:**
- Create: `src/state/AppState.tsx`
- Test: `src/state/AppState.test.tsx`

**Interfaces:**
- Consumes: `loadData`, `saveData`, `getBrowserStorage`, `AppData`, `Settings`, `StorageLike` (Task 6); `applyAnswer` (Task 4); `Position`, `positionKey` (Task 3).
- Produces:
  - `AppProvider({ storage?, now?, children })`: `storage` omitido → `localStorage` do navegador; `null` → sem armazenamento; `now` padrão `Date.now`.
  - `useAppState(): { data: AppData; storageAvailable: boolean; recovered: boolean; recordAnswer(position: Position, correct: boolean): void; updateSettings(patch: Partial<Settings>): void; resetProgress(): void }`

- [ ] **Step 1: Escrever o teste que falha**

`src/state/AppState.test.tsx`:
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  createMemoryStorage,
  createThrowingStorage,
  readSaved,
} from '../test-utils';
import { AppProvider, useAppState } from './AppState';

function Probe() {
  const s = useAppState();
  return (
    <div>
      <button onClick={() => s.recordAnswer({ string: 6, fret: 0 }, true)}>right</button>
      <button onClick={() => s.recordAnswer({ string: 6, fret: 0 }, false)}>wrong</button>
      <button onClick={() => s.updateSettings({ leftHanded: true })}>lefty</button>
      <button onClick={() => s.resetProgress()}>reset</button>
      <output data-testid="box">{s.data.progress['6-0']?.box ?? 'none'}</output>
      <output data-testid="avail">{String(s.storageAvailable)}</output>
      <output data-testid="left">{String(s.data.settings.leftHanded)}</output>
    </div>
  );
}

const renderWith = (storage: Parameters<typeof AppProvider>[0]['storage'], now = () => 1000) =>
  render(
    <AppProvider storage={storage} now={now}>
      <Probe />
    </AppProvider>,
  );

describe('AppProvider', () => {
  it('records answers and persists them synchronously', () => {
    const storage = createMemoryStorage();
    renderWith(storage);
    fireEvent.click(screen.getByText('right'));
    expect(screen.getByTestId('box')).toHaveTextContent('2');
    expect(readSaved(storage).progress['6-0'].box).toBe(2);
    fireEvent.click(screen.getByText('wrong'));
    expect(screen.getByTestId('box')).toHaveTextContent('1');
  });

  it('applies two answers in the same tick without losing the first', () => {
    const storage = createMemoryStorage();
    renderWith(storage);
    const right = screen.getByText('right');
    fireEvent.click(right);
    fireEvent.click(right);
    expect(readSaved(storage).progress['6-0'].correct).toBe(2);
  });

  it('merges settings patches and persists them', () => {
    const storage = createMemoryStorage();
    renderWith(storage);
    fireEvent.click(screen.getByText('lefty'));
    expect(screen.getByTestId('left')).toHaveTextContent('true');
    expect(readSaved(storage).settings.leftHanded).toBe(true);
  });

  it('resets progress but keeps settings', () => {
    const storage = createMemoryStorage();
    renderWith(storage);
    fireEvent.click(screen.getByText('lefty'));
    fireEvent.click(screen.getByText('right'));
    fireEvent.click(screen.getByText('reset'));
    expect(screen.getByTestId('box')).toHaveTextContent('none');
    expect(readSaved(storage).settings.leftHanded).toBe(true);
    expect(readSaved(storage).progress).toEqual({});
  });

  it('keeps working in memory when there is no storage', () => {
    renderWith(null);
    expect(screen.getByTestId('avail')).toHaveTextContent('false');
    fireEvent.click(screen.getByText('right'));
    expect(screen.getByTestId('box')).toHaveTextContent('2');
  });

  it('flags storage as unavailable when a write throws, and keeps working', () => {
    renderWith(createThrowingStorage('write'));
    expect(screen.getByTestId('avail')).toHaveTextContent('true');
    fireEvent.click(screen.getByText('right'));
    expect(screen.getByTestId('avail')).toHaveTextContent('false');
    expect(screen.getByTestId('box')).toHaveTextContent('2');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/state/AppState.test.tsx`
Expected: FAIL (módulo não encontrado).

- [ ] **Step 3: Implementação**

`src/state/AppState.tsx`:
```tsx
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { positionKey, type Position } from '../domain/fretboard';
import { applyAnswer } from '../domain/scheduler';
import {
  getBrowserStorage,
  loadData,
  saveData,
  type AppData,
  type Settings,
  type StorageLike,
} from './storage';

interface AppStateValue {
  data: AppData;
  storageAvailable: boolean;
  recovered: boolean;
  recordAnswer(position: Position, correct: boolean): void;
  updateSettings(patch: Partial<Settings>): void;
  resetProgress(): void;
}

const AppStateContext = createContext<AppStateValue | null>(null);

interface AppProviderProps {
  /** Omitido: localStorage do navegador. `null`: sem armazenamento. */
  storage?: StorageLike | null;
  now?: () => number;
  children: ReactNode;
}

export function AppProvider({ storage, now = Date.now, children }: AppProviderProps) {
  const [init] = useState(() => {
    const resolved = storage === undefined ? getBrowserStorage() : storage;
    return { storage: resolved, ...loadData(resolved) };
  });
  const dataRef = useRef<AppData>(init.data);
  const [data, setData] = useState<AppData>(init.data);
  const [storageAvailable, setStorageAvailable] = useState(init.storageAvailable);

  const commit = useCallback(
    (next: AppData) => {
      dataRef.current = next;
      setData(next);
      if (!saveData(init.storage, next)) setStorageAvailable(false);
    },
    [init.storage],
  );

  const recordAnswer = useCallback(
    (position: Position, correct: boolean) => {
      const current = dataRef.current;
      const key = positionKey(position);
      commit({
        ...current,
        progress: { ...current.progress, [key]: applyAnswer(current.progress[key], correct, now()) },
      });
    },
    [commit, now],
  );

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      const current = dataRef.current;
      commit({ ...current, settings: { ...current.settings, ...patch } });
    },
    [commit],
  );

  const resetProgress = useCallback(() => {
    commit({ ...dataRef.current, progress: {} });
  }, [commit]);

  const value = useMemo<AppStateValue>(
    () => ({
      data,
      storageAvailable,
      recovered: init.recovered,
      recordAnswer,
      updateSettings,
      resetProgress,
    }),
    [data, storageAvailable, init.recovered, recordAnswer, updateSettings, resetProgress],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const value = useContext(AppStateContext);
  if (!value) throw new Error('useAppState must be used inside <AppProvider>');
  return value;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/state/AppState.test.tsx && npx tsc --noEmit`
Expected: PASS e sem erros de tipo.

- [ ] **Step 5: Commit**

```bash
git add src/state/AppState.tsx src/state/AppState.test.tsx
git commit -m "feat(state): AppProvider context with persisted progress and settings" \
  --trailer "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" \
  --trailer "Claude-Session: https://claude.ai/code/session_01YSPS7fXqt2sVKM4uaawqbi"
```

---

### Task 8: Componente `Fretboard` (SVG)

**Files:**
- Create: `src/ui/Fretboard.tsx`
- Test: `src/ui/Fretboard.test.tsx`

**Interfaces:**
- Consumes: `Position`, `positionKey` (Task 3).
- Produces:
  - `type MarkKind = 'target' | 'correct' | 'wrong' | 'hint' | 'unseen' | 'learning' | 'mastered'`
  - `interface Mark { position: Position; kind: MarkKind; label?: string }` (label `"C · Dó"` vira duas linhas)
  - `Fretboard({ fretMin, fretMax, marks, onTap?, leftHanded?, scrollToFret? })`
  - Cada célula tem `data-testid="cell-{corda}-{casa}"`; com `onTap`, ganha `role="button"` e `aria-label="Corda N, casa M"`. Marcas usam as classes `mark mark--{kind}`.
  - Em modo canhoto o desenho é espelhado, mas `onTap` recebe sempre a posição correta.

- [ ] **Step 1: Escrever o teste que falha**

`src/ui/Fretboard.test.tsx`:
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Fretboard } from './Fretboard';

describe('Fretboard', () => {
  it('renders one cell per string and fret in the window', () => {
    const { container } = render(<Fretboard fretMin={0} fretMax={4} marks={[]} />);
    expect(container.querySelectorAll('[data-testid^="cell-"]')).toHaveLength(30);
  });

  it('reports the tapped position', () => {
    const onTap = vi.fn();
    render(<Fretboard fretMin={0} fretMax={12} marks={[]} onTap={onTap} />);
    fireEvent.click(screen.getByTestId('cell-3-7'));
    expect(onTap).toHaveBeenCalledWith({ string: 3, fret: 7 });
    expect(screen.getByTestId('cell-3-7')).toHaveAttribute('aria-label', 'Corda 3, casa 7');
  });

  it('does not make cells interactive without onTap', () => {
    render(<Fretboard fretMin={0} fretMax={4} marks={[]} />);
    expect(screen.getByTestId('cell-1-0')).not.toHaveAttribute('role');
  });

  it('mirrors the drawing for left-handed players but keeps positions correct', () => {
    const onTap = vi.fn();
    const { rerender } = render(<Fretboard fretMin={0} fretMax={4} marks={[]} onTap={onTap} />);
    expect(screen.getByTestId('cell-1-0')).toHaveAttribute('x', '0');
    rerender(<Fretboard fretMin={0} fretMax={4} marks={[]} onTap={onTap} leftHanded />);
    expect(screen.getByTestId('cell-1-0')).toHaveAttribute('x', '224');
    fireEvent.click(screen.getByTestId('cell-1-0'));
    expect(onTap).toHaveBeenCalledWith({ string: 1, fret: 0 });
  });

  it('draws marks with their kind and label, ignoring marks outside the window', () => {
    const { container } = render(
      <Fretboard
        fretMin={0}
        fretMax={4}
        marks={[
          { position: { string: 6, fret: 3 }, kind: 'target', label: 'G' },
          { position: { string: 6, fret: 20 }, kind: 'hint' },
        ]}
      />,
    );
    expect(screen.getByText('G')).toBeInTheDocument();
    expect(container.querySelectorAll('.mark')).toHaveLength(1);
    expect(container.querySelector('.mark--target')).not.toBeNull();
  });

  it('splits a combined label into two lines', () => {
    render(
      <Fretboard
        fretMin={0}
        fretMax={4}
        marks={[{ position: { string: 1, fret: 0 }, kind: 'correct', label: 'E · Mi' }]}
      />,
    );
    expect(screen.getByText('E')).toBeInTheDocument();
    expect(screen.getByText('Mi')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/Fretboard.test.tsx`
Expected: FAIL (módulo não encontrado).

- [ ] **Step 3: Implementação**

`src/ui/Fretboard.tsx`:
```tsx
import { useEffect, useRef } from 'react';
import { STRING_COUNT, positionKey, type Position } from '../domain/fretboard';

export type MarkKind =
  | 'target'
  | 'correct'
  | 'wrong'
  | 'hint'
  | 'unseen'
  | 'learning'
  | 'mastered';

export interface Mark {
  position: Position;
  kind: MarkKind;
  label?: string;
}

export interface FretboardProps {
  fretMin: number;
  fretMax: number;
  marks: Mark[];
  onTap?: (position: Position) => void;
  leftHanded?: boolean;
  /** Casa a centralizar na área rolável. */
  scrollToFret?: number;
}

const FRET_W = 56;
const STRING_GAP = 44;
const TOP = 28;
const MARK_R = 16;
const INLAYS = new Set([3, 5, 7, 9, 12, 15, 17, 19, 21, 24]);
const STRINGS = [1, 2, 3, 4, 5, 6].slice(0, STRING_COUNT);

export function Fretboard({
  fretMin,
  fretMax,
  marks,
  onTap,
  leftHanded = false,
  scrollToFret,
}: FretboardProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const count = fretMax - fretMin + 1;
  const width = count * FRET_W;
  const height = TOP + STRING_COUNT * STRING_GAP;
  const frets = Array.from({ length: count }, (_, i) => fretMin + i);

  const colOf = (fret: number) => (leftHanded ? fretMax - fret : fret - fretMin);
  const cx = (fret: number) => colOf(fret) * FRET_W + FRET_W / 2;
  const cy = (string: number) => TOP + (string - 1) * STRING_GAP + STRING_GAP / 2;

  useEffect(() => {
    const el = scrollRef.current;
    if (el && scrollToFret !== undefined) {
      el.scrollLeft = cx(scrollToFret) - el.clientWidth / 2;
    }
  }, [scrollToFret, fretMin, fretMax, leftHanded]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleMarks = marks.filter((m) => m.position.fret >= fretMin && m.position.fret <= fretMax);

  return (
    <div className="fretboard" ref={scrollRef} role="group" aria-label="Braço da guitarra">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {frets.map((f) => (
          <text key={`n${f}`} className="fret-number" x={cx(f)} y={16} textAnchor="middle">
            {f}
          </text>
        ))}
        {frets.map((f) => {
          const x = leftHanded ? colOf(f) * FRET_W : (colOf(f) + 1) * FRET_W;
          return (
            <line
              key={`w${f}`}
              className={f === 0 ? 'nut' : 'wire'}
              x1={x}
              x2={x}
              y1={TOP}
              y2={height}
            />
          );
        })}
        {frets
          .filter((f) => INLAYS.has(f))
          .flatMap((f) =>
            (f % 12 === 0 ? [2, 4] : [3]).map((row) => (
              <circle
                key={`i${f}-${row}`}
                className="inlay"
                cx={cx(f)}
                cy={TOP + row * STRING_GAP}
                r={6}
              />
            )),
          )}
        {STRINGS.map((s) => (
          <line
            key={`s${s}`}
            className="string"
            x1={0}
            x2={width}
            y1={cy(s)}
            y2={cy(s)}
            strokeWidth={1 + (s - 1) * 0.4}
          />
        ))}
        {STRINGS.flatMap((s) =>
          frets.map((f) => (
            <rect
              key={`c${s}-${f}`}
              data-testid={`cell-${s}-${f}`}
              className={onTap ? 'cell cell--tappable' : 'cell'}
              x={colOf(f) * FRET_W}
              y={TOP + (s - 1) * STRING_GAP}
              width={FRET_W}
              height={STRING_GAP}
              {...(onTap
                ? {
                    role: 'button',
                    'aria-label': `Corda ${s}, casa ${f}`,
                    onClick: () => onTap({ string: s, fret: f }),
                  }
                : {})}
            />
          )),
        )}
        {visibleMarks.map((m) => {
          const x = cx(m.position.fret);
          const y = cy(m.position.string);
          const lines = m.label ? m.label.split(' · ') : [];
          return (
            <g
              key={`m${positionKey(m.position)}-${m.kind}`}
              className={`mark mark--${m.kind}`}
              pointerEvents="none"
            >
              <circle cx={x} cy={y} r={MARK_R} />
              {lines.length > 0 && (
                <text textAnchor="middle">
                  {lines.map((line, i) => (
                    <tspan key={i} x={x} y={y + (i - (lines.length - 1) / 2) * 12 + 4}>
                      {line}
                    </tspan>
                  ))}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/ui/Fretboard.test.tsx && npx tsc --noEmit`
Expected: PASS e sem erros de tipo.

- [ ] **Step 5: Commit**

```bash
git add src/ui/Fretboard.tsx src/ui/Fretboard.test.tsx
git commit -m "feat(ui): SVG Fretboard with marks, tapping and left-handed mirroring" \
  --trailer "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" \
  --trailer "Claude-Session: https://claude.ai/code/session_01YSPS7fXqt2sVKM4uaawqbi"
```

---

### Task 9: Tela Estudar (3 modos de quiz)

**Files:**
- Create: `src/ui/useAutoAdvance.ts`, `src/ui/screens/window.ts`, `src/ui/screens/ChoiceQuiz.tsx`, `src/ui/screens/FindQuiz.tsx`, `src/ui/screens/Flashcard.tsx`, `src/ui/screens/Study.tsx`
- Test: `src/ui/screens/Study.test.tsx`

**Interfaces:**
- Consumes: `useAppState` (Task 7); `Fretboard`, `Mark` (Task 8); `buildChoiceQuestion`, `buildFindQuestion`, `isCorrectFind`, `QuizMode` (Task 5); `pickNext` (Task 4); `positionsInFilter`, `positionsOfNote`, `noteAt`, `positionKey`, `Position`, `Filter` (Task 3); `noteLabel` (Task 2); `Settings` (Task 6); `seededStorage`, `readSaved` (Task 6).
- Produces:
  - `useAutoAdvance(active: boolean, onNext: () => void, delayMs?: number): void` (padrão 700 ms)
  - `windowFor(filter: Filter, position: Position): { fretMin: number; fretMax: number }`
  - `interface QuizProps { position: Position; settings: Settings; onAnswer(correct: boolean): void; onNext(): void }` (exportada de `ChoiceQuiz.tsx`)
  - `Study({ forced?: Position | null })`: com `forced`, a primeira posição é essa; depois volta ao sorteio.

- [ ] **Step 1: Escrever o teste que falha**

`src/ui/screens/Study.test.tsx`:
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AppProvider } from '../../state/AppState';
import { readSaved, seededStorage } from '../../test-utils';
import type { Settings } from '../../state/storage';
import { Study } from './Study';

// Uma única posição candidata: corda 6, casa 0 (nota E) → sorteio determinístico.
const SINGLE: Settings['filter'] = { strings: [6], fretMin: 0, fretMax: 0, naturalsOnly: true };

function setup(settings: Partial<Settings> = {}, forced?: { string: number; fret: number }) {
  const storage = seededStorage({ settings: { notation: 'cifra', filter: SINGLE, ...settings } });
  render(
    <AppProvider storage={storage}>
      <Study forced={forced ?? null} />
    </AppProvider>,
  );
  return storage;
}

describe('Study', () => {
  it('explains what is missing when the filter has no positions', () => {
    setup({ filter: { ...SINGLE, strings: [] } });
    expect(screen.getByText(/Nenhuma posição no foco/)).toBeInTheDocument();
  });

  it('explains it too when naturals-only leaves nothing (A# on string 5 fret 1)', () => {
    setup({ filter: { strings: [5], fretMin: 1, fretMax: 1, naturalsOnly: true } });
    expect(screen.getByText(/Nenhuma posição no foco/)).toBeInTheDocument();
  });

  it('multiple choice: a correct answer gives feedback and saves progress', () => {
    const storage = setup();
    expect(screen.getByText('Qual é esta nota?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'E' }));
    expect(screen.getByText('Correto!')).toBeInTheDocument();
    expect(readSaved(storage).progress['6-0'].box).toBe(2);
    expect(screen.getByText(/Acertos 1\/1/)).toBeInTheDocument();
  });

  it('multiple choice: a wrong answer shows the right note and a Próxima button', () => {
    const storage = setup();
    const wrong = screen
      .getAllByRole('button')
      .find((b) => b.classList.contains('option') && b.textContent !== 'E')!;
    fireEvent.click(wrong);
    expect(screen.getByText('Era E')).toBeInTheDocument();
    expect(readSaved(storage).progress['6-0'].box).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));
    expect(screen.getByText('Qual é esta nota?')).toBeInTheDocument();
    expect(screen.queryByText('Era E')).not.toBeInTheDocument();
  });

  it('find mode: tapping the right cell is correct, another cell is wrong', () => {
    const storage = setup({ mode: 'note-to-position' });
    expect(screen.getByText('Encontre E na corda 6')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cell-6-0'));
    expect(screen.getByText('Correto!')).toBeInTheDocument();
    expect(readSaved(storage).progress['6-0'].box).toBe(2);
  });

  it('find mode: a wrong tap saves a miss', () => {
    const storage = setup({ mode: 'note-to-position' });
    fireEvent.click(screen.getByTestId('cell-5-0'));
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeInTheDocument();
    expect(readSaved(storage).progress['6-0'].box).toBe(1);
  });

  it('flashcard: reveal then self-grade', () => {
    const storage = setup({ mode: 'flashcard' });
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar nota' }));
    fireEvent.click(screen.getByRole('button', { name: 'Acertei' }));
    expect(readSaved(storage).progress['6-0'].box).toBe(2);
    expect(screen.getByRole('button', { name: 'Mostrar nota' })).toBeInTheDocument();
  });

  it('switches mode from the mode bar and remembers it', () => {
    const storage = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Flashcard' }));
    expect(screen.getByRole('button', { name: 'Mostrar nota' })).toBeInTheDocument();
    expect(readSaved(storage).settings.mode).toBe('flashcard');
  });

  it('starts on the forced position even if it is outside the filter', () => {
    setup({ mode: 'note-to-position' }, { string: 3, fret: 7 });
    expect(screen.getByText('Encontre D na corda 3')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/screens/Study.test.tsx`
Expected: FAIL (módulos não encontrados).

- [ ] **Step 3: Implementação — utilitários**

`src/ui/useAutoAdvance.ts`:
```ts
import { useEffect, useRef } from 'react';

/** Chama `onNext` após `delayMs` enquanto `active` for verdadeiro. */
export function useAutoAdvance(active: boolean, onNext: () => void, delayMs = 700): void {
  const latest = useRef(onNext);
  useEffect(() => {
    latest.current = onNext;
  });
  useEffect(() => {
    if (!active) return;
    const id = setTimeout(() => latest.current(), delayMs);
    return () => clearTimeout(id);
  }, [active, delayMs]);
}
```

`src/ui/screens/window.ts`:
```ts
import type { Filter, Position } from '../../domain/fretboard';

/** Janela de casas do braço: a do filtro, ampliada para conter a posição perguntada. */
export function windowFor(filter: Filter, position: Position) {
  return {
    fretMin: Math.min(filter.fretMin, position.fret),
    fretMax: Math.max(filter.fretMax, position.fret),
  };
}
```

- [ ] **Step 4: Implementação — múltipla escolha**

`src/ui/screens/ChoiceQuiz.tsx`:
```tsx
import { useMemo, useState } from 'react';
import type { Position } from '../../domain/fretboard';
import { noteLabel, type NoteIndex } from '../../domain/notes';
import { buildChoiceQuestion } from '../../domain/quiz';
import type { Settings } from '../../state/storage';
import { Fretboard } from '../Fretboard';
import { useAutoAdvance } from '../useAutoAdvance';
import { windowFor } from './window';

export interface QuizProps {
  position: Position;
  settings: Settings;
  onAnswer(correct: boolean): void;
  onNext(): void;
}

export function ChoiceQuiz({ position, settings, onAnswer, onNext }: QuizProps) {
  const { filter, notation, leftHanded } = settings;
  const question = useMemo(
    () => buildChoiceQuestion(position, filter.naturalsOnly, Math.random),
    [position, filter.naturalsOnly],
  );
  const [picked, setPicked] = useState<NoteIndex | null>(null);
  const answered = picked !== null;
  const correct = answered && picked === question.answer;
  useAutoAdvance(correct, onNext);

  function choose(note: NoteIndex) {
    if (answered) return;
    setPicked(note);
    onAnswer(note === question.answer);
  }

  const { fretMin, fretMax } = windowFor(filter, position);
  return (
    <div className="quiz">
      <p className="prompt">Qual é esta nota?</p>
      <Fretboard
        fretMin={fretMin}
        fretMax={fretMax}
        leftHanded={leftHanded}
        scrollToFret={position.fret}
        marks={[
          {
            position,
            kind: !answered ? 'target' : correct ? 'correct' : 'wrong',
            label: answered ? noteLabel(question.answer, notation) : undefined,
          },
        ]}
      />
      <div className="options">
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
        <div className="feedback" role="status">
          <p>{correct ? 'Correto!' : `Era ${noteLabel(question.answer, notation)}`}</p>
          {!correct && (
            <button type="button" className="primary" onClick={onNext}>
              Próxima
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Implementação — nota → posição**

`src/ui/screens/FindQuiz.tsx`:
```tsx
import { useMemo, useState } from 'react';
import { positionsOfNote, type Position } from '../../domain/fretboard';
import { noteLabel } from '../../domain/notes';
import { buildFindQuestion, isCorrectFind } from '../../domain/quiz';
import { Fretboard, type Mark } from '../Fretboard';
import { useAutoAdvance } from '../useAutoAdvance';
import type { QuizProps } from './ChoiceQuiz';
import { windowFor } from './window';

export function FindQuiz({ position, settings, onAnswer, onNext }: QuizProps) {
  const { filter, notation, leftHanded } = settings;
  const question = useMemo(() => buildFindQuestion(position, filter), [position, filter]);
  const [tapped, setTapped] = useState<Position | null>(null);
  const correct = tapped !== null && isCorrectFind(question, tapped);
  useAutoAdvance(correct, onNext);

  const { fretMin, fretMax } = windowFor(filter, position);

  function tap(p: Position) {
    if (tapped) return;
    setTapped(p);
    onAnswer(isCorrectFind(question, p));
  }

  const marks: Mark[] = [];
  if (tapped) {
    marks.push({ position: tapped, kind: correct ? 'correct' : 'wrong' });
    if (!correct) {
      for (const p of question.validPositions) marks.push({ position: p, kind: 'correct' });
      const everywhere = positionsOfNote(question.target, {
        strings: [1, 2, 3, 4, 5, 6],
        fretMin,
        fretMax,
        naturalsOnly: false,
      });
      for (const p of everywhere) {
        if (p.string !== question.string) marks.push({ position: p, kind: 'hint' });
      }
    }
  }

  return (
    <div className="quiz">
      <p className="prompt">
        Encontre {noteLabel(question.target, notation)} na corda {question.string}
      </p>
      <Fretboard
        fretMin={fretMin}
        fretMax={fretMax}
        leftHanded={leftHanded}
        scrollToFret={position.fret}
        marks={marks}
        onTap={tapped ? undefined : tap}
      />
      {tapped && (
        <div className="feedback" role="status">
          <p>{correct ? 'Correto!' : `Errou. ${noteLabel(question.target, notation)} está marcada no braço.`}</p>
          {!correct && (
            <button type="button" className="primary" onClick={onNext}>
              Próxima
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Implementação — flashcard**

`src/ui/screens/Flashcard.tsx`:
```tsx
import { useState } from 'react';
import { noteAt } from '../../domain/fretboard';
import { noteLabel } from '../../domain/notes';
import { Fretboard } from '../Fretboard';
import type { QuizProps } from './ChoiceQuiz';
import { windowFor } from './window';

export function Flashcard({ position, settings, onAnswer, onNext }: QuizProps) {
  const { filter, notation, leftHanded } = settings;
  const [revealed, setRevealed] = useState(false);
  const { fretMin, fretMax } = windowFor(filter, position);

  function grade(correct: boolean) {
    onAnswer(correct);
    onNext();
  }

  return (
    <div className="quiz">
      <p className="prompt">Qual é esta nota?</p>
      <Fretboard
        fretMin={fretMin}
        fretMax={fretMax}
        leftHanded={leftHanded}
        scrollToFret={position.fret}
        marks={[
          {
            position,
            kind: 'target',
            label: revealed ? noteLabel(noteAt(position), notation) : undefined,
          },
        ]}
      />
      {revealed ? (
        <div className="options options--two">
          <button type="button" className="option option--wrong" onClick={() => grade(false)}>
            Errei
          </button>
          <button type="button" className="option option--correct" onClick={() => grade(true)}>
            Acertei
          </button>
        </div>
      ) : (
        <button type="button" className="primary" onClick={() => setRevealed(true)}>
          Mostrar nota
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Implementação — tela Estudar**

`src/ui/screens/Study.tsx`:
```tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { positionKey, positionsInFilter, type Position } from '../../domain/fretboard';
import type { QuizMode } from '../../domain/quiz';
import { pickNext } from '../../domain/scheduler';
import { useAppState } from '../../state/AppState';
import { ChoiceQuiz } from './ChoiceQuiz';
import { Flashcard } from './Flashcard';
import { FindQuiz } from './FindQuiz';

const MODES: { mode: QuizMode; label: string }[] = [
  { mode: 'position-to-note', label: 'Posição → nota' },
  { mode: 'note-to-position', label: 'Nota → posição' },
  { mode: 'flashcard', label: 'Flashcard' },
];

export function Study({ forced = null }: { forced?: Position | null }) {
  const { data, recordAnswer, updateSettings } = useAppState();
  const { settings } = data;
  const candidates = useMemo(() => positionsInFilter(settings.filter), [settings.filter]);

  const [position, setPosition] = useState<Position | null>(null);
  const [round, setRound] = useState(0);
  const [session, setSession] = useState({ correct: 0, total: 0, streak: 0 });
  const lastKey = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (forced && round === 0) {
      setPosition(forced);
      return;
    }
    if (candidates.length === 0) {
      setPosition(null);
      return;
    }
    setPosition(pickNext(candidates, data.progress, Date.now(), Math.random, lastKey.current));
  }, [round, candidates]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleAnswer(correct: boolean) {
    if (!position) return;
    recordAnswer(position, correct);
    setSession((s) => ({
      correct: s.correct + (correct ? 1 : 0),
      total: s.total + 1,
      streak: correct ? s.streak + 1 : 0,
    }));
  }

  function handleNext() {
    if (position) lastKey.current = positionKey(position);
    setRound((r) => r + 1);
  }

  const quizProps = { settings, onAnswer: handleAnswer, onNext: handleNext };

  return (
    <section className="screen">
      <div className="mode-bar" role="group" aria-label="Modo de estudo">
        {MODES.map(({ mode, label }) => (
          <button
            key={mode}
            type="button"
            aria-pressed={settings.mode === mode}
            onClick={() => updateSettings({ mode })}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="session">
        Acertos {session.correct}/{session.total} · Sequência {session.streak}
      </p>
      {candidates.length === 0 && !forced ? (
        <p className="empty">
          Nenhuma posição no foco atual. Selecione ao menos uma corda ou ajuste as casas e o nível
          de notas em Foco.
        </p>
      ) : (
        position &&
        (settings.mode === 'position-to-note' ? (
          <ChoiceQuiz key={round} position={position} {...quizProps} />
        ) : settings.mode === 'note-to-position' ? (
          <FindQuiz key={round} position={position} {...quizProps} />
        ) : (
          <Flashcard key={round} position={position} {...quizProps} />
        ))
      )}
    </section>
  );
}
```

- [ ] **Step 8: Rodar e ver passar**

Run: `npx vitest run src/ui/screens/Study.test.tsx && npx tsc --noEmit`
Expected: PASS e sem erros de tipo.

- [ ] **Step 9: Commit**

```bash
git add src/ui
git commit -m "feat(ui): Study screen with choice, find and flashcard modes" \
  --trailer "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" \
  --trailer "Claude-Session: https://claude.ai/code/session_01YSPS7fXqt2sVKM4uaawqbi"
```

---

### Task 10: Telas Foco, Progresso e Ajustes, e navegação

**Files:**
- Create: `src/ui/screens/Focus.tsx`, `src/ui/screens/Progress.tsx`, `src/ui/screens/Settings.tsx`
- Modify: `src/App.tsx`, `src/App.test.tsx`, `src/main.tsx`
- Create: `src/styles.css`
- Test: `src/ui/screens/Focus.test.tsx`, `src/ui/screens/Progress.test.tsx`, `src/ui/screens/Settings.test.tsx`, `src/App.test.tsx`

**Interfaces:**
- Consumes: `useAppState`, `AppProvider` (Task 7); `Fretboard`, `Mark` (Task 8); `Study` (Task 9); `positionsInFilter`, `allPositions`, `positionKey`, `MAX_FRET`, `Filter`, `Position` (Task 3); `masteryOf` (Task 4); `seededStorage`, `readSaved`, `createMemoryStorage` (Task 6).
- Produces:
  - `Focus()`, `Progress({ onSelect(position: Position): void })`, `Settings()`
  - `App({ storage? })` com abas e banners de armazenamento indisponível / dados recuperados.

- [ ] **Step 1: Escrever os testes que falham**

`src/ui/screens/Focus.test.tsx`:
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AppProvider } from '../../state/AppState';
import { readSaved, seededStorage } from '../../test-utils';
import { Focus } from './Focus';

function setup() {
  const storage = seededStorage();
  render(
    <AppProvider storage={storage}>
      <Focus />
    </AppProvider>,
  );
  return storage;
}

describe('Focus', () => {
  it('shows how many positions are in focus', () => {
    setup();
    // default: 6 strings, frets 0..5, naturals only → 6 strings × (casas naturais em 0..5)
    expect(screen.getByTestId('count')).toHaveTextContent(/^\d+ posições no foco$/);
  });

  it('toggles strings', () => {
    const storage = setup();
    const chip = screen.getByRole('button', { name: 'Corda 6' });
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    expect(readSaved(storage).settings.filter.strings).toEqual([1, 2, 3, 4, 5]);
  });

  it('warns when no string is selected', () => {
    setup();
    for (let s = 1; s <= 6; s++) fireEvent.click(screen.getByRole('button', { name: `Corda ${s}` }));
    expect(screen.getByTestId('count')).toHaveTextContent('0 posições no foco');
    expect(screen.getByText(/Nenhuma posição/)).toBeInTheDocument();
  });

  it('applies fret presets', () => {
    const storage = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Casas 5–12' }));
    expect(screen.getByLabelText('Casa inicial')).toHaveValue('5');
    expect(screen.getByLabelText('Casa final')).toHaveValue('12');
    expect(readSaved(storage).settings.filter).toMatchObject({ fretMin: 5, fretMax: 12 });
  });

  it('keeps the range ordered when one end crosses the other', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Casas 5–12' }));
    fireEvent.change(screen.getByLabelText('Casa final'), { target: { value: '2' } });
    expect(screen.getByLabelText('Casa inicial')).toHaveValue('2');
    expect(screen.getByLabelText('Casa final')).toHaveValue('2');
  });

  it('toggles naturals-only', () => {
    const storage = setup();
    fireEvent.click(screen.getByLabelText('Só notas naturais'));
    expect(readSaved(storage).settings.filter.naturalsOnly).toBe(false);
  });
});
```

`src/ui/screens/Progress.test.tsx`:
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppProvider } from '../../state/AppState';
import { seededStorage } from '../../test-utils';
import { Progress } from './Progress';

const entry = (box: 1 | 2 | 3 | 4 | 5) => ({
  box,
  correct: 1,
  wrong: 0,
  lastReview: 0,
  nextReview: 0,
});

describe('Progress', () => {
  it('summarises mastery over all 150 positions', () => {
    const storage = seededStorage({
      progress: { '6-0': entry(5), '5-0': entry(1), '4-0': entry(2) },
    });
    render(
      <AppProvider storage={storage}>
        <Progress onSelect={() => {}} />
      </AppProvider>,
    );
    expect(screen.getByText('Dominadas: 1')).toBeInTheDocument();
    expect(screen.getByText('Errando: 1')).toBeInTheDocument();
    expect(screen.getByText('Aprendendo: 1')).toBeInTheDocument();
    expect(screen.getByText('Nunca vistas: 147')).toBeInTheDocument();
  });

  it('colours positions by mastery and reports taps', () => {
    const onSelect = vi.fn();
    const storage = seededStorage({ progress: { '6-0': entry(5) } });
    const { container } = render(
      <AppProvider storage={storage}>
        <Progress onSelect={onSelect} />
      </AppProvider>,
    );
    expect(container.querySelectorAll('.mark--mastered')).toHaveLength(1);
    expect(container.querySelectorAll('.mark--unseen')).toHaveLength(149);
    fireEvent.click(screen.getByTestId('cell-6-0'));
    expect(onSelect).toHaveBeenCalledWith({ string: 6, fret: 0 });
  });
});
```

`src/ui/screens/Settings.test.tsx`:
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { AppProvider } from '../../state/AppState';
import { readSaved, seededStorage } from '../../test-utils';
import { Settings } from './Settings';

afterEach(() => vi.restoreAllMocks());

function setup() {
  const storage = seededStorage({
    progress: { '6-0': { box: 3, correct: 1, wrong: 0, lastReview: 0, nextReview: 0 } },
  });
  render(
    <AppProvider storage={storage}>
      <Settings />
    </AppProvider>,
  );
  return storage;
}

describe('Settings', () => {
  it('changes the notation', () => {
    const storage = setup();
    fireEvent.click(screen.getByLabelText('Dó Ré Mi'));
    expect(readSaved(storage).settings.notation).toBe('solfejo');
  });

  it('toggles left-handed mode', () => {
    const storage = setup();
    fireEvent.click(screen.getByLabelText('Mão esquerda'));
    expect(readSaved(storage).settings.leftHanded).toBe(true);
  });

  it('resets progress only after confirmation', () => {
    const storage = setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    fireEvent.click(screen.getByRole('button', { name: 'Zerar progresso' }));
    expect(Object.keys(readSaved(storage).progress)).toEqual(['6-0']);
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Zerar progresso' }));
    expect(readSaved(storage).progress).toEqual({});
  });
});
```

`src/App.test.tsx` (substitui o teste do Task 1):
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { App } from './App';
import { STORAGE_KEY } from './state/storage';
import { createMemoryStorage, createThrowingStorage, seededStorage } from './test-utils';

describe('App', () => {
  it('shows the four tabs and starts on Estudar', () => {
    render(<App storage={createMemoryStorage()} />);
    const nav = screen.getByRole('navigation', { name: 'Principal' });
    for (const name of ['Estudar', 'Progresso', 'Foco', 'Ajustes']) {
      expect(nav).toHaveTextContent(name);
    }
    expect(screen.getByRole('button', { name: 'Estudar' })).toHaveAttribute('aria-current', 'page');
  });

  it('navigates between tabs', () => {
    render(<App storage={createMemoryStorage()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Foco' }));
    expect(screen.getByTestId('count')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ajustes' }));
    expect(screen.getByRole('button', { name: 'Zerar progresso' })).toBeInTheDocument();
  });

  it('tapping a position in Progresso opens it in Estudar', () => {
    render(<App storage={seededStorage({ settings: { notation: 'cifra' } })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Progresso' }));
    fireEvent.click(screen.getByTestId('cell-6-0'));
    expect(screen.getByRole('button', { name: 'Estudar' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('Qual é esta nota?')).toBeInTheDocument();
    // a nota da posição 6-0 (E) está entre as opções
    expect(screen.getByRole('button', { name: 'E' })).toBeInTheDocument();
  });

  it('warns when storage is unavailable and still works', () => {
    render(<App storage={null} />);
    expect(screen.getByText(/progresso não será salvo/i)).toBeInTheDocument();
    expect(screen.getByText('Qual é esta nota?')).toBeInTheDocument();
  });

  it('warns after the first answer when writes fail', () => {
    const { container } = render(<App storage={createThrowingStorage('write')} />);
    expect(screen.queryByText(/progresso não será salvo/i)).not.toBeInTheDocument();
    fireEvent.click(container.querySelector('.option')!);
    expect(screen.getByText(/progresso não será salvo/i)).toBeInTheDocument();
  });

  it('tells the user when saved data was corrupted and reset', () => {
    render(<App storage={createMemoryStorage({ [STORAGE_KEY]: '{oops' })} />);
    expect(screen.getByText(/dados salvos estavam corrompidos/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }));
    expect(screen.queryByText(/dados salvos estavam corrompidos/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/screens/Focus.test.tsx src/ui/screens/Progress.test.tsx src/ui/screens/Settings.test.tsx src/App.test.tsx`
Expected: FAIL (módulos não encontrados / App sem abas).

- [ ] **Step 3: Implementação — Foco**

`src/ui/screens/Focus.tsx`:
```tsx
import { useMemo } from 'react';
import { MAX_FRET, positionsInFilter, type Filter } from '../../domain/fretboard';
import { useAppState } from '../../state/AppState';

const PRESETS = [
  { label: 'Casas 0–5', min: 0, max: 5 },
  { label: 'Casas 5–12', min: 5, max: 12 },
  { label: 'Casas 12–24', min: 12, max: 24 },
];
const FRET_OPTIONS = Array.from({ length: MAX_FRET + 1 }, (_, i) => i);

export function Focus() {
  const { data, updateSettings } = useAppState();
  const { filter } = data.settings;
  const count = useMemo(() => positionsInFilter(filter).length, [filter]);

  const setFilter = (patch: Partial<Filter>) => updateSettings({ filter: { ...filter, ...patch } });

  const toggleString = (s: number) =>
    setFilter({
      strings: filter.strings.includes(s)
        ? filter.strings.filter((x) => x !== s)
        : [...filter.strings, s].sort((a, b) => a - b),
    });

  const setMin = (value: string) => {
    const n = Number(value);
    setFilter({ fretMin: n, fretMax: Math.max(n, filter.fretMax) });
  };
  const setMax = (value: string) => {
    const n = Number(value);
    setFilter({ fretMax: n, fretMin: Math.min(n, filter.fretMin) });
  };

  return (
    <section className="screen">
      <h2>Foco</h2>

      <h3>Cordas</h3>
      <div className="chips">
        {[1, 2, 3, 4, 5, 6].map((s) => (
          <button
            key={s}
            type="button"
            className="chip"
            aria-label={`Corda ${s}`}
            aria-pressed={filter.strings.includes(s)}
            onClick={() => toggleString(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <h3>Casas</h3>
      <div className="chips">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            className="chip chip--wide"
            aria-pressed={filter.fretMin === p.min && filter.fretMax === p.max}
            onClick={() => setFilter({ fretMin: p.min, fretMax: p.max })}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="field-row">
        <label>
          Casa inicial
          <select value={filter.fretMin} onChange={(e) => setMin(e.target.value)}>
            {FRET_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <label>
          Casa final
          <select value={filter.fretMax} onChange={(e) => setMax(e.target.value)}>
            {FRET_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="check">
        <input
          type="checkbox"
          checked={filter.naturalsOnly}
          onChange={(e) => setFilter({ naturalsOnly: e.target.checked })}
        />
        Só notas naturais
      </label>

      <p data-testid="count" className="count">
        {count} posições no foco
      </p>
      {count === 0 && (
        <p className="empty">
          Nenhuma posição: selecione ao menos uma corda ou inclua notas com sustenido.
        </p>
      )}
    </section>
  );
}
```

Observação: `<select value={number}>` renderiza `value` como string no DOM; o teste compara com `'5'`, o que o React garante.

- [ ] **Step 4: Implementação — Progresso**

`src/ui/screens/Progress.tsx`:
```tsx
import { useMemo } from 'react';
import { MAX_FRET, allPositions, positionKey, type Position } from '../../domain/fretboard';
import { masteryOf, type Mastery } from '../../domain/scheduler';
import { useAppState } from '../../state/AppState';
import { Fretboard, type Mark } from '../Fretboard';

const LEGEND: { mastery: Mastery; label: string }[] = [
  { mastery: 'mastered', label: 'Dominadas' },
  { mastery: 'learning', label: 'Aprendendo' },
  { mastery: 'wrong', label: 'Errando' },
  { mastery: 'unseen', label: 'Nunca vistas' },
];

export function Progress({ onSelect }: { onSelect(position: Position): void }) {
  const { data } = useAppState();
  const { progress, settings } = data;

  const { marks, counts } = useMemo(() => {
    const counts: Record<Mastery, number> = { unseen: 0, wrong: 0, learning: 0, mastered: 0 };
    const marks: Mark[] = allPositions().map((position) => {
      const kind = masteryOf(progress[positionKey(position)]);
      counts[kind] += 1;
      return { position, kind };
    });
    return { marks, counts };
  }, [progress]);

  return (
    <section className="screen">
      <h2>Progresso</h2>
      <Fretboard
        fretMin={0}
        fretMax={MAX_FRET}
        marks={marks}
        onTap={onSelect}
        leftHanded={settings.leftHanded}
      />
      <ul className="legend">
        {LEGEND.map(({ mastery, label }) => (
          <li key={mastery}>
            <span className={`swatch swatch--${mastery}`} aria-hidden="true" />
            {label}: {counts[mastery]}
          </li>
        ))}
      </ul>
      <p className="hint">Toque numa posição para estudá-la.</p>
    </section>
  );
}
```

- [ ] **Step 5: Implementação — Ajustes**

`src/ui/screens/Settings.tsx`:
```tsx
import type { Notation } from '../../domain/notes';
import { useAppState } from '../../state/AppState';

const NOTATIONS: { value: Notation; label: string }[] = [
  { value: 'cifra', label: 'C D E' },
  { value: 'solfejo', label: 'Dó Ré Mi' },
  { value: 'ambos', label: 'Os dois' },
];

export function Settings() {
  const { data, updateSettings, resetProgress } = useAppState();
  const { settings } = data;

  return (
    <section className="screen">
      <h2>Ajustes</h2>

      <fieldset>
        <legend>Notação</legend>
        {NOTATIONS.map(({ value, label }) => (
          <label key={value} className="check">
            <input
              type="radio"
              name="notation"
              checked={settings.notation === value}
              onChange={() => updateSettings({ notation: value })}
            />
            {label}
          </label>
        ))}
      </fieldset>

      <label className="check">
        <input
          type="checkbox"
          checked={settings.leftHanded}
          onChange={(e) => updateSettings({ leftHanded: e.target.checked })}
        />
        Mão esquerda
      </label>

      <button
        type="button"
        className="danger"
        onClick={() => {
          if (window.confirm('Apagar todo o progresso? Isso não pode ser desfeito.')) {
            resetProgress();
          }
        }}
      >
        Zerar progresso
      </button>
    </section>
  );
}
```

- [ ] **Step 6: Implementação — App e estilos**

`src/App.tsx`:
```tsx
import { useState } from 'react';
import type { Position } from './domain/fretboard';
import { AppProvider, useAppState } from './state/AppState';
import type { StorageLike } from './state/storage';
import { Focus } from './ui/screens/Focus';
import { Progress } from './ui/screens/Progress';
import { Settings } from './ui/screens/Settings';
import { Study } from './ui/screens/Study';

type Tab = 'study' | 'progress' | 'focus' | 'settings';

const TABS: { tab: Tab; label: string }[] = [
  { tab: 'study', label: 'Estudar' },
  { tab: 'progress', label: 'Progresso' },
  { tab: 'focus', label: 'Foco' },
  { tab: 'settings', label: 'Ajustes' },
];

function Shell() {
  const { storageAvailable, recovered } = useAppState();
  const [tab, setTab] = useState<Tab>('study');
  const [forced, setForced] = useState<Position | null>(null);
  const [recoveredDismissed, setRecoveredDismissed] = useState(false);

  const go = (next: Tab) => {
    setForced(null);
    setTab(next);
  };

  return (
    <div className="app">
      <header className="banners">
        {!storageAvailable && (
          <p className="banner">O progresso não será salvo neste navegador (armazenamento indisponível).</p>
        )}
        {recovered && !recoveredDismissed && (
          <p className="banner">
            Os dados salvos estavam corrompidos e foram reiniciados. Uma cópia foi guardada.
            <button type="button" aria-label="Fechar aviso" onClick={() => setRecoveredDismissed(true)}>
              ×
            </button>
          </p>
        )}
      </header>

      <main>
        {tab === 'study' && <Study forced={forced} />}
        {tab === 'progress' && (
          <Progress
            onSelect={(position) => {
              setForced(position);
              setTab('study');
            }}
          />
        )}
        {tab === 'focus' && <Focus />}
        {tab === 'settings' && <Settings />}
      </main>

      <nav className="tabs" aria-label="Principal">
        {TABS.map(({ tab: t, label }) => (
          <button
            key={t}
            type="button"
            aria-current={tab === t ? 'page' : undefined}
            onClick={() => go(t)}
          >
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

export function App({ storage }: { storage?: StorageLike | null }) {
  return (
    <AppProvider storage={storage}>
      <Shell />
    </AppProvider>
  );
}
```

`src/main.tsx` — adicionar o import dos estilos:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`src/styles.css`:
```css
:root {
  color-scheme: dark light;
  --bg: #14110f;
  --surface: #211c18;
  --surface-2: #2d2620;
  --text: #f4ece3;
  --muted: #a89c8f;
  --line: #4a4036;
  --accent: #e8a33d;
  --ok: #4caf7a;
  --bad: #e5604d;
  --warn: #d9b93c;
  --wood: #3a2c20;
  --tap: 48px;
}
@media (prefers-color-scheme: light) {
  :root {
    --bg: #faf5ee;
    --surface: #ffffff;
    --surface-2: #efe6da;
    --text: #231b14;
    --muted: #6d6256;
    --line: #cdbfae;
    --wood: #e9d9c3;
  }
}

* { box-sizing: border-box; }
html, body, #root { height: 100%; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font: 16px/1.4 system-ui, -apple-system, 'Segoe UI', sans-serif;
  -webkit-tap-highlight-color: transparent;
}
button, select, input { font: inherit; color: inherit; }
button { cursor: pointer; }

.app {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-width: 640px;
  margin: 0 auto;
  padding-top: env(safe-area-inset-top);
}
main { flex: 1; overflow-y: auto; padding: 0 16px 16px; }
.screen h2 { margin: 12px 0 8px; font-size: 1.25rem; }
.screen h3 { margin: 16px 0 8px; font-size: 0.95rem; color: var(--muted); font-weight: 600; }

.banners .banner {
  margin: 0;
  padding: 8px 16px;
  background: var(--warn);
  color: #1a1408;
  font-size: 0.875rem;
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.banner button { background: none; border: 0; font-size: 1.25rem; line-height: 1; }

/* Abas */
.tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  background: var(--surface);
  border-top: 1px solid var(--line);
  padding-bottom: env(safe-area-inset-bottom);
}
.tabs button {
  min-height: var(--tap);
  background: none;
  border: 0;
  color: var(--muted);
  font-size: 0.875rem;
}
.tabs button[aria-current='page'] { color: var(--accent); font-weight: 700; }

/* Estudar */
.mode-bar { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin: 12px 0 4px; }
.mode-bar button {
  min-height: 44px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 10px;
  font-size: 0.8125rem;
}
.mode-bar button[aria-pressed='true'] { background: var(--accent); border-color: var(--accent); color: #1a1408; font-weight: 700; }
.session { margin: 4px 0 8px; color: var(--muted); font-size: 0.875rem; }
.prompt { margin: 8px 0; font-size: 1.125rem; font-weight: 600; }
.empty, .hint { color: var(--muted); }

.options { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 16px; }
.options--two { grid-template-columns: 1fr 1fr; }
.option {
  min-height: 56px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  font-size: 1.125rem;
  font-weight: 600;
}
.option:disabled { cursor: default; }
.option--correct { background: var(--ok); border-color: var(--ok); color: #08140d; }
.option--wrong { background: var(--bad); border-color: var(--bad); color: #1c0905; }

.primary, .danger {
  width: 100%;
  min-height: 52px;
  margin-top: 12px;
  border: 0;
  border-radius: 12px;
  font-weight: 700;
}
.primary { background: var(--accent); color: #1a1408; }
.danger { background: var(--bad); color: #1c0905; margin-top: 24px; }
.feedback { margin-top: 12px; }
.feedback p { margin: 0; font-weight: 600; }

/* Braço */
.fretboard {
  overflow-x: auto;
  background: var(--wood);
  border-radius: 12px;
  -webkit-overflow-scrolling: touch;
}
.fretboard svg { display: block; }
.fret-number { fill: var(--muted); font-size: 11px; }
.wire { stroke: var(--muted); stroke-width: 1.5; }
.nut { stroke: var(--text); stroke-width: 4; }
.string { stroke: var(--text); opacity: 0.7; }
.inlay { fill: var(--line); }
.cell { fill: transparent; }
.cell--tappable { cursor: pointer; }
.mark circle { stroke: var(--bg); stroke-width: 2; }
.mark text { font-size: 11px; font-weight: 700; fill: #111; }
.mark--target circle { fill: var(--accent); }
.mark--correct circle { fill: var(--ok); }
.mark--wrong circle { fill: var(--bad); }
.mark--hint circle { fill: var(--accent); opacity: 0.55; }
.mark--unseen circle { fill: var(--muted); opacity: 0.35; r: 7; }
.mark--learning circle { fill: var(--warn); r: 9; }
.mark--mastered circle { fill: var(--ok); r: 9; }
.mark--unseen.mark circle, .mark--learning circle, .mark--mastered circle { stroke-width: 1; }

/* Foco / Progresso / Ajustes */
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip {
  min-width: var(--tap);
  min-height: var(--tap);
  padding: 0 14px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  font-weight: 600;
}
.chip--wide { flex: 1; }
.chip[aria-pressed='true'] { background: var(--accent); border-color: var(--accent); color: #1a1408; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
.field-row label { display: flex; flex-direction: column; gap: 4px; font-size: 0.875rem; color: var(--muted); }
select {
  min-height: var(--tap);
  padding: 0 12px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 10px;
  font-size: 1rem;
}
.check { display: flex; align-items: center; gap: 12px; min-height: var(--tap); }
.check input { width: 22px; height: 22px; accent-color: var(--accent); }
fieldset { border: 1px solid var(--line); border-radius: 12px; margin: 12px 0; }
legend { padding: 0 8px; color: var(--muted); }
.count { font-weight: 700; margin-top: 16px; }
.legend { list-style: none; padding: 0; margin: 12px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.swatch { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; }
.swatch--mastered { background: var(--ok); }
.swatch--learning { background: var(--warn); }
.swatch--wrong { background: var(--bad); }
.swatch--unseen { background: var(--muted); opacity: 0.5; }
```

Observação: `.mark--wrong circle` é usado tanto pelo erro do quiz (círculo grande) quanto pelo domínio "errando" no Progresso; no Progresso o círculo grande vermelho é aceitável e mantém a legenda coerente.

- [ ] **Step 7: Rodar toda a suíte e o typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: todos os testes passam, sem erros de tipo.

- [ ] **Step 8: Commit**

```bash
git add src
git commit -m "feat(ui): Focus, Progress and Settings screens, tab navigation and styles" \
  --trailer "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" \
  --trailer "Claude-Session: https://claude.ai/code/session_01YSPS7fXqt2sVKM4uaawqbi"
```

---

### Task 11: PWA, verificação no navegador e README

**Files:**
- Create: `public/icon.svg`, `pwa-assets.config.ts`, `README.md`
- Modify: `vite.config.ts`, `index.html`

**Interfaces:**
- Consumes: todo o app dos Tasks anteriores.
- Produces: build com `manifest.webmanifest` e service worker; ícones PNG gerados em `public/`.

- [ ] **Step 1: Instalar dependências de PWA**

```bash
npm install -D vite-plugin-pwa @vite-pwa/assets-generator
```

- [ ] **Step 2: Ícone-fonte e gerador de ícones**

`public/icon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#14110f"/>
  <g stroke="#a89c8f" stroke-width="6">
    <line x1="96" y1="160" x2="416" y2="160"/><line x1="96" y1="224" x2="416" y2="224"/>
    <line x1="96" y1="288" x2="416" y2="288"/><line x1="96" y1="352" x2="416" y2="352"/>
  </g>
  <g stroke="#f4ece3" stroke-width="10"><line x1="144" y1="136" x2="144" y2="376"/></g>
  <g stroke="#a89c8f" stroke-width="6">
    <line x1="256" y1="136" x2="256" y2="376"/><line x1="368" y1="136" x2="368" y2="376"/>
  </g>
  <circle cx="312" cy="224" r="28" fill="#e8a33d"/>
</svg>
```

`pwa-assets.config.ts`:
```ts
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  preset: minimal2023Preset,
  images: ['public/icon.svg'],
});
```

Run: `npx pwa-assets-generator`
Expected: criados em `public/`: `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`, `favicon.ico`.

- [ ] **Step 3: Configurar o plugin PWA**

`vite.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon.svg'],
      manifest: {
        name: 'Guitar Mapper',
        short_name: 'Guitar Mapper',
        description: 'Memorize as notas do braço da guitarra.',
        lang: 'pt-BR',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#14110f',
        background_color: '#14110f',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
});
```

`index.html` — dentro do `<head>`, depois do `theme-color`:
```html
    <link rel="icon" href="/favicon.ico" sizes="48x48" />
    <link rel="icon" href="/icon.svg" sizes="any" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

- [ ] **Step 4: Build e suíte completa**

Run: `npm test && npm run build && ls dist`
Expected: testes passam; build conclui; `dist/` contém `manifest.webmanifest`, `sw.js` e os ícones PNG.

- [ ] **Step 5: Verificação visual em 390px**

Subir `npm run dev -- --host` (ou `npm run preview` após o build) e abrir no navegador com a janela em **390×844**. Conferir cada item e anotar o que falhar:

1. Estudar, múltipla escolha: o ponto aparece no braço, as 4 opções cabem sem rolagem horizontal da página, acertar fica verde e avança sozinho, errar mostra "Era …" e o botão Próxima.
2. Estudar, nota → posição: tocar na célula certa e na errada; ao errar, as posições da nota aparecem destacadas.
3. Estudar, flashcard: Mostrar nota → Acertei/Errei.
4. Foco: preset "Casas 12–24" faz o braço rolar horizontalmente; desmarcar todas as cordas mostra a mensagem e Estudar mostra o aviso.
5. Progresso: o braço inteiro (0–24) rola; responder algumas posições muda as cores; tocar numa posição abre Estudar nela.
6. Ajustes: trocar a notação muda os rótulos; Mão esquerda espelha o braço; Zerar progresso pede confirmação.
7. Recarregar a página mantém configurações e progresso.
8. Alvos de toque ≥ 44px, sem zoom ao tocar nos `select` do iOS (fonte ≥ 16px), abas respeitam a área segura inferior.

Corrigir em `src/styles.css` ou nos componentes o que falhar e rodar `npm test` de novo. Se a janela do navegador não puder ser redimensionada, usar o modo de dispositivo das ferramentas de desenvolvedor.

- [ ] **Step 6: README**

`README.md`:
```markdown
# Guitar Mapper

App web (PWA) para memorizar as notas do braço da guitarra, casas 0–24, com quiz de múltipla escolha, "encontre a nota" no braço e flashcards, com repetição espaçada.

## Desenvolvimento

    npm install
    npm run dev        # servidor local
    npm test           # testes (Vitest)
    npm run build      # build de produção em dist/
    npm run preview    # serve o build

## Estrutura

- `src/domain/`: lógica musical e repetição espaçada (TypeScript puro, sem React).
- `src/state/`: persistência no `localStorage` e contexto do app.
- `src/ui/`: componente do braço (SVG) e telas.

Spec e plano em `docs/superpowers/`.
```

- [ ] **Step 7: Commit**

```bash
git add public pwa-assets.config.ts vite.config.ts index.html package.json package-lock.json README.md
git commit -m "feat: PWA manifest, icons and README" \
  --trailer "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" \
  --trailer "Claude-Session: https://claude.ai/code/session_01YSPS7fXqt2sVKM4uaawqbi"
```

- [ ] **Step 8: Entregar**

Não fazer push automaticamente. Resumir ao usuário o que foi feito, o resultado de `npm test` e `npm run build`, os itens da verificação visual que passaram ou falharam, e perguntar se quer enviar para `origin` (`git push -u origin main`).
