import type { QuizMode } from './quiz';

export type TrackId = 'braco' | 'ouvido' | 'teoria';

export interface ExerciseMeta {
  mode: QuizMode;
  track: TrackId;
  label: string;
  description: string;
  recordsPositionProgress: boolean;
}

export const EXERCISE_META: Record<QuizMode, ExerciseMeta> = {
  'position-to-note': {
    mode: 'position-to-note',
    track: 'braco',
    label: 'Posição → nota',
    description:
      'Veja o ponto no braço e escolha a nota entre 4 opções. Treina o caminho da posição para o nome.',
    recordsPositionProgress: true,
  },
  'note-to-position': {
    mode: 'note-to-position',
    track: 'braco',
    label: 'Nota → posição',
    description:
      'O app pede uma nota numa corda e você toca no braço onde ela está. Treina o caminho inverso, do nome para a posição.',
    recordsPositionProgress: true,
  },
  flashcard: {
    mode: 'flashcard',
    track: 'braco',
    label: 'Flashcard',
    description:
      'Olhe o ponto e tente lembrar a nota de cabeça antes de revelar. Sem opções, e você mesmo diz se acertou. É o mais exigente.',
    recordsPositionProgress: true,
  },
  ear: {
    mode: 'ear',
    track: 'ouvido',
    label: 'Ouvido',
    description: 'Ouça uma nota e descubra qual é. Treina o ouvido, sem ver o braço até responder.',
    recordsPositionProgress: false,
  },
  interval: {
    mode: 'interval',
    track: 'teoria',
    label: 'Intervalos',
    description:
      'Veja uma nota e um intervalo e escolha a nota de chegada entre as 12. O braço mostra onde ela está.',
    recordsPositionProgress: false,
  },
};

export const QUIZ_MODES: QuizMode[] = ['position-to-note', 'note-to-position', 'flashcard', 'ear', 'interval'];

export const TRACKS: { id: TrackId; label: string; modes: QuizMode[] }[] = [
  { id: 'braco', label: 'Braço', modes: ['position-to-note', 'note-to-position', 'flashcard'] },
  { id: 'ouvido', label: 'Ouvido', modes: ['ear'] },
  { id: 'teoria', label: 'Teoria', modes: ['interval'] },
];
