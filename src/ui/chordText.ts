import type { ChordItem, ChordName } from '../domain/chordItems';
import { CHORD_SHAPES, spellChordTones, type ChordShapeId } from '../domain/chords';
import { QUALITY_SYMBOL } from '../domain/harmony';
import type { Accidentals, Notation } from '../domain/notes';
import { phrase } from './harmonyText';

export function chordSymbol(name: ChordName, notation: Notation, accidentals: Accidentals): string {
  const root = spellChordTones(name.root, name.quality, accidentals)[0];
  return phrase(root, notation, QUALITY_SYMBOL[name.quality]);
}

export function chordToneNames(name: ChordName, notation: Notation, accidentals: Accidentals): string {
  return spellChordTones(name.root, name.quality, accidentals)
    .map((t) => phrase(t, notation))
    .join(' ');
}

export function shapeName(shape: ChordShapeId, notation: Notation): string {
  const { form, barre } = CHORD_SHAPES[shape];
  if (form === 'open') return 'forma aberta';
  const letter = phrase({ letter: form === 'e' ? 'E' : 'A', accidental: 0 }, notation);
  return `${barre ? 'pestana, ' : ''}forma de ${letter}`;
}

export function chordTitle(item: ChordItem, notation: Notation, accidentals: Accidentals): string {
  const quality = CHORD_SHAPES[item.shape].quality;
  return `${chordSymbol({ root: item.root, quality }, notation, accidentals)} · ${shapeName(item.shape, notation)}`;
}
