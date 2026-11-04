import type { Position } from './fretboard';
import { GUITAR, type Instrument } from './instruments';

export function pitchOf(position: Position, instrument: Instrument = GUITAR): number {
  return instrument.openMidi[position.string - 1] + position.fret;
}

/** Uma posição por som (altura): a primeira que aparece. O mesmo som toca igual em cordas diferentes. */
export function uniquePitchPositions(
  positions: Position[],
  instrument: Instrument = GUITAR,
): Position[] {
  const seen = new Set<number>();
  return positions.filter((p) => {
    const pitch = pitchOf(p, instrument);
    if (seen.has(pitch)) return false;
    seen.add(pitch);
    return true;
  });
}
