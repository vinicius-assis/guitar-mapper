import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../test-utils';
import { allPositions, noteAt, type Filter } from './fretboard';
import { ALL_NOTES, NATURAL_NOTES, isNatural } from './notes';
import {
  OPTION_COUNT,
  buildChoiceQuestion,
  buildEarQuestion,
  buildFindQuestion,
  isCorrectFind,
} from './quiz';

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

describe('buildEarQuestion', () => {
  const circ = (a: number, b: number) => Math.min((a - b + 12) % 12, (b - a + 12) % 12);

  it('easy: exactly 2 distinct options, the wrong one at least 3 semitones away', () => {
    for (const naturalsOnly of [true, false]) {
      const pool = naturalsOnly ? NATURAL_NOTES : ALL_NOTES;
      for (const answer of pool) {
        const position = { string: 6, fret: (answer - 4 + 12) % 12 || 12 }; // nota `answer` na corda 6
        for (let seed = 1; seed <= 20; seed++) {
          const q = buildEarQuestion(position, 'easy', naturalsOnly, mulberry32(seed));
          expect(q.answer).toBe(noteAt(position));
          expect(q.options).toHaveLength(2);
          expect(new Set(q.options).size).toBe(2);
          expect(q.options).toContain(q.answer);
          const wrong = q.options.find((n) => n !== q.answer)!;
          expect(circ(wrong, q.answer)).toBeGreaterThanOrEqual(3);
          expect(pool).toContain(wrong);
        }
      }
    }
  });

  it('easy: the correct answer lands on both sides across seeds', () => {
    const position = { string: 6, fret: 12 };
    const sides = new Set<number>();
    for (let seed = 1; seed <= 30; seed++) {
      const q = buildEarQuestion(position, 'easy', true, mulberry32(seed));
      sides.add(q.options.indexOf(q.answer));
    }
    expect(sides).toEqual(new Set([0, 1]));
  });

  it('medium: 4 distinct options with the answer, like the multiple choice', () => {
    const q = buildEarQuestion({ string: 3, fret: 5 }, 'medium', true, mulberry32(3));
    expect(q.options).toHaveLength(4);
    expect(new Set(q.options).size).toBe(4);
    expect(q.options).toContain(q.answer);
  });

  it('hard: every note of the focus in chromatic order (7 naturals or 12)', () => {
    const position = { string: 5, fret: 3 };
    expect(buildEarQuestion(position, 'hard', true, mulberry32(1)).options).toEqual([
      ...NATURAL_NOTES,
    ]);
    expect(buildEarQuestion(position, 'hard', false, mulberry32(1)).options).toEqual([
      ...ALL_NOTES,
    ]);
  });
});
