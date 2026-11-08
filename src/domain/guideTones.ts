import { shuffled } from './earTraining';
import {
  CHORD_SHAPES,
  CHORD_SHAPE_IDS,
  isChordShapeId,
  isTriad,
  shapeRoots,
  type ChordShapeId,
  type Voicing,
  type VoicingNote,
} from './chords';
import type { ChordItem, ChordShapeSetting } from './chordItems';
import type { Position } from './fretboard';

/** Formas de sétima, na ordem de `CHORD_SHAPE_IDS`. */
export const GUIDE_SHAPE_IDS: readonly ChordShapeId[] = CHORD_SHAPE_IDS.filter(
  (id) => !isTriad(CHORD_SHAPES[id].quality),
);

const GUIDE_FUNCS: readonly string[] = ['3', '♭3', '7', '♭7'];

export function isGuideFunc(func: string): boolean {
  return GUIDE_FUNCS.includes(func);
}

/** Notas-guia (3ª e 7ª) do desenho, da 6ª corda à 1ª. */
export function guideNotes(v: Voicing): VoicingNote[] {
  return v.notes.filter((n) => isGuideFunc(n.func));
}

/** Casas que o desenho ocupa: aberto 0..4, móvel a janela do desenho. */
export function guideWindow(v: Voicing): { fretMin: number; fretMax: number } {
  return CHORD_SHAPES[v.shape].form === 'open' ? { fretMin: 0, fretMax: 4 } : { fretMin: v.fretMin, fretMax: v.fretMax };
}

export function guidePool(shapes: ChordShapeSetting): ChordItem[] {
  return GUIDE_SHAPE_IDS.filter((id) => {
    const form = CHORD_SHAPES[id].form;
    return shapes === 'all' || (shapes === 'open') === (form === 'open');
  }).flatMap((shape) => shapeRoots(shape).map((root) => ({ shape, root })));
}

export function guideKey(item: ChordItem): string {
  return `guide:${item.shape}:${item.root}`;
}

const GUIDE_KEY = /^guide:([a-z0-9-]+):(\d|1[01])$/;

export function isGuideKey(key: string): boolean {
  const match = GUIDE_KEY.exec(key);
  if (match === null || !isChordShapeId(match[1]) || isTriad(CHORD_SHAPES[match[1]].quality)) return false;
  return (shapeRoots(match[1]) as number[]).includes(Number(match[2]));
}

export function buildGuideQueue(items: readonly ChordItem[], rng: () => number): ChordItem[] {
  return shuffled(items, rng);
}

export type GuideTap = 'guide' | 'other' | 'outside';

/** Por corda e casa: nota-guia, outra nota do desenho, ou fora dele. */
export function classifyGuideTap(v: Voicing, p: Position): GuideTap {
  const note = v.notes.find((n) => n.position.string === p.string && n.position.fret === p.fret);
  if (note === undefined) return 'outside';
  return isGuideFunc(note.func) ? 'guide' : 'other';
}
