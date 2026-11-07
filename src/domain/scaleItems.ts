import { shuffled } from './earTraining';
import type { Instrument } from './instruments';
import type { NoteIndex } from './notes';
import { SCALES, isScaleId, scaleBox, type BoxNote, type ScaleId } from './scales';

/** Desenho escolhido (1..boxCount) ou todos. */
export type ScaleBoxSetting = number | 'all';

export function isScaleBoxSetting(value: unknown, scale: ScaleId): value is ScaleBoxSetting {
  return (
    value === 'all' ||
    (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= SCALES[scale].boxCount)
  );
}

export function scaleBoxes(scale: ScaleId, setting: ScaleBoxSetting): number[] {
  if (setting !== 'all') return [setting];
  return Array.from({ length: SCALES[scale].boxCount }, (_, i) => i + 1);
}

export interface ScaleDegreeItem {
  scale: ScaleId;
  box: number;
  string: number;
  degree: number;
}

export interface ScaleDegreeQuestion extends ScaleDegreeItem {
  root: NoteIndex;
}

export function scaleDegreePool(
  scale: ScaleId,
  setting: ScaleBoxSetting,
  instrument: Instrument,
): ScaleDegreeItem[] {
  const items: ScaleDegreeItem[] = [];
  for (const box of scaleBoxes(scale, setting)) {
    for (const note of scaleBox(scale, box, 0, instrument).notes) {
      if (note.degree === 0) continue;
      items.push({ scale, box, string: note.position.string, degree: note.degree });
    }
  }
  return items;
}

export function scaleDegreeKey(item: ScaleDegreeItem): string {
  return `scaledeg:${item.scale}:${item.box}:${item.string}:${item.degree}`;
}

const SCALE_DEGREE_KEY = /^scaledeg:([a-z-]+):([1-9]):([1-6]):([1-9])$/;
const SCALE_PLAY_KEY = /^scaleplay:([a-z-]+):(\d|1[01]):([1-9])$/;

export function isScaleDegreeKey(key: string): boolean {
  const match = SCALE_DEGREE_KEY.exec(key);
  if (!match || !isScaleId(match[1])) return false;
  const def = SCALES[match[1]];
  return Number(match[2]) <= def.boxCount && Number(match[4]) <= def.semitones.length - 1;
}

export function buildScaleDegreeQueue(
  items: readonly ScaleDegreeItem[],
  rng: () => number,
): ScaleDegreeQuestion[] {
  return shuffled(items, rng).map((item) => ({
    ...item,
    root: Math.min(11, Math.floor(rng() * 12)) as NoteIndex,
  }));
}

export function scaleDegreeTarget(question: ScaleDegreeQuestion, instrument: Instrument): BoxNote {
  const note = scaleBox(question.scale, question.box, question.root, instrument).notes.find(
    (n) => n.position.string === question.string && n.degree === question.degree,
  );
  if (!note) throw new Error(`no scale degree note: ${scaleDegreeKey(question)} root ${question.root}`);
  return note;
}

export interface ScalePlayItem {
  scale: ScaleId;
  root: NoteIndex;
  box: number;
}

export function scalePlayPool(scale: ScaleId, setting: ScaleBoxSetting): ScalePlayItem[] {
  const items: ScalePlayItem[] = [];
  for (let root = 0; root < 12; root++) {
    for (const box of scaleBoxes(scale, setting)) items.push({ scale, root: root as NoteIndex, box });
  }
  return items;
}

export function scalePlayKey(item: ScalePlayItem): string {
  return `scaleplay:${item.scale}:${item.root}:${item.box}`;
}

export function isScalePlayKey(key: string): boolean {
  const match = SCALE_PLAY_KEY.exec(key);
  return match !== null && isScaleId(match[1]) && Number(match[3]) <= SCALES[match[1]].boxCount;
}

export function buildScalePlayQueue(items: readonly ScalePlayItem[], rng: () => number): ScalePlayItem[] {
  return shuffled(items, rng);
}
