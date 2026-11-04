import { describe, it, expect } from 'vitest';
import { BASS, GUITAR, INSTRUMENTS, instrumentById } from './instruments';

describe('instruments', () => {
  it('bass has 4 strings E1 A1 D2 G2 (top to bottom G D A E)', () => {
    expect(BASS.stringCount).toBe(4);
    expect(BASS.openMidi).toEqual([43, 38, 33, 28]);
    expect(BASS.tuning).toEqual([7, 2, 9, 4]);
  });
  it('tuning matches openMidi mod 12', () => {
    for (let i = 0; i < 4; i++) expect(BASS.tuning[i]).toBe(BASS.openMidi[i] % 12);
    for (let i = 0; i < 6; i++) expect(GUITAR.tuning[i]).toBe(GUITAR.openMidi[i] % 12);
  });
  it('looks up by id', () => {
    expect(instrumentById('bass')).toBe(BASS);
    expect(instrumentById('guitar')).toBe(GUITAR);
    expect(INSTRUMENTS.map((i) => i.id)).toEqual(['guitar', 'bass']);
  });
});
