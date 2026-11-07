# Intervalos: sentido/som, círculo de quintas, contagem e destaque do Shift — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Na pergunta de Intervalos: interruptor de som e sentido do som (subindo/descendo), contagem regressiva visível no avanço automático, destaque dos sustenidos enquanto Shift está pressionado e círculo de quintas ligando partida e chegada.

**Architecture:** Novo ajuste global opcional `intervalDirection` (`'up' | 'down'`) no armazenamento v2, sem migração. A `IntervalQuiz` passa a ler `soundEnabled` e `intervalDirection` do estado do app (não da prop `settings`) e ganha: botões Som/Sentido, ordem do som invertida no modo descendo, um hook `useCountdown`, um hook `useShiftHeld` e o componente `CircleOfFifths` (SVG puro, alimentado por `circleLayout` no domínio).

**Tech Stack:** React 19 + TypeScript, Vite (PWA), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-07-interval-quiz-extras-design.md`

## Global Constraints

- `intervalDirection`: `'up' | 'down'`, padrão `'up'`. Valor inválido ou ausente vira `'up'`. Fica em `GlobalSettings` (e por isso em `Settings`) e em `DEFAULT_SETTINGS`.
- A pergunta é sempre "nota + intervalo, acima". O sentido só inverte a ordem de `intervalPitches(...)` ao tocar: `up` → `[partida, chegada]`; `down` → `[chegada, partida]`. Nenhuma altura nova.
- O interruptor **Som** é o `soundEnabled` global (o mesmo de Ajustes). **Sentido** fica desabilitado com o som desligado.
- `IntervalQuiz` lê `soundEnabled` e `intervalDirection` de `useAppState().data.settings`; a prop `settings` continua para o que já usa (`notation`, `leftHanded`, `intervalAdvance`).
- Ordem do círculo de quintas, notas 0–11: `[0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5]` (C G D A E B F♯ C♯ G♯ D♯ A♯ F), do topo, sentido horário, 30° cada.
- Rótulos do círculo: cifra ou solfejo conforme a notação; em `ambos`, só a cifra.
- Contagem: só com avanço `3s` ou `5s` e a pergunta respondida; texto `Próxima em Ns`, nunca abaixo de 1 enquanto a pergunta está na tela.
- Destaque do Shift: classe `note-option--shift` nos botões 1, 3, 6, 8, 10 (C♯, D♯, F♯, G♯, A♯) enquanto Shift está pressionado e a pergunta não respondida; limpa em `keyup` de Shift, ao responder e em `blur` da janela.
- Os testes existentes de `IntervalQuiz` (som 36 → 43, avanço, desmontar) continuam passando sem edição.
- Texto da interface em português. Commits com as linhas `Co-Authored-By` e `Claude-Session` da sessão. Rodar `npm test` e `npm run build` ao final de cada tarefa.

## Review Focus

- Trocar o sentido para `down` toca a chegada primeiro (MIDI 43) e a partida depois (36) para C + 5ª J no baixo; com o som desligado não toca nada, nem a nota pendente depois de desligar.
- Trocar sentido/som depois de responder não toca nada.
- O circulo não revela a chegada antes de responder; singular `1 semitom acima`; sem nomes enarmônicos; notação `ambos` mostra só a cifra.
- A contagem some em avanço manual, mostra 3→1 (ou 5→1) e não passa de um valor errado quando a pergunta muda (a próxima pergunta recomeça).
- O destaque do Shift não fica preso ao trocar de janela (`blur`) e não aparece depois de responder.
- Dados salvos sem `intervalDirection` abrem com `'up'`; valor inválido vira `'up'`.

---

### Task 1: Ajuste `intervalDirection`

**Files:**
- Modify: `src/state/storage.ts`
- Test: `src/state/storage.test.ts` (dentro do `describe('interval settings', ...)`)

- [ ] **Step 1: Escrever os testes que falham** (depois do teste "sanitizes intervalAdvance")

```ts
  it('defaults intervalDirection to up and sanitizes it', () => {
    expect(createDefaultData().settings.intervalDirection).toBe('up');
    expect(load({}).intervalDirection).toBe('up');
    expect(load({ intervalDirection: 'sideways' }).intervalDirection).toBe('up');
    expect(load({ intervalDirection: 'down' }).intervalDirection).toBe('down');
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/state/storage.test.ts`
Expected: FAIL (`intervalDirection` undefined).

- [ ] **Step 3: Implementar** em `src/state/storage.ts`

Depois de `export type IntervalAdvance = ...` acrescentar `export type IntervalDirection = 'up' | 'down';`. Em `GlobalSettings`, depois de `intervalAdvance: IntervalAdvance;`, acrescentar `intervalDirection: IntervalDirection;`. Em `DEFAULT_SETTINGS`, depois de `intervalAdvance: 'manual',`, acrescentar `intervalDirection: 'up',`. Depois de `const ADVANCES...` acrescentar `const DIRECTIONS: IntervalDirection[] = ['up', 'down'];`. No objeto retornado pela sanitização, depois do bloco de `intervalAdvance`, acrescentar:

```ts
    intervalDirection: DIRECTIONS.includes(source.intervalDirection as IntervalDirection)
      ? (source.intervalDirection as IntervalDirection)
      : DEFAULT_SETTINGS.intervalDirection,
```

- [ ] **Step 4: Rodar tudo**

Run: `npm test && npx tsc --noEmit`
Expected: PASS; se algum literal de `GlobalSettings`/`Settings` em testes ou `test-utils` reclamar do campo novo, acrescentar `intervalDirection: 'up'` nele.

- [ ] **Step 5: Commit**

```bash
git add -A src && git commit -m "feat(state): intervalDirection setting with safe default"
```

---

### Task 2: Botões Som e Sentido e a ordem do som

**Files:**
- Modify: `src/ui/screens/IntervalQuiz.tsx`
- Modify: `src/styles.css`
- Test: `src/ui/screens/IntervalQuiz.test.tsx`

Contexto: `setup()` do teste usa `seededStorage({ instrument, settings: { instrument } })`; o som padrão é ligado e `fakePlayer().play` é chamado com 36 e, 700 ms depois, 43 (C + 5ª J no baixo). Para começar em `down`, estender o `setup` com `direction?: 'up' | 'down'` e `sound?: boolean`, repassando `intervalDirection` e `soundEnabled` ao `seededStorage` em `settings`.

- [ ] **Step 1: Escrever os testes que falham**

Ajustar o `setup` (opção `direction`, `sound`) e acrescentar:

```tsx
  describe('sound controls', () => {
    it('plays the arrival first when the direction is down', () => {
      const { player } = setup({ direction: 'down' });
      fireEvent.click(noteBtn('G'));
      expect(player.play).toHaveBeenCalledWith(43);
      act(() => void vi.advanceTimersByTime(700));
      expect(player.play).toHaveBeenLastCalledWith(36);
    });

    it('the Sentido button switches the direction and is disabled with the sound off', () => {
      const { player } = setup();
      const dir = screen.getByRole('button', { name: /Sentido/ });
      expect(dir).toHaveAttribute('aria-pressed', 'false');
      fireEvent.click(dir);
      expect(dir).toHaveAttribute('aria-pressed', 'true');
      fireEvent.click(noteBtn('G'));
      expect(player.play).toHaveBeenCalledWith(43);
    });

    it('the Som button turns the sound off: nothing plays and Sentido is disabled', () => {
      const { player } = setup();
      const sound = screen.getByRole('button', { name: /^Som/ });
      expect(sound).toHaveAttribute('aria-pressed', 'true');
      fireEvent.click(sound);
      expect(sound).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByRole('button', { name: /Sentido/ })).toBeDisabled();
      fireEvent.click(noteBtn('G'));
      act(() => void vi.advanceTimersByTime(2000));
      expect(player.play).not.toHaveBeenCalled();
    });

    it('changing the direction after answering plays nothing', () => {
      const { player } = setup();
      fireEvent.click(noteBtn('G'));
      act(() => void vi.advanceTimersByTime(2000));
      player.play.mockClear();
      fireEvent.click(screen.getByRole('button', { name: /Sentido/ }));
      act(() => void vi.advanceTimersByTime(2000));
      expect(player.play).not.toHaveBeenCalled();
    });
  });
```

(`player.play` é um `vi.fn()`, então `mockClear` existe; se o tipo `NotePlayer` reclamar, tipar `fakePlayer` como `{ [K in keyof NotePlayer]: ReturnType<typeof vi.fn> }`.)

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/screens/IntervalQuiz.test.tsx`
Expected: FAIL (botões não existem).

- [ ] **Step 3: Implementar** em `IntervalQuiz.tsx`

Mudar `const { instrument } = useAppState();` para `const { instrument, data, updateSettings } = useAppState();` e acrescentar:

```tsx
  const { soundEnabled, intervalDirection } = data.settings;
  const descending = intervalDirection === 'down';
```

Em `choose`, trocar `sound.playPitches(pitches);` por `sound.playPitches(descending ? [pitches[1], pitches[0]] : pitches);`.

No JSX, antes de `<p className="prompt">`, acrescentar:

```tsx
      <div className="sound-controls">
        <button
          type="button"
          className="sound-btn"
          aria-pressed={soundEnabled}
          onClick={() => updateSettings({ soundEnabled: !soundEnabled })}
        >
          Som
        </button>
        <button
          type="button"
          className="sound-btn"
          aria-pressed={descending}
          aria-label={`Sentido: ${descending ? 'descendo' : 'subindo'}`}
          disabled={!soundEnabled}
          onClick={() => updateSettings({ intervalDirection: descending ? 'up' : 'down' })}
        >
          {descending ? '↓ Descendo' : '↑ Subindo'}
        </button>
      </div>
```

Em `src/styles.css`, perto de `.keyboard-hint`/`.note-grid`:

```css
.sound-controls { display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 4px; }
.sound-btn { padding: 4px 10px; font-size: 0.8rem; }
.sound-btn[aria-pressed='true'] { background: var(--accent); border-color: var(--accent); color: #1a1408; }
.sound-btn:disabled { opacity: 0.5; }
```

- [ ] **Step 4: Rodar tudo**

Run: `npm test && npm run build`
Expected: PASS (inclusive os testes antigos de som 36 → 43).

- [ ] **Step 5: Commit**

```bash
git add -A src && git commit -m "feat(ui): sound toggle and up/down playback order in the interval quiz"
```

---

### Task 3: Contagem regressiva visível

**Files:**
- Create: `src/ui/useCountdown.ts`
- Test: `src/ui/useCountdown.test.tsx`
- Modify: `src/ui/screens/IntervalQuiz.tsx`
- Test: `src/ui/screens/IntervalQuiz.test.tsx`

- [ ] **Step 1: Escrever os testes que falham**

`src/ui/useCountdown.test.tsx`:

```tsx
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { useCountdown } from './useCountdown';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useCountdown', () => {
  it('is null while inactive', () => {
    const { result } = renderHook(() => useCountdown(false, 3000));
    expect(result.current).toBeNull();
  });

  it('counts 3, 2, 1 and stays at 1', () => {
    const { result } = renderHook(() => useCountdown(true, 3000));
    expect(result.current).toBe(3);
    act(() => void vi.advanceTimersByTime(1000));
    expect(result.current).toBe(2);
    act(() => void vi.advanceTimersByTime(1000));
    expect(result.current).toBe(1);
    act(() => void vi.advanceTimersByTime(5000));
    expect(result.current).toBe(1);
  });

  it('restarts when it becomes active again', () => {
    const { result, rerender } = renderHook(({ on }) => useCountdown(on, 3000), {
      initialProps: { on: true },
    });
    act(() => void vi.advanceTimersByTime(2000));
    rerender({ on: false });
    expect(result.current).toBeNull();
    rerender({ on: true });
    expect(result.current).toBe(3);
  });
});
```

Em `IntervalQuiz.test.tsx`:

```tsx
  it('shows the countdown only with automatic advance', () => {
    setup({ advance: '3s' });
    expect(screen.queryByText(/Próxima em/)).not.toBeInTheDocument();
    fireEvent.click(noteBtn('E'));
    expect(screen.getByText('Próxima em 3s')).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(1000));
    expect(screen.getByText('Próxima em 2s')).toBeInTheDocument();
  });

  it('shows no countdown in manual advance', () => {
    setup({ advance: 'manual' });
    fireEvent.click(noteBtn('E'));
    expect(screen.queryByText(/Próxima em/)).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/useCountdown.test.tsx src/ui/screens/IntervalQuiz.test.tsx`
Expected: FAIL (módulo e texto não existem).

- [ ] **Step 3: Implementar**

`src/ui/useCountdown.ts`:

```ts
import { useEffect, useState } from 'react';

/** Segundos restantes (arredondados para cima, mínimo 1) enquanto `active`; `null` fora disso. */
export function useCountdown(active: boolean, totalMs: number): number | null {
  const [now, setNow] = useState(() => Date.now());
  const [startedAt, setStartedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!active) {
      setStartedAt(null);
      return;
    }
    const start = Date.now();
    setStartedAt(start);
    setNow(start);
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [active, totalMs]);

  if (!active || startedAt === null) return active ? Math.ceil(totalMs / 1000) : null;
  return Math.max(1, Math.ceil((totalMs - (now - startedAt)) / 1000));
}
```

Em `IntervalQuiz.tsx`: importar `useCountdown`; depois de `useAutoAdvance(...)`, acrescentar `const remaining = useCountdown(answered && delay > 0, delay);` e, dentro de `quiz-actions`, depois do botão "Próxima":

```tsx
          {remaining !== null && (
            <span className="countdown" aria-live="off">
              Próxima em {remaining}s
            </span>
          )}
```

CSS: `.countdown { font-size: 0.85rem; color: var(--muted); margin-left: 12px; }`.

- [ ] **Step 4: Rodar tudo**

Run: `npm test && npm run build`
Expected: PASS. Se o teste `Próxima em 3s` falhar por o texto vir quebrado em nós (`Próxima em `, `3`, `s`), trocar o JSX por uma template string: `{`Próxima em ${remaining}s`}`.

- [ ] **Step 5: Commit**

```bash
git add -A src && git commit -m "feat(ui): visible countdown to the next interval question"
```

---

### Task 4: Destaque dos sustenidos com Shift

**Files:**
- Create: `src/ui/useShiftHeld.ts`
- Modify: `src/ui/screens/IntervalQuiz.tsx`, `src/styles.css`
- Test: `src/ui/screens/IntervalQuiz.test.tsx`

- [ ] **Step 1: Escrever os testes que falham**

```tsx
  describe('shift highlight', () => {
    const sharps = () =>
      noteButtons()
        .filter((b) => b.classList.contains('note-option--shift'))
        .map((b) => b.textContent);

    it('highlights C#, D#, F#, G#, A# only while Shift is held', () => {
      setup();
      expect(sharps()).toEqual([]);
      fireEvent.keyDown(document.body, { key: 'Shift', shiftKey: true });
      expect(sharps()).toEqual(['C#', 'D#', 'F#', 'G#', 'A#']);
      fireEvent.keyUp(document.body, { key: 'Shift' });
      expect(sharps()).toEqual([]);
    });

    it('clears on window blur', () => {
      setup();
      fireEvent.keyDown(document.body, { key: 'Shift', shiftKey: true });
      fireEvent.blur(window);
      expect(sharps()).toEqual([]);
    });

    it('does not highlight after the question is answered', () => {
      setup();
      fireEvent.keyDown(document.body, { key: 'Shift', shiftKey: true });
      fireEvent.click(noteBtn('G'));
      expect(sharps()).toEqual([]);
    });
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/screens/IntervalQuiz.test.tsx`
Expected: FAIL (classe não existe).

- [ ] **Step 3: Implementar**

`src/ui/useShiftHeld.ts`:

```ts
import { useEffect, useState } from 'react';

/** `true` enquanto a tecla Shift está pressionada; solta ao perder o foco da janela. */
export function useShiftHeld(): boolean {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    const down = (e: KeyboardEvent) => setHeld(e.shiftKey || e.key === 'Shift');
    const up = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setHeld(false);
    };
    const reset = () => setHeld(false);
    document.addEventListener('keydown', down);
    document.addEventListener('keyup', up);
    window.addEventListener('blur', reset);
    return () => {
      document.removeEventListener('keydown', down);
      document.removeEventListener('keyup', up);
      window.removeEventListener('blur', reset);
    };
  }, []);
  return held;
}
```

Em `IntervalQuiz.tsx`: `const shiftHeld = useShiftHeld();` e, no `className` do botão de nota, acrescentar a linha `!answered && shiftHeld && SHARP_KEYS.has(note) ? 'note-option--shift' : '',` com `const SHARP_KEYS = new Set<NoteIndex>([1, 3, 6, 8, 10]);` no topo do arquivo. CSS:

```css
.note-option.note-option--shift { border-color: var(--accent); box-shadow: inset 0 0 0 2px var(--accent); }
```

- [ ] **Step 4: Rodar tudo**

Run: `npm test && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A src && git commit -m "feat(ui): highlight the sharp keys while Shift is held"
```

---

### Task 5: Círculo de quintas

**Files:**
- Create: `src/domain/circle.ts`, `src/ui/CircleOfFifths.tsx`
- Test: `src/domain/circle.test.ts`, `src/ui/CircleOfFifths.test.tsx`
- Modify: `src/ui/screens/IntervalQuiz.tsx`, `src/styles.css`
- Test: `src/ui/screens/IntervalQuiz.test.tsx`

- [ ] **Step 1: Escrever os testes que falham**

`src/domain/circle.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { CIRCLE_ORDER, circleAngle } from './circle';

describe('circle of fifths', () => {
  it('lists the 12 notes in fifths from C', () => {
    expect(CIRCLE_ORDER).toEqual([0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5]);
    expect(new Set(CIRCLE_ORDER).size).toBe(12);
  });

  it('puts C at the top and G a twelfth of the way round', () => {
    expect(circleAngle(0)).toBe(0);
    expect(circleAngle(7)).toBe(30);
    expect(circleAngle(5)).toBe(330);
  });
});
```

`src/ui/CircleOfFifths.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CircleOfFifths } from './CircleOfFifths';

describe('CircleOfFifths', () => {
  it('shows the 12 notes and only the root before the answer', () => {
    const { container } = render(<CircleOfFifths root={0} target={7} answered={false} notation="cifra" />);
    expect(container.querySelectorAll('g.circle-note')).toHaveLength(12);
    expect(container.querySelectorAll('g.circle-note--root')).toHaveLength(1);
    expect(container.querySelectorAll('g.circle-note--target')).toHaveLength(0);
    expect(container.querySelectorAll('line.circle-link')).toHaveLength(0);
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Círculo de quintas. Partida C');
    expect(screen.getByText('Responda para ver como as duas notas se ligam.')).toBeInTheDocument();
  });

  it('after the answer marks the target, links both and counts the semitones', () => {
    const { container } = render(<CircleOfFifths root={0} target={7} answered notation="cifra" />);
    expect(container.querySelectorAll('g.circle-note--target')).toHaveLength(1);
    expect(container.querySelectorAll('line.circle-link')).toHaveLength(1);
    expect(screen.getByText('7 semitons acima')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Círculo de quintas. Partida C, chegada G');
  });

  it('uses the singular for one semitone', () => {
    render(<CircleOfFifths root={0} target={1} answered notation="cifra" />);
    expect(screen.getByText('1 semitom acima')).toBeInTheDocument();
  });

  it('labels by notation and falls back to the cifra for ambos', () => {
    const solfejo = render(<CircleOfFifths root={0} target={7} answered notation="solfejo" />);
    expect(solfejo.container.textContent).toContain('Sol');
    solfejo.unmount();
    const ambos = render(<CircleOfFifths root={0} target={7} answered notation="ambos" />);
    expect(ambos.container.textContent).not.toContain('·');
  });
});
```

Em `IntervalQuiz.test.tsx`:

```tsx
  it('shows the circle of fifths, revealing the arrival only after answering', () => {
    const { container } = setup();
    expect(container.querySelectorAll('g.circle-note--root')).toHaveLength(1);
    expect(container.querySelectorAll('g.circle-note--target')).toHaveLength(0);
    fireEvent.click(noteBtn('E'));
    expect(container.querySelectorAll('g.circle-note--target')).toHaveLength(1);
    expect(screen.getByText('7 semitons acima')).toBeInTheDocument();
  });
```

(Nota: a legenda mostra a distância do **intervalo** da pergunta, 7 para a 5ª J, não a da resposta errada; o círculo marca a **resposta certa**, `answer`, independente do que foi escolhido.)

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/domain/circle.test.ts src/ui/CircleOfFifths.test.tsx src/ui/screens/IntervalQuiz.test.tsx`
Expected: FAIL (módulos não existem).

- [ ] **Step 3: Implementar**

`src/domain/circle.ts`:

```ts
import type { NoteIndex } from './notes';

/** As 12 notas em quintas, a partir de C: C G D A E B F♯ C♯ G♯ D♯ A♯ F. */
export const CIRCLE_ORDER: readonly NoteIndex[] = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];

