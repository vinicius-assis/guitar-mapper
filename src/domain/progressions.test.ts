import { describe, expect, it } from 'vitest';
import { chordRootClass, degreeQuality, spellChord } from './harmony';
import type { Spelling } from './spelling';
import {
  II_V_I_KEYS,
  buildIiViQueue,
  iiViChords,
  iiViKey,
  iiViPool,
  iiViQuestion,
  iiViWindow,
  isIiViKey,
  isIiViTarget,
  type ShellChord,
  type ShellNote,
} from './progressions';

const NATURAL_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const spellingClass = (s: Spelling) => (NATURAL_PC[s.letter] + s.accidental + 12) % 12;

function fmt(c: ShellChord): string {
  return [6, 5, 4, 3, 2, 1]
    .map((s) => c.notes.find((n) => n.position.string === s)?.position.fret ?? 'x')
    .join('-');
}
const at = (n: ShellNote) => `${n.position.string}-${n.position.fret}:${n.func}`;

const TABLE: Record<string, [string, string, string]> = {
  '0:1': ['x-5-3-5-x-x', '3-x-3-4-x-x', 'x-3-2-4-x-x'], '0:2': ['10-x-10-10-x-x', 'x-10-9-10-x-x', '8-x-9-9-x-x'],
  '5:1': ['x-10-8-10-x-x', '8-x-8-9-x-x', 'x-8-7-9-x-x'], '5:2': ['3-x-3-3-x-x', 'x-3-2-3-x-x', '1-x-2-2-x-x'],
  '7:1': ['x-12-10-12-x-x', '10-x-10-11-x-x', 'x-10-9-11-x-x'], '7:2': ['5-x-5-5-x-x', 'x-5-4-5-x-x', '3-x-4-4-x-x'],
  '2:1': ['x-7-5-7-x-x', '5-x-5-6-x-x', 'x-5-4-6-x-x'], '2:2': ['12-x-12-12-x-x', 'x-12-11-12-x-x', '10-x-11-11-x-x'],
};
const WINDOW: Record<string, [number, number]> = { '0:1': [2, 6], '0:2': [8, 12], '5:1': [7, 11], '5:2': [1, 5], '7:1': [9, 13], '7:2': [3, 7], '2:1': [4, 8], '2:2': [10, 14] };
const TARGETS: Record<string, string> = {
  'iivi:0:1:ii-v': '3-4:3 4-3:♭7', 'iivi:0:1:v-i': '4-2:3 3-4:7', 'iivi:0:2:ii-v': '4-9:3 3-10:♭7', 'iivi:0:2:v-i': '3-9:3 4-9:7',
  'iivi:5:1:ii-v': '3-9:3 4-8:♭7', 'iivi:5:1:v-i': '4-7:3 3-9:7', 'iivi:5:2:ii-v': '4-2:3 3-3:♭7', 'iivi:5:2:v-i': '3-2:3 4-2:7',
  'iivi:7:1:ii-v': '3-11:3 4-10:♭7', 'iivi:7:1:v-i': '4-9:3 3-11:7', 'iivi:7:2:ii-v': '4-4:3 3-5:♭7', 'iivi:7:2:v-i': '3-4:3 4-4:7',
  'iivi:2:1:ii-v': '3-6:3 4-5:♭7', 'iivi:2:1:v-i': '4-4:3 3-6:7', 'iivi:2:2:ii-v': '4-11:3 3-12:♭7', 'iivi:2:2:v-i': '3-11:3 4-11:7',
};

const combos = II_V_I_KEYS.flatMap((k) => ([1, 2] as const).map((g) => [k, g] as const));

describe('ii-V-I voicings', () => {
  it.each(combos)('key %i grip %i matches the table, window and qualities', (k, g) => {
    const chords = iiViChords(k, g);
    expect(chords.map(fmt)).toEqual(TABLE[`${k}:${g}`]);
    expect(chords.map((c) => c.quality)).toEqual(['min7', 'dom7', 'maj7']);
    expect(chords.map((c) => c.degree)).toEqual([2, 5, 1]);
    const { fretMin, fretMax } = iiViWindow(k, g);
    expect([fretMin, fretMax]).toEqual(WINDOW[`${k}:${g}`]);
  });

  it.each(combos)('key %i grip %i agrees with the M5 chord minus the fifth', (k, g) => {
    const { fretMin, fretMax } = iiViWindow(k, g);
    iiViChords(k, g).forEach((c) => {
      const m5 = spellChord('major', k, c.degree, true, 'auto');
      const root = chordRootClass('major', k, c.degree);
      expect(c.quality).toBe(degreeQuality('major', c.degree, true));
      expect(c.root).toBe(root);
      const expected = new Set(m5.tones.map(spellingClass));
      expected.delete((root + 7) % 12);
      expect(new Set(c.notes.map((n) => n.pitch % 12))).toEqual(expected);
      expect(c.notes[0].isRoot).toBe(true);
      expect(c.notes[0].pitch % 12).toBe(root);
      const funcs = c.notes.map((n) => n.func);
      expect(funcs.filter((f) => f === '3' || f === '♭3')).toHaveLength(1);
      expect(funcs.filter((f) => f === '7' || f === '♭7')).toHaveLength(1);
      for (const n of c.notes) {
        expect(n.position.fret).toBeGreaterThanOrEqual(1);
        expect(n.position.fret).toBeLessThanOrEqual(14);
        expect(n.position.fret).toBeGreaterThanOrEqual(fretMin);
        expect(n.position.fret).toBeLessThanOrEqual(fretMax);
      }
    });
  });
});

