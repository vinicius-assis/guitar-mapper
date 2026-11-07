import { spellNote, spellingLabel } from './spelling';

export type NoteIndex = number;
export type Notation = 'cifra' | 'solfejo' | 'ambos';
export type Accidentals = 'sharp' | 'flat' | 'auto';
export const ACCIDENTALS: readonly Accidentals[] = ['sharp', 'flat', 'auto'];

const NATURALS = new Set<NoteIndex>([0, 2, 4, 5, 7, 9, 11]);

export const ALL_NOTES: readonly NoteIndex[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
export const NATURAL_NOTES: readonly NoteIndex[] = ALL_NOTES.filter((n) => NATURALS.has(n));

export function isNatural(note: NoteIndex): boolean {
  return NATURALS.has(note);
}

export function noteLabel(note: NoteIndex, notation: Notation, accidentals: Accidentals = 'sharp'): string {
  return spellingLabel(spellNote(note, accidentals), notation);
}
