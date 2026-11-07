import { describe, it, expect } from 'vitest';
import { sequence } from '../test-utils';
import { BASS, GUITAR, type Instrument } from './instruments';
import { SCALE_IDS, type ScaleId } from './scales';
import {
  buildScaleDegreeQueue,
  buildScalePlayQueue,
  isScaleBoxSetting,
  isScaleDegreeKey,
  isScalePlayKey,
  scaleBoxes,
  scaleDegreeKey,
  scaleDegreePool,
  scaleDegreeTarget,
  scalePlayKey,
  scalePlayPool,
} from './scaleItems';

describe('scale box settings', () => {
  it('expands a setting to box numbers', () => {
    expect(scaleBoxes('major', 'all')).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(scaleBoxes('blues', 2)).toEqual([2]);
  });

  it.each([
    ['all', 'blues', true],
    [5, 'pent-minor', true],
    [7, 'locrian', true],
    [6, 'pent-minor', false],
    [0, 'major', false],
    ['3', 'major', false],
    [1.5, 'major', false],
    [null, 'major', false],
  ] as const)('isScaleBoxSetting(%j, %s) = %s', (value, scale, expected) => {
    expect(isScaleBoxSetting(value, scale)).toBe(expected);
  });
});

const SEVEN: ScaleId[] = ['major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian'];
const SIZES: [string, Instrument, ScaleId[], number[], number][] = [
  ['guitar pentatonic', GUITAR, ['pent-minor', 'pent-major'], [9, 10, 10, 10, 9], 48],
  ['guitar blues', GUITAR, ['blues'], [11, 11, 13, 11, 10], 56],
  ['guitar seven-note', GUITAR, SEVEN, [15, 16, 16, 16, 15, 15, 15], 108],
  ['bass pentatonic', BASS, ['pent-minor', 'pent-major'], [6, 7, 7, 6, 6], 32],
  ['bass blues', BASS, ['blues'], [8, 8, 8, 7, 6], 37],
  ['bass seven-note', BASS, SEVEN, [10, 11, 11, 10, 10, 10, 10], 72],
];

describe('scaleDegreePool', () => {
  it.each(SIZES)('%s sizes', (_label, inst, scales, perBox, all) => {
    for (const id of scales) {
      perBox.forEach((size, i) => {
        expect(scaleDegreePool(id, i + 1, inst), `${id} box ${i + 1}`).toHaveLength(size);
      });
      expect(scaleDegreePool(id, 'all', inst), `${id} all`).toHaveLength(all);
    }
  });

  it('keeps the box order of notes, without the root', () => {
    const pool = scaleDegreePool('pent-minor', 1, GUITAR);
    expect(pool.map((i) => [i.string, i.degree])).toEqual([
      [6, 1], [5, 2], [5, 3], [4, 4], [3, 1], [3, 2], [2, 3], [2, 4], [1, 1],
    ]);
    expect(pool.every((i) => i.scale === 'pent-minor' && i.box === 1)).toBe(true);
  });

  it('has unique keys and no root in any pool', () => {
    for (const inst of [GUITAR, BASS]) {
      for (const id of SCALE_IDS) {
        const pool = scaleDegreePool(id, 'all', inst);
        expect(new Set(pool.map(scaleDegreeKey)).size).toBe(pool.length);
        expect(pool.some((i) => i.degree === 0)).toBe(false);
      }
    }
  });
});

