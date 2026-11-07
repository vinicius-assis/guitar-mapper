import { describe, expect, it } from 'vitest';
import { chordSymbol, chordTitle, chordToneNames, shapeName } from './chordText';

describe('chordText', () => {
  it('spells chord symbols in the chosen notation', () => {
    expect(chordSymbol({ root: 9, quality: 'min7' }, 'cifra', 'auto')).toBe('Am7');
    expect(chordSymbol({ root: 6, quality: 'half-dim' }, 'ambos', 'auto')).toBe('F#m7(b5) (Fá#m7(b5))');
    expect(chordSymbol({ root: 10, quality: 'maj7' }, 'solfejo', 'flat')).toBe('Sib7M');
  });

  it('lists chord tones', () => {
    expect(chordToneNames({ root: 0, quality: 'dom7' }, 'cifra', 'sharp')).toBe('C E G Bb');
  });

  it('names shapes', () => {
    expect(shapeName('c', 'cifra')).toBe('forma aberta');
    expect(shapeName('e-7', 'cifra')).toBe('pestana, forma de E');
    expect(shapeName('a-maj', 'solfejo')).toBe('pestana, forma de Lá');
    expect(shapeName('a-m7b5', 'ambos')).toBe('forma de A (Lá)');
  });

  it('builds the chord title', () => {
    expect(chordTitle({ shape: 'e-7', root: 9 }, 'cifra', 'auto')).toBe('A7 · pestana, forma de E');
  });
});
