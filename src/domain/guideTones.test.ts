import { describe, it, expect } from 'vitest';
import { chordVoicing, type VoicingNote } from './chords';
import {
  GUIDE_SHAPE_IDS,
  buildGuideQueue,
  classifyGuideTap,
  guideKey,
  guideNotes,
  guidePool,
  guideWindow,
  isGuideFunc,
  isGuideKey,
} from './guideTones';
import type { NoteIndex } from './notes';

const fmt = (ns: VoicingNote[]) => ns.map((n) => `${n.position.string}-${n.position.fret}`).join(' ');

const OPEN_GUIDES: Record<string, string> = { g7: '5-2 2-0 1-1', c7: '4-2 3-3 1-0', d7: '2-1 1-2', a7: '3-0 2-2', e7: '4-0 3-1', am7: '3-0 2-1', em7: '4-0 3-0', dm7: '2-1 1-1', cmaj7: '4-2 2-0 1-0', fmaj7: '3-2 1-0', bm7b5: '3-2 2-3' };
/** Índice = fundamental 0..11. */
const MOVABLE_GUIDES: Record<string, string[]> = {
  'e-7': ['4-8 3-9', '4-9 3-10', '4-10 3-11', '4-11 3-12', '4-12 3-13', '4-1 3-2', '4-2 3-3', '4-3 3-4', '4-4 3-5', '4-5 3-6', '4-6 3-7', '4-7 3-8'],
  'e-m7': ['4-8 3-8', '4-9 3-9', '4-10 3-10', '4-11 3-11', '4-12 3-12', '4-1 3-1', '4-2 3-2', '4-3 3-3', '4-4 3-4', '4-5 3-5', '4-6 3-6', '4-7 3-7'],
  'a-7': ['3-3 2-5', '3-4 2-6', '3-5 2-7', '3-6 2-8', '3-7 2-9', '3-8 2-10', '3-9 2-11', '3-10 2-12', '3-11 2-13', '3-12 2-14', '3-1 2-3', '3-2 2-4'],
  'a-m7': ['3-3 2-4', '3-4 2-5', '3-5 2-6', '3-6 2-7', '3-7 2-8', '3-8 2-9', '3-9 2-10', '3-10 2-11', '3-11 2-12', '3-12 2-13', '3-1 2-2', '3-2 2-3'],
  'a-maj7': ['3-4 2-5', '3-5 2-6', '3-6 2-7', '3-7 2-8', '3-8 2-9', '3-9 2-10', '3-10 2-11', '3-11 2-12', '3-12 2-13', '3-13 2-14', '3-2 2-3', '3-3 2-4'],
  'a-m7b5': ['3-3 2-4', '3-4 2-5', '3-5 2-6', '3-6 2-7', '3-7 2-8', '3-8 2-9', '3-9 2-10', '3-10 2-11', '3-11 2-12', '3-12 2-13', '3-1 2-2', '3-2 2-3'],
};

describe('guide shapes', () => {
  it('lists the seventh shapes in chord order', () => {
    expect(GUIDE_SHAPE_IDS).toEqual(['g7', 'c7', 'd7', 'a7', 'e7', 'am7', 'em7', 'dm7', 'cmaj7', 'fmaj7', 'bm7b5', 'e-7', 'e-m7', 'a-7', 'a-m7', 'a-maj7', 'a-m7b5']);
  });

  it.each(Object.keys(OPEN_GUIDES))('open %s guide notes', (id) => {
    expect(fmt(guideNotes(chordVoicing(id as never, 0)))).toBe(OPEN_GUIDES[id]);
  });

  describe.each(Object.keys(MOVABLE_GUIDES))('movable %s', (id) => {
    it.each([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])('root %i', (r) => {
      expect(fmt(guideNotes(chordVoicing(id as never, r as NoteIndex)))).toBe(MOVABLE_GUIDES[id][r]);
    });
  });

  it('exposes the functions', () => {
    expect(guideNotes(chordVoicing('g7', 0)).map((n) => n.func)).toEqual(['3', '3', '♭7']);
    expect(guideNotes(chordVoicing('cmaj7', 0)).map((n) => n.func)).toEqual(['3', '7', '3']);
  });

  it('every pooled voicing has a third and a seventh, inside its window', () => {
    for (const item of guidePool('all')) {
      const v = chordVoicing(item.shape, item.root);
      const funcs = guideNotes(v).map((n) => n.func);
      expect(funcs.some((f) => f === '3' || f === '♭3')).toBe(true);
      expect(funcs.some((f) => f === '7' || f === '♭7')).toBe(true);
      const w = guideWindow(v);
      for (const n of v.notes) {
        expect(n.position.fret).toBeGreaterThanOrEqual(w.fretMin);
        expect(n.position.fret).toBeLessThanOrEqual(w.fretMax);
      }
    }
  });
});

