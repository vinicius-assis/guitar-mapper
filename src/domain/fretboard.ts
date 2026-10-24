import { isNatural, type NoteIndex } from './notes';
import { STANDARD_TUNING } from './tuning';

export const STRING_COUNT = 6;
export const MAX_FRET = 24;

export interface Position {
  /** 1 (E agudo) … 6 (E grave) */
  string: number;
  /** 0 (solta) … 24 */
  fret: number;
}

export interface Filter {
  strings: number[];
  fretMin: number;
  fretMax: number;
  naturalsOnly: boolean;
}

export function noteAt(pos: Position, tuning: readonly NoteIndex[] = STANDARD_TUNING): NoteIndex {
  return (tuning[pos.string - 1] + pos.fret) % 12;
}

export function positionKey(pos: Position): string {
  return `${pos.string}-${pos.fret}`;
}

export function parsePositionKey(key: string): Position | null {
  const match = /^([1-6])-(\d{1,2})$/.exec(key);
  if (!match) return null;
  const fret = Number(match[2]);
  if (fret > MAX_FRET) return null;
  return { string: Number(match[1]), fret };
}

export function allPositions(): Position[] {
  const out: Position[] = [];
  for (let string = 1; string <= STRING_COUNT; string++) {
    for (let fret = 0; fret <= MAX_FRET; fret++) out.push({ string, fret });
  }
  return out;
}

export function positionsInFilter(
  filter: Filter,
  tuning: readonly NoteIndex[] = STANDARD_TUNING,
): Position[] {
  const strings = [...new Set(filter.strings)]
    .filter((s) => Number.isInteger(s) && s >= 1 && s <= STRING_COUNT)
    .sort((a, b) => a - b);
  const fretMin = Math.max(0, filter.fretMin);
  const fretMax = Math.min(MAX_FRET, filter.fretMax);
  const out: Position[] = [];
  for (const string of strings) {
    for (let fret = fretMin; fret <= fretMax; fret++) {
      const pos = { string, fret };
      if (filter.naturalsOnly && !isNatural(noteAt(pos, tuning))) continue;
      out.push(pos);
    }
  }
  return out;
}

export function positionsOfNote(
  note: NoteIndex,
  filter: Filter,
  tuning: readonly NoteIndex[] = STANDARD_TUNING,
): Position[] {
  return positionsInFilter(filter, tuning).filter((p) => noteAt(p, tuning) === note);
}
