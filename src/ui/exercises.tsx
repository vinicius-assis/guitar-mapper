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
import {
  buildDegreeQueue,
  buildEarIntervalQueue,
  degreeKey,
  degreePool,
  degreeTarget,
  earIntervalKey,
  earIntervalPool,
  type DegreeQuestion,
  type EarIntervalQuestion,
} from '../domain/earTraining';
import {
  buildChordNameQueue,
  buildChordPlayQueue,
  chordNameKey,
  chordPlayKey,
  chordPool,
  type ChordItem,
  type ChordKindSetting,
  type ChordNameQuestion,
  type ChordShapeSetting,
} from '../domain/chordItems';
import { chordVoicing, voicingPitches } from '../domain/chords';
import { arpeggioKey, buildArpeggioQueue } from '../domain/arpeggio';
import { buildGuideQueue, guideKey, guidePool } from '../domain/guideTones';
import { buildIiViQueue, iiViKey, iiViPool, iiViQuestion, type IiViItem } from '../domain/progressions';
import { buildDictationQueue, dictationKey, dictationPool, type DictationQuestion } from '../domain/dictation';
import { chordPitches, type HarmonyFieldSetting } from '../domain/harmony';
import {
  buildHarmonyQueue,
  buildQualityQueue,
  harmonyChordKey,
  harmonyDegreeKey,
  harmonyPool,
  qualityKey,
  qualityPool,
  type HarmonyItem,
  type QualityQuestion,
} from '../domain/harmonyItems';
import {
  buildScaleDegreeQueue,
  buildScalePlayQueue,
  scaleDegreeKey,
  scaleDegreePool,
  scaleDegreeTarget,
  scalePlayKey,
  scalePlayPool,
  type ScaleDegreeQuestion,
  type ScalePlayItem,
} from '../domain/scaleItems';
import { SCALES, SCALE_GROUPS, scaleBox, type ScaleId } from '../domain/scales';
import { ALL_NOTES, NATURAL_NOTES } from '../domain/notes';
import { pitchOf, uniquePitchPositions } from '../domain/pitch';
import { selectForReview } from '../domain/review';
import type { ProgressMap } from '../domain/scheduler';
import type { EarLevel, QuizMode } from '../domain/quiz';
import { buildQueue } from '../domain/session';
import type { useSound } from '../audio/SoundProvider';
import { useAppState } from '../state/AppState';
import type { Settings } from '../state/storage';
import {
  DEGREE_LEVEL_TEXT,
  DICTATION_LEVEL_TEXT,
  EAR_DIRECTION_LABELS,
  EAR_INTERVAL_LEVEL_TEXT,
  EAR_LEVELS,
} from './modeLabels';
import { DegreeQuiz } from './screens/DegreeQuiz';
import { EarIntervalQuiz } from './screens/EarIntervalQuiz';
import { ChoiceQuiz } from './screens/ChoiceQuiz';
import { EarQuiz } from './screens/EarQuiz';
import { FindQuiz } from './screens/FindQuiz';
import { Flashcard } from './screens/Flashcard';
import { IntervalQuiz } from './screens/IntervalQuiz';
import { ChordNameQuiz } from './screens/ChordNameQuiz';
import { ChordPlayQuiz } from './screens/ChordPlayQuiz';
import { HarmonyChordQuiz } from './screens/HarmonyChordQuiz';
import { HarmonyDegreeQuiz } from './screens/HarmonyDegreeQuiz';
import { HarmonyQualityQuiz } from './screens/HarmonyQualityQuiz';
import { HARMONY_KEY_TEXT } from './harmonyText';
import { ScaleDegreeQuiz } from './screens/ScaleDegreeQuiz';
import { ScalePlayQuiz } from './screens/ScalePlayQuiz';
import { ArpeggioQuiz } from './screens/ArpeggioQuiz';
import { GuideToneQuiz } from './screens/GuideToneQuiz';
import { IiViQuiz } from './screens/IiViQuiz';
import { DictationQuiz } from './screens/DictationQuiz';

