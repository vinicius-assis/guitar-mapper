import { keySpelling, QUALITY_SYMBOL, spellChord } from '../domain/harmony';
import type { ChordQuality, HarmonyField, HarmonyKeyLevel } from '../domain/harmony';
import type { Accidentals, Notation, NoteIndex } from '../domain/notes';
import { spellingLabel, type Spelling } from '../domain/spelling';

/** Nota (ou acorde, com `suffix`) na notação escolhida: `Bb7M`, `Sib7M` ou `Bb7M (Sib7M)`. */
export function phrase(spelling: Spelling, notation: Notation, suffix = ''): string {
  const cifra = spellingLabel(spelling, 'cifra') + suffix;
  const solfejo = spellingLabel(spelling, 'solfejo') + suffix;
  if (notation === 'cifra') return cifra;
  if (notation === 'solfejo') return solfejo;
  return `${cifra} (${solfejo})`;
}

export function keyName(
  field: HarmonyField,
  key: NoteIndex,
  notation: Notation,
  accidentals: Accidentals,
): string {
  return phrase(keySpelling(field, key, accidentals)[0], notation, field === 'major' ? ' maior' : ' menor');
}

export function chordName(
  field: HarmonyField,
  key: NoteIndex,
  degree: number,
  sevenths: boolean,
  notation: Notation,
  accidentals: Accidentals,
): string {
  const { root, quality } = spellChord(field, key, degree, sevenths, accidentals);
  return phrase(root, notation, QUALITY_SYMBOL[quality]);
}

export function chordTones(
  field: HarmonyField,
  key: NoteIndex,
  degree: number,
  sevenths: boolean,
  notation: Notation,
  accidentals: Accidentals,
): string {
  return spellChord(field, key, degree, sevenths, accidentals)
    .tones.map((t) => phrase(t, notation))
    .join(' ');
}

export function chordDetail(
  field: HarmonyField,
  key: NoteIndex,
  degree: number,
  sevenths: boolean,
  notation: Notation,
  accidentals: Accidentals,
): string {
  const args = [field, key, degree, sevenths, notation, accidentals] as const;
  return `${chordName(...args)}: ${chordTones(...args)}`;
}

export const QUALITY_TEXT: Record<ChordQuality, { label: string; name: string }> = {
  major: { label: 'Maior', name: 'maior' },
  minor: { label: 'Menor', name: 'menor' },
  dim: { label: 'Diminuto', name: 'diminuto' },
  maj7: { label: '7M', name: 'maior com 7ª maior' },
  dom7: { label: '7', name: 'dominante' },
  min7: { label: 'm7', name: 'menor com 7ª' },
  'half-dim': { label: 'm7(♭5)', name: 'meio-diminuto' },
};

export const HARMONY_KEY_TEXT: Record<HarmonyKeyLevel, string> = {
  easy: 'Tonalidades com até 1 acidente: C, F e G maior; Am, Dm e Em.',
  medium: 'Até 3 acidentes: acrescenta D, A, Bb e Eb maior; Bm, F#m, Gm e Cm.',
  all: 'As 12 tonalidades.',
};
