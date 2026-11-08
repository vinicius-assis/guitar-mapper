import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundProvider } from '../../audio/SoundProvider';
import type { NotePlayer } from '../../audio/player';
import { arpeggioOf } from '../../domain/arpeggio';
import { CHORD_KIND_SETTINGS, CHORD_SHAPE_SETTINGS, type ChordItem, type ChordNameQuestion } from '../../domain/chordItems';
import { chordSemitones, chordVoicing } from '../../domain/chords';
import type { DictationQuestion } from '../../domain/dictation';
import {
  DEGREE_LEVELS,
  EAR_DIRECTIONS,
  EAR_INTERVAL_LEVELS,
  type DegreeQuestion,
  type EarIntervalQuestion,
} from '../../domain/earTraining';
import { buildFindQuestion } from '../../domain/quiz';
import { noteAt, positionKey, positionsInFilter, type Position } from '../../domain/fretboard';
import { guideNotes, isGuideFunc } from '../../domain/guideTones';
import {
  HARMONY_KEY_LEVELS,
  SEVENTH_QUALITIES,
  TRIAD_QUALITIES,
  chordRootClass,
  degreeQuality,
} from '../../domain/harmony';
import type { HarmonyItem, QualityQuestion } from '../../domain/harmonyItems';
import { BASS, GUITAR, type Instrument } from '../../domain/instruments';
import { INTERVALS, intervalAnswer, type IntervalItem } from '../../domain/intervals';
import { ACCIDENTALS, noteLabel, type Notation } from '../../domain/notes';
import { pitchOf } from '../../domain/pitch';
import { iiViQuestion, type IiViItem } from '../../domain/progressions';
import type { EarLevel, QuizMode } from '../../domain/quiz';
import { scaleDegreeTarget, type ScaleDegreeQuestion, type ScalePlayItem } from '../../domain/scaleItems';
import { SCALES, SCALE_IDS, scaleBox, scaleDegreeOf } from '../../domain/scales';
import { AppProvider } from '../../state/AppState';
import { activeView, createDefaultData, defaultFilterFor, type Settings } from '../../state/storage';
import { mulberry32, seededStorage } from '../../test-utils';
import { EXERCISES, type QuizItem } from '../exercises';

/**
 * Varredura de telas: cada exercício do registro × instrumento × as tônicas/tons/formas que o
 * pool produz, com uma resposta CERTA e uma ERRADA derivadas do domínio. Pega a classe de bug
 * em que um caso fora das fixtures (ex.: escala sem Dó) derruba a tela sem error boundary.
 */

const NOTATIONS: readonly Notation[] = ['cifra', 'solfejo', 'ambos'];
const COMBOS = ACCIDENTALS.flatMap((accidentals) => NOTATIONS.map((notation) => ({ notation, accidentals })));
const LEVELS: readonly EarLevel[] = ['easy', 'medium', 'hard'];
const BASS_ONLY_GUITAR: readonly QuizMode[] = ['chord-name', 'chord-play', 'guide-tones', 'ii-v-i'];
const BASS_NO_CHORDS = 'Acordes são só para violão. Troque para Violão em Ajustes.';

const fakePlayer = (): NotePlayer => ({ unlock: vi.fn(), prepare: vi.fn(), play: vi.fn() });

function baseSettings(instrument: Instrument): Settings {
  const s = activeView(createDefaultData()).settings;
  return {
    ...s,
    instrument: instrument.id,
    filter: { ...defaultFilterFor(instrument), fretMin: 1, fretMax: 12, naturalsOnly: false },
  };
}

// ---------- itens: os builders do domínio com rng semeado, sobre todas as variantes de ajuste ----------

type Variant = Partial<Settings>;
const product = <A, B>(as: readonly A[], bs: readonly B[]) => as.flatMap((a) => bs.map((b) => [a, b] as const));

