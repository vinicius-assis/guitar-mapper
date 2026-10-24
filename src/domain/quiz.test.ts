import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../test-utils';
import { allPositions, noteAt, type Filter } from './fretboard';
import { isNatural } from './notes';
import { OPTION_COUNT, buildChoiceQuestion, buildFindQuestion, isCorrectFind } from './quiz';

describe('buildChoiceQuestion', () => {
  it('always has 4 distinct options with exactly one correct (all notes)', () => {
    const rng = mulberry32(1);
    for (const position of allPositions()) {
      const q = buildChoiceQuestion(position, false, rng);
      expect(q.options).toHaveLength(OPTION_COUNT);
      expect(new Set(q.options).size).toBe(OPTION_COUNT);
      expect(q.options.filter((o) => o === q.answer)).toHaveLength(1);
      expect(q.answer).toBe(noteAt(position));
    }
  });

  it('only offers natural notes in naturals-only mode', () => {
    const rng = mulberry32(2);
    for (const position of allPositions().filter((p) => isNatural(noteAt(p)))) {
      const q = buildChoiceQuestion(position, true, rng);
      expect(q.options).toHaveLength(OPTION_COUNT);
      expect(new Set(q.options).size).toBe(OPTION_COUNT);
      expect(q.options.every(isNatural)).toBe(true);
    }
  });

  it('prefers neighbouring notes as distractors', () => {
    // string 3 fret 5 = C; neighbours: fret 4 = B, fret 6 = C#, fret 3 = A#
    const q = buildChoiceQuestion({ string: 3, fret: 5 }, false, mulberry32(3));
    expect(q.options).toEqual(expect.arrayContaining([0, 11, 1, 10]));
  });
});

describe('buildFindQuestion', () => {
  const filter: Filter = { strings: [6], fretMin: 0, fretMax: 24, naturalsOnly: true };

  it('accepts every position of the note on that string (12 and 24; open string excluded)', () => {
    const q = buildFindQuestion({ string: 6, fret: 12 }, filter);
    expect(q.string).toBe(6);
    expect(q.target).toBe(4);
    expect(q.validPositions.map((p) => p.fret)).toEqual([12, 24]);
    expect(isCorrectFind(q, { string: 6, fret: 12 })).toBe(true);
    expect(isCorrectFind(q, { string: 6, fret: 24 })).toBe(true);
    expect(isCorrectFind(q, { string: 6, fret: 0 })).toBe(false);
  });

  it('rejects other frets and the same note on another string', () => {
    const q = buildFindQuestion({ string: 6, fret: 12 }, filter);
    expect(isCorrectFind(q, { string: 6, fret: 5 })).toBe(false);
    expect(isCorrectFind(q, { string: 5, fret: 7 })).toBe(false); // também é E, outra corda
  });

  it('still accepts the asked position when it lies outside the filter window', () => {
    const narrow: Filter = { strings: [6], fretMin: 0, fretMax: 5, naturalsOnly: true };
    const q = buildFindQuestion({ string: 6, fret: 12 }, narrow);
    expect(isCorrectFind(q, { string: 6, fret: 12 })).toBe(true);
  });
});
