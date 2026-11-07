import { SEVENTH_QUALITIES, type ChordQuality } from './harmony';
import { SCALES } from './scales';
import { spellScale, type Spelling } from './spelling';
import { GUITAR } from './instruments';
import type { Position } from './fretboard';
import type { Accidentals, NoteIndex } from './notes';

export const CHORD_QUALITIES: readonly ChordQuality[] = ['major', 'minor', 'maj7', 'dom7', 'min7', 'half-dim'];
export const TRIAD_FAMILY: readonly ChordQuality[] = ['major', 'minor'];

export function isTriad(q: ChordQuality): boolean {
  return TRIAD_FAMILY.includes(q);
}

export function chordFamily(q: ChordQuality): readonly ChordQuality[] {
  return isTriad(q) ? TRIAD_FAMILY : SEVENTH_QUALITIES;
}

const SEMITONES: Record<ChordQuality, readonly number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  dim: [0, 3, 6],
  maj7: [0, 4, 7, 11],
  dom7: [0, 4, 7, 10],
  min7: [0, 3, 7, 10],
  'half-dim': [0, 3, 6, 10],
};

export function chordSemitones(q: ChordQuality): readonly number[] {
  return SEMITONES[q];
}

/** Notas do acorde: terças empilhadas por letra, com as regras do `spellScale` aplicadas a um "acorde como escala". */
export function spellChordTones(root: NoteIndex, q: ChordQuality, accidentals: Accidentals): Spelling[] {
  const semitones = chordSemitones(q);
  return spellScale(
    root,
    { ...SCALES.major, semitones, letterSteps: [0, 2, 4, 6].slice(0, semitones.length) },
    accidentals,
  );
}

const FUNCTION_LABELS: Record<number, string> = {
  0: '1',
  3: '♭3',
  4: '3',
  6: '♭5',
  7: '5',
  10: '♭7',
  11: '7',
};

export function functionLabel(semitonesAboveRoot: number): string {
  return FUNCTION_LABELS[semitonesAboveRoot];
}

export const CHORD_SHAPE_IDS = [
  'c', 'a', 'g', 'e', 'd', 'am', 'em', 'dm',
  'g7', 'c7', 'd7', 'a7', 'e7', 'am7', 'em7', 'dm7',
  'cmaj7', 'fmaj7', 'bm7b5',
  'e-maj', 'e-min', 'e-7', 'e-m7',
  'a-maj', 'a-min', 'a-7', 'a-m7', 'a-maj7', 'a-m7b5',
] as const;

export type ChordShapeId = (typeof CHORD_SHAPE_IDS)[number];

export function isChordShapeId(v: unknown): v is ChordShapeId {
  return typeof v === 'string' && (CHORD_SHAPE_IDS as readonly string[]).includes(v);
}

export interface ChordShape {
  id: ChordShapeId;
  quality: ChordQuality;
  form: 'open' | 'e' | 'a';
  /** Só nos abertos. */
  root?: NoteIndex;
  /** 6ª → 1ª; absolutas nos abertos, relativas à casa da fundamental nos móveis; null = abafada. */
  frets: readonly (number | null)[];
  barre?: { fromString: number; toString: number };
  omitsFifth?: true;
}

type F = readonly (number | null)[];
const x = null;

function open(id: ChordShapeId, quality: ChordQuality, root: NoteIndex, frets: F, omitsFifth?: true): ChordShape {
  return omitsFifth ? { id, quality, form: 'open', root, frets, omitsFifth } : { id, quality, form: 'open', root, frets };
}
function formE(id: ChordShapeId, quality: ChordQuality, frets: F): ChordShape {
  return { id, quality, form: 'e', frets, barre: { fromString: 6, toString: 1 } };
}
function formA(id: ChordShapeId, quality: ChordQuality, frets: F, barre = true): ChordShape {
  return barre
    ? { id, quality, form: 'a', frets, barre: { fromString: 5, toString: 1 } }
    : { id, quality, form: 'a', frets };
}

