import { positionKey, type Position } from './fretboard';

export type Box = 1 | 2 | 3 | 4 | 5;
export type Mastery = 'unseen' | 'wrong' | 'learning' | 'mastered';

export interface PositionProgress {
  box: Box;
  correct: number;
  wrong: number;
  lastReview: number;
  nextReview: number;
}

export type ProgressMap = Record<string, PositionProgress>;

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/** Caixa 1 vence imediatamente: o erro volta logo (mas nunca em sequência, ver `pickNext`). */
export const BOX_INTERVALS_MS: Record<Box, number> = {
  1: 0,
  2: 10 * MINUTE,
  3: DAY,
  4: 3 * DAY,
  5: 7 * DAY,
};

export function applyAnswer(
  prev: PositionProgress | undefined,
  correct: boolean,
  now: number,
): PositionProgress {
  const box = prev?.box ?? 1;
  const nextBox = (correct ? Math.min(5, box + 1) : 1) as Box;
  return {
    box: nextBox,
    correct: (prev?.correct ?? 0) + (correct ? 1 : 0),
    wrong: (prev?.wrong ?? 0) + (correct ? 0 : 1),
    lastReview: now,
    nextReview: now + BOX_INTERVALS_MS[nextBox],
  };
}

export function masteryOf(p: PositionProgress | undefined): Mastery {
  if (!p) return 'unseen';
  if (p.box === 1) return 'wrong';
  return p.box >= 4 ? 'mastered' : 'learning';
}

export function pickNext(
  candidates: Position[],
  progress: ProgressMap,
  now: number,
  rng: () => number,
  avoidKey?: string,
): Position {
  if (candidates.length === 0) throw new Error('pickNext: no candidates');

  const pool =
    candidates.length > 1 && avoidKey
      ? candidates.filter((p) => positionKey(p) !== avoidKey)
      : candidates;

  const due: Position[] = [];
  const fresh: Position[] = [];
  const rest: Position[] = [];
  for (const p of pool) {
    const entry = progress[positionKey(p)];
    if (!entry) fresh.push(p);
    else if (entry.nextReview <= now) due.push(p);
    else rest.push(p);
  }

  const buckets = [
    { items: due, weight: 0.5 },
    { items: fresh, weight: 0.3 },
    { items: rest, weight: 0.2 },
  ].filter((b) => b.items.length > 0);

  const total = buckets.reduce((sum, b) => sum + b.weight, 0);
  let r = rng() * total;
  let chosen = buckets[buckets.length - 1];
  for (const bucket of buckets) {
    if (r < bucket.weight) {
      chosen = bucket;
      break;
    }
    r -= bucket.weight;
  }
  const index = Math.min(chosen.items.length - 1, Math.floor(rng() * chosen.items.length));
  return chosen.items[index];
}
