import { shuffled } from './earTraining';
import {
  fieldsOf,
  harmonyKeys,
  type HarmonyField,
  type HarmonyFieldSetting,
  type HarmonyKeyLevel,
} from './harmony';
import type { NoteIndex } from './notes';

/** Item de Acorde do grau e Grau do acorde: um grau (2..7) numa tônica de um campo. */
export interface HarmonyItem {
  field: HarmonyField;
  key: NoteIndex;
  degree: number;
}

const DEGREES_WITHOUT_TONIC = [2, 3, 4, 5, 6, 7];
const ALL_DEGREES = [1, 2, 3, 4, 5, 6, 7];

export function harmonyPool(setting: HarmonyFieldSetting, level: HarmonyKeyLevel): HarmonyItem[] {
  return fieldsOf(setting).flatMap((field) =>
    harmonyKeys(field, level).flatMap((key) => DEGREES_WITHOUT_TONIC.map((degree) => ({ field, key, degree }))),
  );
}

export function harmonyChordKey(item: HarmonyItem): string {
  return `hchord:${item.field}:${item.key}:${item.degree}`;
}

export function harmonyDegreeKey(item: HarmonyItem): string {
  return `hdeg:${item.field}:${item.key}:${item.degree}`;
}

const CHORD_KEY = /^hchord:(major|minor):(\d|1[01]):([2-7])$/;
const DEGREE_KEY = /^hdeg:(major|minor):(\d|1[01]):([2-7])$/;
const QUALITY_KEY = /^hqual:(major|minor):(triad|seventh):([1-7])$/;

export const isHarmonyChordKey = (key: string): boolean => CHORD_KEY.test(key);
export const isHarmonyDegreeKey = (key: string): boolean => DEGREE_KEY.test(key);
export const isQualityKey = (key: string): boolean => QUALITY_KEY.test(key);

export function buildHarmonyQueue(items: readonly HarmonyItem[], rng: () => number): HarmonyItem[] {
  return shuffled(items, rng);
}

/** Item de Qualidade do acorde: o progresso não depende da tônica. */
export interface QualityItem {
  field: HarmonyField;
  sevenths: boolean;
  degree: number;
}

export interface QualityQuestion extends QualityItem {
  key: NoteIndex;
}

export function qualityPool(setting: HarmonyFieldSetting, sevenths: boolean): QualityItem[] {
  return fieldsOf(setting).flatMap((field) => ALL_DEGREES.map((degree) => ({ field, sevenths, degree })));
}

export function qualityKey(item: QualityItem): string {
  return `hqual:${item.field}:${item.sevenths ? 'seventh' : 'triad'}:${item.degree}`;
}

export function buildQualityQueue(
  items: readonly QualityItem[],
  level: HarmonyKeyLevel,
  rng: () => number,
): QualityQuestion[] {
  return shuffled(items, rng).map((item) => {
    const keys = harmonyKeys(item.field, level);
    return { ...item, key: keys[Math.min(keys.length - 1, Math.floor(rng() * keys.length))] };
  });
}
