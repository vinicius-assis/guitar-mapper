import type { ProgressMap } from './scheduler';

export const SESSION_SIZE = 20;

export interface ReviewOptions<T> {
  keyOf(item: T): string;
  progress: ProgressMap;
  now: number;
  rng: () => number;
  limit: number;
}

function shuffled<T>(group: T[], rng: () => number): T[] {
  const copy = group.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Picks `limit` distinct items for a review session. Classification matches `pickNext`
 * (no entry = new, nextReview <= now = due, else rest). Quotas: 30% new, 20% rest, remainder due;
 * unused quota is redistributed in the order due, new, rest.
 */
export function selectForReview<T>(items: T[], options: ReviewOptions<T>): T[] {
  const { keyOf, progress, now, rng, limit } = options;
  if (items.length <= limit) return items.slice();

  const due: T[] = [];
  const fresh: T[] = [];
  const rest: T[] = [];
  for (const item of items) {
    const entry = progress[keyOf(item)];
    if (!entry) fresh.push(item);
    else if (entry.nextReview <= now) due.push(item);
    else rest.push(item);
  }

  const freshQuota = Math.floor(limit * 0.3);
  const restQuota = Math.floor(limit * 0.2);
  const dueQuota = limit - freshQuota - restQuota;

  const groups = [
    { pool: shuffled(due, rng), quota: dueQuota },
    { pool: shuffled(fresh, rng), quota: freshQuota },
    { pool: shuffled(rest, rng), quota: restQuota },
  ];

  const result: T[] = [];
  for (const g of groups) result.push(...g.pool.splice(0, g.quota));
  for (const g of groups) {
    if (result.length >= limit) break;
    result.push(...g.pool.splice(0, limit - result.length));
  }
  return result;
}
