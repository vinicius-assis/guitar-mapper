// Gera public/sounds/nylon/<midi>.mp3 (MIDI 40-88) a partir do soundfont FluidR3 do projeto
// midi-js-soundfonts. Rodar uma vez: node scripts/extract-nylon.mjs
import { mkdirSync, writeFileSync } from 'node:fs';

const URL = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_guitar_nylon-mp3.js';
const OUT = 'public/sounds/nylon';
const SEMITONE = { C: 0, Db: 1, D: 2, Eb: 3, E: 4, F: 5, Gb: 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };

const source = await (await fetch(URL)).text();
mkdirSync(OUT, { recursive: true });
let count = 0;
for (const [, name, base64] of source.matchAll(/"([A-G]b?\d)":\s*"data:audio\/mp3;base64,([^"]+)"/g)) {
  const [, letter, octave] = /^([A-G]b?)(\d)$/.exec(name);
  const midi = 12 * (Number(octave) + 1) + SEMITONE[letter];
  if (midi < 40 || midi > 88) continue;
  writeFileSync(`${OUT}/${midi}.mp3`, Buffer.from(base64, 'base64'));
  count++;
}
console.log(`${count} notes written to ${OUT}`);
