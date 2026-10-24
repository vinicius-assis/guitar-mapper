import {
  MAX_FRET,
  STRING_COUNT,
  noteAt,
  positionsInFilter,
  type Filter,
  type Position,
} from './fretboard';
import { ALL_NOTES, NATURAL_NOTES, type NoteIndex } from './notes';
import { STANDARD_TUNING } from './tuning';

export type QuizMode = 'position-to-note' | 'note-to-position' | 'flashcard';

export const OPTION_COUNT = 4;

export interface ChoiceQuestion {
  position: Position;
  answer: NoteIndex;
  options: NoteIndex[];
}

export interface FindQuestion {
  string: number;
  target: NoteIndex;
  validPositions: Position[];
}

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function buildChoiceQuestion(
  position: Position,
  naturalsOnly: boolean,
  rng: () => number,
  tuning: readonly NoteIndex[] = STANDARD_TUNING,
): ChoiceQuestion {
  const answer = noteAt(position, tuning);
  const allowed = naturalsOnly ? NATURAL_NOTES : ALL_NOTES;
  const { string, fret } = position;

  const neighbours: Position[] = [
    { string, fret: fret - 1 },
    { string, fret: fret + 1 },
    { string, fret: fret - 2 },
    { string, fret: fret + 2 },
    { string: string - 1, fret },
    { string: string + 1, fret },
  ].filter((p) => p.string >= 1 && p.string <= STRING_COUNT && p.fret >= 0 && p.fret <= MAX_FRET);

  const distractors: NoteIndex[] = [];
  for (const n of neighbours) {
    const note = noteAt(n, tuning);
    if (note !== answer && allowed.includes(note) && !distractors.includes(note)) {
      distractors.push(note);
    }
  }
  for (const note of shuffle(allowed, rng)) {
    if (distractors.length >= OPTION_COUNT - 1) break;
    if (note !== answer && !distractors.includes(note)) distractors.push(note);
  }

  const options = shuffle([answer, ...distractors.slice(0, OPTION_COUNT - 1)], rng);
  return { position, answer, options };
}

export function buildFindQuestion(
  position: Position,
  filter: Filter,
  tuning: readonly NoteIndex[] = STANDARD_TUNING,
): FindQuestion {
  const target = noteAt(position, tuning);
  // A janela inclui a própria posição sorteada, mesmo que esteja fora do filtro
  // (ex.: aberta a partir do mapa de Progresso).
  const stringOnly: Filter = {
    strings: [position.string],
    fretMin: Math.min(filter.fretMin, position.fret),
    fretMax: Math.max(filter.fretMax, position.fret),
    naturalsOnly: false,
  };
  const validPositions = positionsInFilter(stringOnly, tuning).filter(
    (p) => noteAt(p, tuning) === target,
  );
  return { string: position.string, target, validPositions };
}

export function isCorrectFind(question: FindQuestion, tapped: Position): boolean {
  return question.validPositions.some((p) => p.string === tapped.string && p.fret === tapped.fret);
}
