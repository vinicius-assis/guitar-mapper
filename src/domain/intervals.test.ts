import { describe, it, expect } from 'vitest';
import {
  DEFAULT_INTERVALS,
  INTERVALS,
  buildIntervalQueue,
  instrumentRange,
  intervalAnswer,
  intervalById,
  intervalLink,
  intervalPitches,
  isIntervalId,
} from './intervals';
import { BASS, GUITAR } from './instruments';
import { ALL_NOTES, NATURAL_NOTES } from './notes';
import { MAX_FRET } from './fretboard';
import { pitchOf } from './pitch';
import { mulberry32 } from '../test-utils';

describe('intervals', () => {
  it('has 11 intervals from 1 to 11 semitones', () => {
    expect(INTERVALS).toHaveLength(11);
    expect(INTERVALS.map((i) => i.semitones)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it('computes the arrival note', () => {
    expect(intervalAnswer({ root: 0, interval: '5J' })).toBe(7);
    expect(intervalAnswer({ root: 11, interval: '2m' })).toBe(0);
    expect(intervalAnswer({ root: 0, interval: '4A' })).toBe(6);
  });

  it('has the default set and a type guard', () => {
    expect(DEFAULT_INTERVALS).toEqual(['3m', '3M', '5J', '7m', '7M']);
    expect(isIntervalId('5J')).toBe(true);
    expect(isIntervalId('9M')).toBe(false);
  });
});

describe('buildIntervalQueue', () => {
  const key = (i: { root: number; interval: string }) => `${i.root}-${i.interval}`;
  it('has every combination once, deterministic per seed', () => {
    const q = buildIntervalQueue(NATURAL_NOTES, ['3m', '5J'], mulberry32(1));
    expect(q).toHaveLength(14);
    expect(new Set(q.map(key)).size).toBe(14);
    expect(buildIntervalQueue(NATURAL_NOTES, ['3m', '5J'], mulberry32(1))).toEqual(q);
    expect(buildIntervalQueue(NATURAL_NOTES, ['3m', '5J'], mulberry32(2)).map(key)).not.toEqual(
      q.map(key),
    );
  });
  it('is empty without intervals', () => {
    expect(buildIntervalQueue(ALL_NOTES, [], mulberry32(1))).toEqual([]);
  });
});

describe('pitches', () => {
  it('computes the instrument range', () => {
    expect(instrumentRange(BASS)).toEqual([28, 67]);
    expect(instrumentRange(GUITAR)).toEqual([40, 88]);
  });

  it('picks the lowest fitting pitches', () => {
    expect(intervalPitches(0, intervalById('5J'), BASS)).toEqual([36, 43]);
    expect(intervalPitches(0, intervalById('5J'), GUITAR)).toEqual([48, 55]);
    expect(intervalPitches(4, intervalById('5J'), BASS)).toEqual([28, 35]);
  });

  it('holds for all instruments, roots and intervals', () => {
    for (const inst of [GUITAR, BASS]) {
      const [lo, hi] = instrumentRange(inst);
      for (const root of ALL_NOTES) {
        for (const interval of INTERVALS) {
          const [a, b] = intervalPitches(root, interval, inst);
          expect(b - a).toBe(interval.semitones);
          expect(a % 12).toBe(root);
          expect(a).toBeGreaterThanOrEqual(lo);
          expect(b).toBeLessThanOrEqual(hi);
        }
      }
    }
  });
});

describe('intervalLink', () => {
  it('links the closest pair', () => {
    expect(intervalLink(0, intervalById('5J'), BASS)).toEqual({
      from: { string: 3, fret: 3 },
      to: { string: 2, fret: 5 },
    });
  });

  it('only returns valid links', () => {
    for (const inst of [GUITAR, BASS]) {
      for (const root of ALL_NOTES) {
        for (const interval of INTERVALS) {
          for (const [min, max] of [[0, 12], [0, MAX_FRET], [3, 9]]) {
            const link = intervalLink(root, interval, inst, min, max);
            if (!link) continue;
            expect(pitchOf(link.to, inst) - pitchOf(link.from, inst)).toBe(interval.semitones);
            for (const p of [link.from, link.to]) {
              expect(p.fret).toBeGreaterThanOrEqual(min);
              expect(p.fret).toBeLessThanOrEqual(max);
              expect(p.string).toBeLessThanOrEqual(inst.stringCount);
            }
          }
        }
      }
    }
  });

  it('returns null when the window cannot hold the interval', () => {
    expect(intervalLink(0, intervalById('7M'), BASS, 0, 1)).toBeNull();
  });
});