/** Ângulo em graus no relógio (0 = topo, horário) da nota no círculo de quintas. */
export function circleAngle(note: NoteIndex): number {
  return CIRCLE_ORDER.indexOf(note) * 30;
}
```

`src/ui/CircleOfFifths.tsx`:

```tsx
import { CIRCLE_ORDER, circleAngle } from '../domain/circle';
import { noteLabel, type Notation, type NoteIndex } from '../domain/notes';

const SIZE = 240;
const C = SIZE / 2;
const R = 90;

const point = (note: NoteIndex, radius = R) => {
  const rad = (circleAngle(note) * Math.PI) / 180;
  return { x: C + radius * Math.sin(rad), y: C - radius * Math.cos(rad) };
};

export interface CircleOfFifthsProps {
  root: NoteIndex;
  target: NoteIndex;
  answered: boolean;
  notation: Notation;
}

export function CircleOfFifths({ root, target, answered, notation }: CircleOfFifthsProps) {
  // Em "ambos" o rótulo de duas partes não cabe no círculo: só a cifra.
  const style: Notation = notation === 'ambos' ? 'cifra' : notation;
  const semitones = (target - root + 12) % 12;
  const a = point(root);
  const b = point(target);
  const aria =
    `Círculo de quintas. Partida ${noteLabel(root, style)}` +
    (answered ? `, chegada ${noteLabel(target, style)}` : '');
  return (
    <figure className="circle-fifths">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={aria}>
        <circle cx={C} cy={C} r={R} fill="none" className="circle-ring" />
        {answered && <line className="circle-link" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />}
        {CIRCLE_ORDER.map((note) => {
          const p = point(note);
          const kind =
            note === root ? ' circle-note--root' : answered && note === target ? ' circle-note--target' : '';
          return (
            <g key={note} className={`circle-note${kind}`}>
              <circle cx={p.x} cy={p.y} r={16} />
              <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central">
                {noteLabel(note, style)}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption>
        {answered
          ? `${semitones} ${semitones === 1 ? 'semitom' : 'semitons'} acima`
          : 'Responda para ver como as duas notas se ligam.'}
      </figcaption>
    </figure>
  );
}
```

Atenção: se `root === target` (nunca ocorre: intervalos têm 1–11 semitons) ou a nota de chegada coincidir com a de partida, a classe `--root` ganha; sem tratamento extra.

Em `IntervalQuiz.tsx`, depois do bloco `{answered && (<div className="feedback quiz-actions">...)}`, acrescentar:

```tsx
      <CircleOfFifths root={item.root} target={answer} answered={answered} notation={notation} />
```

(com `import { CircleOfFifths } from '../CircleOfFifths';`). CSS:

```css
.circle-fifths { margin: 16px auto 0; max-width: 260px; text-align: center; }
.circle-fifths figcaption { font-size: 0.85rem; color: var(--muted); }
.circle-ring { stroke: var(--muted); opacity: 0.5; }
.circle-note circle { fill: var(--bg); stroke: var(--muted); stroke-width: 1.5; }
.circle-note text { fill: var(--text); font-size: 11px; font-weight: 600; }
.circle-note--root circle { fill: var(--accent); stroke: var(--accent); }
.circle-note--root text { fill: #1a1408; }
.circle-note--target circle { fill: var(--ok); stroke: var(--ok); }
.circle-note--target text { fill: #08140d; }
.circle-link { stroke: var(--accent); stroke-width: 2.5; stroke-dasharray: 6 5; stroke-linecap: round; }
```

- [ ] **Step 4: Rodar tudo e conferir no navegador**

Run: `npm test && npm run build`
Expected: PASS. Depois `npm run dev`, modo Intervalos: o círculo aparece abaixo das notas (e do feedback depois de responder), legível em 375 px e em 1280 px, nos temas claro e escuro, e a linha liga partida e chegada. Se a página ficar comprida demais no celular, reduzir `max-width` do `.circle-fifths`.

- [ ] **Step 5: Commit**

```bash
git add -A src && git commit -m "feat(ui): circle of fifths linking the root and the answer in the interval quiz"
```
