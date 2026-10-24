import { describe, it, expect } from 'vitest';
import {
  MAX_FRET,
  allPositions,
  noteAt,
  parsePositionKey,
  positionKey,
  positionsInFilter,
  positionsOfNote,
  type Filter,
} from './fretboard';

const filter = (over: Partial<Filter> = {}): Filter => ({
  strings: [1, 2, 3, 4, 5, 6],
  fretMin: 0,
  fretMax: MAX_FRET,
  naturalsOnly: false,
  ...over,
});

describe('noteAt', () => {
  it('matches known positions', () => {
    expect(noteAt({ string: 6, fret: 0 })).toBe(4); // E
    expect(noteAt({ string: 5, fret: 3 })).toBe(0); // C
    expect(noteAt({ string: 2, fret: 1 })).toBe(0); // C
    expect(noteAt({ string: 4, fret: 0 })).toBe(2); // D
  });

  it('repeats the open string at fret 12 and 24 on every string', () => {
    for (let s = 1; s <= 6; s++) {
      const open = noteAt({ string: s, fret: 0 });
      expect(noteAt({ string: s, fret: 12 })).toBe(open);
      expect(noteAt({ string: s, fret: 24 })).toBe(open);
    }
  });
});

describe('positions', () => {
  it('has 150 unique positions', () => {
    const all = allPositions();
    expect(all).toHaveLength(150);
    expect(new Set(all.map(positionKey)).size).toBe(150);
  });

  it('round-trips keys and rejects invalid ones', () => {
    expect(parsePositionKey('3-12')).toEqual({ string: 3, fret: 12 });
    expect(parsePositionKey('7-1')).toBeNull();
    expect(parsePositionKey('1-25')).toBeNull();
    expect(parsePositionKey('abc')).toBeNull();
  });
});

describe('positionsInFilter', () => {
  it('respects strings and fret range, naturals only', () => {
    // string 6, frets 0..5 → E F F# G G# A → naturals at frets 0,1,3,5
    const result = positionsInFilter(filter({ strings: [6], fretMax: 5, naturalsOnly: true }));
    expect(result.map((p) => p.fret)).toEqual([0, 1, 3, 5]);
  });

  it('returns nothing when no string is selected', () => {
    expect(positionsInFilter(filter({ strings: [] }))).toEqual([]);
  });

  it('returns nothing when naturals-only leaves no natural note (A# on string 5 fret 1)', () => {
    const f = filter({ strings: [5], fretMin: 1, fretMax: 1, naturalsOnly: true });
    expect(positionsInFilter(f)).toEqual([]);
  });

  it('ignores invalid strings and clamps the fret range', () => {
    const f = filter({ strings: [0, 7, 6], fretMin: -3, fretMax: 99 });
    expect(positionsInFilter(f)).toHaveLength(25);
  });
});

describe('positionsOfNote', () => {
  it('finds the repeated E on the low string at frets 0, 12 and 24', () => {
    const result = positionsOfNote(4, filter({ strings: [6] }));
    expect(result.map((p) => p.fret)).toEqual([0, 12, 24]);
  });
});
