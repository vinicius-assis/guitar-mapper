import { noteLabel } from '../domain/notes';
import { STANDARD_TUNING } from '../domain/tuning';

/** Nome de cada corda solta (E B G D A E), da corda 1 à 6. Sempre em cifra, qualquer que seja a notação. */
export function stringLabels(): string[] {
  return STANDARD_TUNING.map((note) => noteLabel(note, 'cifra'));
}
