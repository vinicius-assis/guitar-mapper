import type { SessionResult } from './session';

export interface DayStats {
  sessions: number;
  answered: number;
  correct: number;
  ms: number;
}

/** Chave `AAAA-MM-DD` (data local). */
export type StatsMap = Record<string, DayStats>;

export const STATS_RETENTION_DAYS = 400;

export function dayKey(date: Date): string {
  const y = String(date.getFullYear()).padStart(4, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Dia vizinho por aritmética de calendário local (imune a horário de verão). */
function shiftDays(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
}

export function addSessionToStats(stats: StatsMap, results: SessionResult[], now: Date): StatsMap {
  if (results.length === 0) return stats;
  const key = dayKey(now);
  const prev = stats[key] ?? { sessions: 0, answered: 0, correct: 0, ms: 0 };
  const next: DayStats = {
    sessions: prev.sessions + 1,
    answered: prev.answered + results.length,
    correct: prev.correct + results.filter((r) => r.correct).length,
    ms: prev.ms + results.reduce((sum, r) => sum + r.ms, 0),
  };
  const cutoff = dayKey(shiftDays(now, -STATS_RETENTION_DAYS));
  const out: StatsMap = {};
  for (const [k, v] of Object.entries(stats)) if (k >= cutoff) out[k] = v;
  out[key] = next;
  return out;
}

const studied = (stats: StatsMap, date: Date) => (stats[dayKey(date)]?.sessions ?? 0) > 0;

export function currentStreak(stats: StatsMap, today: Date): number {
  let cursor = shiftDays(today, 0);
  if (!studied(stats, cursor)) cursor = shiftDays(cursor, -1);
  let count = 0;
  while (studied(stats, cursor)) {
    count++;
    cursor = shiftDays(cursor, -1);
  }
  return count;
}

export function daysStudiedThisWeek(stats: StatsMap, today: Date): number {
  const sinceMonday = (today.getDay() + 6) % 7;
  let count = 0;
  for (let i = 0; i < 7; i++) {
    if (studied(stats, shiftDays(today, -sinceMonday + i))) count++;
  }
  return count;
}

export function averageResponseMs(stats: StatsMap, today: Date): number | null {
  let ms = 0;
  let answered = 0;
  for (let i = 0; i < 7; i++) {
    const s = stats[dayKey(shiftDays(today, -i))];
    if (s) {
      ms += s.ms;
      answered += s.answered;
    }
  }
  return answered > 0 ? ms / answered : null;
}
