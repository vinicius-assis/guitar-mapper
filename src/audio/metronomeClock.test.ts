import { describe, it, expect } from 'vitest';
import {
  scheduleWindow,
  clampBpm,
  type ClockState,
  type Click,
  TICK_MS,
  LOOK_AHEAD_S,
  START_DELAY_S,
  LATE_S,
  BPM_MIN,
  BPM_MAX,
  BPM_DEFAULT,
  BEATS_OPTIONS,
  BEATS_DEFAULT,
} from './metronomeClock';

const fresh = (startAt: number): ClockState => ({ last: null, startAt, beat: 0 });

function expectClicks(actual: Click[], times: number[], accents: boolean[]) {
  expect(actual.length).toBe(times.length);
  actual.forEach((c, i) => {
    expect(c.time).toBeCloseTo(times[i], 9);
    expect(c.accent).toBe(accents[i]);
  });
}

describe('constants', () => {
  it('match the spec', () => {
    expect([TICK_MS, LOOK_AHEAD_S, START_DELAY_S, LATE_S]).toEqual([25, 0.1, 0.05, 0.05]);
    expect([BPM_MIN, BPM_MAX, BPM_DEFAULT, BEATS_DEFAULT]).toEqual([40, 220, 80, 4]);
    expect(BEATS_OPTIONS).toEqual([1, 2, 3, 4, 6]);
  });
});

describe('scheduleWindow', () => {
  it('first click', () => {
    const r = scheduleWindow(fresh(1), { now: 1, lookAhead: 0.1, bpm: 120, beatsPerBar: 4 });
    expect(r.clicks).toEqual([{ time: 1, accent: true }]);
    expect(r.state).toEqual({ last: 1, startAt: 1, beat: 1 });
  });

  it('no duplicates across calls', () => {
    let s = scheduleWindow(fresh(1), { now: 1, lookAhead: 0.1, bpm: 120, beatsPerBar: 4 }).state;
    const step = (now: number) => {
      const r = scheduleWindow(s, { now, lookAhead: 0.1, bpm: 120, beatsPerBar: 4 });
      s = r.state;
      return r.clicks;
    };
    expect(step(1)).toEqual([]);
    expect(step(1.3)).toEqual([]);
    const c = step(1.45);
    expectClicks(c, [1.5], [false]);
    expect(step(1.45)).toEqual([]);
  });

  it('wide window and accent pattern', () => {
    const r = scheduleWindow(fresh(1), { now: 1, lookAhead: 2, bpm: 120, beatsPerBar: 3 });
    expectClicks(r.clicks, [1, 1.5, 2, 2.5], [true, false, false, true]);
    expect(r.state.last).toBeCloseTo(2.5, 9);
    expect(r.state.beat).toBe(4);
  });

  it('no accent', () => {
    const r = scheduleWindow(fresh(1), { now: 1, lookAhead: 2, bpm: 120, beatsPerBar: 1 });
    expect(r.clicks.map((c) => c.accent)).toEqual([false, false, false, false]);
  });

  it('tempo change applies to the next click', () => {
    const s: ClockState = { last: 1.5, startAt: 1, beat: 2 };
    const slow = scheduleWindow(s, { now: 2.45, lookAhead: 0.1, bpm: 60, beatsPerBar: 4 });
    expectClicks(slow.clicks, [2.5], [false]);
    const fast = scheduleWindow(s, { now: 1.7, lookAhead: 0.1, bpm: 240, beatsPerBar: 4 });
    expectClicks(fast.clicks, [1.75], [false]);
  });

  it('late clicks are skipped, bar kept', () => {
    const r = scheduleWindow(
      { last: 1, startAt: 1, beat: 1 },
      { now: 3, lookAhead: 0.1, bpm: 120, beatsPerBar: 4 },
    );
    expect(r.clicks).toEqual([{ time: 3, accent: true }]);
    expect(r.state.beat).toBe(5);
  });

  it('tolerates a slightly late first click', () => {
    const r = scheduleWindow(fresh(1), { now: 1.03, lookAhead: 0.1, bpm: 120, beatsPerBar: 4 });
    expect(r.clicks).toEqual([{ time: 1, accent: true }]);
  });

  function run(bpmAt: (now: number) => number) {
    let s = fresh(0.05);
    const all: Click[] = [];
    for (let i = 0; i < 400; i++) {
      const r = scheduleWindow(s, { now: i * 0.025, lookAhead: 0.1, bpm: bpmAt(i * 0.025), beatsPerBar: 4 });
      s = r.state;
      all.push(...r.clicks);
    }
    return all;
  }

  it('simulated run', () => {
    const all = run(() => 120);
    expect(all.length).toBe(21);
    expect(all[0].time).toBeCloseTo(0.05, 9);
    expect(all[20].time).toBeCloseTo(10.05, 9);
    all.forEach((c, i) => {
      if (i > 0) {
        expect(c.time).toBeGreaterThan(all[i - 1].time);
        expect(c.time - all[i - 1].time).toBeCloseTo(0.5, 9);
      }
      expect(c.accent).toBe(i % 4 === 0);
    });
  });

  it('simulated run with a tempo change', () => {
    const all = run((now) => (now < 5 ? 120 : 60));
    const times = [0.05, 0.55, 1.05, 1.55, 2.05, 2.55, 3.05, 3.55, 4.05, 4.55, 5.05, 6.05, 7.05, 8.05, 9.05, 10.05];
    expect(all.length).toBe(16);
    times.forEach((t, i) => expect(all[i].time).toBeCloseTo(t, 9));
  });
});

describe('scheduleWindow with a non-positive or invalid bpm', () => {
  it.each([0, -10, NaN, Infinity, -Infinity])('bpm %s returns no clicks and the same state', (bpm) => {
    const state: ClockState = { last: 1, startAt: 1, beat: 3 };
    const r = scheduleWindow(state, { now: 5, lookAhead: 0.1, bpm, beatsPerBar: 4 });
    expect(r.clicks).toEqual([]);
    expect(r.state).toBe(state);
    const f = scheduleWindow(fresh(1), { now: 5, lookAhead: 0.1, bpm, beatsPerBar: 4 });
    expect(f.clicks).toEqual([]);
    expect(f.state).toEqual({ last: null, startAt: 1, beat: 0 });
  });
});

describe('clampBpm', () => {
  it.each([
    [39, 40],
    [221, 220],
    [80.4, 80],
    [80.5, 81],
    [NaN, 80],
    ['120', 80],
    [undefined, 80],
  ])('%s -> %s', (input, out) => {
    expect(clampBpm(input)).toBe(out);
  });
});
