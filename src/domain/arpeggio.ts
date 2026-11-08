import { shuffled } from './earTraining';
import { chordSemitones } from './chords';
import type { Position } from './fretboard';
import type { ChordQuality } from './harmony';
import type { Instrument } from './instruments';
import type { NoteIndex } from './notes';
import { pitchOf } from './pitch';
import { SCALES, isScaleId, scaleBox, type BoxNote, type ScaleBox, type ScaleId } from './scales';
import type { ScalePlayItem } from './scaleItems';

/** Acorde construído sobre a tônica de cada escala. */
export const TONIC_CHORD: Record<ScaleId, ChordQuality> = {
  'pent-minor': 'min7',
  'pent-major': 'major',
  blues: 'min7',
  major: 'maj7',
  minor: 'min7',
  dorian: 'min7',
  phrygian: 'min7',
  lydian: 'maj7',
  mixolydian: 'dom7',
  locrian: 'half-dim',
};

export interface Arpeggio {
  box: ScaleBox;
  quality: ChordQuality;
  /** Notas do desenho que pertencem ao acorde. */
  notes: BoxNote[];
  pitches: ReadonlySet<number>;
  rootPitches: ReadonlySet<number>;
}

export function arpeggioOf(scale: ScaleId, box: number, root: NoteIndex, instrument: Instrument): Arpeggio {
  const quality = TONIC_CHORD[scale];
  const chord = chordSemitones(quality);
  const scaleBoxed = scaleBox(scale, box, root, instrument);
  const notes = scaleBoxed.notes.filter((n) => chord.includes((((n.pitch - root) % 12) + 12) % 12));
  return {
    box: scaleBoxed,
    quality,
    notes,
    pitches: new Set(notes.map((n) => n.pitch)),
    rootPitches: new Set(notes.filter((n) => (((n.pitch - root) % 12) + 12) % 12 === 0).map((n) => n.pitch)),
  };
}

export function isArpeggioTap(a: Arpeggio, p: Position, instrument: Instrument): boolean {
  return a.pitches.has(pitchOf(p, instrument));
}

export function arpeggioKey(item: ScalePlayItem): string {
  return `arp:${item.scale}:${item.root}:${item.box}`;
}

const ARP_KEY = /^arp:([a-z-]+):(\d|1[01]):([1-9])$/;

export function isArpeggioKey(key: string): boolean {
  const match = ARP_KEY.exec(key);
  return match !== null && isScaleId(match[1]) && Number(match[3]) <= SCALES[match[1]].boxCount;
}

export function buildArpeggioQueue(items: readonly ScalePlayItem[], rng: () => number): ScalePlayItem[] {
  return shuffled(items, rng);
}
