import type { Position } from './fretboard';

/** Nota MIDI de cada corda solta, da corda 1 (E4) à 6 (E2). */
export const OPEN_STRING_MIDI: readonly number[] = [64, 59, 55, 50, 45, 40];
export const LOWEST_MIDI = 40;
export const HIGHEST_MIDI = 88;

export function pitchOf(position: Position): number {
  return OPEN_STRING_MIDI[position.string - 1] + position.fret;
}

/** Uma posição por som (altura): a primeira que aparece. O mesmo som toca igual em cordas diferentes. */
export function uniquePitchPositions(positions: Position[]): Position[] {
  const seen = new Set<number>();
  return positions.filter((p) => {
    const pitch = pitchOf(p);
    if (seen.has(pitch)) return false;
    seen.add(pitch);
    return true;
  });
}
