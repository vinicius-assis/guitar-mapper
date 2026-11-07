import { EXERCISE_META, QUIZ_MODES } from '../domain/exercises';
import { EAR_LISTEN_LIMIT, type EarLevel, type QuizMode } from '../domain/quiz';

export const MODES: { mode: QuizMode; label: string }[] = QUIZ_MODES.map((mode) => ({
  mode,
  label: EXERCISE_META[mode].label,
}));

export const MODE_DESCRIPTIONS = Object.fromEntries(
  QUIZ_MODES.map((mode) => [mode, EXERCISE_META[mode].description]),
) as Record<QuizMode, string>;

export const EAR_LEVELS: { level: EarLevel; label: 'Fácil' | 'Médio' | 'Difícil'; description: string }[] = [
  {
    level: 'easy',
    label: 'Fácil',
    description: '2 opções, com notas bem diferentes. Para começar a reconhecer o som.',
  },
  {
    level: 'medium',
    label: 'Médio',
    description: `4 opções, incluindo notas vizinhas. Você pode ouvir ${EAR_LISTEN_LIMIT.medium} vezes cada nota.`,
  },
  {
    level: 'hard',
    label: 'Difícil',
    description: `Sem dicas: todas as notas do seu foco são opções. Você pode ouvir ${EAR_LISTEN_LIMIT.hard} vezes cada nota.`,
  },
];

export function earLevelLabel(level: EarLevel): string {
  return EAR_LEVELS.find((l) => l.level === level)!.label;
}

export function modeLabel(mode: QuizMode): string {
  return MODES.find((m) => m.mode === mode)!.label;
}
