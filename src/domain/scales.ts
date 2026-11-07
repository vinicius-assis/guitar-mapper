import { FIRST_QUIZ_FRET, MAX_FRET, type Position } from './fretboard';
import type { Instrument } from './instruments';
import type { NoteIndex } from './notes';

export type ScaleId =
  | 'pent-minor'
  | 'pent-major'
  | 'blues'
  | 'major'
  | 'minor'
  | 'dorian'
  | 'phrygian'
  | 'lydian'
  | 'mixolydian'
  | 'locrian';

export const SCALE_IDS: readonly ScaleId[] = [
  'pent-minor',
  'pent-major',
  'blues',
  'major',
  'minor',
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'locrian',
];

export function isScaleId(value: unknown): value is ScaleId {
  return typeof value === 'string' && (SCALE_IDS as readonly string[]).includes(value);
}

export interface ScaleDef {
  id: ScaleId;
  /** Rótulo no menu. */
  label: string;
  /** Nome após a tônica ("A pentatônica menor"). */
  name: string;
  semitones: readonly number[];
  /** Passo de letra de cada grau a partir da tônica. */
  letterSteps: readonly number[];
  degrees: readonly string[];
  notesPerString: 2 | 3;
  /** Escala cujos desenhos esta reaproveita (blues). */
  base?: 'pent-minor';
  /** Índice em `semitones` da blue note. */
  blueNote?: number;
  boxCount: number;
}

const SEVEN = [0, 1, 2, 3, 4, 5, 6];

export const SCALES: Record<ScaleId, ScaleDef> = {
  'pent-minor': {
    id: 'pent-minor',
    label: 'Pentatônica menor',
    name: 'pentatônica menor',
    semitones: [0, 3, 5, 7, 10],
    letterSteps: [0, 2, 3, 4, 6],
    degrees: ['1', '♭3', '4', '5', '♭7'],
    notesPerString: 2,
    boxCount: 5,
  },
  'pent-major': {
    id: 'pent-major',
    label: 'Pentatônica maior',
    name: 'pentatônica maior',
    semitones: [0, 2, 4, 7, 9],
    letterSteps: [0, 1, 2, 4, 5],
    degrees: ['1', '2', '3', '5', '6'],
    notesPerString: 2,
    boxCount: 5,
  },
  blues: {
    id: 'blues',
    label: 'Blues',
    name: 'blues',
    semitones: [0, 3, 5, 6, 7, 10],
    letterSteps: [0, 2, 3, 4, 4, 6],
    degrees: ['1', '♭3', '4', '♭5', '5', '♭7'],
    notesPerString: 2,
    base: 'pent-minor',
    blueNote: 3,
    boxCount: 5,
  },
  major: {
    id: 'major',
    label: 'Maior (jônio)',
    name: 'maior',
    semitones: [0, 2, 4, 5, 7, 9, 11],
    letterSteps: SEVEN,
    degrees: ['1', '2', '3', '4', '5', '6', '7'],
    notesPerString: 3,
    boxCount: 7,
  },
  minor: {
    id: 'minor',
    label: 'Menor natural (eólio)',
    name: 'menor natural',
    semitones: [0, 2, 3, 5, 7, 8, 10],
    letterSteps: SEVEN,
    degrees: ['1', '2', '♭3', '4', '5', '♭6', '♭7'],
    notesPerString: 3,
    boxCount: 7,
  },
  dorian: {
    id: 'dorian',
    label: 'Dórico',
    name: 'dórico',
    semitones: [0, 2, 3, 5, 7, 9, 10],
    letterSteps: SEVEN,
    degrees: ['1', '2', '♭3', '4', '5', '6', '♭7'],
    notesPerString: 3,
    boxCount: 7,
  },
  phrygian: {
    id: 'phrygian',
    label: 'Frígio',
    name: 'frígio',
    semitones: [0, 1, 3, 5, 7, 8, 10],
    letterSteps: SEVEN,
    degrees: ['1', '♭2', '♭3', '4', '5', '♭6', '♭7'],
    notesPerString: 3,
    boxCount: 7,
  },
  lydian: {
    id: 'lydian',
    label: 'Lídio',
    name: 'lídio',
    semitones: [0, 2, 4, 6, 7, 9, 11],
    letterSteps: SEVEN,
    degrees: ['1', '2', '3', '♯4', '5', '6', '7'],
    notesPerString: 3,
    boxCount: 7,
  },
  mixolydian: {
    id: 'mixolydian',
    label: 'Mixolídio',
    name: 'mixolídio',
    semitones: [0, 2, 4, 5, 7, 9, 10],
    letterSteps: SEVEN,
    degrees: ['1', '2', '3', '4', '5', '6', '♭7'],
    notesPerString: 3,
    boxCount: 7,
  },
  locrian: {
    id: 'locrian',
    label: 'Lócrio',
    name: 'lócrio',
    semitones: [0, 1, 3, 5, 6, 8, 10],
    letterSteps: SEVEN,
    degrees: ['1', '♭2', '♭3', '4', '♭5', '♭6', '♭7'],
    notesPerString: 3,
    boxCount: 7,
  },
};

