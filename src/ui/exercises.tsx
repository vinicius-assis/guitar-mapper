import type { ComponentType } from 'react';
import { EXERCISE_META, type ExerciseMeta } from '../domain/exercises';
import { positionKey, type Position } from '../domain/fretboard';
import type { Instrument } from '../domain/instruments';
import {
  buildIntervalQueue,
  intervalById,
  intervalItems,
  intervalPitches,
  shuffleIntervalItems,
  type IntervalItem,
} from '../domain/intervals';
import { ALL_NOTES, NATURAL_NOTES } from '../domain/notes';
import { pitchOf, uniquePitchPositions } from '../domain/pitch';
import { selectForReview } from '../domain/review';
import type { ProgressMap } from '../domain/scheduler';
import type { QuizMode } from '../domain/quiz';
import { buildQueue } from '../domain/session';
import type { useSound } from '../audio/SoundProvider';
import { useAppState } from '../state/AppState';
import type { Settings } from '../state/storage';
import { EAR_LEVELS } from './modeLabels';
import { ChoiceQuiz } from './screens/ChoiceQuiz';
import { EarQuiz } from './screens/EarQuiz';
import { FindQuiz } from './screens/FindQuiz';
import { Flashcard } from './screens/Flashcard';
import { IntervalQuiz } from './screens/IntervalQuiz';

export type QuizItem = Position | IntervalItem;

export interface ExerciseContext {
  settings: Settings;
  instrument: Instrument;
  candidates: Position[];
  rng: () => number;
  /** Progresso por item: com `limit`, a fila vira uma seleção de revisão. */
  progress?: ProgressMap;
  /** Instante da seleção (ms); ausente usa `Date.now()`. */
  now?: number;
  /** Tamanho máximo da fila quando há `progress`. */
  limit?: number;
}

export interface ExerciseQuizProps {
  item: QuizItem;
  settings: Settings;
  onAnswer(correct: boolean): void;
  onNext(): void;
}

type Sound = ReturnType<typeof useSound>;

export interface Exercise extends ExerciseMeta {
  /** Chave estável do item (gancho para o progresso por item). */
  itemKey(item: QuizItem, instrument: Instrument): string;
  questionCount(ctx: ExerciseContext): number;
  /** Mensagens que impedem o início; vazio = pode iniciar. */
  startBlockers(ctx: ExerciseContext): string[];
  /** Uma posição vinda do Progresso já inicia a sessão? */
  startsFromPosition(ctx: ExerciseContext): boolean;
  /** Controles extras na tela de início. */
  Options?: ComponentType;
  buildQueue(ctx: ExerciseContext, forced?: Position | null): QuizItem[];
  prepareSound(sound: Sound, items: QuizItem[], instrument: Instrument): void;
  Quiz: ComponentType<ExerciseQuizProps>;
}

const NO_POSITION =
  'Nenhuma posição no foco atual. Abra o Foco abaixo e selecione ao menos uma corda ou inclua notas com acidentais.';
const EAR_WITHOUT_SOUND = 'Ligue o Som em Ajustes para treinar de ouvido.';
const NO_INTERVAL = 'Nenhum intervalo no foco. Abra o Foco e marque ao menos um intervalo.';

const positionItemKey = (item: QuizItem) => positionKey(item as Position);
const earItemKey = (item: QuizItem, instrument: Instrument) =>
  `ear:${pitchOf(item as Position, instrument)}`;
const intervalItemKey = (item: QuizItem) => {
  const { root, interval } = item as IntervalItem;
  return `interval:${root}:${interval}`;
};

/** Com `progress` e `limit`, escolhe até `limit` itens do pool por `selectForReview`; senão, o pool todo. */
function reviewSubset<T>(ctx: ExerciseContext, pool: T[], keyOf: (item: T) => string, limit?: number): T[] {
  const max = limit ?? ctx.limit;
  if (!ctx.progress || max === undefined) return pool;
  return selectForReview(pool, {
    keyOf,
    progress: ctx.progress,
    now: ctx.now ?? Date.now(),
    rng: ctx.rng,
    limit: Math.max(0, max),
  });
}

/**
 * Pool das posições na fila de revisão: sem a forçada (e, no Ouvido, sem a mesma altura dela).
 * Sem `progress`/`limit`, devolve `candidates` intacto (comportamento antigo).
 */
function positionPool(
  ctx: ExerciseContext,
  forced: Position | null,
  ear: boolean,
): Position[] {
  if (!ctx.progress || ctx.limit === undefined) return ctx.candidates;
  const base = ear ? uniquePitchPositions(ctx.candidates, ctx.instrument) : ctx.candidates;
  const forcedKey = forced ? positionKey(forced) : null;
  const forcedPitch = forced ? pitchOf(forced, ctx.instrument) : null;
  const pool = base.filter((p) =>
    ear ? pitchOf(p, ctx.instrument) !== forcedPitch : positionKey(p) !== forcedKey,
  );
  const keyOf = ear ? (p: Position) => earItemKey(p, ctx.instrument) : positionKey;
  return reviewSubset(ctx, pool, keyOf, ctx.limit - (forced ? 1 : 0));
}