export type QuizItem = Position | IntervalItem | EarIntervalQuestion | DegreeQuestion | ScaleDegreeQuestion | ScalePlayItem | HarmonyItem | QualityQuestion | ChordItem | ChordNameQuestion | IiViItem | DictationQuestion;

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
  /** Nível a gravar no histórico da sessão (só os modos de Ouvido). */
  historyLevel?(settings: Settings): EarLevel;
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

function LevelBar({ value, onChange }: { value: EarLevel; onChange(level: EarLevel): void }) {
  return (
    <div className="level-bar" role="group" aria-label="Nível">
      {EAR_LEVELS.map(({ level, label }) => (
        <button key={level} type="button" aria-pressed={value === level} onClick={() => onChange(level)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function EarIntervalOptions() {
  const { data, updateSettings } = useAppState();
  const { earIntervalLevel, earIntervalDirection } = data.settings;
  return (
    <>
      <LevelBar value={earIntervalLevel} onChange={(level) => updateSettings({ earIntervalLevel: level })} />
      <p className="mode-description">{EAR_INTERVAL_LEVEL_TEXT[earIntervalLevel]}</p>
      <div className="level-bar" role="group" aria-label="Direção">
        {EAR_DIRECTION_LABELS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={earIntervalDirection === value}
            onClick={() => updateSettings({ earIntervalDirection: value })}
          >
            {label}
          </button>
        ))}
      </div>
    </>
  );
}

function DegreeOptions() {
  const { data, updateSettings } = useAppState();
  const { degreeLevel } = data.settings;
  return (
    <>
      <LevelBar value={degreeLevel} onChange={(level) => updateSettings({ degreeLevel: level })} />
      <p className="mode-description">{DEGREE_LEVEL_TEXT[degreeLevel]}</p>
    </>
  );
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
  historyLevel: (settings) => settings.earLevel,
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

const earIntervalPoolOf = (settings: Settings) =>
  earIntervalPool(settings.earIntervalLevel, settings.earIntervalDirection);

const earIntervalExercise: Exercise = {
  ...EXERCISE_META['ear-interval'],
  itemKey: (item) => earIntervalKey(item as EarIntervalQuestion),
  questionCount: (ctx) => earIntervalPoolOf(ctx.settings).length,
  startBlockers: (ctx) => (ctx.settings.soundEnabled ? [] : [EAR_WITHOUT_SOUND]),
  startsFromPosition: () => false,
  historyLevel: (settings) => settings.earIntervalLevel,
  Options: EarIntervalOptions,
  buildQueue: (ctx) =>
    buildEarIntervalQueue(
      reviewSubset(ctx, earIntervalPoolOf(ctx.settings), earIntervalKey),
      ctx.instrument,
      ctx.rng,
    ),
  prepareSound: (sound, items) =>
    sound.preparePitches((items as EarIntervalQuestion[]).flatMap((q) => q.pitches)),
  Quiz: function EarIntervalExerciseQuiz({ item, ...rest }: ExerciseQuizProps) {
    return <EarIntervalQuiz question={item as EarIntervalQuestion} {...rest} />;
  },
};

const earDegree: Exercise = {
  ...EXERCISE_META['ear-degree'],
  itemKey: (item) => degreeKey(item as DegreeQuestion),
  questionCount: (ctx) => degreePool(ctx.settings.degreeLevel).length,
  startBlockers: (ctx) => (ctx.settings.soundEnabled ? [] : [EAR_WITHOUT_SOUND]),
  startsFromPosition: () => false,
  historyLevel: (settings) => settings.degreeLevel,
  Options: DegreeOptions,
  buildQueue: (ctx) =>
    buildDegreeQueue(
      reviewSubset(ctx, degreePool(ctx.settings.degreeLevel), degreeKey),
      ctx.instrument,
      ctx.rng,
    ),
  // O nível não chega aqui: carrega as alturas dos níveis Fácil/Médio (o Difícil usa um subconjunto).
  prepareSound: (sound, items) =>
    sound.preparePitches(
      (items as DegreeQuestion[]).flatMap((q) => [
        q.tonicMidi,
        q.tonicMidi + 4,
        q.tonicMidi + 7,
        degreeTarget(q),
      ]),
    ),
  Quiz: function DegreeExerciseQuiz({ item, ...rest }: ExerciseQuizProps) {
    return <DegreeQuiz question={item as DegreeQuestion} {...rest} />;
  },
};

function ScaleOptions() {
  const { data, updateSettings } = useAppState();
  const { scale, scaleBox: box } = data.settings;
  const boxCount = SCALES[scale].boxCount;
  const boxes: { value: number | 'all'; label: string }[] = [
    { value: 'all', label: 'Todos' },
    ...Array.from({ length: boxCount }, (_, i) => ({ value: i + 1, label: String(i + 1) })),
  ];
  return (
    <>
      <label>
        Escala
        <select
          value={scale}
          onChange={(e) => {
            const next = e.target.value as ScaleId;
            updateSettings({
              scale: next,
              ...(typeof box === 'number' && box > SCALES[next].boxCount ? { scaleBox: 1 } : {}),
            });
          }}
        >
          {SCALE_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.scales.map((id) => (
                <option key={id} value={id}>
                  {SCALES[id].label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <div className="level-bar" role="group" aria-label="Desenho">
        {boxes.map(({ value, label }) => (
          <button
            key={label}
            type="button"
            aria-pressed={box === value}
            onClick={() => updateSettings({ scaleBox: value })}
          >
            {label}
          </button>
        ))}
      </div>
    </>
  );
}

const scaleDegree: Exercise = {
  ...EXERCISE_META['scale-degree'],
  itemKey: (item) => scaleDegreeKey(item as ScaleDegreeQuestion),
  questionCount: (ctx) =>
    scaleDegreePool(ctx.settings.scale, ctx.settings.scaleBox, ctx.instrument).length,
  startBlockers: () => [],
  startsFromPosition: () => false,
  Options: ScaleOptions,
  buildQueue: (ctx) =>
    buildScaleDegreeQueue(
      reviewSubset(
        ctx,
        scaleDegreePool(ctx.settings.scale, ctx.settings.scaleBox, ctx.instrument),
        scaleDegreeKey,
      ),
      ctx.rng,
    ),
  prepareSound: (sound, items, instrument) =>
    sound.prepare((items as ScaleDegreeQuestion[]).map((q) => scaleDegreeTarget(q, instrument).position)),
  Quiz: function ScaleDegreeExerciseQuiz({ item, ...rest }: ExerciseQuizProps) {
    return <ScaleDegreeQuiz question={item as ScaleDegreeQuestion} {...rest} />;
  },
};

const scalePlay: Exercise = {
  ...EXERCISE_META['scale-play'],
  itemKey: (item) => scalePlayKey(item as ScalePlayItem),
  questionCount: (ctx) => scalePlayPool(ctx.settings.scale, ctx.settings.scaleBox).length,
  startBlockers: () => [],
  startsFromPosition: () => false,
  Options: ScaleOptions,
  buildQueue: (ctx) =>
    buildScalePlayQueue(
      reviewSubset(ctx, scalePlayPool(ctx.settings.scale, ctx.settings.scaleBox), scalePlayKey),
      ctx.rng,
    ),
  prepareSound: (sound, items, instrument) =>
    sound.prepare(
      (items as ScalePlayItem[]).flatMap((q) =>
        scaleBox(q.scale, q.box, q.root, instrument).notes.map((n) => n.position),
      ),
    ),
  Quiz: function ScalePlayExerciseQuiz({ item, ...rest }: ExerciseQuizProps) {
    return <ScalePlayQuiz question={item as ScalePlayItem} {...rest} />;
  },
};

const FIELD_OPTIONS: { value: HarmonyFieldSetting; label: string }[] = [
  { value: 'major', label: 'Maior' },
  { value: 'minor', label: 'Menor' },
  { value: 'both', label: 'Os dois' },
];
const CHORD_OPTIONS = [
  { value: false, label: 'Tríades' },
  { value: true, label: 'Tétrades' },
];
const KEY_OPTIONS = [
  { value: 'easy', label: 'Fáceis' },
  { value: 'medium', label: 'Médias' },
  { value: 'all', label: 'Todas' },
] as const;

function HarmonyOptions() {
  const { data, updateSettings } = useAppState();
  const { harmonyField, harmonySevenths, harmonyKeys } = data.settings;
  return (
    <>
      <div className="level-bar" role="group" aria-label="Campo">
        {FIELD_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={harmonyField === value}
            onClick={() => updateSettings({ harmonyField: value })}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="level-bar" role="group" aria-label="Acordes">
        {CHORD_OPTIONS.map(({ value, label }) => (
          <button
            key={label}
            type="button"
            aria-pressed={harmonySevenths === value}
            onClick={() => updateSettings({ harmonySevenths: value })}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="level-bar" role="group" aria-label="Tonalidades">
        {KEY_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={harmonyKeys === value}
            onClick={() => updateSettings({ harmonyKeys: value })}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="mode-description">{HARMONY_KEY_TEXT[harmonyKeys]}</p>
    </>
  );
}

const chordItemPitches = (items: HarmonyItem[], sevenths: boolean, instrument: Instrument) =>
  items.flatMap((q) => chordPitches(q.field, q.key, q.degree, sevenths, instrument));

const harmonyChord: Exercise = {
  ...EXERCISE_META['harmony-chord'],
  itemKey: (item) => harmonyChordKey(item as HarmonyItem),
  questionCount: (ctx) => harmonyPool(ctx.settings.harmonyField, ctx.settings.harmonyKeys).length,
  startBlockers: () => [],
  startsFromPosition: () => false,
  Options: HarmonyOptions,
  buildQueue: (ctx) =>
    buildHarmonyQueue(
      reviewSubset(ctx, harmonyPool(ctx.settings.harmonyField, ctx.settings.harmonyKeys), harmonyChordKey),
      ctx.rng,
    ),
  prepareSound: (sound, items, instrument) =>
    sound.preparePitches(chordItemPitches(items as HarmonyItem[], true, instrument)),
  Quiz: function HarmonyChordExerciseQuiz({ item, ...rest }: ExerciseQuizProps) {
    return <HarmonyChordQuiz item={item as HarmonyItem} {...rest} />;
  },
};

const harmonyDegree: Exercise = {
  ...harmonyChord,
  ...EXERCISE_META['harmony-degree'],
  itemKey: (item) => harmonyDegreeKey(item as HarmonyItem),
  buildQueue: (ctx) =>
    buildHarmonyQueue(
      reviewSubset(ctx, harmonyPool(ctx.settings.harmonyField, ctx.settings.harmonyKeys), harmonyDegreeKey),
      ctx.rng,
    ),
  Quiz: function HarmonyDegreeExerciseQuiz({ item, ...rest }: ExerciseQuizProps) {
    return <HarmonyDegreeQuiz item={item as HarmonyItem} {...rest} />;
  },
};

const harmonyQuality: Exercise = {
  ...EXERCISE_META['harmony-quality'],
  itemKey: (item) => qualityKey(item as QualityQuestion),
  questionCount: (ctx) => qualityPool(ctx.settings.harmonyField, ctx.settings.harmonySevenths).length,
  startBlockers: () => [],
  startsFromPosition: () => false,
  Options: HarmonyOptions,
  buildQueue: (ctx) =>
    buildQualityQueue(
      reviewSubset(ctx, qualityPool(ctx.settings.harmonyField, ctx.settings.harmonySevenths), qualityKey),
      ctx.settings.harmonyKeys,
      ctx.rng,
    ),
  prepareSound: (sound, items, instrument) =>
    sound.preparePitches(
      (items as QualityQuestion[]).flatMap((q) =>
        chordPitches(q.field, q.key, q.degree, q.sevenths, instrument),
      ),
    ),
  Quiz: function HarmonyQualityExerciseQuiz({ item, ...rest }: ExerciseQuizProps) {
    return <HarmonyQualityQuiz question={item as QualityQuestion} {...rest} />;
  },
};

const BASS_NO_CHORDS = 'Acordes são só para violão. Troque para Violão em Ajustes.';
const SHAPE_OPTIONS: { value: ChordShapeSetting; label: string }[] = [
  { value: 'open', label: 'Abertas' },
  { value: 'barre', label: 'Pestana' },
  { value: 'all', label: 'Todas' },
];
const KIND_OPTIONS: { value: ChordKindSetting; label: string }[] = [
  { value: 'triads', label: 'Tríades' },
  { value: 'sevenths', label: 'Tétrades' },
  { value: 'both', label: 'Todos' },
];

function ChordOptions() {
  const { data, updateSettings } = useAppState();
  const { chordShapes, chordKinds } = data.settings;
  return (
    <>
      <div className="level-bar" role="group" aria-label="Formas">
        {SHAPE_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={chordShapes === value}
            onClick={() => updateSettings({ chordShapes: value })}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="level-bar" role="group" aria-label="Acordes">
        {KIND_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={chordKinds === value}
            onClick={() => updateSettings({ chordKinds: value })}
          >
            {label}
          </button>
        ))}
      </div>
    </>
  );
}

const chordItemsPitches = (items: ChordItem[]) =>
  items.flatMap((i) => voicingPitches(chordVoicing(i.shape, i.root)));

const chordName: Exercise = {
  ...EXERCISE_META['chord-name'],
  itemKey: (item) => chordNameKey(item as ChordItem),
  questionCount: (ctx) =>
    ctx.instrument.id === 'bass' ? 0 : chordPool(ctx.settings.chordShapes, ctx.settings.chordKinds).length,
  startBlockers: (ctx) => (ctx.instrument.id === 'bass' ? [BASS_NO_CHORDS] : []),
  startsFromPosition: () => false,
  Options: ChordOptions,
  buildQueue: (ctx) =>
    buildChordNameQueue(
      reviewSubset(ctx, chordPool(ctx.settings.chordShapes, ctx.settings.chordKinds), chordNameKey),
      ctx.rng,
    ),
  prepareSound: (sound, items) => sound.preparePitches(chordItemsPitches(items as ChordItem[])),
  Quiz: function ChordNameExerciseQuiz({ item, ...rest }: ExerciseQuizProps) {
    return <ChordNameQuiz question={item as ChordNameQuestion} {...rest} />;
  },
};

const chordPlay: Exercise = {
  ...chordName,
  ...EXERCISE_META['chord-play'],
  itemKey: (item) => chordPlayKey(item as ChordItem),
  buildQueue: (ctx) =>
    buildChordPlayQueue(
      reviewSubset(ctx, chordPool(ctx.settings.chordShapes, ctx.settings.chordKinds), chordPlayKey),
      ctx.rng,
    ),
  Quiz: function ChordPlayExerciseQuiz({ item, ...rest }: ExerciseQuizProps) {
    return <ChordPlayQuiz question={item as ChordItem} {...rest} />;
  },
};

function GuideOptions() {
  const { data, updateSettings } = useAppState();
  const { chordShapes } = data.settings;
  return (
    <div className="level-bar" role="group" aria-label="Formas">
      {SHAPE_OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          aria-pressed={chordShapes === value}
          onClick={() => updateSettings({ chordShapes: value })}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

const guideTones: Exercise = {
  ...EXERCISE_META['guide-tones'],
  itemKey: (item) => guideKey(item as ChordItem),
  questionCount: (ctx) => (ctx.instrument.id === 'bass' ? 0 : guidePool(ctx.settings.chordShapes).length),
  startBlockers: (ctx) => (ctx.instrument.id === 'bass' ? [BASS_NO_CHORDS] : []),
  startsFromPosition: () => false,
  Options: GuideOptions,
  buildQueue: (ctx) =>
    buildGuideQueue(reviewSubset(ctx, guidePool(ctx.settings.chordShapes), guideKey), ctx.rng),
  prepareSound: (sound, items) => sound.preparePitches(chordItemsPitches(items as ChordItem[])),
  Quiz: function GuideToneExerciseQuiz({ item, ...rest }: ExerciseQuizProps) {
    return <GuideToneQuiz question={item as ChordItem} {...rest} />;
  },
};

const arpeggio: Exercise = {
  ...scalePlay,
  ...EXERCISE_META.arpeggio,
  itemKey: (item) => arpeggioKey(item as ScalePlayItem),
  buildQueue: (ctx) =>
    buildArpeggioQueue(
      reviewSubset(ctx, scalePlayPool(ctx.settings.scale, ctx.settings.scaleBox), arpeggioKey),
      ctx.rng,
    ),
  Quiz: function ArpeggioExerciseQuiz({ item, ...rest }: ExerciseQuizProps) {
    return <ArpeggioQuiz question={item as ScalePlayItem} {...rest} />;
  },
};

const iiVI: Exercise = {
  ...guideTones,
  ...EXERCISE_META['ii-v-i'],
  itemKey: (item) => iiViKey(item as IiViItem),
  questionCount: (ctx) => (ctx.instrument.id === 'bass' ? 0 : iiViPool().length),
  Options: undefined,
  buildQueue: (ctx) => buildIiViQueue(reviewSubset(ctx, iiViPool(), iiViKey), ctx.rng),
  prepareSound: (sound, items) =>
    sound.preparePitches(
      (items as IiViItem[]).flatMap((i) => {
        const q = iiViQuestion(i);
        return [...q.from.notes, ...q.to.notes].map((n) => n.pitch);
      }),
    ),
  Quiz: function IiViExerciseQuiz({ item, ...rest }: ExerciseQuizProps) {
    return <IiViQuiz question={item as IiViItem} {...rest} />;
  },
};

function DictationOptions() {
  const { data, updateSettings } = useAppState();
  const { dictationLevel } = data.settings;
  return (
    <>
      <LevelBar value={dictationLevel} onChange={(level) => updateSettings({ dictationLevel: level })} />
      <p className="mode-description">{DICTATION_LEVEL_TEXT[dictationLevel]}</p>
    </>
  );
}

const dictation: Exercise = {
  ...EXERCISE_META.dictation,
  itemKey: (item) => dictationKey(item as DictationQuestion),
  questionCount: (ctx) => dictationPool(ctx.settings.dictationLevel).length,
  startBlockers: (ctx) => (ctx.settings.soundEnabled ? [] : [EAR_WITHOUT_SOUND]),
  startsFromPosition: () => false,
  historyLevel: (settings) => settings.dictationLevel,
  Options: DictationOptions,
  buildQueue: (ctx) =>
    buildDictationQueue(
      reviewSubset(ctx, dictationPool(ctx.settings.dictationLevel), dictationKey),
      ctx.instrument,
      ctx.rng,
    ),
  prepareSound: (sound, items) => sound.preparePitches((items as DictationQuestion[]).flatMap((q) => q.pitches)),
  Quiz: function DictationExerciseQuiz({ item, ...rest }: ExerciseQuizProps) {
    return <DictationQuiz question={item as DictationQuestion} {...rest} />;
  },
};

export const EXERCISES: Record<QuizMode, Exercise> = {
  'position-to-note': positionExercise('position-to-note', positionQuiz(ChoiceQuiz)),
  'note-to-position': positionExercise('note-to-position', positionQuiz(FindQuiz)),
  flashcard: positionExercise('flashcard', positionQuiz(Flashcard)),
  ear,
  'ear-interval': earIntervalExercise,
  'ear-degree': earDegree,
  interval,
  'scale-degree': scaleDegree,
  'scale-play': scalePlay,
  'harmony-chord': harmonyChord,
  'harmony-degree': harmonyDegree,
  'harmony-quality': harmonyQuality,
  'chord-name': chordName,
  'chord-play': chordPlay,
  'guide-tones': guideTones,
  arpeggio,
  'ii-v-i': iiVI,
  dictation,
};

export function exerciseFor(mode: QuizMode): Exercise {
  return EXERCISES[mode];
}