export const SCALE_GROUPS: readonly { label: string; scales: readonly ScaleId[] }[] = [
  { label: 'Pentatônicas e blues', scales: ['pent-minor', 'pent-major', 'blues'] },
  { label: 'Maior e menor', scales: ['major', 'minor'] },
  { label: 'Modos', scales: ['dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian'] },
];

export interface BoxNote {
  position: Position;
  pitch: number;
  /** Índice em `semitones` (0 = tônica). */
  degree: number;
}

export interface ScaleBox {
  /** Da corda mais grave à mais aguda, casa crescente. */
  notes: BoxNote[];
  fretMin: number;
  fretMax: number;
}

/** Índice do grau da pentatônica menor dentro do blues. */
const PENT_MINOR_IN_BLUES = [0, 1, 2, 4, 5];

export function scaleDegreeOf(pitchClass: NoteIndex, root: NoteIndex, scale: ScaleId): number {
  const interval = (((pitchClass - root) % 12) + 12) % 12;
  return SCALES[scale].semitones.indexOf(interval);
}

function sortNotes(notes: BoxNote[]): BoxNote[] {
  return notes.sort((a, b) => b.position.string - a.position.string || a.position.fret - b.position.fret);
}

function withRange(notes: BoxNote[]): ScaleBox {
  const frets = notes.map((n) => n.position.fret);
  return { notes, fretMin: Math.min(...frets), fretMax: Math.max(...frets) };
}

export function scaleBox(scale: ScaleId, box: number, root: NoteIndex, instrument: Instrument): ScaleBox {
  const def = SCALES[scale];
  if (def.base) {
    const base = scaleBox(def.base, box, root, instrument);
    const notes: BoxNote[] = base.notes.map((n) => ({ ...n, degree: PENT_MINOR_IN_BLUES[n.degree] }));
    const have = new Set(notes.map((n) => n.pitch));
    const blueClass = (root + def.semitones[def.blueNote ?? 0]) % 12;
    for (let string = 1; string <= instrument.stringCount; string++) {
      for (let fret = base.fretMin; fret <= base.fretMax; fret++) {
        const pitch = instrument.openMidi[string - 1] + fret;
        if (pitch % 12 !== blueClass || have.has(pitch)) continue;
        notes.push({ position: { string, fret }, pitch, degree: def.blueNote ?? 0 });
        have.add(pitch);
      }
    }
    return withRange(sortNotes(notes));
  }

  const count = instrument.stringCount;
  const low = instrument.openMidi[count - 1];
  const n = def.semitones.length;
  const first = box - 1;
  const targetClass = (root + def.semitones[first]) % 12;
  const start = low + ((targetClass - (low % 12) + 12) % 12);
  const origin = start - def.semitones[first];

  let notes: BoxNote[] = [];
  for (let k = 0; k < count * def.notesPerString; k++) {
    const idx = first + k;
    const string = count - Math.floor(k / def.notesPerString);
    const pitch = origin + def.semitones[idx % n] + 12 * Math.floor(idx / n);
    notes.push({ position: { string, fret: pitch - instrument.openMidi[string - 1] }, pitch, degree: idx % n });
  }
  while (notes.some((x) => x.position.fret < FIRST_QUIZ_FRET)) {
    notes = notes.map((x) => ({
      ...x,
      pitch: x.pitch + 12,
      position: { string: x.position.string, fret: x.position.fret + 12 },
    }));
  }
  if (notes.some((x) => x.position.fret > MAX_FRET)) {
    throw new Error(`scale box out of range: ${scale} ${box} ${root}`);
  }
  return withRange(sortNotes(notes));
}
