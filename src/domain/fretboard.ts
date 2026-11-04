import { isNatural, type NoteIndex } from './notes';
import { GUITAR, type Instrument } from './instruments';

export const MAX_FRET = 24;
/** Primeira casa usada nas perguntas. 1 = sem corda solta; mude para 0 para voltar a incluí-la. */
export const FIRST_QUIZ_FRET = 1;

export interface Position {
  /** Número da corda: 1 (a mais aguda) até a última corda do instrumento (6 no violão, 4 no baixo). */
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

export function noteAt(pos: Position, instrument: Instrument = GUITAR): NoteIndex {
  return (instrument.tuning[pos.string - 1] + pos.fret) % 12;
}

export function positionKey(pos: Position): string {
  return `${pos.string}-${pos.fret}`;
}

export function parsePositionKey(key: string, instrument: Instrument = GUITAR): Position | null {
  const match = /^(\d{1,2})-(\d{1,2})$/.exec(key);
  if (!match) return null;
  const string = Number(match[1]);
  const fret = Number(match[2]);
  if (string < 1 || string > instrument.stringCount || fret > MAX_FRET) return null;
  return { string, fret };
}

export function allPositions(instrument: Instrument = GUITAR): Position[] {
  const out: Position[] = [];
  for (let string = 1; string <= instrument.stringCount; string++) {
    for (let fret = 0; fret <= MAX_FRET; fret++) out.push({ string, fret });
  }
  return out;
}

export function positionsInFilter(
  filter: Filter,
  instrument: Instrument = GUITAR,
): Position[] {
  const strings = [...new Set(filter.strings)]
    .filter((s) => Number.isInteger(s) && s >= 1 && s <= instrument.stringCount)
    .sort((a, b) => a - b);
  const fretMin = Math.max(FIRST_QUIZ_FRET, filter.fretMin);
  const fretMax = Math.min(MAX_FRET, filter.fretMax);
  const out: Position[] = [];
  for (const string of strings) {
    for (let fret = fretMin; fret <= fretMax; fret++) {
      const pos = { string, fret };
      if (filter.naturalsOnly && !isNatural(noteAt(pos, instrument))) continue;
      out.push(pos);
    }
  }
  return out;
}

export function positionsOfNote(
  note: NoteIndex,
  filter: Filter,
  instrument: Instrument = GUITAR,
): Position[] {
  return positionsInFilter(filter, instrument).filter((p) => noteAt(p, instrument) === note);
}
