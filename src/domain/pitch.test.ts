import { describe, it, expect } from 'vitest';
import { allPositions, noteAt } from './fretboard';
import { HIGHEST_MIDI, LOWEST_MIDI, OPEN_STRING_MIDI, pitchOf } from './pitch';

describe('pitchOf', () => {
  it('knows the open strings (E2 A2 D3 G3 B3 E4)', () => {
    expect(OPEN_STRING_MIDI).toEqual([64, 59, 55, 50, 45, 40]);
    expect(pitchOf({ string: 6, fret: 0 })).toBe(40);
    expect(pitchOf({ string: 1, fret: 0 })).toBe(64);
  });

  it('adds one semitone per fret', () => {
    expect(pitchOf({ string: 5, fret: 3 })).toBe(48); // C3
    expect(pitchOf({ string: 6, fret: 12 })).toBe(52); // E3
  });

  it('spans E2 to E6 over the whole neck', () => {
    expect(pitchOf({ string: 1, fret: 24 })).toBe(HIGHEST_MIDI);
    expect(HIGHEST_MIDI).toBe(88);
    expect(LOWEST_MIDI).toBe(40);
    for (const p of allPositions()) {
      expect(pitchOf(p)).toBeGreaterThanOrEqual(LOWEST_MIDI);
      expect(pitchOf(p)).toBeLessThanOrEqual(HIGHEST_MIDI);
    }
  });

  it('agrees with noteAt for every position', () => {
    for (const p of allPositions()) expect(pitchOf(p) % 12).toBe(noteAt(p));
  });
});
