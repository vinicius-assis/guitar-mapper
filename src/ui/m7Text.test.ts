import { describe, expect, it } from 'vitest';
import { chordVoicing } from '../domain/chords';
import { iiViQuestion } from '../domain/progressions';
import {
  arpeggioSymbol,
  arpeggioTitle,
  arpeggioToneNames,
  functionName,
  guideNames,
  iiViChordSymbol,
  iiViDetail,
  iiViTargetNames,
  iiViTitle,
} from './m7Text';

describe('guide and arpeggio texts', () => {
  it('names the guide tones of a voicing', () => {
    expect(guideNames(chordVoicing('g7', 0), 'cifra', 'auto')).toBe('B (3) e F (♭7)');
    expect(guideNames(chordVoicing('am7', 0), 'cifra', 'auto')).toBe('C (♭3) e G (♭7)');
    expect(guideNames(chordVoicing('a-maj7', 10), 'solfejo', 'flat')).toBe('Ré (3) e Lá (7)');
  });

  it('names chord functions', () => {
    expect(functionName('5')).toBe('a 5ª');
    expect(functionName('1')).toBe('a fundamental');
    expect(functionName('♭5')).toBe('a ♭5');
  });

  it('names arpeggios', () => {
    expect(arpeggioSymbol('pent-minor', 9, 'cifra', 'auto')).toBe('Am7');
    expect(arpeggioSymbol('pent-major', 0, 'cifra', 'auto')).toBe('C');
    expect(arpeggioSymbol('locrian', 11, 'cifra', 'auto')).toBe('Bm7(b5)');
    expect(arpeggioTitle({ scale: 'pent-minor', root: 9, box: 1 }, 'cifra', 'auto')).toBe(
      'Am7 em A pentatônica menor · desenho 1',
    );
    expect(arpeggioToneNames('pent-minor', 9, 'cifra', 'auto')).toBe('A C E G');
    expect(arpeggioToneNames('mixolydian', 7, 'cifra', 'auto')).toBe('G B D F');
  });

  it('describes ii-V-I steps', () => {
    const iiV = iiViQuestion({ key: 0, grip: 1, step: 'ii-v' });
    expect(iiViTitle(iiV, 'cifra', 'auto')).toBe('Dm7 → G7 · ii–V–I em C');
    expect(iiViTargetNames(iiV, 'cifra', 'auto')).toBe('B e F');
    expect(iiViDetail(iiV, 'cifra', 'auto')).toBe('C (♭7) desce meio tom para B (3) · F (♭3) fica e vira a ♭7');
    expect(iiViChordSymbol(0, iiV.from, 'cifra', 'auto')).toBe('Dm7');
    const vI = iiViQuestion({ key: 0, grip: 1, step: 'v-i' });
    expect(iiViTitle(vI, 'cifra', 'auto')).toBe('G7 → C7M · ii–V–I em C');
    expect(iiViDetail(vI, 'cifra', 'auto')).toBe('F (♭7) desce meio tom para E (3) · B (3) fica e vira a 7');
    const f = iiViQuestion({ key: 5, grip: 2, step: 'ii-v' });
    expect(iiViTitle(f, 'cifra', 'auto')).toBe('Gm7 → C7 · ii–V–I em F');
    expect(iiViTargetNames(f, 'cifra', 'auto')).toBe('E e Bb');
    const d = iiViQuestion({ key: 2, grip: 1, step: 'v-i' });
    expect(iiViTitle(d, 'ambos', 'auto')).toBe('A7 (Lá7) → D7M (Ré7M) · ii–V–I em D (Ré)');
  });
});
