import { describe, it, expect } from 'vitest';
import { allPositions } from '../domain/fretboard';
import { pitchOf } from '../domain/pitch';

// import.meta.glob (do Vite) evita depender de tipos do Node só para listar arquivos.
const mp3 = Object.keys(
  import.meta.glob('/public/sounds/nylon/*.mp3', { query: '?url', import: 'default' }),
);
const license = Object.values(
  import.meta.glob('/public/sounds/nylon/LICENSE.txt', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
)[0] as string | undefined;

describe('nylon guitar assets', () => {
  it('has an MP3 for every pitch on the fretboard', () => {
    const pitches = new Set(allPositions().map(pitchOf));
    for (const midi of pitches) {
      expect(mp3, `${midi}.mp3`).toContain(`/public/sounds/nylon/${midi}.mp3`);
    }
  });

  it('ships the license notices', () => {
    expect(license).toBeDefined();
    expect(license).toMatch(/FluidR3/);
    expect(license).toMatch(/MIT/);
    expect(license).toMatch(/Creative Commons Attribution 3\.0/);
  });
});
