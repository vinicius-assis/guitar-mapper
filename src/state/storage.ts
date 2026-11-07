import {
  FIRST_QUIZ_FRET,
  MAX_FRET,
  parsePositionKey,
  type Filter,
} from '../domain/fretboard';
import {
  GUITAR,
  INSTRUMENTS,
  instrumentById,
  type Instrument,
  type InstrumentId,
} from '../domain/instruments';
import { QUIZ_MODES } from '../domain/exercises';
import { DEFAULT_INTERVALS, isIntervalId, type IntervalId } from '../domain/intervals';
import type { Notation } from '../domain/notes';
import type { EarLevel, QuizMode } from '../domain/quiz';
import { HISTORY_LIMIT, type HistoryEntry } from '../domain/session';
import type { Box, PositionProgress, ProgressMap } from '../domain/scheduler';

export type IntervalAdvance = 'manual' | '3s' | '5s';

export interface InstrumentData {
  filter: Filter;
  progress: ProgressMap;
  history: HistoryEntry[];
}

export interface GlobalSettings {
  notation: Notation;
  leftHanded: boolean;
  mode: QuizMode;
  soundEnabled: boolean;
  earLevel: EarLevel;
  instrument: InstrumentId;
  intervals: IntervalId[];
  intervalAdvance: IntervalAdvance;
}

/** Visão das configurações para o instrumento ativo (globais + filtro dele). */
export type Settings = GlobalSettings & { filter: Filter };

export interface AppData {
  version: 2;
  settings: GlobalSettings;
  instruments: Record<InstrumentId, InstrumentData>;
}

/** Visão plana do instrumento ativo, usada pelas telas. */
export interface ActiveData {
  settings: Settings;
  progress: ProgressMap;
  history: HistoryEntry[];
}

export const STORAGE_KEY = 'guitar-mapper:v2';
export const BACKUP_KEY = 'guitar-mapper:v2:backup';
export const LEGACY_STORAGE_KEY = 'guitar-mapper:v1';

export function defaultFilterFor(instrument: Instrument): Filter {
  return {
    strings: Array.from({ length: instrument.stringCount }, (_, i) => i + 1),
    fretMin: FIRST_QUIZ_FRET,
    fretMax: 5,
    naturalsOnly: true,
  };
}

export const DEFAULT_FILTER: Filter = defaultFilterFor(GUITAR);