describe('ii-V-I questions', () => {
  it.each(iiViPool())('%o: targets, moves and unique window pitches', (item) => {
    const q = iiViQuestion(item);
    expect(q.targets.map(at).join(' ')).toBe(TARGETS[iiViKey(item)]);
    const chords = iiViChords(item.key, item.grip);
    const [from, to] = item.step === 'ii-v' ? [chords[0], chords[1]] : [chords[1], chords[2]];
    expect(q.from).toEqual(from);
    expect(q.to).toEqual(to);
    const seventh = from.notes.find((n) => n.func === '7' || n.func === '♭7')!;
    const third = from.notes.find((n) => n.func === '3' || n.func === '♭3')!;
    const [down, stay] = q.moves;
    expect(down.from).toEqual(seventh);
    expect(down.to).toEqual(q.targets[0]);
    expect(down.semitones).toBe(-1);
    expect(down.from.position.string).toBe(down.to.position.string);
    expect(stay.from).toEqual(third);
    expect(stay.to).toEqual(q.targets[1]);
    expect(stay.semitones).toBe(0);
    expect(stay.from.position).toEqual(stay.to.position);
    expect([q.fretMin, q.fretMax]).toEqual(WINDOW[`${item.key}:${item.grip}`]);

    const pitches = new Set(q.targets.map((t) => t.pitch));
    const open = [64, 59, 55, 50, 45, 40];
    const found: string[] = [];
    for (let s = 1; s <= 6; s++) {
      for (let f = q.fretMin; f <= q.fretMax; f++) {
        if (pitches.has(open[s - 1] + f)) found.push(`${s}-${f}`);
      }
    }
    expect(found.sort()).toEqual(q.targets.map((t) => `${t.position.string}-${t.position.fret}`).sort());
  });

  it('judges taps by exact pitch', () => {
    const q = iiViQuestion({ key: 0, grip: 1, step: 'ii-v' });
    expect(isIiViTarget(q, 59)).toBe(true);
    expect(isIiViTarget(q, 53)).toBe(true);
    expect(isIiViTarget(q, 47)).toBe(false);
    expect(isIiViTarget(q, 65)).toBe(false);
    expect(isIiViTarget(q, 43)).toBe(false);
    expect(isIiViTarget(q, 50)).toBe(false);
  });
});

describe('ii-V-I items', () => {
  it('builds the fixed pool', () => {
    const pool = iiViPool();
    expect(pool).toHaveLength(16);
    expect(pool[0]).toEqual({ key: 0, grip: 1, step: 'ii-v' });
    const keys = pool.map(iiViKey);
    expect(new Set(keys).size).toBe(16);
    keys.forEach((k) => expect(isIiViKey(k)).toBe(true));
  });

  it('formats and validates keys', () => {
    expect(iiViKey({ key: 7, grip: 2, step: 'v-i' })).toBe('iivi:7:2:v-i');
    for (const k of ['iivi:0:1:ii-v', 'iivi:2:2:v-i', 'iivi:5:1:v-i', 'iivi:7:2:ii-v']) expect(isIiViKey(k)).toBe(true);
    for (const k of ['iivi:1:1:ii-v', 'iivi:0:3:ii-v', 'iivi:0:1:i-v', 'iivi:00:1:ii-v', 'iivi:0:1', 'iivi:12:1:ii-v'])
      expect(isIiViKey(k)).toBe(false);
  });

  it('shuffles without losing items', () => {
    const pool = iiViPool();
    const q = buildIiViQueue(pool, () => 0.3);
    expect(q.map(iiViKey).sort()).toEqual(pool.map(iiViKey).sort());
  });
});
