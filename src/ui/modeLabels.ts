import type { EarLevel, QuizMode } from '../domain/quiz';

export const MODES: { mode: QuizMode; label: string }[] = [
  { mode: 'position-to-note', label: 'Posição → nota' },
  { mode: 'note-to-position', label: 'Nota → posição' },
  { mode: 'flashcard', label: 'Flashcard' },
  { mode: 'ear', label: 'Ouvido' },
];

export const MODE_DESCRIPTIONS: Record<QuizMode, string> = {
  'position-to-note':
    'Veja o ponto no braço e escolha a nota entre 4 opções. Treina o caminho da posição para o nome.',
  'note-to-position':
    'O app pede uma nota numa corda e você toca no braço onde ela está. Treina o caminho inverso, do nome para a posição.',
  flashcard:
    'Olhe o ponto e tente lembrar a nota de cabeça antes de revelar. Sem opções, e você mesmo diz se acertou. É o mais exigente.',
  ear: 'Ouça uma nota de violão e descubra qual é. Treina o ouvido, sem ver o braço até responder.',
};

export const EAR_LEVELS: { level: EarLevel; label: 'Fácil' | 'Médio' | 'Difícil'; description: string }[] = [
  {
    level: 'easy',
    label: 'Fácil',
    description: '2 opções, com notas bem diferentes. Para começar a reconhecer o som.',
  },
  {
    level: 'medium',
    label: 'Médio',
    description: '4 opções, incluindo notas vizinhas. Pede mais atenção ao ouvir.',
  },
  {
    level: 'hard',
    label: 'Difícil',
    description: 'Sem dicas: todas as notas do seu foco são opções.',
  },
];

export function earLevelLabel(level: EarLevel): string {
  return EAR_LEVELS.find((l) => l.level === level)!.label;
}

export function modeLabel(mode: QuizMode): string {
  return MODES.find((m) => m.mode === mode)!.label;
}
