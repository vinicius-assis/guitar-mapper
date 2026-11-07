import type { Accidentals, NoteIndex, Notation } from './notes';
import type { Interval } from './intervals';

export type Letter = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
export type Accidental = -1 | 0 | 1;
export interface Spelling {
  letter: Letter;
  accidental: Accidental;
}

const LETTERS: readonly Letter[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NATURAL_PC: Record<Letter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SOLFEJO: Record<Letter, string> = {
  C: 'Dó',
  D: 'Ré',
  E: 'Mi',
  F: 'Fá',
  G: 'Sol',
  A: 'Lá',
  B: 'Si',
};

function parse(names: string): Spelling[] {
  return names.split(' ').map((name) => ({
    letter: name[0] as Letter,
    accidental: name[1] === '#' ? 1 : name[1] === 'b' ? -1 : 0,
  }));
}

const TABLES: Record<Accidentals, Spelling[]> = {
  sharp: parse('C C# D D# E F F# G G# A A# B'),
  flat: parse('C Db D Eb E F Gb G Ab A Bb B'),
  auto: parse('C Db D Eb E F F# G Ab A Bb B'),
};

const LETTER_STEPS: Record<string, number> = {
  '2m': 1,
  '2M': 1,
  '3m': 2,
  '3M': 2,
  '4J': 3,
  '4A': 3,
  '5J': 4,
  '6m': 5,
  '6M': 5,
  '7m': 6,
  '7M': 6,
};

const RARE = new Set(['Fb', 'Cb', 'E#', 'B#']);

export function spellNote(note: NoteIndex, accidentals: Accidentals): Spelling {
  return TABLES[accidentals][note];
}

export function spellInterval(root: NoteIndex, interval: Interval, accidentals: Accidentals): Spelling {
  const rootSpelling = spellNote(root, accidentals);
  const arrival = (root + interval.semitones) % 12;
  const letter = LETTERS[(LETTERS.indexOf(rootSpelling.letter) + LETTER_STEPS[interval.id]) % 7];
  const diff = (((arrival - NATURAL_PC[letter]) % 12) + 12) % 12;
  const accidental = diff > 5 ? diff - 12 : diff;
  if (accidental < -1 || accidental > 1) return spellNote(arrival, accidentals);
  const result: Spelling = { letter, accidental: accidental as Accidental };
  return RARE.has(spellingLabel(result, 'cifra')) ? spellNote(arrival, accidentals) : result;
}

export function spellingLabel(spelling: Spelling, notation: Notation): string {
  const suffix = spelling.accidental === 1 ? '#' : spelling.accidental === -1 ? 'b' : '';
  const cifra = spelling.letter + suffix;
  const solfejo = SOLFEJO[spelling.letter] + suffix;
  switch (notation) {
    case 'cifra':
      return cifra;
    case 'solfejo':
      return solfejo;
    case 'ambos':
      return `${cifra} · ${solfejo}`;
  }
}
