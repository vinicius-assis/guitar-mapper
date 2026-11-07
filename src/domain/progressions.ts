import { shuffled } from './earTraining';
import { functionLabel } from './chords';
import type { Position } from './fretboard';
import { chordRootClass, degreeQuality, type ChordQuality } from './harmony';
import { GUITAR } from './instruments';
import type { NoteIndex } from './notes';
import { pitchOf } from './pitch';

/** Tons do ii–V–I: C, F, G, D (as formas ficam entre as casas 1 e 14). */
export const II_V_I_KEYS: readonly NoteIndex[] = [0, 5, 7, 2];

export type IiViGrip = 1 | 2;
export type IiViStep = 'ii-v' | 'v-i';

export interface IiViItem {
  key: NoteIndex;
  grip: IiViGrip;
  step: IiViStep;
}

export interface ShellNote {
  position: Position;
  pitch: number;
  func: string;
  isRoot: boolean;
}

export interface ShellChord {
  degree: 2 | 5 | 1;
  root: NoteIndex;
  quality: ChordQuality;
  /** Do grave ao agudo. */
  notes: ShellNote[];
}

/**
 * Voicings curados (fundamental, 3ª e 7ª), casas da 6ª à 1ª corda, `x` = corda não tocada.
 * Forma 1: ii e I com a fundamental na 5ª corda, V na 6ª. Forma 2: ii e I na 6ª, V na 5ª.
 */
const SHELLS: Record<IiViGrip, Record<NoteIndex, readonly [string, string, string]>> = {
  1: {
    0: ['x-5-3-5-x-x', '3-x-3-4-x-x', 'x-3-2-4-x-x'],
    5: ['x-10-8-10-x-x', '8-x-8-9-x-x', 'x-8-7-9-x-x'],
    7: ['x-12-10-12-x-x', '10-x-10-11-x-x', 'x-10-9-11-x-x'],
    2: ['x-7-5-7-x-x', '5-x-5-6-x-x', 'x-5-4-6-x-x'],
  },
  2: {
    0: ['10-x-10-10-x-x', 'x-10-9-10-x-x', '8-x-9-9-x-x'],
    5: ['3-x-3-3-x-x', 'x-3-2-3-x-x', '1-x-2-2-x-x'],
    7: ['5-x-5-5-x-x', 'x-5-4-5-x-x', '3-x-4-4-x-x'],
    2: ['12-x-12-12-x-x', 'x-12-11-12-x-x', '10-x-11-11-x-x'],
  },
};

const DEGREES = [2, 5, 1] as const;

function shellChord(degree: 2 | 5 | 1, key: NoteIndex, shape: string): ShellChord {
  const root = chordRootClass('major', key, degree);
  const notes: ShellNote[] = [];
  shape.split('-').forEach((cell, i) => {
    if (cell === 'x') return;
    const position: Position = { string: 6 - i, fret: Number(cell) };
    const pitch = pitchOf(position, GUITAR);
    const semitones = (((pitch - root) % 12) + 12) % 12;
    notes.push({ position, pitch, func: functionLabel(semitones), isRoot: semitones === 0 });
  });
  return { degree, root, quality: degreeQuality('major', degree, true), notes };
}

/** ii m7, V 7 e I 7M do tom, na forma pedida. */
export function iiViChords(key: NoteIndex, grip: IiViGrip): [ShellChord, ShellChord, ShellChord] {
  const shapes = SHELLS[grip][key];
  return [
    shellChord(DEGREES[0], key, shapes[0]),
    shellChord(DEGREES[1], key, shapes[1]),
    shellChord(DEGREES[2], key, shapes[2]),
  ];
}

/** Cinco casas a partir da menor casa dos três voicings. */
export function iiViWindow(key: NoteIndex, grip: IiViGrip): { fretMin: number; fretMax: number } {
  const frets = iiViChords(key, grip).flatMap((c) => c.notes.map((n) => n.position.fret));
  const lo = Math.min(...frets);
  return { fretMin: lo, fretMax: lo + 4 };
}

export interface IiViMove {
  from: ShellNote;
  to: ShellNote;
  semitones: number;
}

export interface IiViQuestion {
  item: IiViItem;
  from: ShellChord;
  to: ShellChord;
  /** Notas-guia do destino: 3ª, 7ª. */
  targets: ShellNote[];
  /** [7ª → 3ª, 3ª → 7ª] */
  moves: [IiViMove, IiViMove];
  fretMin: number;
  fretMax: number;
}

const isThird = (n: ShellNote) => n.func === '3' || n.func === '♭3';
const isSeventh = (n: ShellNote) => n.func === '7' || n.func === '♭7';

function move(from: ShellNote, to: ShellNote): IiViMove {
  return { from, to, semitones: to.pitch - from.pitch };
}

export function iiViQuestion(item: IiViItem): IiViQuestion {
  const [ii, v, i] = iiViChords(item.key, item.grip);
  const [from, to] = item.step === 'ii-v' ? [ii, v] : [v, i];
  const third = to.notes.find(isThird)!;
  const seventh = to.notes.find(isSeventh)!;
  return {
    item,
    from,
    to,
    targets: [third, seventh],
    moves: [move(from.notes.find(isSeventh)!, third), move(from.notes.find(isThird)!, seventh)],
    ...iiViWindow(item.key, item.grip),
  };
}

export function iiViPool(): IiViItem[] {
  return II_V_I_KEYS.flatMap((key) =>
    ([1, 2] as const).flatMap((grip) => (['ii-v', 'v-i'] as const).map((step) => ({ key, grip, step }))),
  );
}

export function iiViKey(item: IiViItem): string {
  return `iivi:${item.key}:${item.grip}:${item.step}`;
}

const IIVI_KEY = /^iivi:(\d|1[01]):([12]):(ii-v|v-i)$/;

export function isIiViKey(key: string): boolean {
  const m = IIVI_KEY.exec(key);
  return m !== null && II_V_I_KEYS.includes(Number(m[1]));
}

export function buildIiViQueue(items: readonly IiViItem[], rng: () => number): IiViItem[] {
  return shuffled(items, rng);
}

/** Vale só a altura exata de uma nota-guia do destino. */
export function isIiViTarget(q: IiViQuestion, pitch: number): boolean {
  return q.targets.some((t) => t.pitch === pitch);
}