export const DEFAULT_SETTINGS: GlobalSettings = {
  notation: 'ambos',
  leftHanded: false,
  mode: 'position-to-note',
  soundEnabled: true,
  earLevel: 'easy',
  instrument: 'guitar',
  intervals: [...DEFAULT_INTERVALS],
  intervalAdvance: 'manual',
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

function defaultInstrumentData(instrument: Instrument): InstrumentData {
  return { filter: defaultFilterFor(instrument), progress: {}, history: [] };
}

export function createDefaultData(): AppData {
  return {
    version: 2,
    settings: { ...DEFAULT_SETTINGS, intervals: [...DEFAULT_INTERVALS] },
    instruments: { guitar: defaultInstrumentData(GUITAR), bass: defaultInstrumentData(instrumentById('bass')) },
  };
}

export function activeView(data: AppData): ActiveData {
  const bucket = data.instruments[data.settings.instrument];
  return {
    settings: { ...data.settings, filter: bucket.filter },
    progress: bucket.progress,
    history: bucket.history,
  };
}

export function withActive(data: AppData, patch: Partial<InstrumentData>): AppData {
  const id = data.settings.instrument;
  return {
    ...data,
    instruments: { ...data.instruments, [id]: { ...data.instruments[id], ...patch } },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clampFret(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(MAX_FRET, Math.max(FIRST_QUIZ_FRET, Math.round(value)));
}

function sanitizeFilter(raw: unknown, instrument: Instrument): Filter {
  const fallback = defaultFilterFor(instrument);
  const source = isRecord(raw) ? raw : {};
  const strings = Array.isArray(source.strings)
    ? [...new Set(source.strings)]
        .filter((s): s is number => Number.isInteger(s) && s >= 1 && s <= instrument.stringCount)
        .sort((a, b) => a - b)
    : fallback.strings;
  let fretMin = clampFret(source.fretMin, fallback.fretMin);
  let fretMax = clampFret(source.fretMax, fallback.fretMax);
  if (fretMin > fretMax) [fretMin, fretMax] = [fretMax, fretMin];
  const naturalsOnly =
    typeof source.naturalsOnly === 'boolean' ? source.naturalsOnly : fallback.naturalsOnly;
  return { strings, fretMin, fretMax, naturalsOnly };
}

const NOTATIONS: Notation[] = ['cifra', 'solfejo', 'ambos'];
const ADVANCES: IntervalAdvance[] = ['manual', '3s', '5s'];
const EAR_LEVELS: EarLevel[] = ['easy', 'medium', 'hard'];

function sanitizeSettings(raw: unknown): GlobalSettings {
  const source = isRecord(raw) ? raw : {};
  return {
    notation: NOTATIONS.includes(source.notation as Notation)
      ? (source.notation as Notation)
      : DEFAULT_SETTINGS.notation,
    leftHanded:
      typeof source.leftHanded === 'boolean' ? source.leftHanded : DEFAULT_SETTINGS.leftHanded,
    mode: QUIZ_MODES.includes(source.mode as QuizMode)
      ? (source.mode as QuizMode)
      : DEFAULT_SETTINGS.mode,
    soundEnabled:
      typeof source.soundEnabled === 'boolean'
        ? source.soundEnabled
        : DEFAULT_SETTINGS.soundEnabled,
    earLevel: EAR_LEVELS.includes(source.earLevel as EarLevel)
      ? (source.earLevel as EarLevel)
      : DEFAULT_SETTINGS.earLevel,
    instrument: INSTRUMENTS.some((i) => i.id === source.instrument)
      ? (source.instrument as InstrumentId)
      : DEFAULT_SETTINGS.instrument,
    intervals: Array.isArray(source.intervals)
      ? [...new Set(source.intervals)].filter(isIntervalId)
      : [...DEFAULT_INTERVALS],
    intervalAdvance: ADVANCES.includes(source.intervalAdvance as IntervalAdvance)
      ? (source.intervalAdvance as IntervalAdvance)
      : DEFAULT_SETTINGS.intervalAdvance,
  };
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function sanitizeProgress(raw: unknown, instrument: Instrument): ProgressMap {
  const out: ProgressMap = {};
  if (!isRecord(raw)) return out;
  for (const [key, entry] of Object.entries(raw)) {
    if (!parsePositionKey(key, instrument) || !isRecord(entry)) continue;
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

function sanitizeHistory(raw: unknown): HistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: HistoryEntry[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const { mode, at, total, correct, averageMs } = entry;
    if (
      QUIZ_MODES.includes(mode as QuizMode) &&
      isCount(at) &&
      isCount(total) &&
      Number.isInteger(total) &&
      total > 0 &&
      isCount(correct) &&
      Number.isInteger(correct) &&
      correct <= total &&
      isCount(averageMs)
    ) {
      out.push({
        mode: mode as QuizMode,
        at,
        total,
        correct,
        averageMs,
        ...(mode === 'ear'
          ? { level: EAR_LEVELS.includes(entry.level as EarLevel) ? (entry.level as EarLevel) : 'easy' }
          : {}),
      });
    }
  }
  return out.slice(0, HISTORY_LIMIT);
}

export interface LoadResult {
  data: AppData;
  storageAvailable: boolean;
  recovered: boolean;
}

function sanitizeBucket(raw: unknown, instrument: Instrument): InstrumentData {
  const source = isRecord(raw) ? raw : {};
  return {
    filter: sanitizeFilter(source.filter, instrument),
    progress: sanitizeProgress(source.progress, instrument),
    history: sanitizeHistory(source.history),
  };
}

function sanitizeV2(parsed: Record<string, unknown>): AppData {
  const buckets = isRecord(parsed.instruments) ? parsed.instruments : {};
  return {
    version: 2,
    settings: sanitizeSettings(parsed.settings),
    instruments: {
      guitar: sanitizeBucket(buckets.guitar, instrumentById('guitar')),
      bass: sanitizeBucket(buckets.bass, instrumentById('bass')),
    },
  };
}

function migrateV1(parsed: Record<string, unknown>): AppData {
  const settings = isRecord(parsed.settings) ? parsed.settings : {};
  return {
    version: 2,
    settings: sanitizeSettings(settings),
    instruments: {
      guitar: sanitizeBucket(
        { filter: settings.filter, progress: parsed.progress, history: parsed.history },
        GUITAR,
      ),
      bass: defaultInstrumentData(instrumentById('bass')),
    },
  };
}

export function loadData(storage: StorageLike | null): LoadResult {
  if (!storage) return { data: createDefaultData(), storageAvailable: false, recovered: false };

  let raw: string | null;
  let legacy: string | null = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
    if (raw === null) legacy = storage.getItem(LEGACY_STORAGE_KEY);
  } catch {
    return { data: createDefaultData(), storageAvailable: false, recovered: false };
  }

  const text = raw ?? legacy;
  if (text === null) {
    return { data: createDefaultData(), storageAvailable: true, recovered: false };
  }

  if (raw === null) {
    // só existe a chave v1: migra; se ilegível ou de outra versão, recuperação (sem alterar a v1)
    try {
      const parsed: unknown = JSON.parse(text);
      if (isRecord(parsed) && parsed.version === 1) {
        const data = migrateV1(parsed);
        saveData(storage, data); // falha de escrita é ignorada
        return { data, storageAvailable: true, recovered: false };
      }
    } catch {
      // cai para a recuperação abaixo
    }
  } else {
    try {
      const parsed: unknown = JSON.parse(text);
      if (isRecord(parsed) && parsed.version === 2 && isRecord(parsed.instruments)) {
        return { data: sanitizeV2(parsed), storageAvailable: true, recovered: false };
      }
    } catch {
      // cai para a recuperação abaixo
    }
  }

  try {
    storage.setItem(BACKUP_KEY, text);
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
