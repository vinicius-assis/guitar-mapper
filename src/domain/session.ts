import { positionKey, type Position } from './fretboard';
import type { QuizMode } from './quiz';

export const HISTORY_LIMIT = 20;

export interface SessionResult {
  correct: boolean;
  ms: number;
}

export interface SessionSummary {
  total: number;
  correct: number;
  percent: number;
  averageMs: number;
}

export interface HistoryEntry {
  mode: QuizMode;
  /** Instante em que a sessão terminou (ms desde a época). */
  at: number;
  total: number;
  correct: number;
  averageMs: number;
}

/**
 * Fila de uma sessão: todas as posições, embaralhadas, sem repetição.
 * `first`, se dado, abre a fila (mesmo fora da lista) e não aparece de novo.
 */
export function buildQueue(
  positions: Position[],
  rng: () => number,
  first: Position | null = null,
): Position[] {
  const firstKey = first ? positionKey(first) : null;
  const rest = positions.filter((p) => positionKey(p) !== firstKey);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return first ? [first, ...rest] : rest;
}

export function summarize(results: SessionResult[]): SessionSummary {
  const total = results.length;
  if (total === 0) return { total: 0, correct: 0, percent: 0, averageMs: 0 };
  const correct = results.filter((r) => r.correct).length;
  const averageMs = results.reduce((sum, r) => sum + r.ms, 0) / total;
  return { total, correct, percent: Math.round((correct / total) * 100), averageMs };
}

export function makeHistoryEntry(
  mode: QuizMode,
  at: number,
  results: SessionResult[],
): HistoryEntry | null {
  if (results.length === 0) return null;
  const { total, correct, averageMs } = summarize(results);
  return { mode, at, total, correct, averageMs };
}

export function addToHistory(history: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  return [entry, ...history].slice(0, HISTORY_LIMIT);
}
