# Layout responsivo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar o app responsivo em celular (igual a hoje), tablet e computador (barra lateral, exercícios sempre visíveis, painel de Foco fixo, braço largo, Progresso em duas colunas) com atalhos de teclado.

**Architecture:** Um hook `useBreakpoint()` (via `matchMedia`) devolve `'mobile' | 'tablet' | 'desktop'` para o que muda a estrutura; o que muda só visualmente usa `@media` com as mesmas larguras (640px e 1024px). `Fretboard` ganha `fit` e `minFretWidth` para escalar com o espaço. Os atalhos vivem em `useQuizShortcuts` (um listener de teclado que aciona os botões da pergunta atual).

**Tech Stack:** React + TypeScript, CSS (`@media`, grid), Vitest/Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-24-responsive-layout-design.md`

## Global Constraints

- Faixas: celular < 640px, tablet 640–1023px, computador ≥ 1024px. Sem `matchMedia` (testes), o hook devolve `'mobile'`.
- Celular **inalterado** (estrutura, tamanhos, comportamento em sessão). Alvos de toque ≥ 44px.
- Computador: navegação em barra lateral (220px) sempre visível, inclusive em sessão; no celular e no tablet a navegação continua na base e some em sessão.
- Estudar no computador: exercícios como 4 botões no topo (sem menu ☰, sem logo no cabeçalho), Foco como painel fixo e aberto (sem seta nem fundo escurecido) na tela de início, painel some durante a sessão.
- Atalhos só com pergunta/tela de início ativas, sem `alertdialog`/menu abertos, sem modificadores (Ctrl/Alt/Meta) e sem foco em `input`/`select`/`textarea`: `1`–`9` escolhem opção; `Enter` = ação principal (Iniciar / Mostrar nota / Próxima) quando o foco não está num botão; Flashcard revelado: `1` Errei, `2` Acertei; Ouvido: `R` toca de novo; `Esc` já fecha painéis.
- Dados salvos, textos e fluxos não mudam. Texto da interface em português; commits com as linhas `Co-Authored-By` / `Claude-Session` da sessão.

## Review Focus

- Atalhos nunca disparam enquanto um diálogo/menu está aberto, com o foco num campo, ou com Ctrl/Alt/Meta (ex.: Ctrl+R do navegador não repete o som).
- `Enter` com um botão focado ativa o botão uma vez só (sem disparo duplo).
- Trocar a largura da janela (girar o tablet, redimensionar) troca de layout sem perder o estado da sessão.
- No computador, a barra lateral continua visível em sessão e o painel de Foco não fica aberto ao mesmo tempo que uma pergunta.
- Mobile igual: o braço no celular continua com o tamanho natural (sem `fit`) e rola como hoje.

---

### Task 1: `useBreakpoint` e helper de teste

**Files:**
- Create: `src/ui/useBreakpoint.ts`
- Modify: `src/test-utils.ts`
- Test: `src/ui/useBreakpoint.test.tsx`

**Interfaces:**
- Produces: `type Breakpoint = 'mobile' | 'tablet' | 'desktop'`; `BREAKPOINTS = { tablet: 640, desktop: 1024 }`; `useBreakpoint(): Breakpoint`; em `test-utils`: `mockViewport(width: number): { setWidth(w: number): void; restore(): void }` (instala um `window.matchMedia` falso que entende `(min-width: Npx)` e dispara os listeners em `setWidth`).

- [ ] **Step 1: Write the failing test**

```tsx
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, it, expect } from 'vitest';
import { mockViewport } from '../test-utils';
import { useBreakpoint } from './useBreakpoint';

function Probe() {
  return <output>{useBreakpoint()}</output>;
}
let viewport: ReturnType<typeof mockViewport> | null = null;
afterEach(() => viewport?.restore());