describe('keys', () => {
  it('builds keys', () => {
    expect(scaleDegreeKey({ scale: 'blues', box: 3, string: 5, degree: 3 })).toBe('scaledeg:blues:3:5:3');
    expect(scalePlayKey({ scale: 'major', root: 8, box: 7 })).toBe('scaleplay:major:8:7');
  });

  it.each(['scaledeg:pent-minor:1:6:1', 'scaledeg:locrian:7:1:6', 'scaledeg:blues:5:4:5'])('accepts %s', (k) => {
    expect(isScaleDegreeKey(k)).toBe(true);
  });

  it.each([
    'scaledeg:pent-minor:6:1:1',
    'scaledeg:pent-minor:1:7:1',
    'scaledeg:pent-minor:1:1:0',
    'scaledeg:pent-minor:1:1:5',
    'scaledeg:major:1:1:7',
    'scaledeg:ionian:1:1:1',
    'scaledeg:major:01:1:1',
    'scaledeg:major:1:1',
  ])('rejects %s', (k) => {
    expect(isScaleDegreeKey(k)).toBe(false);
  });

  it.each(['scaleplay:pent-minor:0:1', 'scaleplay:major:11:7'])('accepts %s', (k) => {
    expect(isScalePlayKey(k)).toBe(true);
  });

  it.each([
    'scaleplay:major:12:1',
    'scaleplay:blues:0:6',
    'scaleplay:major:00:1',
    'scaleplay:major:3:0',
    'scaleplay:Major:3:1',
  ])('rejects %s', (k) => {
    expect(isScalePlayKey(k)).toBe(false);
  });

  it('accepts every key of every pool', () => {
    for (const inst of [GUITAR, BASS]) {
      for (const id of SCALE_IDS) {
        for (const item of scaleDegreePool(id, 'all', inst)) {
          expect(isScaleDegreeKey(scaleDegreeKey(item))).toBe(true);
        }
        for (const item of scalePlayPool(id, 'all')) {
          expect(isScalePlayKey(scalePlayKey(item))).toBe(true);
        }
      }
    }
  });
});

describe('scalePlayPool', () => {
  it('crosses roots and boxes', () => {
    expect(scalePlayPool('pent-minor', 1)).toHaveLength(12);
    expect(scalePlayPool('pent-minor', 'all')).toHaveLength(60);
    expect(scalePlayPool('major', 'all')).toHaveLength(84);
    expect(scalePlayPool('pent-minor', 1)[0]).toEqual({ scale: 'pent-minor', root: 0, box: 1 });
  });
});

describe('queues', () => {
  it('shuffles the degree pool and assigns roots', () => {
    const pool = scaleDegreePool('major', 'all', GUITAR);
    const queue = buildScaleDegreeQueue(pool, sequence(0.1, 0.5, 0.9));
    expect(queue).toHaveLength(pool.length);
    expect(queue.map(scaleDegreeKey).sort()).toEqual(pool.map(scaleDegreeKey).sort());
    expect(queue.every((q) => q.root >= 0 && q.root <= 11)).toBe(true);
    expect(buildScaleDegreeQueue(pool, () => 0.999).every((q) => q.root === 11)).toBe(true);
  });

  it('shuffles the play pool', () => {
    const pool = scalePlayPool('blues', 'all');
    const queue = buildScalePlayQueue(pool, sequence(0.3, 0.7));
    expect(queue.map(scalePlayKey).sort()).toEqual(pool.map(scalePlayKey).sort());
  });
});

describe('scaleDegreeTarget', () => {
  it('finds the note of the question', () => {
    expect(
      scaleDegreeTarget({ scale: 'pent-minor', box: 1, string: 3, degree: 1, root: 9 }, GUITAR).position,
    ).toEqual({ string: 3, fret: 5 });
    expect(
      scaleDegreeTarget({ scale: 'major', box: 1, string: 5, degree: 3, root: 8 }, GUITAR).position,
    ).toEqual({ string: 5, fret: 4 });
  });

  it('exists for every item, root and instrument', () => {
    for (const inst of [GUITAR, BASS]) {
      for (const id of SCALE_IDS) {
        for (const item of scaleDegreePool(id, 'all', inst)) {
          for (let root = 0; root < 12; root++) {
            const target = scaleDegreeTarget({ ...item, root: root as never }, inst);
            expect(target.degree).toBe(item.degree);
          }
        }
      }
    }
  });
});
