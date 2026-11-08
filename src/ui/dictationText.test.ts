import { describe, expect, it } from 'vitest';
import type { DictationQuestion } from '../domain/dictation';
import { dictationDegrees, dictationNames, ordinalNote } from './dictationText';

const AM: DictationQuestion = { scale: 'pent-minor', root: 9, length: 4, box: 1, pitches: [57, 60, 62, 64] };

describe('dictationText', () => {
  it('spells the melody in the scale spelling', () => {
    expect(dictationNames(AM, 'cifra', 'auto')).toBe('A C D E');
    const major: DictationQuestion = { scale: 'major', root: 0, length: 6, box: 1, pitches: [60, 64, 65, 69, 72, 71] };
    expect(dictationNames(major, 'solfejo', 'auto')).toBe('Dó Mi Fá Lá Dó Si');
  });

  it('lists the degrees', () => {
    expect(dictationDegrees(AM)).toBe('1 ♭3 4 5');
  });

  it('names the ordinal of a note', () => {
    expect(ordinalNote(0)).toBe('1ª');
    expect(ordinalNote(1)).toBe('2ª');
  });
});
