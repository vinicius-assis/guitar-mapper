import type { QuizMode } from '../domain/quiz';

export const MODES: { mode: QuizMode; label: string }[] = [
  { mode: 'position-to-note', label: 'Posição → nota' },
  { mode: 'note-to-position', label: 'Nota → posição' },
  { mode: 'flashcard', label: 'Flashcard' },
];

export function modeLabel(mode: QuizMode): string {
  return MODES.find((m) => m.mode === mode)!.label;
}
