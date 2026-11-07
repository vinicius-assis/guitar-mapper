import type { Accidentals, Notation, NoteIndex } from '../domain/notes';
import { SCALES, type ScaleId } from '../domain/scales';
import { spellScale, spellingLabel } from '../domain/spelling';

/** Nome de uma nota de grau da escala, com a grafia da própria escala. */
export function scaleNoteName(
  scale: ScaleId,
  root: NoteIndex,
  degree: number,
  notation: Notation,
  accidentals: Accidentals,
): string {
  return spellingLabel(spellScale(root, SCALES[scale], accidentals)[degree], notation);
}

export function scaleTitle(
  scale: ScaleId,
  root: NoteIndex,
  box: number,
  notation: Notation,
  accidentals: Accidentals,
): string {
  return `${scaleNoteName(scale, root, 0, notation, accidentals)} ${SCALES[scale].name} · desenho ${box}`;
}
