import type { NoteIndex } from './notes';
import { STANDARD_TUNING } from './tuning';

export type InstrumentId = 'guitar' | 'bass';

export interface Instrument {
  id: InstrumentId;
  label: string;
  /** Rótulo de acessibilidade do braço. */
  boardLabel: string;
  stringCount: number;
  /** Nota de cada corda solta; índice 0 = corda 1 (a mais aguda). */
  tuning: readonly NoteIndex[];
  /** Nota MIDI de cada corda solta; índice 0 = corda 1. */
  openMidi: readonly number[];
  soundFolder: string;
}

export const GUITAR: Instrument = {
  id: 'guitar',
  label: 'Violão',
  boardLabel: 'Braço da guitarra',
  stringCount: 6,
  tuning: STANDARD_TUNING,
  openMidi: [64, 59, 55, 50, 45, 40],
  soundFolder: 'nylon',
};

export const BASS: Instrument = {
  id: 'bass',
  label: 'Baixo',
  boardLabel: 'Braço do baixo',
  stringCount: 4,
  tuning: [7, 2, 9, 4],
  openMidi: [43, 38, 33, 28],
  soundFolder: 'bass',
};

export const INSTRUMENTS: readonly Instrument[] = [GUITAR, BASS];

export function instrumentById(id: InstrumentId): Instrument {
  return id === 'bass' ? BASS : GUITAR;
}
