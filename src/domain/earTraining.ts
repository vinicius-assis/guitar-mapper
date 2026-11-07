import type { Instrument, InstrumentId } from './instruments';
import { INTERVALS } from './intervals';
import type { NoteIndex } from './notes';
import type { EarLevel } from './quiz';

export type EarDirection = 'up' | 'down';
export type EarDirectionSetting = EarDirection | 'both';
export const EAR_DIRECTIONS: readonly EarDirectionSetting[] = ['up', 'down', 'both'];

export interface EarInterval {
  semitones: number;
  label: string;
  name: string;
}

/** 0 a 12 semitons; o índice é o número de semitons. */
export const EAR_INTERVALS: readonly EarInterval[] = [
  { semitones: 0, label: 'Uníssono', name: 'uníssono' },
  ...INTERVALS.map((i) => ({ semitones: i.semitones, label: i.label, name: i.name })),
  { semitones: 12, label: '8ª J', name: 'oitava justa' },
];

export function earInterval(semitones: number): EarInterval {
  return EAR_INTERVALS[semitones];
}

export const EAR_INTERVAL_LEVELS: Record<EarLevel, readonly number[]> = {
  easy: [4, 7, 12],
  medium: [2, 3, 4, 5, 7, 9, 12],
  hard: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
};

export const DEGREE_LEVELS: Record<EarLevel, readonly number[]> = {
  easy: [1, 3, 5],
  medium: [1, 2, 3, 4, 5],
  hard: [1, 2, 3, 4, 5, 6, 7],
};

/** Semitons de cada grau da escala maior acima da tônica (índice = grau - 1). */
export const MAJOR_SEMITONES: readonly number[] = [0, 2, 4, 5, 7, 9, 11];

export interface EarIntervalItem {
  root: NoteIndex;
  semitones: number;
  direction: EarDirection;
}

export interface EarIntervalQuestion extends EarIntervalItem {
  pitches: [number, number];
}

export interface DegreeItem {
  tonic: NoteIndex;
  degree: number;
}

export interface DegreeQuestion extends DegreeItem {
  tonicMidi: number;
}

export interface SoundStep {
  midi: number;
  atMs: number;
}

export const EAR_RANGE: Record<InstrumentId, [number, number]> = {
  guitar: [45, 76],
  bass: [33, 60],
};

export function earRange(instrument: Instrument): [number, number] {
  return EAR_RANGE[instrument.id];
}

const ROOTS: NoteIndex[] = Array.from({ length: 12 }, (_, i) => i as NoteIndex);

export function earIntervalPool(level: EarLevel, setting: EarDirectionSetting): EarIntervalItem[] {
  const directions: EarDirection[] = setting === 'both' ? ['up', 'down'] : [setting];
  const items: EarIntervalItem[] = [];
  for (const root of ROOTS) {
    for (const semitones of EAR_INTERVAL_LEVELS[level]) {
      if (semitones === 0) {
        items.push({ root, semitones, direction: 'up' });
        continue;
      }
      for (const direction of directions) items.push({ root, semitones, direction });
    }
  }
  return items;
}

export function degreePool(level: EarLevel): DegreeItem[] {
  const items: DegreeItem[] = [];
  for (const tonic of ROOTS) {
    for (const degree of DEGREE_LEVELS[level]) items.push({ tonic, degree });
  }
  return items;
}

export function earIntervalKey(item: EarIntervalItem): string {
  return `earint:${item.root}:${item.semitones}:${item.direction}`;
}

export function isEarIntervalKey(key: string): boolean {
  return /^earint:(\d|1[01]):(\d|1[0-2]):(up|down)$/.test(key) && !/^earint:\d+:0:down$/.test(key);
}

export function degreeKey(item: DegreeItem): string {
  return `func:${item.tonic}:${item.degree}`;
}

export function isDegreeKey(key: string): boolean {
  return /^func:(\d|1[01]):([1-7])$/.test(key);
}

/** Sorteia, entre as alturas de `[lo, hi]` com a classe `pitchClass`, uma delas. */
function drawPitch(pitchClass: number, lo: number, hi: number, rng: () => number): number {
  const cands: number[] = [];
  for (let m = lo; m <= hi; m++) if (m % 12 === pitchClass) cands.push(m);
  const n = cands.length;
  return cands[Math.min(n - 1, Math.floor(rng() * n))];
}

export function earIntervalPitches(
  item: EarIntervalItem,
  instrument: Instrument,
  rng: () => number,
): [number, number] {
  const [lo, hi] = earRange(instrument);
  const s = item.semitones;
  if (item.direction === 'up') {
    const first = drawPitch(item.root, lo, hi - s, rng);
    return [first, first + s];
  }
  const first = drawPitch(item.root, lo + s, hi, rng);
  return [first, first - s];
}

export function earIntervalSequence(question: EarIntervalQuestion): SoundStep[] {
  return [
    { midi: question.pitches[0], atMs: 0 },
    { midi: question.pitches[1], atMs: 900 },
  ];
}

export function degreeTonicMidi(
  tonic: NoteIndex,
  instrument: Instrument,
  rng: () => number,
): number {
  const [lo, hi] = earRange(instrument);
  return drawPitch(tonic, lo, hi - 11, rng);
}

export function degreeTarget(question: DegreeQuestion): number {
  return question.tonicMidi + MAJOR_SEMITONES[question.degree - 1];
}

export function degreeSequence(question: DegreeQuestion, level: EarLevel): SoundStep[] {
  const t = question.tonicMidi;
  const target = degreeTarget(question);
  if (level === 'hard') {
    return [
      { midi: t, atMs: 0 },
      { midi: target, atMs: 1000 },
    ];
  }
  return [
    { midi: t, atMs: 0 },
    { midi: t + MAJOR_SEMITONES[2], atMs: 400 },
    { midi: t + MAJOR_SEMITONES[4], atMs: 800 },
    { midi: target, atMs: 1800 },
  ];
}

export function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function buildEarIntervalQueue(
  items: readonly EarIntervalItem[],
  instrument: Instrument,
  rng: () => number,
): EarIntervalQuestion[] {
  return shuffled(items, rng).map((item) => ({
    ...item,
    pitches: earIntervalPitches(item, instrument, rng),
  }));
}

export function buildDegreeQueue(
  items: readonly DegreeItem[],
  instrument: Instrument,
  rng: () => number,
): DegreeQuestion[] {
  return shuffled(items, rng).map((item) => ({
    ...item,
    tonicMidi: degreeTonicMidi(item.tonic, instrument, rng),
  }));
}
