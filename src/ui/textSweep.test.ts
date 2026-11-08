import { describe, expect, it } from 'vitest';
import { CHORD_QUALITIES, CHORD_SHAPE_IDS, chordVoicing, spellChordTones } from '../domain/chords';
import { chordPool } from '../domain/chordItems';
import { dictationMelody, dictationPool, dictationQuestion } from '../domain/dictation';
import { guidePool } from '../domain/guideTones';
import {
  HARMONY_FIELDS,
  SEVENTH_QUALITIES,
  TRIAD_QUALITIES,
  degreeNumeral,
  keySpelling,
  romanNumeral,
  spellChord,
} from '../domain/harmony';
import { INSTRUMENTS } from '../domain/instruments';
import { INTERVALS } from '../domain/intervals';
import { ACCIDENTALS, ALL_NOTES, noteLabel, type Notation } from '../domain/notes';
import { iiViPool, iiViQuestion } from '../domain/progressions';
import { SCALES, SCALE_IDS } from '../domain/scales';
import { spellInterval, spellNote, spellScale, spellingLabel } from '../domain/spelling';
import { mulberry32 } from '../test-utils';
import { chordSymbol, chordTitle, chordToneNames, shapeName } from './chordText';
import { dictationDegrees, dictationNames, ordinalNote } from './dictationText';
import { QUALITY_TEXT, chordDetail, chordName, chordTones, keyName, phrase } from './harmonyText';
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
import { scaleNoteName, scaleTitle } from './scaleText';

/**
 * Varredura dos textos: todas as tônicas × acidentes × notações. Um texto quebrado
 * ('undefined', 'NaN', vazio) ou uma exceção aqui vira tela branca no quiz.
 */
const NOTATIONS: readonly Notation[] = ['cifra', 'solfejo', 'ambos'];
const COMBOS = ACCIDENTALS.flatMap((accidentals) => NOTATIONS.map((notation) => ({ notation, accidentals })));

