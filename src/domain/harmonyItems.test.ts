import { describe, it, expect } from 'vitest';
import { HARMONY_FIELD_SETTINGS, HARMONY_KEY_LEVELS, harmonyKeys } from './harmony';
import {
  buildHarmonyQueue,
  buildQualityQueue,
  harmonyChordKey,
  harmonyDegreeKey,
  harmonyPool,
  isHarmonyChordKey,
  isHarmonyDegreeKey,
  isQualityKey,
  qualityKey,
  qualityPool,
} from './harmonyItems';

describe('harmonyPool', () => {
  it.each([
    ['major', 'easy', 18],
    ['major', 'medium', 42],
    ['major', 'all', 72],
    ['minor', 'easy', 18],
    ['both', 'easy', 36],
    ['both', 'medium', 84],
    ['both', 'all', 144],
  ] as const)('%s / %s has %i items', (setting, level, size) => {
    expect(harmonyPool(setting, level)).toHaveLength(size);
  });

  it('is ordered and never includes degree 1', () => {
    const pool = harmonyPool('major', 'easy');
    expect(pool[0]).toEqual({ field: 'major', key: 0, degree: 2 });
    expect(pool[6]).toEqual({ field: 'major', key: 5, degree: 2 });
    expect(pool.some((i) => i.degree === 1)).toBe(false);
  });
});

describe('qualityPool', () => {
  it('has the seven degrees of one field', () => {
    const pool = qualityPool('major', false);
    expect(pool).toHaveLength(7);
    expect(pool.map((i) => i.degree)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('covers both fields with sevenths', () => {
    const pool = qualityPool('both', true);
    expect(pool).toHaveLength(14);
    expect(pool.every((i) => i.sevenths)).toBe(true);
    expect(pool.slice(0, 7).every((i) => i.field === 'major')).toBe(true);
  });
});

describe('keys', () => {
  it('builds the keys', () => {
    expect(harmonyChordKey({ field: 'major', key: 5, degree: 4 })).toBe('hchord:major:5:4');
    expect(harmonyDegreeKey({ field: 'minor', key: 9, degree: 7 })).toBe('hdeg:minor:9:7');
    expect(qualityKey({ field: 'minor', sevenths: true, degree: 2 })).toBe('hqual:minor:seventh:2');
    expect(qualityKey({ field: 'minor', sevenths: false, degree: 2 })).toBe('hqual:minor:triad:2');
  });

  it.each(['hchord:major:0:2', 'hchord:minor:11:7'])('chord validator accepts %s', (k) => {
    expect(isHarmonyChordKey(k)).toBe(true);
  });
  it('degree validator accepts', () => {
    expect(isHarmonyDegreeKey('hdeg:major:10:5')).toBe(true);
  });
  it.each(['hqual:major:triad:1', 'hqual:minor:seventh:7'])('quality validator accepts %s', (k) => {
    expect(isQualityKey(k)).toBe(true);
  });
  it.each([
    'hchord:major:0:1',
    'hchord:major:12:2',
    'hchord:major:01:2',
    'hchord:dorian:0:2',
    'hdeg:major:0:8',
    'hqual:major:triad:0',
    'hqual:major:tetrad:1',
    'hqual:Major:triad:1',
    'hchord:major:0',
  ])('rejects %s', (k) => {
    expect(isHarmonyChordKey(k) || isHarmonyDegreeKey(k) || isQualityKey(k)).toBe(false);
  });

  it('every pool key is valid and unique', () => {
    for (const setting of HARMONY_FIELD_SETTINGS) {
      for (const level of HARMONY_KEY_LEVELS) {
        const pool = harmonyPool(setting, level);
        const chords = pool.map(harmonyChordKey);
        const degs = pool.map(harmonyDegreeKey);
        expect(chords.every(isHarmonyChordKey)).toBe(true);
        expect(degs.every(isHarmonyDegreeKey)).toBe(true);
        expect(new Set(chords).size).toBe(pool.length);
        expect(new Set(degs).size).toBe(pool.length);
      }
      for (const sevenths of [false, true]) {
        const q = qualityPool(setting, sevenths).map(qualityKey);
        expect(q.every(isQualityKey)).toBe(true);
        expect(new Set(q).size).toBe(q.length);
      }
    }
  });
});

describe('queues', () => {
  it('buildHarmonyQueue is a permutation', () => {
    const pool = harmonyPool('major', 'easy');
    const q = buildHarmonyQueue(pool, Math.random);
    expect(q.map(harmonyChordKey).sort()).toEqual(pool.map(harmonyChordKey).sort());
  });

  it('buildQualityQueue assigns keys of the level', () => {
    const pool = qualityPool('both', false);
    const q = buildQualityQueue(pool, 'easy', Math.random);
    expect(q.map(qualityKey).sort()).toEqual(pool.map(qualityKey).sort());
    for (const item of q) expect(harmonyKeys(item.field, 'easy')).toContain(item.key);
  });

  it('with rng 0.999 picks the last key', () => {
    const q = buildQualityQueue(qualityPool('both', false), 'easy', () => 0.999);
    for (const item of q) expect(item.key).toBe(item.field === 'major' ? 7 : 9);
  });
});
