import type { QuizMode } from '../domain/quiz';

export const MODES: { mode: QuizMode; label: string }[] = [
  { mode: 'position-to-note', label: 'Posição → nota' },
  { mode: 'note-to-position', label: 'Nota → posição' },
  { mode: 'flashcard', label: 'Flashcard' },
];

export const MODE_DESCRIPTIONS: Record<QuizMode, string> = {
  'position-to-note':
    'Veja o ponto no braço e escolha a nota entre 4 opções. Treina o caminho da posição para o nome.',
  'note-to-position':
    'O app pede uma nota numa corda e você toca no braço onde ela está. Treina o caminho inverso, do nome para a posição.',
  flashcard:
    'Olhe o ponto e tente lembrar a nota de cabeça antes de revelar. Sem opções, e você mesmo diz se acertou. É o mais exigente.',
};

export function modeLabel(mode: QuizMode): string {
  return MODES.find((m) => m.mode === mode)!.label;
}