function expectClean(text: unknown, where: string) {
  expect(typeof text, where).toBe('string');
  expect((text as string).length, where).toBeGreaterThan(0);
  expect(text, where).not.toMatch(/undefined|NaN|null|\[object/);
}

describe('text sweep', () => {
  it('spelling: every note, interval and scale spells with real letters', () => {
    for (const acc of ACCIDENTALS) {
      for (const root of ALL_NOTES) {
        expect(spellNote(root, acc), `${root} ${acc}`).toBeDefined();
        for (const interval of INTERVALS) {
          const s = spellInterval(root, interval, acc);
          for (const n of NOTATIONS) expectClean(spellingLabel(s, n), `${root}+${interval.id} ${acc}`);
        }
        for (const scale of SCALE_IDS) {
          const spelled = spellScale(root, SCALES[scale], acc);
          const where = `${scale} ${root} ${acc}`;
          expect(spelled, where).toHaveLength(SCALES[scale].semitones.length);
          spelled.forEach((s) => expectClean(spellingLabel(s, 'ambos'), where));
        }
        for (const n of NOTATIONS) expectClean(noteLabel(root, n, acc), `${root} ${n} ${acc}`);
      }
    }
  });

  it('scaleText: every scale, tonic, degree and box', () => {
    for (const { notation, accidentals } of COMBOS) {
      for (const scale of SCALE_IDS) {
        for (const root of ALL_NOTES) {
          SCALES[scale].semitones.forEach((_, degree) => {
            expectClean(scaleNoteName(scale, root, degree, notation, accidentals), `${scale} ${root} ${degree}`);
          });
          for (let box = 1; box <= SCALES[scale].boxCount; box++) {
            expectClean(scaleTitle(scale, root, box, notation, accidentals), `${scale} ${root} ${box}`);
          }
        }
      }
    }
  });

  it('harmonyText: every field, key, degree and chord size', () => {
    for (const { notation, accidentals } of COMBOS) {
      for (const field of HARMONY_FIELDS) {
        for (const key of ALL_NOTES) {
          expectClean(keyName(field, key, notation, accidentals), `${field} ${key}`);
          expect(keySpelling(field, key, accidentals)).toHaveLength(7);
          for (let degree = 1; degree <= 7; degree++) {
            for (const sevenths of [false, true]) {
              const where = `${field} ${key} ${degree} ${sevenths} ${notation} ${accidentals}`;
              const sp = spellChord(field, key, degree, sevenths, accidentals);
              expect(sp.tones, where).toHaveLength(sevenths ? 4 : 3);
              expectClean(phrase(sp.root, notation), where);
              expectClean(chordName(field, key, degree, sevenths, notation, accidentals), where);
              expectClean(chordTones(field, key, degree, sevenths, notation, accidentals), where);
              expectClean(chordDetail(field, key, degree, sevenths, notation, accidentals), where);
              expectClean(romanNumeral(field, degree), where);
              expectClean(degreeNumeral(field, degree, sevenths), where);
            }
          }
        }
      }
    }
    for (const q of [...TRIAD_QUALITIES, ...SEVENTH_QUALITIES]) {
      expectClean(QUALITY_TEXT[q].label, q);
      expectClean(QUALITY_TEXT[q].name, q);
    }
  });

  it('chordText: every root × quality and every shape in the pool', () => {
    for (const { notation, accidentals } of COMBOS) {
      for (const root of ALL_NOTES) {
        for (const quality of CHORD_QUALITIES) {
          const where = `${root} ${quality} ${notation} ${accidentals}`;
          expect(spellChordTones(root, quality, accidentals).every(Boolean), where).toBe(true);
          expectClean(chordSymbol({ root, quality }, notation, accidentals), where);
          expectClean(chordToneNames({ root, quality }, notation, accidentals), where);
        }
      }
      for (const shape of CHORD_SHAPE_IDS) expectClean(shapeName(shape, notation), shape);
      for (const item of chordPool('all', 'both')) {
        expectClean(chordTitle(item, notation, accidentals), `${item.shape} ${item.root}`);
      }
    }
  });

  it('m7Text: arpeggios, guide tones and ii–V–I for every item', () => {
    for (const { notation, accidentals } of COMBOS) {
      for (const scale of SCALE_IDS) {
        for (const root of ALL_NOTES) {
          const where = `${scale} ${root} ${notation} ${accidentals}`;
          expectClean(arpeggioSymbol(scale, root, notation, accidentals), where);
          expectClean(arpeggioToneNames(scale, root, notation, accidentals), where);
          for (let box = 1; box <= SCALES[scale].boxCount; box++) {
            expectClean(arpeggioTitle({ scale, root, box }, notation, accidentals), `${where} ${box}`);
          }
        }
      }
      for (const item of guidePool('all')) {
        const v = chordVoicing(item.shape, item.root);
        expectClean(guideNames(v, notation, accidentals), `${item.shape} ${item.root}`);
        for (const n of v.notes) expectClean(functionName(n.func), `${item.shape} ${n.func}`);
      }
      for (const item of iiViPool()) {
        const q = iiViQuestion(item);
        const where = `${item.key} ${item.grip} ${item.step}`;
        expectClean(iiViChordSymbol(item.key, q.from, notation, accidentals), where);
        expectClean(iiViChordSymbol(item.key, q.to, notation, accidentals), where);
        expectClean(iiViTitle(q, notation, accidentals), where);
        expectClean(iiViTargetNames(q, notation, accidentals), where);
        expectClean(iiViDetail(q, notation, accidentals), where);
      }
    }
  });

  it('dictationText: every level, scale and tonic, both instruments', () => {
    const rng = mulberry32(11);
    for (const instrument of INSTRUMENTS) {
      for (const level of ['easy', 'medium', 'hard'] as const) {
        for (const item of dictationPool(level)) {
          expect(dictationQuestion(item, instrument, rng).pitches, `${item.scale} ${item.root}`).toHaveLength(item.length);
          // Todos os desenhos, não só o sorteado.
          for (let box = 1; box <= SCALES[item.scale].boxCount; box++) {
            const q = { ...item, box, pitches: dictationMelody(item, box, instrument, rng) };
            const where = `${instrument.id} ${item.scale} ${item.root} box ${box}`;
            expect(q.pitches, where).toHaveLength(item.length);
            expect(q.pitches.every(Number.isFinite), where).toBe(true);
            expectClean(dictationDegrees(q), where);
            for (const { notation, accidentals } of COMBOS) {
              expectClean(dictationNames(q, notation, accidentals), where);
            }
          }
        }
      }
    }
    for (let i = 0; i < 8; i++) expectClean(ordinalNote(i), String(i));
  });
});
