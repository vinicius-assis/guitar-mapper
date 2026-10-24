# Som de violão Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tocar o som real de violão de nylon (FluidR3) da posição estudada logo depois que o aluno responde, com opção de desligar e créditos de licença.

**Architecture:** `domain/pitch.ts` converte posição em nota MIDI (puro). `audio/player.ts` carrega/decodifica/toca os MP3 por Web Audio, com o `AudioContext` e o `fetch` injetados (testável e à prova de falhas). `audio/SoundProvider.tsx` expõe `useSound()` que respeita `settings.soundEnabled`. Os três quizzes chamam `playPosition` ao responder. Os MP3 (E2–E6, 49 arquivos) vão em `public/sounds/nylon/` e entram no precache do service worker.

**Tech Stack:** React + TypeScript, Web Audio API, Vitest/Testing Library, vite-plugin-pwa (workbox).

**Spec:** `docs/superpowers/specs/2026-10-24-guitar-sound-design.md`

## Global Constraints

- Som só **depois** de responder: Posição→nota toca a nota real da posição perguntada (mesmo se errou); Nota→posição toca a casa tocada; Flashcard toca em "Mostrar nota". Nada em Progresso, início de sessão ou Acertei/Errei.
- No máximo um som por resposta; um som novo corta o anterior.
- Falhas de áudio (sem `AudioContext`, arquivo ausente, erro de decodificação) = silêncio, nunca erro visível nem quebra do estudo.
- `settings.soundEnabled` padrão `true`; dados antigos sem o campo viram `true`. Com som desligado: nenhum som e nenhum download dos MP3.
- Amostras: FluidR3 nylon, MIDI 40–88 (E2–E6). Afinação padrão: `OPEN_STRING_MIDI = [64, 59, 55, 50, 45, 40]` (cordas 1–6).
- Créditos de licença visíveis em Ajustes; `public/sounds/nylon/LICENSE.txt` com os avisos originais.
- Código em TypeScript estrito, texto da interface em português, commits terminando com as linhas `Co-Authored-By` / `Claude-Session` definidas na sessão.

## Review Focus

- Som desligado: nenhum `fetch` dos MP3 nem `play` (testado no player e na UI).
- Respostas rápidas em sequência: o som antigo é cortado, e uma nota que termina de carregar depois de uma resposta mais nova **não** toca por cima.
- `AudioContext` ausente ou `fetch`/`decodeAudioData` rejeitando: o quiz continua e nada lança.
- Dados salvos antes da opção (`settings` sem `soundEnabled`) e valores inválidos viram `true`.
- Os 49 MP3 cobrem exatamente todas as posições 1–24 × 6 cordas (nenhuma posição sem arquivo) e entram no precache do service worker (funciona offline).

---

### Task 1: Altura (MIDI) de cada posição

**Files:**
- Create: `src/domain/pitch.ts`
- Test: `src/domain/pitch.test.ts`

**Interfaces:**
- Consumes: `Position`, `noteAt`, `allPositions`, `FIRST_QUIZ_FRET`, `MAX_FRET` de `./fretboard`.
- Produces: `OPEN_STRING_MIDI: readonly number[]`, `pitchOf(position: Position): number`, `LOWEST_MIDI = 40`, `HIGHEST_MIDI = 88`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { allPositions, noteAt } from './fretboard';
import { HIGHEST_MIDI, LOWEST_MIDI, OPEN_STRING_MIDI, pitchOf } from './pitch';

