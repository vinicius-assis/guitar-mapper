import { TONIC_CHORD } from '../domain/arpeggio';
import { chordSemitones, spellChordTones, type Voicing } from '../domain/chords';
import { QUALITY_SYMBOL, keySpelling, spellChord } from '../domain/harmony';
import type { Accidentals, Notation, NoteIndex } from '../domain/notes';
import type { IiViQuestion, ShellChord } from '../domain/progressions';
import type { ScalePlayItem } from '../domain/scaleItems';
import { SCALES, type ScaleId } from '../domain/scales';
import { spellScale } from '../domain/spelling';
import { phrase } from './harmonyText';
import { scaleTitle } from './scaleText';

function thirdAndSeventh(v: Voicing | ShellChord, accidentals: Accidentals) {
  const tones = spellChordTones(v.root, v.quality, accidentals);
  return { third: tones[1], seventh: tones[3] };
}

const funcOf = (v: Voicing | ShellChord, indexInChord: 1 | 3) =>
  v.notes.find((n) => (indexInChord === 1 ? ['3', '♭3'] : ['7', '♭7']).includes(n.func))!.func;

/** `B (3) e F (♭7)`. */
export function guideNames(v: Voicing, notation: Notation, accidentals: Accidentals): string {
  const { third, seventh } = thirdAndSeventh(v, accidentals);
  return `${phrase(third, notation)} (${funcOf(v, 1)}) e ${phrase(seventh, notation)} (${funcOf(v, 3)})`;
}

export function functionName(func: string): string {
  if (func === '1') return 'a fundamental';
  return func === '5' ? 'a 5ª' : `a ${func}`;
}

export function arpeggioSymbol(scale: ScaleId, root: NoteIndex, notation: Notation, accidentals: Accidentals): string {
  return phrase(spellScale(root, SCALES[scale], accidentals)[0], notation, QUALITY_SYMBOL[TONIC_CHORD[scale]]);
}

export function arpeggioTitle(item: ScalePlayItem, notation: Notation, accidentals: Accidentals): string {
  return `${arpeggioSymbol(item.scale, item.root, notation, accidentals)} em ${scaleTitle(item.scale, item.root, item.box, notation, accidentals)}`;
}

/** Notas da escala (na grafia dela) que pertencem ao arpejo. */
export function arpeggioToneNames(scale: ScaleId, root: NoteIndex, notation: Notation, accidentals: Accidentals): string {
  const chord = chordSemitones(TONIC_CHORD[scale]);
  const spelled = spellScale(root, SCALES[scale], accidentals);
  return SCALES[scale].semitones
    .map((s, i) => (chord.includes(s) ? phrase(spelled[i], notation) : null))
    .filter((n): n is string => n !== null)
    .join(' ');
}

export function iiViChordSymbol(key: NoteIndex, chord: ShellChord, notation: Notation, accidentals: Accidentals): string {
  return phrase(spellChord('major', key, chord.degree, true, accidentals).root, notation, QUALITY_SYMBOL[chord.quality]);
}

export function iiViTitle(q: IiViQuestion, notation: Notation, accidentals: Accidentals): string {
  const { key } = q.item;
  const de = iiViChordSymbol(key, q.from, notation, accidentals);
  const para = iiViChordSymbol(key, q.to, notation, accidentals);
  const tom = phrase(keySpelling('major', key, accidentals)[0], notation);
  return `${de} → ${para} · ii–V–I em ${tom}`;
}

/** `B e F`: 3ª e 7ª do acorde de destino. */
export function iiViTargetNames(q: IiViQuestion, notation: Notation, accidentals: Accidentals): string {
  const { third, seventh } = thirdAndSeventh(q.to, accidentals);
  return `${phrase(third, notation)} e ${phrase(seventh, notation)}`;
}

export function iiViDetail(q: IiViQuestion, notation: Notation, accidentals: Accidentals): string {
  const from = thirdAndSeventh(q.from, accidentals);
  const to = thirdAndSeventh(q.to, accidentals);
  return (
    `${phrase(from.seventh, notation)} (${funcOf(q.from, 3)}) desce meio tom para ${phrase(to.third, notation)} (${funcOf(q.to, 1)})` +
    ` · ${phrase(from.third, notation)} (${funcOf(q.from, 1)}) fica e vira a ${funcOf(q.to, 3)}`
  );
}
