import { existsSync, readFileSync, statSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { allPositions } from '../domain/fretboard';
import { pitchOf } from '../domain/pitch';

const DIR = 'public/sounds/nylon';

describe('nylon guitar assets', () => {
  it('has an MP3 for every pitch on the fretboard', () => {
    const pitches = new Set(allPositions().map(pitchOf));
    for (const midi of pitches) {
      const file = `${DIR}/${midi}.mp3`;
      expect(existsSync(file), file).toBe(true);
      expect(statSync(file).size, file).toBeGreaterThan(1000);
    }
  });

  it('ships the license notices', () => {
    const text = readFileSync(`${DIR}/LICENSE.txt`, 'utf8');
    expect(text).toMatch(/FluidR3/);
    expect(text).toMatch(/MIT/);
    expect(text).toMatch(/Creative Commons Attribution 3\.0/);
  });
});
