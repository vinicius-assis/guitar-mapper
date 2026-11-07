import { EXERCISE_META, QUIZ_MODES } from '../domain/exercises';
import type { EarDirectionSetting } from '../domain/earTraining';
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

export const EAR_INTERVAL_LEVEL_TEXT: Record<EarLevel, string> = {
  easy: 'Três intervalos bem diferentes: 3ª maior, 5ª justa e oitava.',
  medium: 'Sete intervalos, os mais comuns em melodias.',
  hard: 'Todos os 13, do uníssono à oitava.',
};

export const DEGREE_LEVEL_TEXT: Record<EarLevel, string> = {
  easy: 'Graus 1, 3 e 5, depois do arpejo da tônica.',
  medium: 'Graus 1 a 5, depois do arpejo da tônica.',
  hard: 'Os 7 graus, só com a tônica como referência.',
};

export const EAR_DIRECTION_LABELS: { value: EarDirectionSetting; label: string }[] = [
  { value: 'up', label: 'Sobe' },
  { value: 'down', label: 'Desce' },
  { value: 'both', label: 'Os dois' },
];

/** Atalhos dos botões de resposta de intervalos (até 13), na ordem dos botões. */
export const INTERVAL_SHORTCUTS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'q', 'w', 'e'];
