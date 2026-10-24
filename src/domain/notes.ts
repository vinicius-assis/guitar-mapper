export type NoteIndex = number;
export type Notation = 'cifra' | 'solfejo' | 'ambos';

const CIFRA = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const SOLFEJO = ['Dó', 'Dó#', 'Ré', 'Ré#', 'Mi', 'Fá', 'Fá#', 'Sol', 'Sol#', 'Lá', 'Lá#', 'Si'];
const NATURALS = new Set<NoteIndex>([0, 2, 4, 5, 7, 9, 11]);

export const ALL_NOTES: readonly NoteIndex[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
export const NATURAL_NOTES: readonly NoteIndex[] = ALL_NOTES.filter((n) => NATURALS.has(n));

export function isNatural(note: NoteIndex): boolean {
  return NATURALS.has(note);
}

export function noteLabel(note: NoteIndex, notation: Notation): string {
  switch (notation) {
    case 'cifra':
      return CIFRA[note];
    case 'solfejo':
      return SOLFEJO[note];
    case 'ambos':
      return `${CIFRA[note]} · ${SOLFEJO[note]}`;
  }
}
