import { noteLabel, type Notation } from '../domain/notes';
import { STANDARD_TUNING } from '../domain/tuning';

/** Nome de cada corda solta, da corda 1 (E agudo) à 6 (E grave), na notação escolhida. */
export function stringLabels(notation: Notation): string[] {
  return STANDARD_TUNING.map((note) => noteLabel(note, notation));
}