export const CHORD_SHAPES: Record<ChordShapeId, ChordShape> = {
  c: open('c', 'major', 0, [x, 3, 2, 0, 1, 0]),
  a: open('a', 'major', 9, [x, 0, 2, 2, 2, 0]),
  g: open('g', 'major', 7, [3, 2, 0, 0, 0, 3]),
  e: open('e', 'major', 4, [0, 2, 2, 1, 0, 0]),
  d: open('d', 'major', 2, [x, x, 0, 2, 3, 2]),
  am: open('am', 'minor', 9, [x, 0, 2, 2, 1, 0]),
  em: open('em', 'minor', 4, [0, 2, 2, 0, 0, 0]),
  dm: open('dm', 'minor', 2, [x, x, 0, 2, 3, 1]),
  g7: open('g7', 'dom7', 7, [3, 2, 0, 0, 0, 1]),
  c7: open('c7', 'dom7', 0, [x, 3, 2, 3, 1, 0], true),
  d7: open('d7', 'dom7', 2, [x, x, 0, 2, 1, 2]),
  a7: open('a7', 'dom7', 9, [x, 0, 2, 0, 2, 0]),
  e7: open('e7', 'dom7', 4, [0, 2, 0, 1, 0, 0]),
  am7: open('am7', 'min7', 9, [x, 0, 2, 0, 1, 0]),
  em7: open('em7', 'min7', 4, [0, 2, 0, 0, 0, 0]),
  dm7: open('dm7', 'min7', 2, [x, x, 0, 2, 1, 1]),
  cmaj7: open('cmaj7', 'maj7', 0, [x, 3, 2, 0, 0, 0]),
  fmaj7: open('fmaj7', 'maj7', 5, [x, x, 3, 2, 1, 0]),
  bm7b5: open('bm7b5', 'half-dim', 11, [x, 2, 3, 2, 3, x]),
  'e-maj': formE('e-maj', 'major', [0, 2, 2, 1, 0, 0]),
  'e-min': formE('e-min', 'minor', [0, 2, 2, 0, 0, 0]),
  'e-7': formE('e-7', 'dom7', [0, 2, 0, 1, 0, 0]),
  'e-m7': formE('e-m7', 'min7', [0, 2, 0, 0, 0, 0]),
  'a-maj': formA('a-maj', 'major', [x, 0, 2, 2, 2, 0]),
  'a-min': formA('a-min', 'minor', [x, 0, 2, 2, 1, 0]),
  'a-7': formA('a-7', 'dom7', [x, 0, 2, 0, 2, 0]),
  'a-m7': formA('a-m7', 'min7', [x, 0, 2, 0, 1, 0]),
  'a-maj7': formA('a-maj7', 'maj7', [x, 0, 2, 1, 2, 0]),
  'a-m7b5': formA('a-m7b5', 'half-dim', [x, 0, 1, 0, 1, x], false),
};

export function shapeRoots(id: ChordShapeId): NoteIndex[] {
  const shape = CHORD_SHAPES[id];
  return shape.form === 'open' ? [shape.root as NoteIndex] : ([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as NoteIndex[]);
}

/** Móvel: casa da fundamental na corda 6 (forma de Mi) ou 5 (forma de Lá), de 1 a 12. Aberto: 0. */
export function barreFret(id: ChordShapeId, root: NoteIndex): number {
  const shape = CHORD_SHAPES[id];
  if (shape.form === 'open') return 0;
  const openNote = shape.form === 'e' ? 4 : 9;
  return ((root - openNote + 12) % 12) || 12;
}

export interface VoicingNote {
  position: Position;
  pitch: number;
  func: string;
  isRoot: boolean;
}

export interface Voicing {
  shape: ChordShapeId;
  root: NoteIndex;
  quality: ChordQuality;
  /** Cordas tocadas, 6ª → 1ª. */
  notes: VoicingNote[];
  /** Casa ≥ 1. */
  fretted: VoicingNote[];
  /** Índice 0 = corda 1. */
  stringMarks: ('open' | 'muted' | null)[];
  barre?: { fret: number; fromString: number; toString: number };
  fretMin: number;
  fretMax: number;
}

export function chordVoicing(id: ChordShapeId, root: NoteIndex): Voicing {
  const shape = CHORD_SHAPES[id];
  const isOpen = shape.form === 'open';
  const r = isOpen ? (shape.root as NoteIndex) : root;
  const base = isOpen ? 0 : barreFret(id, r);
  const notes: VoicingNote[] = [];
  const stringMarks: ('open' | 'muted' | null)[] = [null, null, null, null, null, null];
  shape.frets.forEach((rel, i) => {
    const string = 6 - i;
    if (rel === null) {
      stringMarks[string - 1] = 'muted';
      return;
    }
    const fret = base + rel;
    if (fret === 0) stringMarks[string - 1] = 'open';
    const pitch = GUITAR.openMidi[string - 1] + fret;
    notes.push({
      position: { string, fret },
      pitch,
      func: functionLabel((pitch - r + 120) % 12),
      isRoot: (pitch - r + 120) % 12 === 0,
    });
  });
  const lo = isOpen ? 1 : Math.max(1, base - 1);
  const hi = isOpen ? 4 : lo + 4;
  const voicing: Voicing = {
    shape: id,
    root: r,
    quality: shape.quality,
    notes,
    fretted: notes.filter((n) => n.position.fret >= 1),
    stringMarks,
    fretMin: lo,
    fretMax: hi,
  };
  if (!isOpen && shape.barre) voicing.barre = { fret: base, ...shape.barre };
  return voicing;
}

export function voicingPitches(v: Voicing): number[] {
  return v.notes.map((n) => n.pitch);
}