describe('useBreakpoint', () => {
  it('is mobile when matchMedia does not exist', () => {
    render(<Probe />);
    expect(screen.getByRole('status')).toHaveTextContent('mobile');
  });

  it.each([
    [390, 'mobile'],
    [639, 'mobile'],
    [640, 'tablet'],
    [1023, 'tablet'],
    [1024, 'desktop'],
    [1600, 'desktop'],
  ])('width %i is %s', (width, expected) => {
    viewport = mockViewport(width);
    render(<Probe />);
    expect(screen.getByRole('status')).toHaveTextContent(expected);
  });

  it('reacts when the window is resized', () => {
    viewport = mockViewport(1280);
    render(<Probe />);
    expect(screen.getByRole('status')).toHaveTextContent('desktop');
    act(() => viewport!.setWidth(700));
    expect(screen.getByRole('status')).toHaveTextContent('tablet');
    act(() => viewport!.setWidth(390));
    expect(screen.getByRole('status')).toHaveTextContent('mobile');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/useBreakpoint.test.tsx`
Expected: FAIL (módulo e helper não existem)

- [ ] **Step 3: Write minimal implementation**

`useBreakpoint.ts`:

```ts
import { useEffect, useState } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';
export const BREAKPOINTS = { tablet: 640, desktop: 1024 } as const;

function read(): Breakpoint {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'mobile';
  if (window.matchMedia(`(min-width: ${BREAKPOINTS.desktop}px)`).matches) return 'desktop';
  if (window.matchMedia(`(min-width: ${BREAKPOINTS.tablet}px)`).matches) return 'tablet';
  return 'mobile';
}

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(read);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const queries = [BREAKPOINTS.tablet, BREAKPOINTS.desktop].map((w) =>
      window.matchMedia(`(min-width: ${w}px)`),
    );
    const update = () => setBreakpoint(read());
    queries.forEach((q) => q.addEventListener('change', update));
    update();
    return () => queries.forEach((q) => q.removeEventListener('change', update));
  }, []);
  return breakpoint;
}
```

`test-utils.ts` (acrescentar):

```ts
export function mockViewport(initialWidth: number) {
  let width = initialWidth;
  const original = window.matchMedia;
  type Listener = () => void;
  const listeners = new Set<Listener>();
  window.matchMedia = ((query: string) => {
    const min = Number(/min-width:\s*(\d+)px/.exec(query)?.[1] ?? 0);
    return {
      get matches() {
        return width >= min;
      },
      media: query,
      addEventListener: (_: string, l: Listener) => listeners.add(l),
      removeEventListener: (_: string, l: Listener) => listeners.delete(l),
    } as unknown as MediaQueryList;
  }) as typeof window.matchMedia;
  return {
    setWidth(w: number) {
      width = w;
      listeners.forEach((l) => l());
    },
    restore() {
      window.matchMedia = original;
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ui/useBreakpoint.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/useBreakpoint.ts src/ui/useBreakpoint.test.tsx src/test-utils.ts
git commit -m "feat(ui): useBreakpoint hook and viewport test helper"
```

---

### Task 2: Braço que escala (`fit` e `minFretWidth`)

**Files:**
- Modify: `src/ui/Fretboard.tsx`, `src/styles.css`
- Test: `src/ui/Fretboard.test.tsx`

**Interfaces:**
- Produces: props novas de `Fretboard`: `fit?: boolean` (o SVG ocupa 100% da largura do container, nunca abaixo de `count * minFretWidth`) e `minFretWidth?: number` (padrão 56). Sem `fit`, o SVG mantém o tamanho natural de hoje.

- [ ] **Step 1: Write the failing test**

```tsx
// Fretboard.test.tsx — acrescentar (ou criar, se não existir) com os imports do arquivo
it('keeps the natural size without fit (phone)', () => {
  const { container } = render(<Fretboard fretMin={1} fretMax={5} marks={[]} />);
  const svg = container.querySelector('svg')!;
  expect(svg.getAttribute('width')).toBe(String(5 * 56));
  expect(svg.style.width).toBe('');
});

it('with fit the SVG fills the container but never shrinks below minFretWidth per fret', () => {
  const { container } = render(<Fretboard fretMin={1} fretMax={24} marks={[]} fit minFretWidth={34} />);
  const svg = container.querySelector('svg')!;
  expect(svg.style.width).toBe('100%');
  expect(svg.style.minWidth).toBe(`${24 * 34}px`);
  expect(svg.style.height).toBe('auto');
  expect(svg.getAttribute('viewBox')).toBe(`0 0 ${24 * 56} ${28 + 6 * 44}`);
});

it('fit defaults to a 56px minimum per fret', () => {
  const { container } = render(<Fretboard fretMin={1} fretMax={5} marks={[]} fit />);
  expect(container.querySelector('svg')!.style.minWidth).toBe(`${5 * 56}px`);
});
```

- [ ] **Step 2:** Run `npx vitest run src/ui/Fretboard.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** — adicionar as props; no `<svg>` acrescentar `style={fit ? { width: '100%', minWidth: count * (minFretWidth ?? FRET_W), height: 'auto' } : undefined}`; o `viewBox` continua com as medidas naturais (já existe); CSS `.fretboard svg { max-width: none; }` se necessário.
- [ ] **Step 4:** Run `npx vitest run` — Expected: PASS (suíte inteira).
- [ ] **Step 5: Commit** — `git commit -am "feat(ui): fretboard can scale to its container (fit, minFretWidth)"`

---

### Task 3: Shell responsivo (barra lateral, colunas por faixa)

**Files:**
- Modify: `src/App.tsx`, `src/styles.css`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: `useBreakpoint`, `mockViewport` (Task 1).
- Produces: `div.app` ganha a classe `app--desktop` / `app--tablet` conforme a faixa; no computador o `<nav aria-label="Principal">` recebe a classe `sidebar` e contém antes dos botões a marca (`<img alt="Guitar Mapper">` + texto "Guitar Mapper"); a navegação **não** é escondida em sessão no computador.

- [ ] **Step 1: Write the failing tests** (em `App.test.tsx`, com `mockViewport` e `afterEach(restore)`)

  - celular (390): a navegação existe, não tem a classe `sidebar`, e some em sessão (comportamento atual, já coberto).
  - tablet (800): igual ao celular, e `.app` tem a classe `app--tablet`.
  - computador (1280): `.app` tem `app--desktop`; `nav` tem a classe `sidebar` e mostra o texto "Guitar Mapper" e a imagem com `alt="Guitar Mapper"`; a navegação **continua** no documento depois de iniciar uma sessão (clicar em Iniciar) e os 4 botões seguem funcionando (`aria-current`).
  - mudar a largura de 1280 para 390 com `setWidth` troca `sidebar` por abas sem perder a aba atual.

- [ ] **Step 2:** Run `npx vitest run src/App.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement**

`Shell` usa `const breakpoint = useBreakpoint();` e `const desktop = breakpoint === 'desktop';`. Classe do container: `['app', `app--${breakpoint}`, sessionRunning && !desktop ? 'app--session' : ''].filter(Boolean).join(' ')`. A navegação aparece quando `desktop || !sessionRunning`, com `className={desktop ? 'tabs sidebar' : 'tabs'}`; no computador começa com a marca:

```tsx
{desktop && (
  <div className="sidebar__brand">
    <img src={`${import.meta.env.BASE_URL}pwa-64x64.png`} width="32" height="32" alt="Guitar Mapper" />
    <span>Guitar Mapper</span>
  </div>
)}
```

CSS (`styles.css`):

```css
@media (min-width: 640px) { .app { max-width: 760px; } }
@media (min-width: 1024px) {
  .app { max-width: none; display: grid; grid-template-columns: 220px minmax(0, 1fr); grid-template-rows: auto 1fr; height: 100%; }
  .banners { grid-column: 1 / -1; }
  .sidebar { grid-column: 1; grid-row: 2; display: flex; flex-direction: column; gap: 4px; padding: 16px 12px; border-top: 0; border-right: 1px solid var(--line); background: var(--surface); }
  .sidebar__brand { display: flex; align-items: center; gap: 10px; padding: 4px 8px 16px; font-weight: 700; }
  .sidebar button { justify-content: flex-start; text-align: left; padding: 0 12px; min-height: 44px; border-radius: 10px; }
  .app > main { grid-column: 2; grid-row: 2; width: 100%; max-width: 1100px; margin: 0 auto; }
}
```

(a barra lateral fica antes de `main` no DOM, então usar `order`/posição de grid como acima; no celular/tablet o `nav` continua depois de `main`.)

- [ ] **Step 4:** Run `npx vitest run && npx tsc --noEmit` — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(ui): responsive shell with a desktop sidebar and per-breakpoint columns"`

---

### Task 4: Estudar no computador (exercícios no topo, Foco fixo, sessão larga)

**Files:**
- Modify: `src/ui/screens/Study.tsx`, `src/ui/screens/StudyHeader.tsx`, `src/ui/screens/FocusSheet.tsx`, `src/styles.css`
- Test: `src/ui/screens/Study.test.tsx`

**Interfaces:**
- Consumes: `useBreakpoint`, `mockViewport`.
- Produces: `StudyHeader` recebe `layout: 'compact' | 'tabs'`; em `'tabs'` renderiza `role="group" aria-label="Exercício"` com 4 botões (`aria-pressed`, nomes iguais aos do menu) e sem logo nem botão de menu; `FocusSheet` recebe `fixed?: boolean`: com `fixed` fica sempre aberto (sem botão de abrir/fechar, sem `aria-expanded`), mantendo `role="group" aria-label="Foco"` e os mesmos controles.

- [ ] **Step 1: Write the failing tests** (`Study.test.tsx`, `mockViewport(1280)` em `beforeEach` do novo `describe`, `restore` em `afterEach`)

  - computador, tela de início: existem os botões "Posição → nota", "Nota → posição", "Flashcard", "Ouvido" com `aria-pressed` no atual (dentro do grupo "Exercício"), **não** existe o botão "Menu de exercícios" nem a imagem "Guitar Mapper" no cabeçalho; clicar em "Ouvido" troca o modo (salvo) e mostra o seletor de nível.
  - computador: o grupo "Foco" já está aberto (`getByRole('button', { name: 'Corda 6' })` presente sem clicar em nada), não tem botão com `aria-expanded`, não há `focus-backdrop`, e editar uma corda salva e atualiza a contagem "Perguntas".
  - computador, em sessão: o grupo "Foco" e o grupo "Exercício" não estão na tela; ao finalizar voltam.
  - celular (390): nada disso muda (menu ☰, Foco recolhido).

- [ ] **Step 2:** Run `npx vitest run src/ui/screens/Study.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** — `Study` usa `useBreakpoint()`: `desktop` → `<StudyHeader layout="tabs" …>` e `<FocusSheet fixed …>`; o painel fixo ignora `openPanel`/backdrop. CSS: `.session-start` em duas colunas no computador (`grid-template-columns: 340px 1fr`, o painel de Foco na esquerda ocupando as duas linhas, descrição + níveis + Iniciar na direita); `.screen--study` em sessão com `max-width: 860px; margin: 0 auto`; `.options` em 4 colunas (`repeat(4, 1fr)`) no computador (6 para `.options--many`); `.study-header--tabs` com os 4 botões em linha.
- [ ] **Step 4:** Run `npx vitest run && npx tsc --noEmit && npm run build` — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(ui): desktop Estudar with exercise tabs, fixed Foco panel and wide session"`

---

### Task 5: Progresso e telas de formulário no computador/tablet

**Files:**
- Modify: `src/ui/screens/Progress.tsx`, `src/ui/screens/Focus.tsx`, `src/ui/screens/Settings.tsx`, `src/ui/screens/Study.tsx` (passar `fit` aos braços), `src/ui/screens/ChoiceQuiz.tsx`, `FindQuiz.tsx`, `Flashcard.tsx`, `EarQuiz.tsx` (prop `fit`), `src/styles.css`
- Test: `src/ui/screens/Progress.test.tsx`

**Interfaces:**
- Consumes: `useBreakpoint`; `Fretboard` `fit`/`minFretWidth` (Task 2).
- Produces: todos os braços recebem `fit={breakpoint !== 'mobile'}`; o mapa do Progresso recebe `minFretWidth={desktop ? 34 : undefined}` e a seção ganha as classes `progress-layout` (duas colunas no computador: mapa à esquerda; legenda, "Zerar progresso" e histórico numa coluna de 320px à direita).

- [ ] **Step 1: Write the failing tests**

  - Progresso, computador (1280): o `svg` do mapa tem `style.minWidth` = `24 * 34px` e `width: 100%`; o histórico (`h2` "Histórico") está dentro de um elemento `.progress-side`, e o mapa dentro de `.progress-main`.
  - Progresso, celular (390): o `svg` não tem `style.width` (tamanho natural) e não existem `.progress-side`/`.progress-main`... (mesma estrutura de hoje).
  - Tablet (800): um braço de pergunta (ex.: Flashcard em sessão) tem `style.width === '100%'`; no celular não.

- [ ] **Step 2:** Run `npx vitest run src/ui/screens/Progress.test.tsx src/ui/screens/Study.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** — passar `fit`; em `Progress` envolver em `<div className="progress-layout">` com `.progress-main` (título, mapa, legenda, dica) e `.progress-side` (Zerar progresso, histórico) **somente no computador** (no celular/tablet manter a ordem atual sem wrappers extras, ou com wrappers sem efeito de layout); CSS `@media (min-width: 1024px) { .progress-layout { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 24px; } }`; `Focus`/`Settings`: `max-width: 640px` na `.screen` quando a classe `screen--form` estiver presente (e aplicar a classe nos dois).
- [ ] **Step 4:** Run `npx vitest run && npx tsc --noEmit && npm run build` — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(ui): scaling boards everywhere, two-column Progresso on desktop, centered forms"`

---

### Task 6: Teclado e mouse (atalhos, selos numéricos, foco visível)

**Files:**
- Create: `src/ui/useQuizShortcuts.ts`
- Modify: `src/ui/screens/Study.tsx`, `src/styles.css`
- Test: `src/ui/useQuizShortcuts.test.tsx` (hook montado dentro de `Study`, via `Study.test.tsx`)

**Interfaces:**
- Consumes: DOM das perguntas (`.options .option`, `.quiz-actions .primary`, `.ear-play`, `.start`) e `role="alertdialog"`/`role="menu"`.
- Produces: `useQuizShortcuts(active: boolean): void` — registra um `keydown` no `document` enquanto `active`.

Regras de `handleKey(event)` (ordem): ignora se `event.defaultPrevented`, se `ctrl/alt/meta`, se existe `[role="alertdialog"]` ou `[role="menu"]` no documento, ou se `event.target` é `input`, `select`, `textarea` ou `contenteditable`. Depois:
  - dígito `1`–`9`: `.options .option:not(:disabled)` (não `.options--two`) na posição `n-1` → `click()`; no Flashcard revelado (`.options--two .option`): `1` = primeiro botão (Errei), `2` = segundo (Acertei).
  - `Enter`: se `event.target` é `button`/`a`, não faz nada (o navegador ativa o botão); senão clica, na ordem, em `.quiz-actions .primary` (Próxima / Mostrar nota) ou `.start:not(:disabled)`.
  - `r`/`R`: `.ear-play:not(:disabled)` → `click()`.
  - Cada atalho usado chama `event.preventDefault()`.

- [ ] **Step 1: Write the failing tests** (em `Study.test.tsx`, `describe('Study: keyboard')`, usando `fireEvent.keyDown(document.body, { key })`)

  - tela de início: `Enter` com o foco no corpo inicia a sessão; com Iniciar desabilitado (foco vazio) não faz nada.
  - Posição → nota: a tecla `2` escolhe a segunda opção (o botão correspondente fica com `option--correct` ou `option--wrong`); depois de errar, `Enter` avança (clica Próxima); `Enter` com um botão focado (`button.focus()` + keyDown no botão) **não** dispara o atalho (nenhuma ação duplicada: o número de perguntas respondidas não muda).
  - Flashcard: `Enter` mostra a nota; `1` marca Errei; em outra pergunta `2` marca Acertei (conferir o progresso salvo).
  - Ouvido: `r` chama `player.play` de novo (respeita o limite: com Difícil depois da 1ª repetição, `r` não toca mais); `Ctrl+R` não toca.
  - Com o diálogo "Finalizar a sessão?" aberto, as teclas `1`, `Enter` e `r` não fazem nada na pergunta; com um `select` focado, `1` não responde.
  - Selos: `.options--two .option` e `.options .option` mostram o número via CSS (teste de CSS não é viável; cobrir por inspeção no navegador na Task 7).

- [ ] **Step 2:** Run `npx vitest run src/ui/screens/Study.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement**

```ts
import { useEffect } from 'react';

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement &&
  (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) || el.isContentEditable);

export function useQuizShortcuts(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const click = (el: Element | null | undefined) => (el instanceof HTMLElement ? (el.click(), true) : false);
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey) return;
      if (document.querySelector('[role="alertdialog"], [role="menu"]') || isTyping(event.target)) return;
      let handled = false;
      if (/^[1-9]$/.test(event.key)) {
        const n = Number(event.key) - 1;
        const grade = document.querySelectorAll('.options--two .option');
        const options = document.querySelectorAll('.options:not(.options--two) .option:not(:disabled)');
        handled = click(grade.length ? grade[n] : options[n]);
      } else if (event.key === 'Enter') {
        if (event.target instanceof HTMLElement && ['BUTTON', 'A'].includes(event.target.tagName)) return;
        handled = click(document.querySelector('.quiz-actions .primary')) || click(document.querySelector('.start:not(:disabled)'));
      } else if (event.key === 'r' || event.key === 'R') {
        handled = click(document.querySelector('.ear-play:not(:disabled)'));
      }
      if (handled) event.preventDefault();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active]);
}
```

`Study` chama `useQuizShortcuts(true)` (a tela Estudar está montada). CSS: foco visível e hover:

```css
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
button:hover:not(:disabled), select:hover { border-color: var(--accent); }
@media (hover: hover) and (min-width: 1024px) {
  .options { counter-reset: opt; }
  .options .option { counter-increment: opt; position: relative; }
  .options .option::before { content: counter(opt); position: absolute; top: 6px; left: 8px; font-size: 0.7rem; opacity: 0.6; border: 1px solid currentColor; border-radius: 4px; padding: 0 4px; }
  .options--many .option::before { display: none; }
}
```

- [ ] **Step 4:** Run `npx vitest run && npx tsc --noEmit && npm run build` — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(ui): keyboard shortcuts, option number badges, visible focus and hover states"`

---

### Task 7: Verificação no navegador

**Files:** nenhum.

- [ ] **Step 1:** `npm run build`, `npx vite preview --port 4173`; abrir iframes de 390, 768 e 1280px.
- [ ] **Step 2:** Conferir por medidas e capturas: 1280 — barra lateral à esquerda com marca, navegação visível em sessão, exercícios no topo, painel de Foco aberto, braço e respostas largos, 24 casas do Progresso sem rolagem com histórico ao lado, selos 1–4 nas opções; 768 — coluna de 760px, braço escalado, abas na base; 390 — igual a antes (tamanho natural do braço, menu ☰, Foco recolhível). Nenhum estouro horizontal (`scrollWidth <= clientWidth`) nas três larguras; atalhos funcionando (teclas simuladas).
- [ ] **Step 3:** Ajustar o CSS do que a verificação mostrar (commit `fix(ui): …`), parar o preview e fechar a aba.