/** Um quiz de posição recebe a posição em vez do item genérico. */
function positionQuiz(
  Component: ComponentType<{ position: Position } & Omit<ExerciseQuizProps, 'item'>>,
): ComponentType<ExerciseQuizProps> {
  return function PositionQuiz({ item, ...rest }: ExerciseQuizProps) {
    return <Component position={item as Position} {...rest} />;
  };
}

function positionExercise(
  mode: 'position-to-note' | 'note-to-position' | 'flashcard',
  Quiz: ComponentType<ExerciseQuizProps>,
): Exercise {
  return {
    ...EXERCISE_META[mode],
    itemKey: positionItemKey,
    questionCount: (ctx) => ctx.candidates.length,
    startBlockers: (ctx) => (ctx.candidates.length === 0 ? [NO_POSITION] : []),
    startsFromPosition: () => true,
    buildQueue: (ctx, forced = null) =>
      buildQueue(positionPool(ctx, forced, false), ctx.rng, forced, {
        avoidSameNote: false,
        uniquePitch: false,
        instrument: ctx.instrument,
      }),
    prepareSound: (sound, items) => sound.prepare(items as Position[]),
    Quiz,
  };
}

function EarOptions() {
  const { data, updateSettings } = useAppState();
  const { earLevel } = data.settings;
  return (
    <>
      <div className="level-bar" role="group" aria-label="Nível">
        {EAR_LEVELS.map(({ level, label }) => (
          <button
            key={level}
            type="button"
            aria-pressed={earLevel === level}
            onClick={() => updateSettings({ earLevel: level })}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="mode-description">{EAR_LEVELS.find((l) => l.level === earLevel)!.description}</p>
    </>
  );
}

const ear: Exercise = {
  ...EXERCISE_META.ear,
  itemKey: earItemKey,
  // Ouvido pergunta cada som uma vez (o mesmo som em cordas diferentes não é outra pergunta).
  questionCount: (ctx) => uniquePitchPositions(ctx.candidates, ctx.instrument).length,
  startBlockers: (ctx) => [
    ...(ctx.settings.soundEnabled ? [] : [EAR_WITHOUT_SOUND]),
    ...(ctx.candidates.length === 0 ? [NO_POSITION] : []),
  ],
  // Ouvido precisa de som: sem ele, uma posição vinda do Progresso não inicia a sessão.
  startsFromPosition: (ctx) => ctx.settings.soundEnabled,
  Options: EarOptions,
  buildQueue: (ctx, forced = null) =>
    buildQueue(positionPool(ctx, forced, true), ctx.rng, forced, {
      avoidSameNote: true,
      uniquePitch: true,
      instrument: ctx.instrument,
    }),
  prepareSound: (sound, items) => sound.prepare(items as Position[]),
  Quiz: positionQuiz(EarQuiz),
};

function intervalRoots(settings: Settings) {
  return settings.filter.naturalsOnly ? NATURAL_NOTES : ALL_NOTES;
}

const interval: Exercise = {
  ...EXERCISE_META.interval,
  itemKey: intervalItemKey,
  // A mesma conta do Foco (useIntervalFocus): notas do foco × intervalos marcados.
  questionCount: (ctx) => intervalRoots(ctx.settings).length * ctx.settings.intervals.length,
  startBlockers: (ctx) => (ctx.settings.intervals.length === 0 ? [NO_INTERVAL] : []),
  startsFromPosition: () => false,
  buildQueue: (ctx) => {
    const roots = intervalRoots(ctx.settings);
    if (!ctx.progress || ctx.limit === undefined) {
      return buildIntervalQueue(roots, ctx.settings.intervals, ctx.rng);
    }
    // A seleção vem agrupada (vencidos, novos, resto): embaralhar remove essa ordem.
    const selected = reviewSubset(ctx, intervalItems(roots, ctx.settings.intervals), intervalItemKey);
    return shuffleIntervalItems(selected, ctx.rng);
  },
  prepareSound: (sound, items, instrument) =>
    sound.preparePitches(
      (items as IntervalItem[]).flatMap((item) =>
        intervalPitches(item.root, intervalById(item.interval), instrument),
      ),
    ),
  Quiz: function IntervalExerciseQuiz({ item, ...rest }: ExerciseQuizProps) {
    return <IntervalQuiz item={item as IntervalItem} {...rest} />;
  },
};

export const EXERCISES: Record<QuizMode, Exercise> = {
  'position-to-note': positionExercise('position-to-note', positionQuiz(ChoiceQuiz)),
  'note-to-position': positionExercise('note-to-position', positionQuiz(FindQuiz)),
  flashcard: positionExercise('flashcard', positionQuiz(Flashcard)),
  ear,
  interval,
};

export function exerciseFor(mode: QuizMode): Exercise {
  return EXERCISES[mode];
}
