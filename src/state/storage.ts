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
