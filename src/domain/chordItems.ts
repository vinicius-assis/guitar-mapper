import { shuffled } from './earTraining';
import type { ChordQuality } from './harmony';
import {
  CHORD_SHAPES,
  CHORD_SHAPE_IDS,
  chordFamily,
  isChordShapeId,
  isTriad,
  shapeRoots,
  type ChordShapeId,
} from './chords';
import type { NoteIndex } from './notes';

export type ChordShapeSetting = 'open' | 'barre' | 'all';
export const CHORD_SHAPE_SETTINGS: readonly ChordShapeSetting[] = ['open', 'barre', 'all'];
export type ChordKindSetting = 'triads' | 'sevenths' | 'both';
export const CHORD_KIND_SETTINGS: readonly ChordKindSetting[] = ['triads', 'sevenths', 'both'];

/** Item de Acordes: uma forma de violão numa fundamental. */
export interface ChordItem {
  shape: ChordShapeId;
  root: NoteIndex;
}

export function chordPool(shapes: ChordShapeSetting, kinds: ChordKindSetting): ChordItem[] {
  return CHORD_SHAPE_IDS.filter((id) => {
    const shape = CHORD_SHAPES[id];
    if (shapes === 'open' && shape.form !== 'open') return false;
    if (shapes === 'barre' && shape.form === 'open') return false;
    if (kinds === 'triads') return isTriad(shape.quality);
    if (kinds === 'sevenths') return !isTriad(shape.quality);
    return true;
  }).flatMap((shape) => shapeRoots(shape).map((root) => ({ shape, root })));
}

export function chordNameKey(item: ChordItem): string {
  return `chordname:${item.shape}:${item.root}`;
}

export function chordPlayKey(item: ChordItem): string {
  return `chordplay:${item.shape}:${item.root}`;
}

const NAME_KEY = /^chordname:([a-z0-9-]+):(\d|1[01])$/;
const PLAY_KEY = /^chordplay:([a-z0-9-]+):(\d|1[01])$/;

function isValidKey(re: RegExp, key: string): boolean {
  const match = re.exec(key);
  if (match === null || !isChordShapeId(match[1])) return false;
  return (shapeRoots(match[1]) as number[]).includes(Number(match[2]));
}

export const isChordNameKey = (key: string): boolean => isValidKey(NAME_KEY, key);
export const isChordPlayKey = (key: string): boolean => isValidKey(PLAY_KEY, key);

export interface ChordName {
  root: NoteIndex;
  quality: ChordQuality;
}

export interface ChordNameQuestion extends ChordItem {
  options: ChordName[];
}

const ALL_ROOTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as NoteIndex[];

export function buildChordNameQueue(items: readonly ChordItem[], rng: () => number): ChordNameQuestion[] {
  const pick = <T>(list: readonly T[]): T => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
  return shuffled(items, rng).map((item) => {
    const { root } = item;
    const quality = CHORD_SHAPES[item.shape].quality;
    const family = chordFamily(quality);
    const correct: ChordName = { root, quality };
    const sameRoot: ChordName = { root, quality: pick(family.filter((q) => q !== quality)) };
    const sameQuality: ChordName = { root: ((root + 1 + pick([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])) % 12) as NoteIndex, quality };
    const taken = [correct, sameRoot, sameQuality];
    const rest = ALL_ROOTS.flatMap((r) => family.map((q) => ({ root: r, quality: q }))).filter(
      (c) => !taken.some((t) => t.root === c.root && t.quality === c.quality),
    );
    return { ...item, options: shuffled([...taken, pick(rest)], rng) };
  });
}

export function buildChordPlayQueue(items: readonly ChordItem[], rng: () => number): ChordItem[] {
  return shuffled(items, rng);
}
