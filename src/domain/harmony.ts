import type { Instrument } from './instruments';
import { EAR_RANGE } from './earTraining';
import type { Accidentals, NoteIndex } from './notes';
import { SCALES } from './scales';
import { spellScale, type Spelling } from './spelling';

export type HarmonyField = 'major' | 'minor';
export const HARMONY_FIELDS: readonly HarmonyField[] = ['major', 'minor'];

export type HarmonyFieldSetting = HarmonyField | 'both';
export const HARMONY_FIELD_SETTINGS: readonly HarmonyFieldSetting[] = ['major', 'minor', 'both'];

export function fieldsOf(setting: HarmonyFieldSetting): HarmonyField[] {
  return setting === 'both' ? ['major', 'minor'] : [setting];
}

export type HarmonyKeyLevel = 'easy' | 'medium' | 'all';
export const HARMONY_KEY_LEVELS: readonly HarmonyKeyLevel[] = ['easy', 'medium', 'all'];

export type ChordQuality = 'major' | 'minor' | 'dim' | 'maj7' | 'dom7' | 'min7' | 'half-dim';
export const TRIAD_QUALITIES: readonly ChordQuality[] = ['major', 'minor', 'dim'];
export const SEVENTH_QUALITIES: readonly ChordQuality[] = ['maj7', 'dom7', 'min7', 'half-dim'];

export const QUALITY_SYMBOL: Record<ChordQuality, string> = {
  major: '',
  minor: 'm',
  dim: '°',
  maj7: '7M',
  dom7: '7',
  min7: 'm7',
  'half-dim': 'm7(b5)',
};

const QUALITY_SEMITONES: Record<ChordQuality, readonly number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  dim: [0, 3, 6],
  maj7: [0, 4, 7, 11],
  dom7: [0, 4, 7, 10],
  min7: [0, 3, 7, 10],
  'half-dim': [0, 3, 6, 10],
};

/** Semitons acima da fundamental do grau `degree` (1-7) até o grau `steps` acima (mod 7). */
function above(field: HarmonyField, degree: number, steps: number): number {
  const semitones = SCALES[field].semitones;
  const from = semitones[degree - 1];
  const to = semitones[(degree - 1 + steps) % 7];
  return (to - from + 12) % 12;
}

export function degreeQuality(field: HarmonyField, degree: number, sevenths: boolean): ChordQuality {
  const third = above(field, degree, 2);
  const fifth = above(field, degree, 4);
  const triad: 'major' | 'minor' | 'dim' =
    third === 4 && fifth === 7 ? 'major' : third === 3 && fifth === 7 ? 'minor' : 'dim';
  if (!sevenths) return triad;
  const seventh = above(field, degree, 6);
  if (triad === 'major') return seventh === 11 ? 'maj7' : 'dom7';
  return triad === 'minor' ? 'min7' : 'half-dim';
}

export function chordRootClass(field: HarmonyField, key: NoteIndex, degree: number): NoteIndex {
  return (key + SCALES[field].semitones[degree - 1]) % 12;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const MINOR_FLATTENED = new Set([3, 6, 7]);

export function romanNumeral(field: HarmonyField, degree: number): string {
  return (field === 'minor' && MINOR_FLATTENED.has(degree) ? '♭' : '') + ROMAN[degree - 1];
}

export function degreeNumeral(field: HarmonyField, degree: number, sevenths: boolean): string {
  const suffix = QUALITY_SYMBOL[degreeQuality(field, degree, sevenths)].replace('b', '♭');
  return romanNumeral(field, degree) + suffix;
}

export interface ChordSpelling {
  root: Spelling;
  tones: Spelling[];
  quality: ChordQuality;
}

export function keySpelling(field: HarmonyField, key: NoteIndex, accidentals: Accidentals): Spelling[] {
  return spellScale(key, SCALES[field], accidentals);
}

export function spellChord(
  field: HarmonyField,
  key: NoteIndex,
  degree: number,
  sevenths: boolean,
  accidentals: Accidentals,
): ChordSpelling {
  const names = keySpelling(field, key, accidentals);
  const tones = Array.from({ length: sevenths ? 4 : 3 }, (_, k) => names[(degree - 1 + 2 * k) % 7]);
  return { root: tones[0], tones, quality: degreeQuality(field, degree, sevenths) };
}

export function keySignatureCount(field: HarmonyField, key: NoteIndex): number {
  return keySpelling(field, key, 'auto').filter((s) => s.accidental !== 0).length;
}

const KEY_LEVEL_LIMIT: Record<HarmonyKeyLevel, number> = { easy: 1, medium: 3, all: 7 };

export function harmonyKeys(field: HarmonyField, level: HarmonyKeyLevel): NoteIndex[] {
  return Array.from({ length: 12 }, (_, k) => k).filter(
    (k) => keySignatureCount(field, k) <= KEY_LEVEL_LIMIT[level],
  );
}

export function chordPitches(
  field: HarmonyField,
  key: NoteIndex,
  degree: number,
  sevenths: boolean,
  instrument: Instrument,
): number[] {
  const low = EAR_RANGE[instrument.id][0];
  const rootClass = chordRootClass(field, key, degree);
  const root = low + ((rootClass - low) % 12 + 12) % 12;
  return QUALITY_SEMITONES[degreeQuality(field, degree, sevenths)].map((s) => root + s);
}
