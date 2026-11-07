import { MAX_FRET, notePositions, type Position } from './fretboard';
import type { Instrument } from './instruments';
import type { NoteIndex } from './notes';
import { pitchOf } from './pitch';

export type IntervalId =
  | '2m'
  | '2M'
  | '3m'
  | '3M'
  | '4J'
  | '4A'
  | '5J'
  | '6m'
  | '6M'
  | '7m'
  | '7M';

export interface Interval {
  id: IntervalId;
  semitones: number;
  label: string;
  name: string;
  abbr: string;
}

export const INTERVALS: readonly Interval[] = [
  { id: '2m', semitones: 1, label: '2ª m', name: 'segunda menor', abbr: '2m' },
  { id: '2M', semitones: 2, label: '2ª M', name: 'segunda maior', abbr: '2M' },
  { id: '3m', semitones: 3, label: '3ª m', name: 'terça menor', abbr: '3m' },
  { id: '3M', semitones: 4, label: '3ª M', name: 'terça maior', abbr: '3M' },
  { id: '4J', semitones: 5, label: '4ª J', name: 'quarta justa', abbr: '4J' },
  { id: '4A', semitones: 6, label: 'Trítono', name: 'trítono', abbr: '4A/5d' },
  { id: '5J', semitones: 7, label: '5ª J', name: 'quinta justa', abbr: '5J' },
  { id: '6m', semitones: 8, label: '6ª m', name: 'sexta menor', abbr: '6m' },
  { id: '6M', semitones: 9, label: '6ª M', name: 'sexta maior', abbr: '6M' },
  { id: '7m', semitones: 10, label: '7ª m', name: 'sétima menor', abbr: '7m' },
  { id: '7M', semitones: 11, label: '7ª M', name: 'sétima maior', abbr: '7M' },
];

export const DEFAULT_INTERVALS: readonly IntervalId[] = ['3m', '3M', '5J', '7m', '7M'];

export function intervalById(id: IntervalId): Interval {
  return INTERVALS.find((i) => i.id === id) as Interval;
}

export function isIntervalId(value: unknown): value is IntervalId {
  return INTERVALS.some((i) => i.id === value);
}

export interface IntervalItem {
  root: NoteIndex;
  interval: IntervalId;
}

export function intervalAnswer(item: IntervalItem): NoteIndex {
  return (item.root + intervalById(item.interval).semitones) % 12;
}

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Todas as combinações nota × intervalo, uma vez cada, na ordem nota × intervalo. */
export function intervalItems(
  roots: readonly NoteIndex[],
  intervals: readonly IntervalId[],
): IntervalItem[] {
  const items: IntervalItem[] = [];
  for (const root of roots) {
    for (const interval of intervals) items.push({ root, interval });
  }
  return items;
}

/** Embaralha itens de intervalo (o mesmo embaralhamento de `buildIntervalQueue`). */
export function shuffleIntervalItems(items: readonly IntervalItem[], rng: () => number): IntervalItem[] {
  return shuffle(items, rng);
}

/** Todas as combinações nota × intervalo, uma vez cada, embaralhadas. */
export function buildIntervalQueue(
  roots: readonly NoteIndex[],
  intervals: readonly IntervalId[],
  rng: () => number,
): IntervalItem[] {
  return shuffle(intervalItems(roots, intervals), rng);
}

/** Menor e maior altura MIDI tocáveis (corda solta mais grave até a casa 24 da mais aguda). */
export function instrumentRange(instrument: Instrument): [number, number] {
  return [
    Math.min(...instrument.openMidi),
    Math.max(...instrument.openMidi) + MAX_FRET,
  ];
}

/** Par de alturas [partida, chegada]: a menor partida dentro da faixa cuja chegada também cabe. */
export function intervalPitches(
  root: NoteIndex,
  interval: Interval,
  instrument: Instrument,
): [number, number] {
  const [lo, hi] = instrumentRange(instrument);
  let a = lo + ((root - (lo % 12) + 12) % 12);
  if (a + interval.semitones > hi) a -= 12;
  return [a, a + interval.semitones];
}

/** Ligação mais curta no braço entre a nota de partida e a de chegada do intervalo (sempre ascendente). */
export function intervalLink(
  root: NoteIndex,
  interval: Interval,
  instrument: Instrument,
  fretMin = 0,
  fretMax = 12,
): { from: Position; to: Position } | null {
  const arrival = (root + interval.semitones) % 12;
  const froms = notePositions(root, instrument, fretMin, fretMax);
  const tos = notePositions(arrival, instrument, fretMin, fretMax);
  let best: { from: Position; to: Position } | null = null;
  let bestDist = Infinity;
  for (const from of froms) {
    for (const to of tos) {
      if (pitchOf(to, instrument) - pitchOf(from, instrument) !== interval.semitones) continue;
      const dist = Math.abs(to.string - from.string) + Math.abs(to.fret - from.fret);
      const better =
        dist < bestDist ||
        (dist === bestDist &&
          best !== null &&
          (from.fret < best.from.fret ||
            (from.fret === best.from.fret && from.string < best.from.string)));
      if (better) {
        best = { from, to };
        bestDist = dist;
      }
    }
  }
  return best;
}
