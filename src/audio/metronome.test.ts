import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMetronome, type ClickContextLike, type MetronomeDeps } from './metronome';

interface FakeOsc {
  frequency: { value: number };
  startAt?: number;
  stopCalls: (number | undefined)[];
  gainCalls: [string, number, number][];
  disconnects: number;
  gainDisconnects: number;
  node?: { onended?: (() => void) | null };
}

function fakeCtx() {
  const oscs: FakeOsc[] = [];
  const ctx = {
    currentTime: 0,
    state: 'suspended',
    destination: {},
    resume: vi.fn(() => Promise.resolve()),
    createOscillator() {
      const o: FakeOsc = {
        frequency: { value: 0 },
        stopCalls: [],
        gainCalls: [],
        disconnects: 0,
        gainDisconnects: 0,
      };
      oscs.push(o);
      const node = {
        onended: null as (() => void) | null,
        frequency: o.frequency,
        connect() {},
        disconnect() {
          o.disconnects++;
        },
        start(when: number) {
          o.startAt = when;
        },
        stop(when?: number) {
          o.stopCalls.push(when);
        },
      };
      o.node = node;
      return node;
    },
    createGain() {
      const calls = oscs[oscs.length - 1].gainCalls;
      return {
        gain: {
          setValueAtTime: (v: number, t: number) => calls.push(['set', v, t]),
          exponentialRampToValueAtTime: (v: number, t: number) => calls.push(['ramp', v, t]),
        },
        connect() {},
        disconnect() {
          oscs[oscs.length - 1].gainDisconnects++;
        },
      };
    },
  };
  return { ctx: ctx as ClickContextLike & { currentTime: number; resume: ReturnType<typeof vi.fn> }, oscs };
}

function setup(initial = { bpm: 120, beatsPerBar: 4 }) {
  const { ctx, oscs } = fakeCtx();
  const timer = { fn: null as null | (() => void), ids: [] as number[], cleared: [] as unknown[], ms: 0 };
  const createContext = vi.fn(() => ctx);
  const deps: MetronomeDeps = {
    createContext,
    setInterval: (fn, ms) => {
      timer.fn = fn;
      timer.ms = ms;
      timer.ids.push(timer.ids.length + 1);
      return timer.ids.length;
    },
    clearInterval: (id) => timer.cleared.push(id),
  };
  return { ctx, oscs, timer, createContext, metro: createMetronome(deps, initial) };
}

