import type { QuizMode } from './quiz';

export type TrackId = 'braco' | 'ouvido' | 'teoria' | 'escalas' | 'harmonia' | 'acordes';

export interface ExerciseMeta {
  mode: QuizMode;
  track: TrackId;
  label: string;
  description: string;
  recordsPositionProgress: boolean;
  /** O exercício usa o cartão de Foco (cordas, casas, notas)? */
  usesFocus: boolean;
}

export const EXERCISE_META: Record<QuizMode, ExerciseMeta> = {
  'position-to-note': {
    mode: 'position-to-note',
    track: 'braco',
    label: 'Posição → nota',
    description:
      'Veja o ponto no braço e escolha a nota entre 4 opções. Treina o caminho da posição para o nome.',
    recordsPositionProgress: true,
    usesFocus: true,
  },
  'note-to-position': {
    mode: 'note-to-position',
    track: 'braco',
    label: 'Nota → posição',
    description:
      'O app pede uma nota numa corda e você toca no braço onde ela está. Treina o caminho inverso, do nome para a posição.',
    recordsPositionProgress: true,
    usesFocus: true,
  },
  flashcard: {
    mode: 'flashcard',
    track: 'braco',
    label: 'Flashcard',
    description:
      'Olhe o ponto e tente lembrar a nota de cabeça antes de revelar. Sem opções, e você mesmo diz se acertou. É o mais exigente.',
    recordsPositionProgress: true,
    usesFocus: true,
  },
  ear: {
    mode: 'ear',
    track: 'ouvido',
    label: 'Ouvido',
    description: 'Ouça uma nota e descubra qual é. Treina o ouvido, sem ver o braço até responder.',
    recordsPositionProgress: false,
    usesFocus: true,
  },
  'ear-interval': {
    mode: 'ear-interval',
    track: 'ouvido',
    label: 'Ouvir intervalos',
    description:
      'Ouça duas notas, uma depois da outra, e diga o intervalo entre elas. Treina reconhecer distâncias de ouvido.',
    recordsPositionProgress: false,
    usesFocus: false,
  },
  'ear-degree': {
    mode: 'ear-degree',
    track: 'ouvido',
    label: 'Ouvir graus',
    description:
      'O app toca a tônica de uma tonalidade e depois uma nota. Diga qual grau da escala maior ela é. A tonalidade muda a cada pergunta.',
    recordsPositionProgress: false,
    usesFocus: false,
  },
  interval: {
    mode: 'interval',
    track: 'teoria',
    label: 'Intervalos',
    description:
      'Veja uma nota e um intervalo e escolha a nota de chegada entre as 12. O braço mostra onde ela está.',
    recordsPositionProgress: false,
    usesFocus: true,
  },
  'scale-degree': {
    mode: 'scale-degree',
    track: 'escalas',
    label: 'Grau no desenho',
    description:
      'O braço mostra um desenho da escala com as tônicas marcadas e destaca uma nota. Diga qual grau ela é. Treina enxergar a função de cada nota no desenho.',
    recordsPositionProgress: false,
    usesFocus: false,
  },
  'scale-play': {
    mode: 'scale-play',
    track: 'escalas',
    label: 'Toque a escala',
    description:
      'O app pede uma escala e um desenho e marca as tônicas. Toque no braço todas as outras notas do desenho. Um toque fora da escala encerra a pergunta.',
    recordsPositionProgress: false,
    usesFocus: false,
  },
  'harmony-chord': {
    mode: 'harmony-chord',
    track: 'harmonia',
    label: 'Acorde do grau',
    description:
      'O app diz uma tonalidade e um grau, como o IV de Ré maior. Escolha a nota do acorde desse grau entre as 12. Treina montar o campo harmônico de cabeça.',
    recordsPositionProgress: false,
    usesFocus: false,
  },
  'harmony-degree': {
    mode: 'harmony-degree',
    track: 'harmonia',
    label: 'Grau do acorde',
    description:
      'O app mostra um acorde e uma tonalidade, como G em Ré maior. Diga qual grau ele é. Treina reconhecer a função dos acordes numa música.',
    recordsPositionProgress: false,
    usesFocus: false,
  },
  'harmony-quality': {
    mode: 'harmony-quality',
    track: 'harmonia',
    label: 'Qualidade do acorde',
    description:
      'O app diz um grau de uma tonalidade. Diga se o acorde dele é maior, menor ou diminuto (ou o tipo de tétrade). Treina a regra do campo harmônico.',
    recordsPositionProgress: false,
    usesFocus: false,
  },
  'chord-name': {
    mode: 'chord-name',
    track: 'acordes',
    label: 'Nome do acorde',
    description:
      'O braço mostra o desenho de um acorde, com as cordas soltas (○) e abafadas (×). Escolha o nome dele entre 4 opções. Só no violão.',
    recordsPositionProgress: false,
    usesFocus: false,
  },
  'chord-play': {
    mode: 'chord-play',
    track: 'acordes',
    label: 'Monte o acorde',
    description:
      'O app pede um acorde e a forma, aberta ou de pestana. Toque no braço as casas presas do desenho. Uma nota fora do acorde encerra a pergunta. Só no violão.',
    recordsPositionProgress: false,
    usesFocus: false,
  },
};

export const QUIZ_MODES: QuizMode[] = [
  'position-to-note',
  'note-to-position',
  'flashcard',
  'ear',
  'ear-interval',
  'ear-degree',
  'interval',
  'scale-degree',
  'scale-play',
  'harmony-chord',
  'harmony-degree',
  'harmony-quality',
  'chord-name',
  'chord-play',
];

export const TRACKS: { id: TrackId; label: string; modes: QuizMode[] }[] = [
  { id: 'braco', label: 'Braço', modes: ['position-to-note', 'note-to-position', 'flashcard'] },
  { id: 'ouvido', label: 'Ouvido', modes: ['ear', 'ear-interval', 'ear-degree'] },
  { id: 'teoria', label: 'Teoria', modes: ['interval'] },
  { id: 'escalas', label: 'Escalas', modes: ['scale-degree', 'scale-play'] },
  { id: 'harmonia', label: 'Harmonia', modes: ['harmony-chord', 'harmony-degree', 'harmony-quality'] },
  { id: 'acordes', label: 'Acordes', modes: ['chord-name', 'chord-play'] },
];
