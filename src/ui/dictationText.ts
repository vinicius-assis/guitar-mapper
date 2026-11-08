import type { DictationQuestion } from '../domain/dictation';
import type { Accidentals, Notation, NoteIndex } from '../domain/notes';
import { SCALES, scaleDegreeOf } from '../domain/scales';
import { scaleNoteName } from './scaleText';

function degreeOfPitch(q: DictationQuestion, pitch: number): number {
  return scaleDegreeOf((pitch % 12) as NoteIndex, q.root, q.scale);
}

export function dictationNames(q: DictationQuestion, notation: Notation, accidentals: Accidentals): string {
  return q.pitches.map((p) => scaleNoteName(q.scale, q.root, degreeOfPitch(q, p), notation, accidentals)).join(' ');
}

export function dictationDegrees(q: DictationQuestion): string {
  return q.pitches.map((p) => SCALES[q.scale].degrees[degreeOfPitch(q, p)]).join(' ');
}

export function ordinalNote(i: number): string {
  return `${i + 1}ª`;
}
