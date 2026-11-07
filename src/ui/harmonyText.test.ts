import { describe, expect, it } from 'vitest';
import { chordDetail, chordName, chordTones, keyName, phrase, QUALITY_TEXT, HARMONY_KEY_TEXT } from './harmonyText';

describe('harmonyText', () => {
  it('phrase', () => {
    const bb = { letter: 'B', accidental: -1 } as const;
    expect(phrase(bb, 'cifra', '7M')).toBe('Bb7M');
    expect(phrase(bb, 'solfejo', '7M')).toBe('Sib7M');
    expect(phrase(bb, 'ambos', '7M')).toBe('Bb7M (Sib7M)');
    expect(phrase(bb, 'cifra')).toBe('Bb');
  });

  it('keyName', () => {
    expect(keyName('major', 5, 'cifra', 'sharp')).toBe('F maior');
    expect(keyName('major', 5, 'solfejo', 'auto')).toBe('Fá maior');
    expect(keyName('major', 5, 'ambos', 'auto')).toBe('F maior (Fá maior)');
    expect(keyName('minor', 3, 'cifra', 'auto')).toBe('Eb menor');
    expect(keyName('minor', 9, 'cifra', 'auto')).toBe('A menor');
  });

  it('chord names and tones', () => {
    expect(chordName('major', 5, 4, true, 'solfejo', 'auto')).toBe('Sib7M');
    expect(chordName('major', 7, 7, true, 'cifra', 'auto')).toBe('F#m7(b5)');
    expect(chordName('major', 2, 2, false, 'ambos', 'auto')).toBe('Em (Mim)');
    expect(chordTones('major', 5, 4, false, 'cifra', 'sharp')).toBe('Bb D F');
    expect(chordDetail('major', 5, 4, false, 'cifra', 'sharp')).toBe('Bb: Bb D F');
  });

  it('texts', () => {
    expect(QUALITY_TEXT['half-dim']).toEqual({ label: 'm7(♭5)', name: 'meio-diminuto' });
    expect(QUALITY_TEXT.maj7).toEqual({ label: '7M', name: 'maior com 7ª maior' });
    expect(QUALITY_TEXT.major).toEqual({ label: 'Maior', name: 'maior' });
    expect(HARMONY_KEY_TEXT.easy).toBe('Tonalidades com até 1 acidente: C, F e G maior; Am, Dm e Em.');
    expect(HARMONY_KEY_TEXT.medium).toBe('Até 3 acidentes: acrescenta D, A, Bb e Eb maior; Bm, F#m, Gm e Cm.');
    expect(HARMONY_KEY_TEXT.all).toBe('As 12 tonalidades.');
  });
});
