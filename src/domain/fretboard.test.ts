import { describe, it, expect } from 'vitest';
import {
  FIRST_QUIZ_FRET,
  MAX_FRET,
  allPositions,
  noteAt,
  parsePositionKey,
  positionKey,
  positionsInFilter,
  positionsOfNote,
  type Filter,
} from './fretboard';
import { BASS } from './instruments';

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
    // string 6, frets 1..5 → F F# G G# A → naturals at frets 1,3,5
    const result = positionsInFilter(filter({ strings: [6], fretMax: 5, naturalsOnly: true }));
    expect(result.map((p) => p.fret)).toEqual([1, 3, 5]);
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
    expect(positionsInFilter(f)).toHaveLength(24);
  });

  it('never returns open-string positions (fret 0), even when the range asks for them', () => {
    expect(FIRST_QUIZ_FRET).toBe(1);
    const result = positionsInFilter(filter({ fretMin: 0, fretMax: 3 }));
    expect(result.some((p) => p.fret === 0)).toBe(false);
    expect(result).toHaveLength(18);
  });
});

describe('positionsOfNote', () => {
  it('finds the repeated E on the low string at frets 12 and 24 (open string excluded)', () => {
    const result = positionsOfNote(4, filter({ strings: [6] }));
    expect(result.map((p) => p.fret)).toEqual([12, 24]);
  });
});

describe('bass', () => {
  const f: Filter = { strings: [1, 2, 3, 4, 5, 6], fretMin: 1, fretMax: 3, naturalsOnly: false };
  it('noteAt', () => {
    expect(noteAt({ string: 4, fret: 0 }, BASS)).toBe(4);
    expect(noteAt({ string: 1, fret: 5 }, BASS)).toBe(0);
  });
  it('allPositions has 4 strings', () => {
    const all = allPositions(BASS);
    expect(all).toHaveLength(4 * 25);
    expect(all.some((p) => p.string === 5)).toBe(false);
  });
  it('parsePositionKey respects the string count', () => {
    expect(parsePositionKey('4-24', BASS)).toEqual({ string: 4, fret: 24 });
    expect(parsePositionKey('5-3', BASS)).toBeNull();
    expect(parsePositionKey('0-3', BASS)).toBeNull();
    expect(parsePositionKey('5-3')).toEqual({ string: 5, fret: 3 });
  });
  it('positionsInFilter ignores strings 5 and 6', () => {
    expect(positionsInFilter(f, BASS).every((p) => p.string <= 4)).toBe(true);
    expect(positionsInFilter(f, BASS)).toHaveLength(12);
  });
});
