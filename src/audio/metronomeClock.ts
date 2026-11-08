export const TICK_MS = 25;
export const LOOK_AHEAD_S = 0.1;
export const START_DELAY_S = 0.05;
export const LATE_S = 0.05;
export const BPM_MIN = 40;
export const BPM_MAX = 220;
export const BPM_DEFAULT = 80;
export const BEATS_OPTIONS = [1, 2, 3, 4, 6];
export const BEATS_DEFAULT = 4;

export interface ClockState {
  last: number | null;
  startAt: number;
  beat: number;
}

export interface Click {
  time: number;
  accent: boolean;
}

export interface WindowInput {
  now: number;
  lookAhead: number;
  bpm: number;
  beatsPerBar: number;
}

export function scheduleWindow(
  state: ClockState,
  input: WindowInput,
): { clicks: Click[]; state: ClockState } {
  const { now, lookAhead, bpm, beatsPerBar } = input;
  const spb = 60 / bpm;
  let last = state.last;
  let beat = state.beat;
  let t = last === null ? state.startAt : last + spb;
  // Clicks already too late are skipped, but still count in the bar.
  while (t < now - LATE_S) {
    last = t;
    beat++;
    t = last + spb;
  }
  const clicks: Click[] = [];
  while (t < now + lookAhead) {
    clicks.push({ time: t, accent: beatsPerBar > 1 && beat % beatsPerBar === 0 });
    last = t;
    beat++;
    t = last + spb;
  }
  return { clicks, state: { last, startAt: state.startAt, beat } };
}

export function clampBpm(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return BPM_DEFAULT;
  return Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(value)));
}