describe('isGuideFunc', () => {
  it.each(['3', '♭3', '7', '♭7'])('accepts %s', (f) => expect(isGuideFunc(f)).toBe(true));
  it.each(['1', '5', '♭5', ''])('rejects %j', (f) => expect(isGuideFunc(f)).toBe(false));
});

describe('guideWindow', () => {
  it('uses 0..4 for open shapes and the voicing range for movable ones', () => {
    expect(guideWindow(chordVoicing('g7', 0))).toEqual({ fretMin: 0, fretMax: 4 });
    expect(guideWindow(chordVoicing('e-7', 9))).toEqual({ fretMin: 4, fretMax: 8 });
  });
});

describe('guidePool', () => {
  it('sizes and order', () => {
    expect(guidePool('open')).toHaveLength(11);
    expect(guidePool('barre')).toHaveLength(72);
    expect(guidePool('all')).toHaveLength(83);
    expect(guidePool('open')[0]).toEqual({ shape: 'g7', root: 7 });
    expect(guidePool('barre')[0]).toEqual({ shape: 'e-7', root: 0 });
  });
});

describe('classifyGuideTap', () => {
  const g7 = chordVoicing('g7', 0);
  it('classifies g7 taps', () => {
    expect(classifyGuideTap(g7, { string: 2, fret: 0 })).toBe('guide');
    expect(classifyGuideTap(g7, { string: 1, fret: 1 })).toBe('guide');
    expect(classifyGuideTap(g7, { string: 5, fret: 2 })).toBe('guide');
    expect(classifyGuideTap(g7, { string: 6, fret: 3 })).toBe('other');
    expect(classifyGuideTap(g7, { string: 4, fret: 0 })).toBe('other');
    expect(classifyGuideTap(g7, { string: 3, fret: 2 })).toBe('outside');
    expect(classifyGuideTap(g7, { string: 2, fret: 1 })).toBe('outside');
  });
  it('classifies a-m7b5 taps', () => {
    const v = chordVoicing('a-m7b5', 0);
    expect(classifyGuideTap(v, { string: 3, fret: 3 })).toBe('guide');
    expect(classifyGuideTap(v, { string: 4, fret: 4 })).toBe('other');
    expect(classifyGuideTap(v, { string: 1, fret: 3 })).toBe('outside');
  });
});

describe('guide keys', () => {
  it('builds keys', () => {
    expect(guideKey({ shape: 'a-maj7', root: 0 })).toBe('guide:a-maj7:0');
  });
  it.each(['guide:g7:7', 'guide:a-m7b5:11', 'guide:e-7:0'])('accepts %s', (k) => expect(isGuideKey(k)).toBe(true));
  it.each(['guide:c:0', 'guide:g7:0', 'guide:e-7:12', 'guide:e-7:01', 'guide:zz:0', 'guide:g7', 'chordname:g7:7'])(
    'rejects %s',
    (k) => expect(isGuideKey(k)).toBe(false),
  );
  it('every pool key is valid and unique', () => {
    const keys = guidePool('all').map(guideKey);
    expect(keys.every(isGuideKey)).toBe(true);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it('queue is a permutation', () => {
    const items = guidePool('open');
    const q = buildGuideQueue(items, () => 0.3);
    expect(q.map(guideKey).sort()).toEqual(items.map(guideKey).sort());
  });
});
