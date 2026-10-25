import { noteAt, positionKey, type Position } from './fretboard';
import type { NoteIndex } from './notes';
import { pitchOf, uniquePitchPositions } from './pitch';
import type { EarLevel, QuizMode } from './quiz';

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
  /** Só nas sessões de Ouvido. */
  level?: EarLevel;
}

/**
 * Reordena sem repetir a mesma nota em sequência, escolhendo ao acaso entre as posições
 * que ainda permitem terminar sem repetição. Se não houver como separar, repete o mínimo.
 */
function arrangeWithoutRepeats(
  items: Position[],
  start: NoteIndex | null,
  rng: () => number,
): Position[] {
  const remaining = [...items];
  const out: Position[] = [];
  let last = start;
  while (remaining.length > 0) {
    const left = remaining.length - 1;
    const counts = new Map<NoteIndex, number>();
    for (const p of remaining) counts.set(noteAt(p), (counts.get(noteAt(p)) ?? 0) + 1);
    // Depois de escolher `picked`, sobram `left` posições: uma nota que não é a escolhida cabe
    // em até ceil(left/2) lugares; a própria nota escolhida, em até floor(left/2).
    const canFinish = (picked: NoteIndex) =>
      [...counts].every(([note, count]) =>
        note === picked ? count - 1 <= Math.floor(left / 2) : count <= Math.ceil(left / 2),
      );
    const different = remaining.filter((p) => noteAt(p) !== last);
    const good = different.filter((p) => canFinish(noteAt(p)));
    const pool = good.length > 0 ? good : different.length > 0 ? different : remaining;
    const pick = pool[Math.floor(rng() * pool.length)];
    remaining.splice(remaining.indexOf(pick), 1);
    out.push(pick);
    last = noteAt(pick);
  }
  return out;
}

/**
 * Fila de uma sessão: todas as posições, embaralhadas, sem repetição.
 * `first`, se dado, abre a fila (mesmo fora da lista) e não aparece de novo.
 */
export function buildQueue(
  positions: Position[],
  rng: () => number,
  first: Position | null = null,
  options: { avoidSameNote?: boolean; uniquePitch?: boolean } = {},
): Position[] {
  const firstKey = first ? positionKey(first) : null;
  // Ouvido: o mesmo som em cordas diferentes é a mesma pergunta, então entra uma vez só.
  const pool = options.uniquePitch ? uniquePitchPositions(positions) : positions;
  const firstPitch = first ? pitchOf(first) : null;
  const rest = pool.filter(
    (p) => positionKey(p) !== firstKey && !(options.uniquePitch && pitchOf(p) === firstPitch),
  );
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  const ordered = options.avoidSameNote
    ? arrangeWithoutRepeats(rest, first ? noteAt(first) : null, rng)
    : rest;
  return first ? [first, ...ordered] : ordered;
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
  level?: EarLevel,
): HistoryEntry | null {
  if (results.length === 0) return null;
  const { total, correct, averageMs } = summarize(results);
  return { mode, at, total, correct, averageMs, ...(mode === 'ear' ? { level: level ?? 'easy' } : {}) };
}

export function addToHistory(history: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  return [entry, ...history].slice(0, HISTORY_LIMIT);
}