describe('metronome engine', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });
  afterEach(() => {
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('starts on the audio clock', () => {
    const { ctx, oscs, timer, createContext, metro } = setup();
    ctx.currentTime = 10;
    expect(metro.start()).toBe(true);
    expect(createContext).toHaveBeenCalledTimes(1);
    expect(ctx.resume).toHaveBeenCalledTimes(1);
    expect(oscs).toHaveLength(1);
    expect(oscs[0].startAt).toBeCloseTo(10.05);
    expect(oscs[0].stopCalls[0]).toBeCloseTo(10.11);
    expect(oscs[0].frequency.value).toBe(1600);
    const g = oscs[0].gainCalls;
    expect(g[0][0]).toBe('set');
    expect(g[0][1]).toBe(0.0001);
    expect(g[0][2]).toBeCloseTo(10.05);
    expect(g[1][1]).toBe(1);
    expect(g[1][2]).toBeCloseTo(10.052);
    expect(g[2][1]).toBe(0.0001);
    expect(g[2][2]).toBeCloseTo(10.1);
    expect(timer.ms).toBe(25);
    expect(metro.isRunning()).toBe(true);
  });

  it('start while running has no effect', () => {
    const { oscs, timer, createContext, ctx, metro } = setup();
    metro.start();
    expect(metro.start()).toBe(true);
    expect(timer.ids).toHaveLength(1);
    expect(createContext).toHaveBeenCalledTimes(1);
    expect(ctx.resume).toHaveBeenCalledTimes(1);
    expect(oscs).toHaveLength(1);
  });

  it('does not resume a running context', () => {
    const { ctx, metro } = setup();
    ctx.state = 'running';
    metro.start();
    expect(ctx.resume).not.toHaveBeenCalled();
  });

  it('swallows a rejected or throwing resume', async () => {
    const { ctx, metro } = setup();
    ctx.resume.mockImplementation(() => Promise.reject(new Error('no')));
    expect(metro.start()).toBe(true);
    await Promise.resolve();
    ctx.resume.mockImplementation(() => {
      throw new Error('sync');
    });
    metro.stop();
    expect(metro.start()).toBe(true);
  });

  it('ticks schedule the next click', () => {
    const { ctx, oscs, timer, metro } = setup();
    ctx.currentTime = 10;
    metro.start();
    ctx.currentTime = 10.5;
    timer.fn!();
    expect(oscs).toHaveLength(2);
    expect(oscs[1].startAt).toBeCloseTo(10.55);
    expect(oscs[1].frequency.value).toBe(1000);
    expect(oscs[1].gainCalls[1][1]).toBe(0.6);
    timer.fn!();
    expect(oscs).toHaveLength(2);
  });

  it('tempo change mid-run applies from the next click', () => {
    const { ctx, oscs, timer, metro } = setup();
    ctx.currentTime = 10;
    metro.start();
    ctx.currentTime = 10.5;
    timer.fn!();
    metro.setBpm(60);
    ctx.currentTime = 11.5;
    timer.fn!();
    expect(oscs[2].startAt).toBeCloseTo(11.55);
  });

  it('clamps bpm so a bad value cannot stall or hang the loop', () => {
    for (const bad of [500, 0, -10, NaN]) {
      const { ctx, oscs, timer, metro } = setup();
      ctx.currentTime = 0;
      metro.start();
      metro.setBpm(bad);
      for (let t = 0; t <= 3; t += 0.025) {
        ctx.currentTime = t;
        timer.fn!();
      }
      const times = oscs.map((o) => o.startAt!);
      const gaps = times.slice(1).map((t, i) => t - times[i]);
      const expected = bad === 500 ? 60 / 220 : bad === 0 || bad === -10 ? 60 / 40 : 60 / 80;
      expect(gaps.length).toBeGreaterThan(0);
      gaps.forEach((gap) => expect(gap).toBeCloseTo(expected));
    }
  });

  it('clamps the initial bpm too', () => {
    const { ctx, oscs, timer, metro } = setup({ bpm: -5, beatsPerBar: 4 });
    metro.start();
    for (let t = 0; t <= 2; t += 0.025) {
      ctx.currentTime = t;
      timer.fn!();
    }
    expect(oscs[1].startAt! - oscs[0].startAt!).toBeCloseTo(60 / 40);
  });

  it('beats per bar restart the bar with an accent', () => {
    const { ctx, oscs, timer, metro } = setup();
    ctx.currentTime = 10;
    metro.start();
    ctx.currentTime = 10.5;
    timer.fn!();
    expect(oscs[1].frequency.value).toBe(1000);
    metro.setBeatsPerBar(3);
    ctx.currentTime = 11;
    timer.fn!();
    expect(oscs[2].frequency.value).toBe(1600);
    ctx.currentTime = 11.5;
    timer.fn!();
    expect(oscs[3].frequency.value).toBe(1000);
  });

  it('stop cancels pending clicks', () => {
    const { ctx, oscs, timer, metro } = setup();
    ctx.currentTime = 10.5;
    metro.start();
    ctx.currentTime = 11;
    timer.fn!();
    expect(oscs[1].startAt).toBeCloseTo(11.05);
    ctx.currentTime = 11.0;
    metro.stop();
    expect(timer.cleared).toEqual([1]);
    expect(oscs[1].stopCalls).toHaveLength(2);
    expect(oscs[1].stopCalls[1]).toBeUndefined();
    expect(metro.isRunning()).toBe(false);
    const n = oscs.length;
    ctx.currentTime = 12;
    timer.fn!();
    expect(oscs).toHaveLength(n);
  });

  it('stop tolerates oscillators that throw on stop', () => {
    const { ctx, timer, metro } = setup();
    const orig = ctx.createOscillator.bind(ctx);
    let first = true;
    ctx.createOscillator = () => {
      const o = orig();
      if (first) {
        first = false;
        return o;
      }
      return {
        ...o,
        stop(when?: number) {
          if (when === undefined) throw new Error('already stopped');
        },
      };
    };
    metro.start();
    ctx.currentTime = 1;
    timer.fn!();
    expect(() => metro.stop()).not.toThrow();
    expect(metro.isRunning()).toBe(false);
  });

  it('stop does not restart on its own and is idempotent', () => {
    const { ctx, oscs, timer, metro } = setup();
    metro.start();
    metro.stop();
    metro.stop();
    expect(timer.cleared).toEqual([1]);
    metro.setBpm(100);
    metro.setBeatsPerBar(3);
    ctx.currentTime = 5;
    timer.fn?.();
    expect(oscs).toHaveLength(1);
    expect(timer.ids).toHaveLength(1);
    expect(metro.isRunning()).toBe(false);
  });

  it('restart reuses the context and accents the first click', () => {
    const { ctx, oscs, timer, createContext, metro } = setup();
    ctx.currentTime = 10;
    metro.start();
    ctx.currentTime = 10.5;
    timer.fn!();
    metro.stop();
    ctx.currentTime = 20;
    metro.start();
    expect(createContext).toHaveBeenCalledTimes(1);
    expect(ctx.resume).toHaveBeenCalledTimes(2);
    expect(oscs.at(-1)!.frequency.value).toBe(1600);
    expect(oscs.at(-1)!.startAt).toBeCloseTo(20.05);
  });

  it('start survives a throwing first click and can be retried', () => {
    const { ctx, oscs, timer, metro } = setup();
    const orig = ctx.createOscillator.bind(ctx);
    let fail = true;
    ctx.createOscillator = () => {
      if (fail) {
        fail = false;
        throw new Error('boom');
      }
      return orig();
    };
    expect(metro.start()).toBe(false);
    expect(metro.isRunning()).toBe(false);
    expect(timer.ids).toHaveLength(0);
    expect(metro.start()).toBe(true);
    expect(metro.isRunning()).toBe(true);
    expect(timer.ids).toHaveLength(1);
    expect(oscs).toHaveLength(1);
  });

  it('disconnects nodes when an oscillator ends', () => {
    const { oscs, metro } = setup();
    metro.start();
    expect(oscs[0].disconnects).toBe(0);
    oscs[0].node!.onended!();
    expect(oscs[0].disconnects).toBe(1);
    expect(oscs[0].gainDisconnects).toBe(1);
  });

  it('a click already slightly late starts at now, not in the past', () => {
    const { ctx, oscs, timer, metro } = setup();
    ctx.currentTime = 10;
    metro.start();
    ctx.currentTime = 10.5;
    timer.fn!();
    ctx.currentTime = 11.08;
    timer.fn!();
    expect(oscs).toHaveLength(3);
    expect(oscs[2].startAt).toBeCloseTo(11.08);
  });

  it('reports no Web Audio without throwing', () => {
    const { oscs, timer } = setup();
    const metro = createMetronome(
      {
        createContext: () => {
          throw new Error('Web Audio indisponível');
        },
        setInterval: () => 1,
        clearInterval: () => {},
      },
      { bpm: 80, beatsPerBar: 4 },
    );
    expect(metro.start()).toBe(false);
    expect(metro.isRunning()).toBe(false);
    expect(() => metro.stop()).not.toThrow();
    expect(oscs).toHaveLength(0);
    expect(timer.ids).toHaveLength(0);
  });
});
