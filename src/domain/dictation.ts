import { earRange, shuffled, type SoundStep } from './earTraining';
import type { Position } from './fretboard';
import type { Instrument } from './instruments';
import type { NoteIndex } from './notes';
import { pitchOf } from './pitch';
import type { EarLevel } from './quiz';
import { SCALES, isScaleId, scaleBox, type ScaleId } from './scales';

export const DICTATION_GAP_MS = 600;

export interface DictationLevelDef {
  scales: readonly ScaleId[];
  length: 4 | 6 | 8;
  maxStep: 2 | 3;
}

export const DICTATION_LEVELS: Record<EarLevel, DictationLevelDef> = {
  easy: { scales: ['pent-major', 'pent-minor'], length: 4, maxStep: 2 },
  medium: { scales: ['major', 'minor'], length: 6, maxStep: 2 },
  hard: {
    scales: ['major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian'],
    length: 8,
    maxStep: 3,
  },
};

const LEVEL_IDS: readonly EarLevel[] = ['easy', 'medium', 'hard'];

export interface DictationItem {
  scale: ScaleId;
  root: NoteIndex;
  length: number;
}

export interface DictationQuestion extends DictationItem {
  box: number;
  pitches: number[];
}

export function dictationPool(level: EarLevel): DictationItem[] {
  const def = DICTATION_LEVELS[level];
  const items: DictationItem[] = [];
  for (const scale of def.scales) {
    for (let root = 0; root < 12; root++) items.push({ scale, root: root as NoteIndex, length: def.length });
  }
  return items;
}

export function dictationKey(item: DictationItem): string {
  return `dict:${item.scale}:${item.root}:${item.length}`;
}

const DICT_KEY = /^dict:([a-z-]+):(\d|1[01]):([468])$/;

export function isDictationKey(key: string): boolean {
  const match = DICT_KEY.exec(key);
  if (match === null || !isScaleId(match[1])) return false;
  const scale = match[1];
  return LEVEL_IDS.some((id) => {
    const def = DICTATION_LEVELS[id];
    return def.length === Number(match[3]) && def.scales.includes(scale);
  });
}

/** Alturas distintas do desenho dentro da faixa de ouvido, da mais grave à mais aguda. */
export function dictationNotes(scale: ScaleId, box: number, root: NoteIndex, instrument: Instrument): number[] {
  const [lo, hi] = earRange(instrument);
  const pitches = scaleBox(scale, box, root, instrument).notes.map((n) => n.pitch);
  return [...new Set(pitches)].filter((p) => p >= lo && p <= hi).sort((a, b) => a - b);
}

function pick<T>(items: readonly T[], rng: () => number): T {
  return items[Math.min(items.length - 1, Math.floor(rng() * items.length))];
}

function maxStepOf(length: number): number {
  const id = LEVEL_IDS.find((l) => DICTATION_LEVELS[l].length === length);
  return id === undefined ? 2 : DICTATION_LEVELS[id].maxStep;
}

export function dictationMelody(item: DictationItem, box: number, instrument: Instrument, rng: () => number): number[] {
  const notes = dictationNotes(item.scale, box, item.root, instrument);
  const maxStep = maxStepOf(item.length);
  const starts: number[] = [];
  notes.forEach((p, i) => {
    if (p % 12 === item.root) starts.push(i);
  });
  let current = pick(starts, rng);
  const out = [notes[current]];
  while (out.length < item.length) {
    const next: number[] = [];
    for (let j = 0; j < notes.length; j++) {
      const d = Math.abs(j - current);
      if (d >= 1 && d <= maxStep) next.push(j);
    }
    current = pick(next, rng);
    out.push(notes[current]);
  }
  return out;
}

export function dictationQuestion(item: DictationItem, instrument: Instrument, rng: () => number): DictationQuestion {
  const boxes = Array.from({ length: SCALES[item.scale].boxCount }, (_, i) => i + 1);
  const box = pick(boxes, rng);
  return { ...item, box, pitches: dictationMelody(item, box, instrument, rng) };
}

export function buildDictationQueue(
  items: readonly DictationItem[],
  instrument: Instrument,
  rng: () => number,
): DictationQuestion[] {
  return shuffled(items, rng).map((item) => dictationQuestion(item, instrument, rng));
}

export function dictationSequence(q: DictationQuestion): SoundStep[] {
  return q.pitches.map((midi, i) => ({ midi, atMs: i * DICTATION_GAP_MS }));
}

/** Depois da última nota (início em `(n − 1) × 600`) sobra 1 s para ela soar. */
export function dictationAdvanceMs(length: number): number {
  return (length - 1) * DICTATION_GAP_MS + 1000;
}

export function isDictationTap(q: DictationQuestion, index: number, p: Position, instrument: Instrument): boolean {
  return pitchOf(p, instrument) === q.pitches[index];
}