const VARIANTS: Record<QuizMode, Variant[]> = {
  'position-to-note': [{}],
  'note-to-position': [{}],
  flashcard: [{}],
  ear: LEVELS.map((earLevel) => ({ earLevel })),
  'ear-interval': product(LEVELS, EAR_DIRECTIONS).map(([earIntervalLevel, earIntervalDirection]) => ({
    earIntervalLevel,
    earIntervalDirection,
  })),
  'ear-degree': LEVELS.map((degreeLevel) => ({ degreeLevel })),
  interval: (['manual', '3s', '5s'] as const).map((intervalAdvance) => ({
    intervalAdvance,
    intervals: INTERVALS.map((i) => i.id),
  })),
  'scale-degree': SCALE_IDS.map((scale) => ({ scale, scaleBox: 'all' as const })),
  'scale-play': SCALE_IDS.map((scale) => ({ scale, scaleBox: 'all' as const })),
  arpeggio: SCALE_IDS.map((scale) => ({ scale, scaleBox: 'all' as const })),
  'harmony-chord': product(HARMONY_KEY_LEVELS, [false, true]).map(([harmonyKeys, harmonySevenths]) => ({
    harmonyField: 'both' as const,
    harmonyKeys,
    harmonySevenths,
  })),
  'harmony-degree': product(HARMONY_KEY_LEVELS, [false, true]).map(([harmonyKeys, harmonySevenths]) => ({
    harmonyField: 'both' as const,
    harmonyKeys,
    harmonySevenths,
  })),
  'harmony-quality': product(HARMONY_KEY_LEVELS, [false, true]).map(([harmonyKeys, harmonySevenths]) => ({
    harmonyField: 'both' as const,
    harmonyKeys,
    harmonySevenths,
  })),
  'chord-name': product(CHORD_SHAPE_SETTINGS, CHORD_KIND_SETTINGS).map(([chordShapes, chordKinds]) => ({
    chordShapes,
    chordKinds,
  })),
  'chord-play': product(CHORD_SHAPE_SETTINGS, CHORD_KIND_SETTINGS).map(([chordShapes, chordKinds]) => ({
    chordShapes,
    chordKinds,
  })),
  'guide-tones': CHORD_SHAPE_SETTINGS.map((chordShapes) => ({ chordShapes })),
  'ii-v-i': [{}],
  dictation: LEVELS.map((dictationLevel) => ({ dictationLevel })),
};

/** O que precisa aparecer ao menos uma vez (sempre inclui a tônica/tom/nota). */
const COVERAGE: Record<QuizMode, (item: QuizItem, s: Settings, inst: Instrument) => string> = {
  'position-to-note': (i, _s, inst) => `${noteAt(i as Position, inst)}:${(i as Position).string}`,
  'note-to-position': (i, _s, inst) => `${noteAt(i as Position, inst)}:${(i as Position).string}`,
  flashcard: (i, _s, inst) => `${noteAt(i as Position, inst)}`,
  ear: (i, s, inst) => `${noteAt(i as Position, inst)}:${s.earLevel}`,
  'ear-interval': (i) => {
    const q = i as EarIntervalQuestion;
    return `${q.root}:${q.semitones}:${q.direction}`;
  },
  'ear-degree': (i, s) => `${(i as DegreeQuestion).tonic}:${(i as DegreeQuestion).degree}:${s.degreeLevel}`,
  interval: (i) => `${(i as IntervalItem).root}:${(i as IntervalItem).interval}`,
  'scale-degree': (i) => `${(i as ScaleDegreeQuestion).scale}:${(i as ScaleDegreeQuestion).root}`,
  'scale-play': (i) => `${(i as ScalePlayItem).scale}:${(i as ScalePlayItem).root}`,
  arpeggio: (i) => `${(i as ScalePlayItem).scale}:${(i as ScalePlayItem).root}`,
  'harmony-chord': (i) => `${(i as HarmonyItem).field}:${(i as HarmonyItem).key}:${(i as HarmonyItem).degree}`,
  'harmony-degree': (i) => `${(i as HarmonyItem).field}:${(i as HarmonyItem).key}:${(i as HarmonyItem).degree}`,
  'harmony-quality': (i) => {
    const q = i as QualityQuestion;
    return `${q.field}:${q.key}:${q.sevenths}`;
  },
  'chord-name': (i) => `${(i as ChordItem).shape}:${(i as ChordItem).root}`,
  'chord-play': (i) => `${(i as ChordItem).shape}:${(i as ChordItem).root}`,
  'guide-tones': (i) => `${(i as ChordItem).shape}:${(i as ChordItem).root}`,
  'ii-v-i': (i) => `${(i as IiViItem).key}:${(i as IiViItem).grip}:${(i as IiViItem).step}`,
  dictation: (i) => `${(i as DictationQuestion).scale}:${(i as DictationQuestion).root}`,
};

