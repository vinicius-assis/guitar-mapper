# Intervalos: teclado A–G e atalho "Acordes" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Responder a pergunta de Intervalos digitando a nota (A–G, Shift para sustenido) e voltar ao conjunto de intervalos de acorde com um chip "Acordes" no Foco.

**Architecture:** O `useQuizShortcuts` já aciona botões que estão na tela; ganha um ramo para letras A–G que clica no botão de nota correspondente (`.note-grid .note-option`, índice = nota 0–11). O `useIntervalFocus` ganha `selectChordTones` e `chordTonesSelected`, usados por um chip novo em `Focus.tsx` e `FocusSheet.tsx`. Sem ajustes novos nem migração.

**Tech Stack:** React 19 + TypeScript, Vite (PWA), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-07-interval-keyboard-chords-design.md`

## Global Constraints

- Mapa de teclas (cifra, sempre): `C`=0, `D`=2, `E`=4, `F`=5, `G`=7, `A`=9, `B`=11. Com Shift: soma 1 semitom, exceto `E` e `B`, que não fazem nada. O sustenido vem de `event.shiftKey`, nunca de Caps Lock.
- Os botões de nota estão na ordem 0–11 dentro de `.note-grid`; a tecla clica `querySelectorAll('.note-grid .note-option')[nota]`, e só conta como tratada se o botão existir e não estiver desabilitado.
- As letras só valem com botões de nota na tela. Mesmas guardas do hook atual: ignorar Ctrl/Alt/Meta, diálogo ou menu aberto, campo de texto. Não alterar `1`–`9`, Enter nem `R`.
- "Acordes" grava exatamente `DEFAULT_INTERVALS` (`3m, 3M, 5J, 7m, 7M`) em `settings.intervals`. Fica marcado só quando a seleção é exatamente esse conjunto. Não mexer em `describeIntervalFocus` nem em `focusSummary.test.ts`.
- Texto da interface em português. Commits com as linhas `Co-Authored-By` e `Claude-Session` da sessão. Rodar `npm test` e `npm run build` ao final de cada tarefa.

## Review Focus

- `Shift+E` e `Shift+B` não respondem nada (não podem responder F ou C), e `Shift+C` responde C#, não D.
- Depois de responder, uma letra não dispara outra resposta nem `preventDefault` indevido; sem botões de nota na tela (outros exercícios, Foco, Progresso) as letras passam batido.
- Chip "Acordes" aparece marcado no padrão, desmarcado depois de tirar ou pôr qualquer intervalo, e "Todos" continua marcado só com os 11.
- Os testes existentes de `useQuizShortcuts`, `Focus`, `FocusSheet` e `focusSummary` continuam passando sem edição.

---

### Task 1: `selectChordTones` no `useIntervalFocus`

**Files:**
- Modify: `src/ui/useIntervalFocus.ts`
- Test: `src/ui/useIntervalFocus.test.tsx`

- [ ] **Step 1: Escrever os testes que falham** (dentro do `describe('useIntervalFocus', ...)`, depois do teste "selects all intervals")

```tsx
  it('selects the chord tones and reports when they are exactly selected', () => {
    const { result } = setup({ intervals: ['2m', '4J'] });
    expect(result.current.chordTonesSelected).toBe(false);
    act(() => result.current.selectChordTones());
    expect(result.current.intervals).toEqual(['3m', '3M', '5J', '7m', '7M']);
    expect(result.current.chordTonesSelected).toBe(true);
  });

  it('chord tones are not selected with an extra or missing interval', () => {
    const { result } = setup();
    expect(result.current.chordTonesSelected).toBe(true);
    act(() => result.current.toggleInterval('2m'));
    expect(result.current.chordTonesSelected).toBe(false);
    act(() => result.current.toggleInterval('2m'));
    act(() => result.current.toggleInterval('5J'));
    expect(result.current.chordTonesSelected).toBe(false);
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/useIntervalFocus.test.tsx`
Expected: FAIL (`selectChordTones is not a function` / `chordTonesSelected` undefined).

- [ ] **Step 3: Implementar**

Em `src/ui/useIntervalFocus.ts`, trocar o import de `../domain/intervals` por `import { DEFAULT_INTERVALS, INTERVALS, type IntervalId } from '../domain/intervals';` e, no objeto retornado, depois de `selectAllIntervals`, acrescentar:

```ts
    selectChordTones: () => updateSettings({ intervals: [...DEFAULT_INTERVALS] }),
    chordTonesSelected:
      intervals.length === DEFAULT_INTERVALS.length &&
      DEFAULT_INTERVALS.every((id) => intervals.includes(id)),
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/ui/useIntervalFocus.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/useIntervalFocus.ts src/ui/useIntervalFocus.test.tsx
git commit -m "feat(ui): chord tones selection in the interval focus hook"
```

---

### Task 2: Chip "Acordes" no Foco e na folha de Foco

**Files:**
- Modify: `src/ui/screens/Focus.tsx` (chips de intervalos, por volta da linha 23)
- Modify: `src/ui/screens/FocusSheet.tsx` (por volta da linha 94)
- Test: `src/ui/screens/Focus.test.tsx`, `src/ui/screens/FocusSheet.test.tsx`

- [ ] **Step 1: Escrever os testes que falham**

Em `Focus.test.tsx`, no `describe` que contém "shows interval controls instead of strings and frets" (o que usa `setupInterval()` e `readSaved`), acrescentar:

```tsx
  it('Acordes selects the chord tones and is pressed only for that set', () => {
    const storage = setupInterval();
    const chip = screen.getByRole('button', { name: 'Acordes' });
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Todos' }));
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(readSaved(storage).settings.intervals).toEqual(['3m', '3M', '5J', '7m', '7M']);
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'false');
  });
```

Em `FocusSheet.test.tsx`, dentro do `describe`, acrescentar um teste análogo para o modo Intervalos. Reaproveitar o `setup` do arquivo: `setup('interval', true)` aberto como no teste "keeps strings and frets in other modes" (ele mostra que o segundo argumento abre a folha). Se o `setup` desse arquivo não aceitar o modo `'interval'`, ler as primeiras 30 linhas do arquivo e ajustar o tipo do parâmetro. Verificações:

```tsx
  it('Acordes chip is pressed by default and restores the chord tones', () => {
    setup('interval', true);
    const chip = screen.getByRole('button', { name: 'Acordes' });
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Todos' }));
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '2ª m' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: '5ª J' })).toHaveAttribute('aria-pressed', 'true');
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/screens/Focus.test.tsx src/ui/screens/FocusSheet.test.tsx`
Expected: FAIL (botão "Acordes" não encontrado).

- [ ] **Step 3: Implementar**

Em `Focus.tsx`, logo depois do botão "Todos" (dentro de `<div className="chips">`):

```tsx
          <button
            type="button"
            className="chip chip--wide chip--nowrap"
            title="3ª, 5ª e 7ª"
            aria-pressed={focus.chordTonesSelected}
            onClick={focus.selectChordTones}
          >
            Acordes
          </button>
