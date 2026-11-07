import {
  STORAGE_KEY,
  activeView,
  createDefaultData,
  type ActiveData,
  type Settings,
  type StorageLike,
} from './state/storage';
import type { InstrumentId } from './domain/instruments';
import type { HistoryEntry } from './domain/session';
import type { ProgressMap } from './domain/scheduler';
import type { StatsMap } from './domain/stats';

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
  overrides: {
    settings?: Partial<Settings>;
    progress?: ProgressMap;
    history?: HistoryEntry[];
    /** `items` do balde escolhido (mesmo balde de `progress`). */
    items?: ProgressMap;
    stats?: StatsMap;
    instrument?: InstrumentId;
  } = {},
) {
  const data = createDefaultData();
  const { filter, ...globals } = overrides.settings ?? {};
  data.settings = { ...data.settings, ...globals };
  const bucket = data.instruments[overrides.instrument ?? overrides.settings?.instrument ?? 'guitar'];
  if (filter) bucket.filter = filter;
  if (overrides.progress) bucket.progress = overrides.progress;
  if (overrides.history) bucket.history = overrides.history;
  if (overrides.items) bucket.items = overrides.items;
  if (overrides.stats) data.stats = overrides.stats;
  return createMemoryStorage({ [STORAGE_KEY]: JSON.stringify(data) });
}

/**
 * Visão plana do balde de `instrument` (padrão: violão). Atenção: devolve
 * `settings.instrument` igual ao argumento, não ao instrumento realmente salvo;
 * para o valor gravado use `readRawSettings`.
 */
export function readSaved(
  storage: { dump(): Record<string, string> },
  instrument: InstrumentId = 'guitar',
): ActiveData {
  const data = JSON.parse(storage.dump()[STORAGE_KEY]);
  return activeView({ ...data, settings: { ...data.settings, instrument } });
}

/** Os `settings` globais exatamente como gravados (inclui o `instrument` ativo real). */
export function readRawSettings(storage: { dump(): Record<string, string> }): Settings {
  return JSON.parse(storage.dump()[STORAGE_KEY]).settings;
}

/** Simula a largura da janela: instala um matchMedia falso que entende `(min-width: Npx)`. */
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

/** jsdom não tem layout: faz o container do braço (`.fretboard`) medir `width` px. */
export function mockBoardWidth(width: number) {
  const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return this.classList.contains('fretboard') ? width : 0;
    },
  });
  return {
    restore() {
      if (original) Object.defineProperty(HTMLElement.prototype, 'clientWidth', original);
      else delete (HTMLElement.prototype as unknown as { clientWidth?: number }).clientWidth;
    },
  };
}