/** A tônica (classe de altura) de um item, para conferir a cobertura das 12. */
const ROOT_OF: Record<QuizMode, (item: QuizItem, inst: Instrument) => number> = {
  'position-to-note': (i, inst) => noteAt(i as Position, inst),
  'note-to-position': (i, inst) => noteAt(i as Position, inst),
  flashcard: (i, inst) => noteAt(i as Position, inst),
  ear: (i, inst) => noteAt(i as Position, inst),
  'ear-interval': (i) => (i as EarIntervalQuestion).root,
  'ear-degree': (i) => (i as DegreeQuestion).tonic,
  interval: (i) => (i as IntervalItem).root,
  'scale-degree': (i) => (i as ScaleDegreeQuestion).root,
  'scale-play': (i) => (i as ScalePlayItem).root,
  arpeggio: (i) => (i as ScalePlayItem).root,
  'harmony-chord': (i) => (i as HarmonyItem).key,
  'harmony-degree': (i) => (i as HarmonyItem).key,
  'harmony-quality': (i) => (i as QualityQuestion).key,
  'chord-name': (i) => (i as ChordItem).root,
  'chord-play': (i) => (i as ChordItem).root,
  'guide-tones': (i) => (i as ChordItem).root,
  'ii-v-i': (i) => (i as IiViItem).key,
  dictation: (i) => (i as DictationQuestion).root,
};

interface Case {
  item: QuizItem;
  settings: Settings;
}

/** Rodadas de cada fila: tônica, desenho e alturas sorteados pelo builder variam entre elas. */
const ROUNDS = 3;

