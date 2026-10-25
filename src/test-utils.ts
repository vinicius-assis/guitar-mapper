import {
  STORAGE_KEY,
  createDefaultData,
  type AppData,
  type Settings,
  type StorageLike,
} from './state/storage';
import type { HistoryEntry } from './domain/session';
import type { ProgressMap } from './domain/scheduler';

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
  overrides: { settings?: Partial<Settings>; progress?: ProgressMap; history?: HistoryEntry[] } = {},
) {
  const base = createDefaultData();
  const data: AppData = {
    version: 1,
    settings: { ...base.settings, ...overrides.settings },
    progress: overrides.progress ?? {},
    history: overrides.history ?? [],
  };
  return createMemoryStorage({ [STORAGE_KEY]: JSON.stringify(data) });
}

export function readSaved(storage: { dump(): Record<string, string> }): AppData {
  return JSON.parse(storage.dump()[STORAGE_KEY]) as AppData;
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