```

Em `FocusSheet.tsx`, logo depois do botão "Todos":

```tsx
                  <button
                    type="button"
                    className="badge badge--button"
                    title="3ª, 5ª e 7ª"
                    aria-pressed={focus.chordTonesSelected}
                    onClick={focus.selectChordTones}
                  >
                    Acordes
                  </button>
```

- [ ] **Step 4: Rodar tudo e conferir a quebra de linha**

Run: `npm test && npm run build`
Expected: tudo PASS. Os chips de intervalos devem continuar em uma linha na tela do computador (commit `8b09e4e` corrigiu isso para os chips existentes): abrir o app (`npm run dev`), modo Intervalos, e conferir em 375 px de largura (folha) e em 1280 px (Foco) que "Acordes" não quebra a linha de forma estranha. Se quebrar, ajustar só o CSS do chip, sem mudar o texto.

- [ ] **Step 5: Commit**

```bash
git add src/ui/screens/Focus.tsx src/ui/screens/FocusSheet.tsx src/ui/screens/Focus.test.tsx src/ui/screens/FocusSheet.test.tsx src/styles.css
git commit -m "feat(ui): Acordes chip selects the chord-tone intervals"
```

---

### Task 3: Teclado A–G no `useQuizShortcuts`

**Files:**
- Modify: `src/ui/useQuizShortcuts.ts`
- Test: `src/ui/screens/IntervalQuiz.test.tsx` (já monta `Shortcuts` + `IntervalQuiz`; usa `item = C + 5ª J`, resposta G)

- [ ] **Step 1: Escrever os testes que falham** (no fim do `describe('IntervalQuiz', ...)`, usando o `setup` e `noteBtn` do arquivo)

```tsx
  describe('keyboard', () => {
    const press = (key: string, init: KeyboardEventInit = {}) =>
      fireEvent.keyDown(document.body, { key, ...init });

    it('a letter answers the natural note', () => {
      const { onAnswer } = setup();
      press('g');
      expect(onAnswer).toHaveBeenCalledWith(true);
      expect(noteBtn('G')).toHaveClass('option--correct');
    });

    it('uppercase works and Shift+letter answers the sharp', () => {
      const { onAnswer } = setup();
      press('F', { shiftKey: true });
      expect(onAnswer).toHaveBeenCalledWith(false);
      expect(noteBtn('F#')).toHaveClass('option--wrong');
    });

    it('Shift+E and Shift+B do nothing', () => {
      const { onAnswer } = setup();
      press('E', { shiftKey: true });
      press('B', { shiftKey: true });
      expect(onAnswer).not.toHaveBeenCalled();
      expect(noteButtons().every((b) => !b.disabled)).toBe(true);
    });

    it('letters use cifra even in solfejo', () => {
      const { onAnswer } = setup({ notation: 'solfejo' });
      press('g');
      expect(onAnswer).toHaveBeenCalledWith(true);
      expect(noteBtn('Sol')).toHaveClass('option--correct');
    });

    it('does nothing after answering, or with Ctrl, or non-note keys', () => {
      const { onAnswer } = setup();
      press('g', { ctrlKey: true });
      press('h');
      expect(onAnswer).not.toHaveBeenCalled();
      press('g');
      press('a');
      expect(onAnswer).toHaveBeenCalledTimes(1);
    });

    it('Enter after a keyboard answer goes to the next question', () => {
      const { onNext } = setup();
      press('g');
      press('Enter');
      expect(onNext).toHaveBeenCalledTimes(1);
    });
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/screens/IntervalQuiz.test.tsx`
Expected: FAIL nos testes novos (letras não fazem nada).

- [ ] **Step 3: Implementar**

Em `src/ui/useQuizShortcuts.ts`, antes de `export function useQuizShortcuts`, acrescentar:

```ts
// Letras da cifra → nota (0 = C). As 12 notas só têm sustenidos: Shift soma um
// semitom, e E/B não têm sustenido próprio (E♯ = F, B♯ = C), então Shift+E/B não faz nada.
const LETTER_NOTE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function answerWithLetter(letter: string, sharp: boolean) {
  const natural = LETTER_NOTE[letter.toUpperCase()];
  if (sharp && (natural === 4 || natural === 11)) return false;
  const button = document.querySelectorAll('.note-grid .note-option')[natural + (sharp ? 1 : 0)];
  if (!(button instanceof HTMLButtonElement) || button.disabled) return false;
  return click(button);
}
```

E dentro de `onKey`, antes do ramo `else if (event.key === 'r' ...)` (depois do ramo de Enter), acrescentar:

```ts
      } else if (/^[a-g]$/i.test(event.key) && !event.repeat) {
        handled = answerWithLetter(event.key, event.shiftKey);
```

(manter o ramo do `R` logo em seguida.)

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/ui/screens/IntervalQuiz.test.tsx src/ui/screens/EarQuiz.test.tsx src/ui/screens/FindQuiz.test.tsx`
Expected: PASS (os de Ouvido e Posição provam que `R`, `1`–`9` e Enter seguem iguais).

- [ ] **Step 5: Commit**

```bash
git add src/ui/useQuizShortcuts.ts src/ui/screens/IntervalQuiz.test.tsx
git commit -m "feat(ui): answer interval questions by typing the note (A-G, Shift for sharp)"
```

---

### Task 4: Dica de teclado na pergunta

**Files:**
- Modify: `src/ui/screens/IntervalQuiz.tsx`
- Modify: `src/styles.css`
- Test: `src/ui/screens/IntervalQuiz.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

```tsx
  it('shows the keyboard hint until the question is answered', () => {
    setup();
    expect(screen.getByText('Teclado: A–G · Shift = ♯')).toBeInTheDocument();
    fireEvent.click(noteBtn('G'));
    expect(screen.queryByText('Teclado: A–G · Shift = ♯')).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/screens/IntervalQuiz.test.tsx`
Expected: FAIL (dica não existe).

- [ ] **Step 3: Implementar**

Em `IntervalQuiz.tsx`, logo depois do `</div>` que fecha `note-grid`, antes de `{answered && (`:

```tsx
      {!answered && <p className="keyboard-hint">Teclado: A–G · Shift = ♯</p>}
```

Em `src/styles.css`, perto das regras de `.note-grid`:

```css
.keyboard-hint {
  margin: 0.5rem 0 0;
  font-size: 0.8rem;
  color: var(--muted);
  text-align: center;
}
```

(Se o projeto não tiver `--muted`, usar a variável de texto secundário que `.interval-equation__name` ou `.empty` já usa.)

- [ ] **Step 4: Verificação final**

Run: `npm test && npm run build`
Expected: tudo PASS. Conferir no navegador (`npm run dev`, modo Intervalos): digitar `g` responde, `Shift+f` marca F#, `Enter` avança, com o 3 s/5 s o avanço automático segue funcionando, e a dica some depois de responder. Conferir também que a dica não desloca o layout do celular (375 px).

- [ ] **Step 5: Commit**

```bash
git add src/ui/screens/IntervalQuiz.tsx src/ui/screens/IntervalQuiz.test.tsx src/styles.css
git commit -m "feat(ui): keyboard hint under the interval answer buttons"
```