function casesFor(mode: QuizMode, inst: Instrument, seed = 1): Case[] {
  const rng = mulberry32(seed);
  const exercise = EXERCISES[mode];
  const all: Case[] = [];
  for (let round = 0; round < ROUNDS; round++) {
    for (const variant of VARIANTS[mode]) {
      const settings = { ...baseSettings(inst), ...variant };
      const candidates = positionsInFilter(settings.filter, inst);
      for (const item of exercise.buildQueue({ settings, instrument: inst, candidates, rng })) {
        all.push({ item, settings });
      }
    }
  }
  // Embaralha antes de deduplicar: a variante que vence cada chave é sorteada, não sempre a primeira.
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  const seen = new Set<string>();
  const picked = all.filter(({ item, settings }) => {
    const key = COVERAGE[mode](item, settings, inst);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  // Notação, acidentes, canhoto e som variam por caso.
  return picked.map(({ item, settings }, i) => ({
    item,
    settings: {
      ...settings,
      ...COMBOS[i % COMBOS.length],
      leftHanded: i % 5 === 4,
      soundEnabled: i % 4 !== 3,
    },
  }));
}

// ---------- montagem ----------

interface Mounted {
  c: HTMLElement;
  onAnswer: ReturnType<typeof vi.fn>;
  onNext: ReturnType<typeof vi.fn>;
}

function mount(mode: QuizMode, { item, settings }: Case): Mounted {
  const onAnswer = vi.fn();
  const onNext = vi.fn();
  const { Quiz } = EXERCISES[mode];
  const { container } = render(
    <AppProvider storage={seededStorage({ settings })}>
      <SoundProvider player={fakePlayer()}>
        <Quiz item={item} settings={settings} onAnswer={onAnswer} onNext={onNext} />
      </SoundProvider>
    </AppProvider>,
  );
  return { c: container, onAnswer, onNext };
}

const parseCell = (el: Element): Position => {
  const [, s, f] = /^cell-(\d+)-(\d+)$/.exec(el.getAttribute('data-testid') ?? '')!;
  return { string: Number(s), fret: Number(f) };
};
const tappable = (c: HTMLElement): Position[] => [...c.querySelectorAll('rect[role="button"]')].map(parseCell);

function tap(c: HTMLElement, p: Position) {
  const el = c.querySelector(`[data-testid="cell-${p.string}-${p.fret}"]`);
  expect(el, `cell ${positionKey(p)}`).not.toBeNull();
  expect(el!.getAttribute('role'), `cell ${positionKey(p)} tappable`).toBe('button');
  fireEvent.click(el!);
}

function click(c: HTMLElement, selector: string, index: number) {
  const buttons = c.querySelectorAll<HTMLButtonElement>(selector);
  expect(buttons.length, selector).toBeGreaterThan(index);
  fireEvent.click(buttons[index]);
}

function findTap(c: HTMLElement, ok: (p: Position) => boolean, what: string): Position {
  const p = tappable(c).find(ok);
  expect(p, what).toBeDefined();
  return p!;
}

// ---------- respostas certas e erradas, derivadas do domínio ----------

interface Driver {
  correct(c: HTMLElement): void;
  wrong(c: HTMLElement, variant: number): void;
  /** O exercício não mostra status (flashcard). */
  silent?: boolean;
}

type MakeDriver = (item: QuizItem, s: Settings, inst: Instrument) => Driver;

/** Botões de opção rotulados por nota (as opções são sorteadas na tela): acha a do domínio. */
function noteOptions(answer: number, s: Settings): Driver {
  const label = noteLabel(answer, s.notation, s.accidentals);
  const index = (c: HTMLElement, right: boolean) =>
    [...c.querySelectorAll('button.option')].findIndex((b) => (b.textContent === label) === right);
  return {
    correct: (c) => click(c, 'button.option', index(c, true)),
    wrong: (c) => click(c, 'button.option', index(c, false)),
  };
}

function byIndex(selector: string, right: number, count: number): Driver {
  return {
    correct: (c) => click(c, selector, right),
    wrong: (c, v) => click(c, selector, (right + 1 + (v % (count - 1))) % count),
  };
}

function tapAll(targets: Position[], isWrong: (p: Position) => boolean, extra?: (c: HTMLElement, v: number) => void): Driver {
  return {
    correct: (c) => targets.forEach((p) => tap(c, p)),
    wrong: (c, v) => {
      // Variante ímpar: acerta uma nota antes de errar.
      if (v % 2 === 1 && targets.length > 1) tap(c, targets[0]);
      extra?.(c, v);
      tap(c, findTap(c, isWrong, 'a wrong cell'));
    },
  };
}

const DRIVERS: Record<QuizMode, MakeDriver> = {
  'position-to-note': (i, s, inst) => noteOptions(noteAt(i as Position, inst), s),
  ear: (i, s, inst) => noteOptions(noteAt(i as Position, inst), s),
  'note-to-position': (i, s, inst) => {
    const q = buildFindQuestion(i as Position, s.filter, inst);
    const valid = new Set(q.validPositions.map(positionKey));
    return {
      correct: (c) => tap(c, q.validPositions[0]),
      wrong: (c) => tap(c, findTap(c, (p) => !valid.has(positionKey(p)), 'a wrong cell')),
    };
  },
  flashcard: () => ({
    silent: true,
    correct: (c) => {
      click(c, 'button.primary', 0);
      click(c, 'button.option--correct', 0);
    },
    wrong: (c) => {
      click(c, 'button.primary', 0);
      click(c, 'button.option--wrong', 0);
    },
  }),
  'ear-interval': (i, s) => {
    const level = EAR_INTERVAL_LEVELS[s.earIntervalLevel];
    return byIndex('.answer-grid button', level.indexOf((i as EarIntervalQuestion).semitones), level.length);
  },
  'ear-degree': (i, s) => {
    const level = DEGREE_LEVELS[s.degreeLevel];
    return byIndex('.answer-grid button', level.indexOf((i as DegreeQuestion).degree), level.length);
  },
  interval: (i) => byIndex('.note-grid button', intervalAnswer(i as IntervalItem), 12),
  'scale-degree': (i, _s, inst) => {
    const q = i as ScaleDegreeQuestion;
    return byIndex('.answer-grid button', scaleDegreeTarget(q, inst).degree, SCALES[q.scale].degrees.length);
  },
  'scale-play': (i, _s, inst) => {
    const q = i as ScalePlayItem;
    const notes = scaleBox(q.scale, q.box, q.root, inst).notes.filter((n) => n.degree !== 0);
    return tapAll(
      notes.map((n) => n.position),
      (p) => scaleDegreeOf(noteAt(p, inst), q.root, q.scale) < 0,
    );
  },
  arpeggio: (i, _s, inst) => {
    const q = i as ScalePlayItem;
    const a = arpeggioOf(q.scale, q.box, q.root, inst);
    return tapAll(
      a.notes.filter((n) => !a.rootPitches.has(n.pitch)).map((n) => n.position),
      (p) => !a.pitches.has(pitchOf(p, inst)),
    );
  },
  'harmony-chord': (i) => {
    const q = i as HarmonyItem;
    return byIndex('.note-grid button', chordRootClass(q.field, q.key, q.degree), 12);
  },
  'harmony-degree': (i) => byIndex('.answer-grid button', (i as HarmonyItem).degree - 1, 7),
  'harmony-quality': (i) => {
    const q = i as QualityQuestion;
    const options = q.sevenths ? SEVENTH_QUALITIES : TRIAD_QUALITIES;
    return byIndex('.answer-grid button', options.indexOf(degreeQuality(q.field, q.degree, q.sevenths)), options.length);
  },
  'chord-name': (i) => {
    const q = i as ChordNameQuestion;
    const v = chordVoicing(q.shape, q.root);
    const right = q.options.findIndex((o) => o.root === v.root && o.quality === v.quality);
    return byIndex('.answer-grid button', right, q.options.length);
  },
  'chord-play': (i) => {
    const q = i as ChordItem;
    const v = chordVoicing(q.shape, q.root);
    const keys = new Set(v.fretted.map((n) => positionKey(n.position)));
    const tones = chordSemitones(v.quality);
    return tapAll(
      v.fretted.map((n) => n.position),
      (p) => !keys.has(positionKey(p)) && !tones.includes((((pitchOf(p, GUITAR) - v.root) % 12) + 12) % 12),
    );
  },
  'guide-tones': (i) => {
    const q = i as ChordItem;
    const v = chordVoicing(q.shape, q.root);
    const notes = new Set(v.notes.map((n) => positionKey(n.position)));
    const other = new Set(v.notes.filter((n) => !isGuideFunc(n.func)).map((n) => positionKey(n.position)));
    return tapAll(
      guideNotes(v).map((n) => n.position),
      (p) => other.has(positionKey(p)),
      // Variante 2/3: um toque fora do desenho antes (não encerra).
      (c, variant) => {
        if (variant >= 2) tap(c, findTap(c, (p) => !notes.has(positionKey(p)), 'an outside cell'));
      },
    );
  },
  'ii-v-i': (i) => {
    const q = iiViQuestion(i as IiViItem);
    const targets = new Set(q.targets.map((t) => t.pitch));
    return tapAll(
      q.targets.map((t) => t.position),
      (p) => !targets.has(pitchOf(p, GUITAR)),
    );
  },
  dictation: (i, _s, inst) => {
    const q = i as DictationQuestion;
    const at = (c: HTMLElement, pitch: number) =>
      findTap(c, (p) => pitchOf(p, inst) === pitch, `a cell for midi ${pitch}`);
    return {
      correct: (c) => q.pitches.forEach((pitch) => tap(c, at(c, pitch))),
      wrong: (c, v) => {
        const k = v % 2 === 1 ? 1 : 0;
        if (k === 1) tap(c, at(c, q.pitches[0]));
        const expected = q.pitches[k];
        // Variante 2/3: a nota certa numa oitava errada, quando houver no desenho.
        const octave = tappable(c).find((p) => {
          const pitch = pitchOf(p, inst);
          return pitch !== expected && pitch % 12 === expected % 12;
        });
        tap(c, v >= 2 && octave ? octave : findTap(c, (p) => pitchOf(p, inst) % 12 !== expected % 12, 'a wrong cell'));
      },
    };
  },
};

// ---------- asserções do estado final ----------

const BROKEN = /undefined|NaN|null|\[object/;

function expectDone(m: Mounted, correct: boolean, silent: boolean) {
  expect(m.onAnswer).toHaveBeenCalledTimes(1);
  expect(m.onAnswer).toHaveBeenCalledWith(correct);
  expect(m.c.textContent).not.toMatch(BROKEN);
  if (silent) return;
  const status = m.c.querySelector('[role="status"]');
  expect(status, 'status').not.toBeNull();
  expect(status!.textContent).toMatch(correct ? /^Correto/ : /^Err(ado|ou)\./);
  expect(status!.textContent).not.toMatch(BROKEN);
  // Avança (pelo tempo, ou pelo botão Próxima) sem quebrar.
  act(() => void vi.advanceTimersByTime(10_000));
  if (m.onNext.mock.calls.length === 0) click(m.c, 'button.primary', 0);
  expect(m.onNext).toHaveBeenCalledTimes(1);
}

function sweep(mode: QuizMode, inst: Instrument) {
  const cases = casesFor(mode, inst);
  expect(cases.length).toBeGreaterThan(0);
  expect(new Set(cases.map((k) => ROOT_OF[mode](k.item, inst))).size, 'all 12 roots').toBe(
    mode === 'ii-v-i' ? 4 : 12,
  );
  const exercise = EXERCISES[mode];
  cases.forEach((k, i) => {
    const where = `${mode} ${inst.id} #${i} ${JSON.stringify(k.item)} ${k.settings.notation}/${k.settings.accidentals}`;
    expect(exercise.itemKey(k.item, inst), where).not.toMatch(BROKEN);
    const driver = DRIVERS[mode](k.item, k.settings, inst);
    try {
      const right = mount(mode, k);
      driver.correct(right.c);
      expectDone(right, true, driver.silent ?? false);
      cleanup();
      const wrong = mount(mode, k);
      driver.wrong(wrong.c, i % 4);
      expectDone(wrong, false, driver.silent ?? false);
      cleanup();
    } catch (e) {
      throw new Error(`${where}: ${(e as Error).message}`);
    }
  });
}

/** Grupos de modos, um por arquivo de teste (rodam em paralelo); juntos cobrem `QUIZ_MODES`. */
export const SWEEP_GROUPS: Record<string, readonly QuizMode[]> = {
  braco: ['position-to-note', 'note-to-position', 'flashcard', 'ear', 'ear-interval', 'ear-degree'],
  teoria: ['interval', 'scale-degree'],
  escalas: ['scale-play', 'arpeggio'],
  harmonia: ['harmony-chord', 'harmony-degree', 'harmony-quality', 'chord-name', 'chord-play', 'guide-tones', 'ii-v-i'],
  ditado: ['dictation'],
};

/** Registra a varredura de `modes`: violão sempre; baixo varre ou confere o bloqueio dos acordes. */
export function sweepModes(modes: readonly QuizMode[]) {
  let errors: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    vi.useFakeTimers();
    errors = vi.spyOn(console, 'error');
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  describe('screen sweep', () => {
    for (const mode of modes) {
      it(`${mode} · guitar: every root, correct and wrong`, () => sweep(mode, GUITAR), 60_000);
      if (BASS_ONLY_GUITAR.includes(mode)) {
        it(`${mode} · bass: blocked`, () => {
          const settings = baseSettings(BASS);
          const ctx = { settings, instrument: BASS, candidates: positionsInFilter(settings.filter, BASS), rng: mulberry32(1) };
          expect(EXERCISES[mode].startBlockers(ctx)).toEqual([BASS_NO_CHORDS]);
          expect(EXERCISES[mode].questionCount(ctx)).toBe(0);
        });
      } else {
        it(`${mode} · bass: every root, correct and wrong`, () => sweep(mode, BASS), 60_000);
      }
    }
  });
}
