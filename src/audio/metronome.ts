import {
  LOOK_AHEAD_S,
  START_DELAY_S,
  TICK_MS,
  clampBpm,
  scheduleWindow,
  type ClockState,
} from './metronomeClock';

export interface OscillatorLike {
  frequency: { value: number };
  connect(node: unknown): void;
  start(when: number): void;
  stop(when?: number): void;
}

export interface GainLike {
  gain: {
    setValueAtTime(v: number, t: number): void;
    exponentialRampToValueAtTime(v: number, t: number): void;
  };
  connect(node: unknown): void;
}

export interface ClickContextLike {
  currentTime: number;
  state: string;
  destination: unknown;
  resume(): Promise<void>;
  createOscillator(): OscillatorLike;
  createGain(): GainLike;
}

export interface MetronomeDeps {
  createContext(): ClickContextLike;
  setInterval(fn: () => void, ms: number): unknown;
  clearInterval(id: unknown): void;
}

export interface Metronome {
  start(): boolean;
  stop(): void;
  setBpm(bpm: number): void;
  setBeatsPerBar(n: number): void;
  isRunning(): boolean;
}

const SILENT = 0.0001;

export function createMetronome(
  deps: MetronomeDeps,
  initial: { bpm: number; beatsPerBar: number },
): Metronome {
  let bpm = initial.bpm;
  let beatsPerBar = initial.beatsPerBar;
  let ctx: ClickContextLike | null = null;
  let timerId: unknown = null;
  let running = false;
  let clock: ClockState = { last: null, startAt: 0, beat: 0 };
  let pending: { osc: OscillatorLike; endsAt: number }[] = [];

  const click = (c: ClickContextLike, time: number, accent: boolean) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.frequency.value = accent ? 1600 : 1000;
    gain.gain.setValueAtTime(SILENT, time);
    gain.gain.exponentialRampToValueAtTime(accent ? 1 : 0.6, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(SILENT, time + 0.05);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(time);
    osc.stop(time + 0.06);
    pending.push({ osc, endsAt: time + 0.06 });
  };

  const tick = () => {
    if (!running || !ctx) return;
    const now = ctx.currentTime;
    pending = pending.filter((p) => p.endsAt >= now);
    const out = scheduleWindow(clock, {
      now,
      lookAhead: LOOK_AHEAD_S,
      bpm: clampBpm(bpm),
      beatsPerBar,
    });
    clock = out.state;
    out.clicks.forEach((c) => click(ctx!, Math.max(c.time, now), c.accent));
  };

  return {
    start() {
      if (running) return true;
      try {
        ctx ??= deps.createContext();
      } catch {
        return false;
      }
      if (ctx.state !== 'running') {
        try {
          ctx.resume().catch(() => {});
        } catch {
          // iOS pode recusar fora de um gesto
        }
      }
      clock = { last: null, startAt: ctx.currentTime + START_DELAY_S, beat: 0 };
      running = true;
      tick();
      timerId = deps.setInterval(tick, TICK_MS);
      return true;
    },
    stop() {
      if (!running) return;
      running = false;
      deps.clearInterval(timerId);
      timerId = null;
      pending.forEach(({ osc }) => {
        try {
          osc.stop();
        } catch {
          // já parou
        }
      });
      pending = [];
    },
    setBpm(value) {
      bpm = value;
    },
    setBeatsPerBar(n) {
      beatsPerBar = n;
      clock = { ...clock, beat: 0 };
    },
    isRunning: () => running,
  };
}

export function browserMetronomeDeps(): MetronomeDeps {
  return {
    createContext: () => {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) throw new Error('Web Audio indisponível');
      return new Ctor() as unknown as ClickContextLike;
    },
    setInterval: (fn, ms) => window.setInterval(fn, ms),
    clearInterval: (id) => window.clearInterval(id as number),
  };
}
