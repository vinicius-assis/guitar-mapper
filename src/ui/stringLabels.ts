import { noteLabel } from '../domain/notes';
import { GUITAR, type Instrument } from '../domain/instruments';

/** Nome de cada corda solta (violão: E B G D A E; baixo: G D A E), da corda 1 à última. Sempre em cifra, qualquer que seja a notação. */
export function stringLabels(instrument: Instrument = GUITAR): string[] {
  return instrument.tuning.map((note) => noteLabel(note, 'cifra'));
}