describe('pitchOf', () => {
  it('knows the open strings (E2 A2 D3 G3 B3 E4)', () => {
    expect(OPEN_STRING_MIDI).toEqual([64, 59, 55, 50, 45, 40]);
    expect(pitchOf({ string: 6, fret: 0 })).toBe(40);
    expect(pitchOf({ string: 1, fret: 0 })).toBe(64);
  });

  it('adds one semitone per fret', () => {
    expect(pitchOf({ string: 5, fret: 3 })).toBe(48); // C3
    expect(pitchOf({ string: 6, fret: 12 })).toBe(52); // E3
  });

  it('spans E2 to E6 over the whole neck', () => {
    expect(pitchOf({ string: 1, fret: 24 })).toBe(HIGHEST_MIDI);
    expect(HIGHEST_MIDI).toBe(88);
    expect(LOWEST_MIDI).toBe(40);
    for (const p of allPositions()) {
      expect(pitchOf(p)).toBeGreaterThanOrEqual(LOWEST_MIDI);
      expect(pitchOf(p)).toBeLessThanOrEqual(HIGHEST_MIDI);
    }
  });

  it('agrees with noteAt for every position', () => {
    for (const p of allPositions()) expect(pitchOf(p) % 12).toBe(noteAt(p));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/pitch.test.ts`
Expected: FAIL (módulo `./pitch` não existe)

- [ ] **Step 3: Write minimal implementation**

```ts
import type { Position } from './fretboard';

/** Nota MIDI de cada corda solta, da corda 1 (E4) à 6 (E2). */
export const OPEN_STRING_MIDI: readonly number[] = [64, 59, 55, 50, 45, 40];
export const LOWEST_MIDI = 40;
export const HIGHEST_MIDI = 88;

export function pitchOf(position: Position): number {
  return OPEN_STRING_MIDI[position.string - 1] + position.fret;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/pitch.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/domain/pitch.ts src/domain/pitch.test.ts
git commit -m "feat(domain): pitchOf maps a fretboard position to a MIDI note"
```

---

### Task 2: Amostras de violão e licença

**Files:**
- Create: `scripts/extract-nylon.mjs`, `public/sounds/nylon/{40..88}.mp3`, `public/sounds/nylon/LICENSE.txt`
- Test: `src/audio/assets.test.ts`

**Interfaces:**
- Consumes: `allPositions`, `pitchOf` (Task 1).
- Produces: arquivos `public/sounds/nylon/<midi>.mp3` para todo MIDI de 40 a 88, e `LICENSE.txt`.

- [ ] **Step 1: Write the failing test**

```ts
import { existsSync, readFileSync, statSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { allPositions } from '../domain/fretboard';
import { pitchOf } from '../domain/pitch';

const DIR = 'public/sounds/nylon';

describe('nylon guitar assets', () => {
  it('has an MP3 for every pitch on the fretboard', () => {
    const pitches = new Set(allPositions().map(pitchOf));
    for (const midi of pitches) {
      const file = `${DIR}/${midi}.mp3`;
      expect(existsSync(file), file).toBe(true);
      expect(statSync(file).size, file).toBeGreaterThan(1000);
    }
  });

  it('ships the license notices', () => {
    const text = readFileSync(`${DIR}/LICENSE.txt`, 'utf8');
    expect(text).toMatch(/FluidR3/);
    expect(text).toMatch(/MIT/);
    expect(text).toMatch(/Creative Commons Attribution 3\.0/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/audio/assets.test.ts`
Expected: FAIL (arquivos não existem)

- [ ] **Step 3: Write the extraction script and run it once**

`scripts/extract-nylon.mjs` baixa `https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_guitar_nylon-mp3.js`, lê cada par `"Nome": "data:audio/mp3;base64,..."`, converte o nome (`C`, `Db`, `D`, `Eb`, `E`, `F`, `Gb`, `G`, `Ab`, `A`, `Bb`, `B` + oitava) em MIDI (`12 * (oitava + 1) + semitom`), e grava os de MIDI 40 a 88 em `public/sounds/nylon/<midi>.mp3`.

```js
import { mkdirSync, writeFileSync } from 'node:fs';

const URL = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_guitar_nylon-mp3.js';
const OUT = 'public/sounds/nylon';
const SEMITONE = { C: 0, Db: 1, D: 2, Eb: 3, E: 4, F: 5, Gb: 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };

const source = await (await fetch(URL)).text();
mkdirSync(OUT, { recursive: true });
let count = 0;
for (const [, name, base64] of source.matchAll(/"([A-G]b?\d)":\s*"data:audio\/mp3;base64,([^"]+)"/g)) {
  const [, letter, octave] = /^([A-G]b?)(\d)$/.exec(name);
  const midi = 12 * (Number(octave) + 1) + SEMITONE[letter];
  if (midi < 40 || midi > 88) continue;
  writeFileSync(`${OUT}/${midi}.mp3`, Buffer.from(base64, 'base64'));
  count++;
}
console.log(`${count} notes written to ${OUT}`);
```

Run: `node scripts/extract-nylon.mjs` — Expected: `49 notes written to public/sounds/nylon`.

Depois, escrever `public/sounds/nylon/LICENSE.txt` com os avisos **copiados dos arquivos originais** (FluidR3 `COPYING`, MIT, autor; README do midi-js-soundfonts com "Creative Commons Attribution 3.0"; autoria do empacotamento por Benjamin Gleitzman), buscando o texto nas fontes `https://github.com/gleitz/midi-js-soundfonts` e `https://github.com/educandu/abcjs-soundfonts` (cópia do COPYING do FluidR3).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/audio/assets.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts public/sounds src/audio/assets.test.ts
git commit -m "feat(audio): FluidR3 nylon guitar samples E2-E6 with license notices"
```

---

### Task 3: Player de notas (Web Audio)

**Files:**
- Create: `src/audio/player.ts`
- Test: `src/audio/player.test.ts`

**Interfaces:**
- Consumes: nada (dependências injetadas).
- Produces:
  - `interface NotePlayer { unlock(): void; prepare(midis: number[]): void; play(midi: number): void }`
  - `createNotePlayer(deps: PlayerDeps): NotePlayer`, com `PlayerDeps = { createContext(): AudioContextLike; fetchBuffer(url: string): Promise<ArrayBuffer>; urlFor(midi: number): string }`
  - `AudioContextLike`: `{ state: string; destination: unknown; resume(): Promise<void>; decodeAudioData(data: ArrayBuffer): Promise<unknown>; createBufferSource(): BufferSourceLike }`; `BufferSourceLike`: `{ buffer: unknown; connect(node: unknown): void; start(): void; stop(): void }`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, vi } from 'vitest';
import { createNotePlayer, type AudioContextLike } from './player';

function fakeEnv() {
  const log: string[] = [];
  const sources: { id: string; stopped: boolean }[] = [];
  let contexts = 0;
  const context: AudioContextLike = {
    state: 'suspended',
    destination: {},
    resume: vi.fn(async () => {}),
    decodeAudioData: vi.fn(async (data: ArrayBuffer) => ({ id: new TextDecoder().decode(data) })),
    createBufferSource() {
      const src = { id: '', stopped: false, buffer: null as unknown, connect() {}, start() { log.push(`start ${this.id}`); }, stop() { this.stopped = true; log.push(`stop ${this.id}`); } };
      Object.defineProperty(src, 'buffer', { set(v: { id: string }) { src.id = v.id; sources.push(src); }, get: () => null });
      return src as never;
    },
  };
  const fetchBuffer = vi.fn(async (url: string) => new TextEncoder().encode(url).buffer as ArrayBuffer);
  const deps = { createContext: () => { contexts++; return context; }, fetchBuffer, urlFor: (m: number) => `n${m}` };
  return { deps, log, sources, context, fetchBuffer, contextCount: () => contexts };
}
const settle = () => new Promise((r) => setTimeout(r, 0));

describe('createNotePlayer', () => {
  it('creates the AudioContext only when unlocked or first used, and resumes it', async () => {
    const env = fakeEnv();
    const player = createNotePlayer(env.deps);
    expect(env.contextCount()).toBe(0);
    player.unlock();
    player.unlock();
    expect(env.contextCount()).toBe(1);
    expect(env.context.resume).toHaveBeenCalled();
  });

  it('plays a note after loading it, and reuses the decoded buffer next time', async () => {
    const env = fakeEnv();
    const player = createNotePlayer(env.deps);
    player.play(64);
    await settle();
    expect(env.log).toEqual(['start n64']);
    player.play(64);
    await settle();
    expect(env.fetchBuffer).toHaveBeenCalledTimes(1);
    expect(env.log).toEqual(['start n64', 'stop n64', 'start n64']);
  });

  it('a new note cuts the previous one', async () => {
    const env = fakeEnv();
    const player = createNotePlayer(env.deps);
    player.play(40);
    await settle();
    player.play(45);
    await settle();
    expect(env.log).toEqual(['start n40', 'stop n40', 'start n45']);
  });

  it('a slow note never plays over a newer request', async () => {
    const env = fakeEnv();
    let release!: () => void;
    env.fetchBuffer.mockImplementationOnce(
      (url) => new Promise((resolve) => (release = () => resolve(new TextEncoder().encode(url).buffer as ArrayBuffer))),
    );
    const player = createNotePlayer(env.deps);
    player.play(40); // lento
    player.play(45); // mais novo
    await settle();
    release();
    await settle();
    expect(env.log).toEqual(['start n45']);
  });

  it('prepare loads notes in advance without playing', async () => {
    const env = fakeEnv();
    const player = createNotePlayer(env.deps);
    player.prepare([40, 45, 40]);
    await settle();
    expect(env.fetchBuffer).toHaveBeenCalledTimes(2);
    expect(env.log).toEqual([]);
    player.play(45);
    await settle();
    expect(env.fetchBuffer).toHaveBeenCalledTimes(2);
    expect(env.log).toEqual(['start n45']);
  });

  it('stays silent and never throws when anything fails', async () => {
    const noContext = createNotePlayer({ createContext: () => { throw new Error('no audio'); }, fetchBuffer: async () => new ArrayBuffer(1), urlFor: String });
    expect(() => { noContext.unlock(); noContext.prepare([40]); noContext.play(40); }).not.toThrow();

    const env = fakeEnv();
    env.fetchBuffer.mockRejectedValue(new Error('offline'));
    const failing = createNotePlayer(env.deps);
    failing.play(40);
    await settle();
    expect(env.log).toEqual([]);
    env.fetchBuffer.mockResolvedValue(new TextEncoder().encode('n40').buffer as ArrayBuffer);
    failing.play(40); // tenta de novo depois da falha
    await settle();
    expect(env.log).toEqual(['start n40']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/audio/player.test.ts`
Expected: FAIL (módulo não existe)

- [ ] **Step 3: Write minimal implementation**

```ts
export interface BufferSourceLike {
  buffer: unknown;
  connect(node: unknown): void;
  start(): void;
  stop(): void;
}

export interface AudioContextLike {
  state: string;
  destination: unknown;
  resume(): Promise<void>;
  decodeAudioData(data: ArrayBuffer): Promise<unknown>;
  createBufferSource(): BufferSourceLike;
}

export interface PlayerDeps {
  createContext(): AudioContextLike;
  fetchBuffer(url: string): Promise<ArrayBuffer>;
  urlFor(midi: number): string;
}

export interface NotePlayer {
  /** Chamar dentro de um gesto do aluno: cria/retoma o AudioContext. */
  unlock(): void;
  prepare(midis: number[]): void;
  play(midi: number): void;
}

export function createNotePlayer(deps: PlayerDeps): NotePlayer {
  let context: AudioContextLike | null = null;
  let current: BufferSourceLike | null = null;
  let latest = 0;
  const buffers = new Map<number, Promise<unknown>>();

  function ensureContext(): AudioContextLike | null {
    if (context) return context;
    try {
      context = deps.createContext();
    } catch {
      return null;
    }
    return context;
  }

  function unlock() {
    const ctx = ensureContext();
    if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
  }

  function load(midi: number): Promise<unknown> | null {
    const ctx = ensureContext();
    if (!ctx) return null;
    let pending = buffers.get(midi);
    if (!pending) {
      pending = deps
        .fetchBuffer(deps.urlFor(midi))
        .then((data) => ctx.decodeAudioData(data))
        .catch((error) => {
          buffers.delete(midi); // permite tentar de novo
          throw error;
        });
      buffers.set(midi, pending);
    }
    return pending;
  }

  function prepare(midis: number[]) {
    for (const midi of new Set(midis)) load(midi)?.catch(() => {});
  }

  function play(midi: number) {
    const request = ++latest;
    unlock();
    const pending = load(midi);
    if (!pending) return;
    pending
      .then((buffer) => {
        const ctx = context;
        if (!ctx || request !== latest) return; // chegou tarde: há um pedido mais novo
        try {
          current?.stop();
        } catch {
          // já tinha terminado
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start();
        current = source;
      })
      .catch(() => {});
  }

  return { unlock, prepare, play };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/audio/player.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/audio/player.ts src/audio/player.test.ts
git commit -m "feat(audio): note player with lazy loading, cutting and silent failure"
```

---

### Task 4: Configuração "Som" e créditos

**Files:**
- Modify: `src/state/storage.ts` (Settings, DEFAULT_SETTINGS, sanitizeSettings), `src/ui/screens/Settings.tsx`
- Test: `src/state/storage.test.ts`, `src/ui/screens/Settings.test.tsx`

**Interfaces:**
- Produces: `Settings.soundEnabled: boolean` (padrão `true`).

- [ ] **Step 1: Write the failing tests**

Em `storage.test.ts`, dentro de um novo `describe('soundEnabled', …)`:

```ts
describe('soundEnabled', () => {
  const load = (settings: unknown) =>
    loadData(createMemoryStorage({ [STORAGE_KEY]: JSON.stringify({ version: 1, settings, progress: {} }) })).data.settings
      .soundEnabled;

  it('defaults to on, also for data saved before the option existed', () => {
    expect(DEFAULT_SETTINGS.soundEnabled).toBe(true);
    expect(load({})).toBe(true);
  });
  it('keeps a saved off, and treats invalid values as on', () => {
    expect(load({ soundEnabled: false })).toBe(false);
    expect(load({ soundEnabled: 'no' })).toBe(true);
  });
});
```

Em `Settings.test.tsx`:

```ts
it('toggles the sound and keeps it saved', () => {
  const storage = setup();
  const toggle = screen.getByLabelText('Som');
  expect(toggle).toBeChecked();
  fireEvent.click(toggle);
  expect(readSaved(storage).settings.soundEnabled).toBe(false);
});

it('explains the iPhone silent switch and credits the sound license', () => {
  setup();
  expect(screen.getByText(/modo silencioso/)).toBeInTheDocument();
  const credits = screen.getByRole('heading', { name: 'Créditos' }).parentElement!;
  expect(credits).toHaveTextContent('FluidR3');
  expect(credits).toHaveTextContent('Creative Commons Attribution 3.0');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/state/storage.test.ts src/ui/screens/Settings.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement**

`storage.ts`: `Settings` ganha `soundEnabled: boolean`; `DEFAULT_SETTINGS.soundEnabled = true`; em `sanitizeSettings`, `soundEnabled: typeof source.soundEnabled === 'boolean' ? source.soundEnabled : DEFAULT_SETTINGS.soundEnabled`.

`Settings.tsx`: depois de "Mão esquerda" acrescentar

```tsx
<label className="check">
  <input
    type="checkbox"
    checked={settings.soundEnabled}
    onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
  />
  Som
</label>
<p className="hint">No iPhone, o som não toca com o aparelho no modo silencioso.</p>

<section aria-labelledby="credits-title">
  <h3 id="credits-title">Créditos</h3>
  <p className="hint">
    Sons de violão de nylon: FluidR3 GM, licença MIT (autor original do FluidR3) e Creative
    Commons Attribution 3.0, empacotado por midi-js-soundfonts (Benjamin Gleitzman).
  </p>
</section>
```

(o teste usa `heading.parentElement`, que aqui é a `<section>`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run`
Expected: PASS (suíte inteira)

- [ ] **Step 5: Commit**

```bash
git add src/state src/ui/screens/Settings.tsx src/ui/screens/Settings.test.tsx
git commit -m "feat(settings): sound toggle (default on), iPhone silent hint and credits"
```

---

### Task 5: Som nos exercícios, pré-carregamento e offline

**Files:**
- Create: `src/audio/SoundProvider.tsx`
- Modify: `src/App.tsx`, `src/ui/screens/ChoiceQuiz.tsx`, `src/ui/screens/FindQuiz.tsx`, `src/ui/screens/Flashcard.tsx`, `src/ui/screens/Study.tsx`, `vite.config.ts`
- Test: `src/audio/SoundProvider.test.tsx`, `src/ui/screens/Study.test.tsx`

**Interfaces:**
- Consumes: `NotePlayer`, `createNotePlayer` (Task 3), `pitchOf` (Task 1), `Settings.soundEnabled` (Task 4), `useAppState`.
- Produces:
  - `SoundProvider({ player?: NotePlayer; children })` (precisa ficar dentro de `AppProvider`)
  - `useSound(): { playPosition(position: Position): void; prepare(positions: Position[]): void; unlock(): void }` — todos viram no-op com `soundEnabled === false`.

- [ ] **Step 1: Write the failing tests**

`SoundProvider.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppProvider } from '../state/AppState';
import { seededStorage } from '../test-utils';
import type { NotePlayer } from './player';
import { SoundProvider, useSound } from './SoundProvider';

const fakePlayer = (): NotePlayer => ({ unlock: vi.fn(), prepare: vi.fn(), play: vi.fn() });

function Probe() {
  const sound = useSound();
  return (
    <>
      <button onClick={() => sound.playPosition({ string: 6, fret: 12 })}>play</button>
      <button onClick={() => sound.prepare([{ string: 1, fret: 24 }, { string: 6, fret: 1 }])}>prepare</button>
      <button onClick={() => sound.unlock()}>unlock</button>
    </>
  );
}
const setup = (soundEnabled: boolean) => {
  const player = fakePlayer();
  render(
    <AppProvider storage={seededStorage({ settings: { soundEnabled } })}>
      <SoundProvider player={player}>
        <Probe />
      </SoundProvider>
    </AppProvider>,
  );
  return player;
};

describe('useSound', () => {
  it('plays the MIDI pitch of a position, prepares pitches and unlocks', () => {
    const player = setup(true);
    fireEvent.click(screen.getByText('play'));
    expect(player.play).toHaveBeenCalledWith(52);
    fireEvent.click(screen.getByText('prepare'));
    expect(player.prepare).toHaveBeenCalledWith([88, 41]);
    fireEvent.click(screen.getByText('unlock'));
    expect(player.unlock).toHaveBeenCalled();
  });

  it('does nothing at all when the sound is off (no loading either)', () => {
    const player = setup(false);
    for (const name of ['play', 'prepare', 'unlock']) fireEvent.click(screen.getByText(name));
    expect(player.play).not.toHaveBeenCalled();
    expect(player.prepare).not.toHaveBeenCalled();
    expect(player.unlock).not.toHaveBeenCalled();
  });

  it('fails loudly outside a provider', () => {
    expect(() => render(<Probe />)).toThrow(/SoundProvider/);
  });
});
```

`Study.test.tsx` (acrescentar; o `setup` passa a envolver com `SoundProvider` e devolver o `player` falso; adicionar `soundEnabled` aos `settings` aceitos):

```tsx
describe('Study: sound', () => {
  it('multiple choice plays the real pitch of the asked position, even on a wrong answer', () => {
    const { player } = setupWithPlayer();
    start();
    const wrong = screen.getAllByRole('button').find((b) => b.classList.contains('option') && b.textContent !== 'E')!;
    fireEvent.click(wrong);
    expect(player.play).toHaveBeenCalledTimes(1);
    expect(player.play).toHaveBeenCalledWith(52); // corda 6 casa 12 = E3
  });

  it('find mode plays the cell that was tapped', () => {
    const { player } = setupWithPlayer({ mode: 'note-to-position' });
    start();
    fireEvent.click(screen.getByTestId('cell-5-12')); // errada: A3 (corda 5 casa 12)
    expect(player.play).toHaveBeenCalledTimes(1);
    expect(player.play).toHaveBeenCalledWith(57);
  });

  it('flashcard plays on Mostrar nota only, not on Acertei', () => {
    const { player } = setupWithPlayer({ mode: 'flashcard' });
    start();
    expect(player.play).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar nota' }));
    expect(player.play).toHaveBeenCalledTimes(1);
    expect(player.play).toHaveBeenCalledWith(52);
    fireEvent.click(screen.getByRole('button', { name: 'Acertei' }));
    expect(player.play).toHaveBeenCalledTimes(1);
  });

  it('starting a session unlocks the audio and preloads the queue pitches', () => {
    const { player } = setupWithPlayer({ filter: THREE });
    expect(player.prepare).not.toHaveBeenCalled();
    start();
    expect(player.unlock).toHaveBeenCalled();
    const prepared = (player.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0] as number[];
    expect([...prepared].sort()).toEqual([41, 43, 45]); // F2, G2, A2
  });

  it('a forced position preloads its pitch right away', () => {
    const { player } = setupWithPlayer({ mode: 'flashcard' }, { string: 3, fret: 7 });
    expect(player.prepare).toHaveBeenCalled();
  });

  it('no sound is requested when the sound is off', () => {
    const { player } = setupWithPlayer({ soundEnabled: false, mode: 'flashcard' });
    start();
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar nota' }));
    expect(player.play).not.toHaveBeenCalled();
    expect(player.prepare).not.toHaveBeenCalled();
  });

  it('keeps working when the player blows up', () => {
    const player = { unlock: vi.fn(), prepare: vi.fn(), play: vi.fn(() => { throw new Error('boom'); }) };
    setupWithPlayer({ mode: 'flashcard' }, undefined, player);
    start();
    expect(() => fireEvent.click(screen.getByRole('button', { name: 'Mostrar nota' }))).not.toThrow();
    expect(screen.getByRole('button', { name: 'Acertei' })).toBeInTheDocument();
  });
});
```

`setupWithPlayer(settings?, forced?, player?)` é um helper novo no arquivo de teste: monta `AppProvider` + `ConfirmProvider` + `SoundProvider player={player}` + `Study` e devolve `{ storage, player }`. O `setup` antigo passa a usá-lo.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/audio/SoundProvider.test.tsx src/ui/screens/Study.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement**

`SoundProvider.tsx`:

```tsx
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Position } from '../domain/fretboard';
import { pitchOf } from '../domain/pitch';
import { useAppState } from '../state/AppState';
import { createNotePlayer, type AudioContextLike, type NotePlayer } from './player';

interface SoundApi {
  playPosition(position: Position): void;
  prepare(positions: Position[]): void;
  unlock(): void;
}

const SoundContext = createContext<SoundApi | null>(null);

function browserPlayer(): NotePlayer {
  return createNotePlayer({
    createContext: () => {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) throw new Error('Web Audio indisponível');
      return new Ctor() as unknown as AudioContextLike;
    },
    fetchBuffer: async (url) => (await fetch(url)).arrayBuffer(),
    urlFor: (midi) => `${import.meta.env.BASE_URL}sounds/nylon/${midi}.mp3`,
  });
}

export function SoundProvider({ player, children }: { player?: NotePlayer; children: ReactNode }) {
  const { data } = useAppState();
  const enabled = data.settings.soundEnabled;
  const [notePlayer] = useState<NotePlayer>(() => player ?? browserPlayer());

  const api = useMemo<SoundApi>(() => {
    const safe = (fn: () => void) => {
      try {
        fn();
      } catch {
        // som nunca derruba o estudo
      }
    };
    return {
      playPosition: (p) => enabled && safe(() => notePlayer.play(pitchOf(p))),
      prepare: (ps) => enabled && safe(() => notePlayer.prepare(ps.map(pitchOf))),
      unlock: () => enabled && safe(() => notePlayer.unlock()),
    };
  }, [enabled, notePlayer]);

  return <SoundContext.Provider value={api}>{children}</SoundContext.Provider>;
}

export function useSound(): SoundApi {
  const value = useContext(SoundContext);
  if (!value) throw new Error('useSound must be used inside <SoundProvider>');
  return value;
}
```

(`enabled && safe(...)` retorna booleano/undefined, que o tipo `void` aceita; se o linter reclamar, usar `if`.)

`App.tsx`: `<ConfirmProvider><SoundProvider><Shell /></SoundProvider></ConfirmProvider>`.

`ChoiceQuiz.tsx`: `const sound = useSound();` e em `choose` depois de `onAnswer(...)`: `sound.playPosition(position);`.
`FindQuiz.tsx`: `const sound = useSound();` e em `tap(p)` depois de `onAnswer(...)`: `sound.playPosition(p);`.
`Flashcard.tsx`: `const sound = useSound();` e no botão "Mostrar nota": `onClick={() => { setRevealed(true); sound.playPosition(position); }}`.
`Study.tsx`: `const sound = useSound();`; em `begin()`, depois de montar a fila: `sound.unlock(); sound.prepare(queue)` (usar a fila recém-criada, guardada numa constante local); na inicialização com `forced`, um `useEffect(() => { if (forced) sound.prepare(queue); }, [])`.

`vite.config.ts`: dentro de `VitePWA({...})` adicionar `workbox: { globPatterns: ['**/*.{js,css,html,ico,png,svg,mp3}'] }`.

Para os testes existentes de `App.test.tsx`, `Study.test.tsx` etc.: o `App` já inclui o `SoundProvider`; os testes que renderizam `Study`/quizzes direto passam a envolver com `SoundProvider` (player falso).

- [ ] **Step 4: Run the whole suite, types and build**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: tudo passa, e `dist/sw.js` lista os arquivos `sounds/nylon/*.mp3` (conferir com `grep -c "sounds/nylon" dist/sw.js`, esperado ≥ 49).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(audio): play the note after each answer, preload on start, precache for offline"
```

---

### Task 6: Verificação no navegador

**Files:** nenhum (verificação).

- [ ] **Step 1:** `npm run build` e `npx vite preview --port 4173`; abrir em iframe de 390px.
- [ ] **Step 2:** Confirmar no navegador: ao iniciar a sessão os MP3 da fila são baixados (aba de rede/`performance.getEntriesByType('resource')` com `sounds/nylon/*.mp3`), ao responder o `AudioContext` fica `running` e uma `AudioBufferSourceNode` é criada; com Som desligado em Ajustes nenhum MP3 é pedido. (O som em si só o aluno ouve.)
- [ ] **Step 3:** Parar o preview e fechar a aba.
