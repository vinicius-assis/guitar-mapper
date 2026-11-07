import { describe, expect, it, vi } from 'vitest';
import { QUIZ_MODES } from '../domain/exercises';
import { noteAt, positionKey, positionsInFilter, type Position } from '../domain/fretboard';
import { BASS, GUITAR } from '../domain/instruments';
import {
  degreeKey,
  degreePool,
  degreeSequence,
  earIntervalKey,
  earIntervalPool,
  earRange,
  type DegreeQuestion,
  type EarIntervalQuestion,
} from '../domain/earTraining';
import { harmonyKeys } from '../domain/harmony';
import {
  harmonyChordKey,
  harmonyPool,
  isHarmonyChordKey,
  isHarmonyDegreeKey,
  type HarmonyItem,
  type QualityQuestion,
} from '../domain/harmonyItems';
import { chordPool, isChordNameKey, isChordPlayKey, type ChordNameQuestion } from '../domain/chordItems';
import { intervalItems } from '../domain/intervals';
import {
  scaleDegreeKey,
  scaleDegreePool,
  scaleDegreeTarget,
  scalePlayKey,
  scalePlayPool,
  type ScaleDegreeQuestion,
  type ScalePlayItem,
} from '../domain/scaleItems';
import { scaleBox } from '../domain/scales';
import { ALL_NOTES } from '../domain/notes';
import { pitchOf, uniquePitchPositions } from '../domain/pitch';
import type { PositionProgress, ProgressMap } from '../domain/scheduler';
import { activeView, createDefaultData, type Settings } from '../state/storage';
import { mulberry32 } from '../test-utils';
import { EXERCISES, exerciseFor, type Exercise, type ExerciseContext } from './exercises';

function makeCtx(overrides: Partial<Settings> = {}, candidates?: Position[]): ExerciseContext {
  const settings = { ...activeView(createDefaultData()).settings, ...overrides };
  return {
    settings,
    instrument: GUITAR,
    candidates: candidates ?? positionsInFilter(settings.filter, GUITAR),
    rng: mulberry32(1),
  };
}

const keys = (positions: Position[]) => positions.map(positionKey).sort();

// Cordas 1–6, casas 1–12: o mesmo som aparece em cordas diferentes.
const WIDE = { strings: [1, 2, 3, 4, 5, 6], fretMin: 1, fretMax: 12, naturalsOnly: true };

describe('registro de exercícios', () => {
  it('cobre todos os modos, cada um com o próprio id', () => {
    expect(Object.keys(EXERCISES).sort()).toEqual([...QUIZ_MODES].sort());
    for (const mode of QUIZ_MODES) expect(exerciseFor(mode).mode).toBe(mode);
  });

  it('posição → nota embaralha todas as posições do foco', () => {
    const ctx = makeCtx();
    const queue = exerciseFor('position-to-note').buildQueue(ctx) as Position[];
    expect(queue).toHaveLength(ctx.candidates.length);
    expect(keys(queue)).toEqual(keys(ctx.candidates));
  });

  it('ouvido: uma posição por altura e nunca a mesma nota duas vezes seguidas', () => {
    const ctx = makeCtx({ filter: WIDE });
    const queue = exerciseFor('ear').buildQueue(ctx) as Position[];
    expect(keys(queue)).toEqual(keys(uniquePitchPositions(ctx.candidates, GUITAR)));
    for (let i = 1; i < queue.length; i++) {
      expect(noteAt(queue[i], GUITAR)).not.toBe(noteAt(queue[i - 1], GUITAR));
    }
  });

  it('ouvido começa pela posição forçada; intervalos ignora a posição forçada', () => {
    const forced = { string: 3, fret: 5 };
    const ear = exerciseFor('ear').buildQueue(makeCtx(), forced) as Position[];
    expect(ear[0]).toEqual(forced);
    const interval = exerciseFor('interval').buildQueue(makeCtx(), forced);
    expect(interval).toHaveLength(35);
    expect(interval.every((item) => !('string' in item))).toBe(true);
  });

  it('questionCount', () => {
    const wide = makeCtx({ filter: WIDE });
    const earCount = exerciseFor('ear').questionCount(wide);
    expect(earCount).toBe(uniquePitchPositions(wide.candidates, GUITAR).length);
    expect(earCount).toBeLessThan(wide.candidates.length);
    expect(exerciseFor('interval').questionCount(makeCtx())).toBe(35);
    expect(exerciseFor('flashcard').questionCount(wide)).toBe(wide.candidates.length);
  });

  it('startBlockers', () => {
    expect(exerciseFor('ear').startBlockers(makeCtx({ soundEnabled: false }))).toEqual([
      'Ligue o Som em Ajustes para treinar de ouvido.',
    ]);
    expect(exerciseFor('interval').startBlockers(makeCtx({ intervals: [] }))).toEqual([
      'Nenhum intervalo no foco. Abra o Foco e marque ao menos um intervalo.',
    ]);
    expect(exerciseFor('position-to-note').startBlockers(makeCtx({}, []))).toEqual([
      'Nenhuma posição no foco atual. Abra o Foco abaixo e selecione ao menos uma corda ou inclua notas com acidentais.',
    ]);
    for (const mode of QUIZ_MODES) expect(exerciseFor(mode).startBlockers(makeCtx())).toEqual([]);
  });

  it('startsFromPosition', () => {
    expect(exerciseFor('flashcard').startsFromPosition(makeCtx())).toBe(true);
    expect(exerciseFor('interval').startsFromPosition(makeCtx())).toBe(false);
    expect(exerciseFor('ear').startsFromPosition(makeCtx({ soundEnabled: true }))).toBe(true);
    expect(exerciseFor('ear').startsFromPosition(makeCtx({ soundEnabled: false }))).toBe(false);
  });

  it('itemKey', () => {
    expect(exerciseFor('position-to-note').itemKey({ string: 3, fret: 5 }, GUITAR)).toBe('3-5');
    expect(exerciseFor('ear').itemKey({ string: 1, fret: 0 }, GUITAR)).toBe('ear:64');
    expect(exerciseFor('interval').itemKey({ root: 0, interval: '3m' }, GUITAR)).toBe(
      'interval:0:3m',
    );
  });
});

describe('fila de revisão (progress + limit)', () => {
  const NOW = 1_000_000;
  // Violão, todas as cordas, casas 1–12, com acidentais: 72 posições, 36 alturas, 60 intervalos.
  const BIG = { strings: [1, 2, 3, 4, 5, 6], fretMin: 1, fretMax: 12, naturalsOnly: false };
  const entry = (nextReview: number): PositionProgress => ({
    box: 2,
    correct: 1,
    wrong: 0,
    lastReview: 0,
    nextReview,
  });

  function reviewCtx(
    progress: ProgressMap = {},
    overrides: Partial<Settings> = {},
    candidates?: Position[],
  ): ExerciseContext {
    return {
      ...makeCtx({ filter: BIG, ...overrides }, candidates),
      rng: mulberry32(3),
      progress,
      now: NOW,
      limit: 20,
    };
  }

  /** Marca `due` chaves como vencidas e o resto do pool alternadamente como visto (não vencido) ou novo. */
  function progressFor(allKeys: string[], due: string[]): ProgressMap {
    const progress: ProgressMap = {};
    allKeys.forEach((k, i) => {
      if (due.includes(k)) progress[k] = entry(NOW - 1);
      else if (i % 2 === 0) progress[k] = entry(NOW + 60_000);
    });
    return progress;
  }

  it('posição → nota: 20 posições distintas e todas as vencidas presentes', () => {
    const candidates = positionsInFilter(BIG, GUITAR);
    expect(candidates.length).toBeGreaterThan(20);
    const allKeys = candidates.map(positionKey);
    const due = allKeys.filter((_, i) => i % 9 === 1).slice(0, 8);
    expect(due).toHaveLength(8);
    const queue = exerciseFor('position-to-note').buildQueue(
      reviewCtx(progressFor(allKeys, due)),
    ) as Position[];
    expect(queue).toHaveLength(20);
    const qKeys = queue.map(positionKey);
    expect(new Set(qKeys).size).toBe(20);
    for (const k of due) expect(qKeys).toContain(k);
  });

  it('ouvido: 20 alturas distintas, sem nota repetida em sequência, vencidas presentes', () => {
    const ear = exerciseFor('ear');
    const unique = uniquePitchPositions(positionsInFilter(BIG, GUITAR), GUITAR);
    expect(unique.length).toBeGreaterThan(20);
    const allKeys = unique.map((p) => ear.itemKey(p, GUITAR));
    const due = allKeys.filter((_, i) => i % 3 === 0).slice(0, 10);
    expect(due).toHaveLength(10);
    const queue = ear.buildQueue(reviewCtx(progressFor(allKeys, due))) as Position[];
    expect(queue).toHaveLength(20);
    expect(new Set(queue.map((p) => pitchOf(p, GUITAR))).size).toBe(20);
    for (let i = 1; i < queue.length; i++) {
      expect(noteAt(queue[i], GUITAR)).not.toBe(noteAt(queue[i - 1], GUITAR));
    }
    const qKeys = queue.map((p) => ear.itemKey(p, GUITAR));
    for (const k of due) expect(qKeys).toContain(k);
  });

  it('intervalos: 20 itens distintos e vencidos presentes', () => {
    const interval = exerciseFor('interval');
    const all = intervalItems(ALL_NOTES, activeView(createDefaultData()).settings.intervals);
    expect(all.length).toBeGreaterThan(20);
    const allKeys = all.map((it) => interval.itemKey(it, GUITAR));
    const due = allKeys.filter((_, i) => i % 7 === 2).slice(0, 8);
    expect(due).toHaveLength(8);
    const queue = interval.buildQueue(reviewCtx(progressFor(allKeys, due)));
    expect(queue).toHaveLength(20);
    const qKeys = queue.map((it) => interval.itemKey(it, GUITAR));
    expect(new Set(qKeys).size).toBe(20);
    for (const k of due) expect(qKeys).toContain(k);
  });

  it('intervalos: a seleção é embaralhada (não fica agrupada por vencidos)', () => {
    const interval = exerciseFor('interval');
    const all = intervalItems(ALL_NOTES, activeView(createDefaultData()).settings.intervals);
    const allKeys = all.map((it) => interval.itemKey(it, GUITAR));
    const due = allKeys.slice(0, 10);
    const queue = interval.buildQueue(reviewCtx(progressFor(allKeys, due)));
    const firstTen = queue.slice(0, 10).map((it) => interval.itemKey(it, GUITAR));
    expect(firstTen.every((k) => due.includes(k))).toBe(false);
  });

  it('posição forçada abre a fila, 20 ao todo, sem repetir', () => {
    const forced = { string: 3, fret: 5 };
    for (const mode of ['position-to-note', 'flashcard'] as const) {
      const queue = exerciseFor(mode).buildQueue(reviewCtx(), forced) as Position[];
      expect(queue[0]).toEqual(forced);
      expect(queue).toHaveLength(20);
      expect(queue.slice(1).map(positionKey)).not.toContain('3-5');
    }
    const ear = exerciseFor('ear').buildQueue(reviewCtx(), forced) as Position[];
    expect(ear[0]).toEqual(forced);
    expect(ear).toHaveLength(20);
    const forcedPitch = pitchOf(forced, GUITAR);
    expect(ear.slice(1).some((p) => pitchOf(p, GUITAR) === forcedPitch)).toBe(false);
    const interval = exerciseFor('interval').buildQueue(reviewCtx(), forced);
    expect(interval).toHaveLength(20);
    expect(interval.every((item) => !('string' in item))).toBe(true);
  });

  it('foco pequeno: todos os itens; 1 item: 1; sem candidatos: vazio', () => {
    const few = positionsInFilter({ strings: [1], fretMin: 1, fretMax: 5, naturalsOnly: false }, GUITAR);
    expect(few.length).toBeLessThan(20);
    const small = { strings: [1], fretMin: 1, fretMax: 5, naturalsOnly: false };
    const pos = exerciseFor('position-to-note').buildQueue(
      reviewCtx({}, { filter: small }, few),
    ) as Position[];
    expect(keys(pos)).toEqual(keys(few));
    const earQ = exerciseFor('ear').buildQueue(reviewCtx({}, { filter: small }, few)) as Position[];
    expect(keys(earQ)).toEqual(keys(few));
    const one = [{ string: 1, fret: 3 }];
    for (const mode of ['position-to-note', 'ear'] as const) {
      expect(exerciseFor(mode).buildQueue(reviewCtx({}, {}, one))).toEqual(one);
      expect(exerciseFor(mode).buildQueue(reviewCtx({}, {}, []))).toEqual([]);
    }
    const intervals = exerciseFor('interval').buildQueue(
      reviewCtx({}, { filter: { ...BIG, naturalsOnly: true }, intervals: ['5J'] }),
    );
    expect(intervals).toHaveLength(7);
  });
});

describe('ouvir intervalos e graus', () => {
  const NOTHING = { earIntervalLevel: 'easy', earIntervalDirection: 'up' } as const;
  const ei = () => exerciseFor('ear-interval');
  const ed = () => exerciseFor('ear-degree');

  it('questionCount segue o tamanho do pool', () => {
    expect(ei().questionCount(makeCtx({ ...NOTHING }))).toBe(36);
    expect(ei().questionCount(makeCtx({ earIntervalLevel: 'easy', earIntervalDirection: 'both' }))).toBe(72);
    expect(ei().questionCount(makeCtx({ earIntervalLevel: 'hard', earIntervalDirection: 'both' }))).toBe(300);
    expect(ed().questionCount(makeCtx({ degreeLevel: 'easy' }))).toBe(36);
    expect(ed().questionCount(makeCtx({ degreeLevel: 'medium' }))).toBe(60);
    expect(ed().questionCount(makeCtx({ degreeLevel: 'hard' }))).toBe(84);
  });

  it('exigem som e nunca iniciam por uma posição', () => {
    for (const ex of [ei(), ed()]) {
      expect(ex.startBlockers(makeCtx({ soundEnabled: false }))).toEqual([
        'Ligue o Som em Ajustes para treinar de ouvido.',
      ]);
      expect(ex.startBlockers(makeCtx({ soundEnabled: true }))).toEqual([]);
      expect(ex.startsFromPosition(makeCtx())).toBe(false);
    }
  });

  const ctxFor = (instrument: typeof GUITAR, settings: Partial<Settings>): ExerciseContext => ({
    ...makeCtx(settings),
    instrument,
    progress: {},
    limit: 20,
    now: 0,
  });

  it.each([GUITAR, BASS])('buildQueue: 20 itens distintos, no pool e dentro da faixa (%#)', (instrument) => {
    const [lo, hi] = earRange(instrument);
    const a = ctxFor(instrument, { earIntervalLevel: 'hard', earIntervalDirection: 'both' });
    const qa = ei().buildQueue(a) as EarIntervalQuestion[];
    const poolKeys = earIntervalPool('hard', 'both').map(earIntervalKey);
    expect(qa).toHaveLength(20);
    const ka = qa.map((q) => ei().itemKey(q, instrument));
    expect(new Set(ka).size).toBe(20);
    for (const k of ka) expect(poolKeys).toContain(k);
    for (const q of qa) for (const p of q.pitches) expect(p >= lo && p <= hi).toBe(true);

    const b = ctxFor(instrument, { degreeLevel: 'hard' });
    const qb = ed().buildQueue(b) as DegreeQuestion[];
    const kb = qb.map((q) => ed().itemKey(q, instrument));
    expect(qb).toHaveLength(20);
    expect(new Set(kb).size).toBe(20);
    const degKeys = degreePool('hard').map(degreeKey);
    for (const k of kb) expect(degKeys).toContain(k);
    for (const q of qb) {
      for (const s of degreeSequence(q, 'hard')) expect(s.midi >= lo && s.midi <= hi).toBe(true);
    }
  });

  it('a revisão prioriza os vencidos', () => {
    const pool = earIntervalPool('hard', 'both');
    const due = pool.slice(0, 5).map(earIntervalKey);
    const progress: ProgressMap = {};
    pool.forEach((item) => {
      const k = earIntervalKey(item);
      progress[k] = due.includes(k)
        ? { box: 1, correct: 0, wrong: 1, lastReview: 0, nextReview: 0 }
        : { box: 2, correct: 1, wrong: 0, lastReview: 0, nextReview: 10 };
    });
    const queue = ei().buildQueue({
      ...makeCtx({ earIntervalLevel: 'hard', earIntervalDirection: 'both' }),
      progress,
      limit: 20,
      now: 0,
    }) as EarIntervalQuestion[];
    const got = queue.map((q) => ei().itemKey(q, GUITAR));
    for (const k of due) expect(got).toContain(k);

    const dpool = degreePool('hard');
    const ddue = dpool.slice(0, 5).map(degreeKey);
    const dprogress: ProgressMap = {};
    dpool.forEach((item) => {
      const k = degreeKey(item);
      dprogress[k] = ddue.includes(k)
        ? { box: 1, correct: 0, wrong: 1, lastReview: 0, nextReview: 0 }
        : { box: 2, correct: 1, wrong: 0, lastReview: 0, nextReview: 10 };
    });
    const dq = ed().buildQueue({
      ...makeCtx({ degreeLevel: 'hard' }),
      progress: dprogress,
      limit: 20,
      now: 0,
    }) as DegreeQuestion[];
    const dgot = dq.map((q) => ed().itemKey(q, GUITAR));
    for (const k of ddue) expect(dgot).toContain(k);
  });

  it('itemKey', () => {
    expect(ei().itemKey({ root: 0, semitones: 4, direction: 'up', pitches: [48, 52] }, GUITAR)).toBe('earint:0:4:up');
    expect(ed().itemKey({ tonic: 0, degree: 5, tonicMidi: 48 }, GUITAR)).toBe('func:0:5');
  });

  it('prepareSound carrega todas as alturas', () => {
    const preparePitches = vi.fn();
    const sound = { preparePitches } as unknown as Parameters<Exercise['prepareSound']>[0];
    ei().prepareSound(sound, [{ root: 0, semitones: 4, direction: 'up', pitches: [48, 52] }], GUITAR);
    expect(preparePitches).toHaveBeenLastCalledWith([48, 52]);
    ed().prepareSound(sound, [{ tonic: 0, degree: 5, tonicMidi: 48 }], GUITAR);
    expect(preparePitches).toHaveBeenLastCalledWith([48, 52, 55, 55]);
  });

  it('historyLevel por modo', () => {
    const s = makeCtx({ earLevel: 'medium', earIntervalLevel: 'hard', degreeLevel: 'easy' }).settings;
    expect(exerciseFor('ear').historyLevel?.(s)).toBe('medium');
    expect(ei().historyLevel?.(s)).toBe('hard');
    expect(ed().historyLevel?.(s)).toBe('easy');
    expect(exerciseFor('interval').historyLevel).toBeUndefined();
  });
});

describe('escalas', () => {
  const sd = () => exerciseFor('scale-degree');
  const sp = () => exerciseFor('scale-play');

  it('questionCount segue o tamanho do pool', () => {
    expect(sd().questionCount(makeCtx())).toBe(9);
    expect(sd().questionCount({ ...makeCtx(), instrument: BASS })).toBe(6);
    expect(sd().questionCount(makeCtx({ scale: 'major', scaleBox: 'all' }))).toBe(108);
    expect(sp().questionCount(makeCtx())).toBe(12);
    expect(sp().questionCount(makeCtx({ scaleBox: 'all' }))).toBe(60);
  });

  it('nunca bloqueiam o início e não iniciam por uma posição', () => {
    for (const ex of [sd(), sp()]) {
      expect(ex.startBlockers(makeCtx({ soundEnabled: false }))).toEqual([]);
      expect(ex.startBlockers(makeCtx())).toEqual([]);
      expect(ex.startsFromPosition(makeCtx())).toBe(false);
      expect(ex.historyLevel).toBeUndefined();
    }
  });

  const ctxFor = (instrument: typeof GUITAR, settings: Partial<Settings>): ExerciseContext => ({
    ...makeCtx(settings),
    instrument,
    progress: {},
    limit: 20,
    now: 0,
  });

  it.each([GUITAR, BASS].flatMap((i) => (['major', 'blues'] as const).map((s) => [i, s] as const)))(
    'buildQueue: 20 itens distintos e no pool (%#)',
    (instrument, scale) => {
      const ctx = ctxFor(instrument, { scale, scaleBox: 'all' });
      const qa = sd().buildQueue(ctx) as ScaleDegreeQuestion[];
      const degKeys = scaleDegreePool(scale, 'all', instrument).map(scaleDegreeKey);
      expect(qa).toHaveLength(20);
      const ka = qa.map((q) => sd().itemKey(q, instrument));
      expect(new Set(ka).size).toBe(20);
      for (const k of ka) expect(degKeys).toContain(k);
      for (const q of qa) {
        expect(q.root >= 0 && q.root <= 11).toBe(true);
        expect(scaleDegreeTarget(q, instrument)).toBeDefined();
      }

      const qb = sp().buildQueue(ctx) as ScalePlayItem[];
      const playKeys = scalePlayPool(scale, 'all').map(scalePlayKey);
      expect(qb).toHaveLength(20);
      const kb = qb.map((q) => sp().itemKey(q, instrument));
      expect(new Set(kb).size).toBe(20);
      for (const k of kb) expect(playKeys).toContain(k);
      for (const q of qb) {
        for (const n of scaleBox(q.scale, q.box, q.root, instrument).notes) {
          expect(n.position.fret >= 1 && n.position.fret <= 24).toBe(true);
        }
      }
    },
  );

  it('a revisão prioriza os vencidos', () => {
    const pool = scalePlayPool('pent-minor', 'all');
    expect(pool).toHaveLength(60);
    const due = pool.slice(0, 5).map(scalePlayKey);
    const progress: ProgressMap = {};
    for (const item of pool) {
      const k = scalePlayKey(item);
      progress[k] = due.includes(k)
        ? { box: 1, correct: 0, wrong: 1, lastReview: 0, nextReview: -1000 }
        : { box: 1, correct: 1, wrong: 0, lastReview: 0, nextReview: 10 ** 12 };
    }
    const queue = sp().buildQueue({ ...makeCtx({ scaleBox: 'all' }), progress, limit: 20, now: 0 });
    const keysOut = queue.map((q) => sp().itemKey(q, GUITAR));
    for (const k of due) expect(keysOut).toContain(k);
  });

  it('chaves dos itens', () => {
    expect(sd().itemKey({ scale: 'pent-minor', box: 1, string: 3, degree: 1, root: 9 }, GUITAR)).toBe(
      'scaledeg:pent-minor:1:3:1',
    );
    expect(sp().itemKey({ scale: 'major', root: 8, box: 7 }, GUITAR)).toBe('scaleplay:major:8:7');
  });

  it('prepareSound carrega as posições de cada pergunta', () => {
    const prepare = vi.fn();
    const sound = { prepare } as unknown as Parameters<Exercise['prepareSound']>[0];
    sd().prepareSound(sound, [{ scale: 'pent-minor', box: 1, string: 3, degree: 1, root: 9 }], GUITAR);
    expect(prepare).toHaveBeenLastCalledWith([{ string: 3, fret: 5 }]);
    sp().prepareSound(sound, [{ scale: 'pent-minor', root: 9, box: 1 }], GUITAR);
    expect(prepare.mock.lastCall![0]).toHaveLength(12);
  });
});

describe('harmonia', () => {
  const hc = () => exerciseFor('harmony-chord');
  const hd = () => exerciseFor('harmony-degree');
  const hq = () => exerciseFor('harmony-quality');

  it('questionCount segue o tamanho do pool', () => {
    expect(hc().questionCount(makeCtx())).toBe(18);
    expect(hd().questionCount(makeCtx())).toBe(18);
    expect(hc().questionCount(makeCtx({ harmonyField: 'both', harmonyKeys: 'all' }))).toBe(144);
    expect(hd().questionCount(makeCtx({ harmonyField: 'both', harmonyKeys: 'all' }))).toBe(144);
    expect(hq().questionCount(makeCtx())).toBe(7);
    expect(hq().questionCount(makeCtx({ harmonyField: 'both' }))).toBe(14);
  });

  it('nunca bloqueiam o início e não iniciam por uma posição', () => {
    for (const ex of [hc(), hd(), hq()]) {
      expect(ex.startBlockers(makeCtx({ soundEnabled: false }))).toEqual([]);
      expect(ex.startBlockers(makeCtx())).toEqual([]);
      expect(ex.startsFromPosition(makeCtx())).toBe(false);
      expect(ex.historyLevel).toBeUndefined();
    }
  });

  const ctxFor = (instrument: typeof GUITAR, settings: Partial<Settings>): ExerciseContext => ({
    ...makeCtx(settings),
    instrument,
    progress: {},
    limit: 20,
    now: 0,
  });

  it.each([GUITAR, BASS])('buildQueue: filas distintas e dentro do pool (%#)', (instrument) => {
    const ctx = ctxFor(instrument, { harmonyField: 'both', harmonyKeys: 'all', harmonySevenths: true });
    const qc = hc().buildQueue(ctx) as HarmonyItem[];
    const kc = qc.map((q) => hc().itemKey(q, instrument));
    expect(qc).toHaveLength(20);
    expect(new Set(kc).size).toBe(20);
    expect(kc.every(isHarmonyChordKey)).toBe(true);
    const qd = hd().buildQueue(ctx) as HarmonyItem[];
    const kd = qd.map((q) => hd().itemKey(q, instrument));
    expect(qd).toHaveLength(20);
    expect(new Set(kd).size).toBe(20);
    expect(kd.every(isHarmonyDegreeKey)).toBe(true);

    const qq = hq().buildQueue(ctx) as QualityQuestion[];
    expect(qq).toHaveLength(14);
    for (const q of qq) expect(harmonyKeys(q.field, 'all')).toContain(q.key);
    const easy = hq().buildQueue(ctxFor(instrument, { harmonyField: 'both', harmonyKeys: 'easy' })) as QualityQuestion[];
    for (const q of easy) expect(harmonyKeys(q.field, 'easy')).toContain(q.key);
  });

  it('a revisão prioriza os vencidos', () => {
    const pool = harmonyPool('both', 'all');
    expect(pool).toHaveLength(144);
    const due = pool.slice(0, 5).map(harmonyChordKey);
    const progress: ProgressMap = {};
    for (const item of pool) {
      const k = harmonyChordKey(item);
      progress[k] = due.includes(k)
        ? { box: 1, correct: 0, wrong: 1, lastReview: 0, nextReview: -1000 }
        : { box: 1, correct: 1, wrong: 0, lastReview: 0, nextReview: 10 ** 12 };
    }
    const queue = hc().buildQueue({
      ...makeCtx({ harmonyField: 'both', harmonyKeys: 'all' }),
      progress,
      limit: 20,
      now: 0,
    });
    const got = queue.map((q) => hc().itemKey(q, GUITAR));
    for (const k of due) expect(got).toContain(k);
  });

  it('chaves dos itens', () => {
    const item = { field: 'major' as const, key: 5, degree: 4 };
    expect(hc().itemKey(item, GUITAR)).toBe('hchord:major:5:4');
    expect(hd().itemKey(item, GUITAR)).toBe('hdeg:major:5:4');
    expect(hq().itemKey({ field: 'minor', sevenths: false, degree: 3, key: 9 }, GUITAR)).toBe('hqual:minor:triad:3');
  });

  it('prepareSound carrega as alturas do acorde', () => {
    const preparePitches = vi.fn();
    const sound = { preparePitches } as unknown as Parameters<Exercise['prepareSound']>[0];
    hc().prepareSound(sound, [{ field: 'major', key: 5, degree: 4 }], GUITAR);
    expect(preparePitches).toHaveBeenLastCalledWith([46, 50, 53, 57]);
  });
});

describe('acordes', () => {
  const cn = () => exerciseFor('chord-name');
  const cp = () => exerciseFor('chord-play');
  const BASS_MSG = 'Acordes são só para violão. Troque para Violão em Ajustes.';
  const bassCtx = (settings: Partial<Settings> = {}): ExerciseContext => ({ ...makeCtx(settings), instrument: BASS });

  it('questionCount segue o tamanho do pool no violão e é 0 no baixo', () => {
    for (const ex of [cn(), cp()]) {
      expect(ex.questionCount(makeCtx())).toBe(8);
      expect(ex.questionCount(makeCtx({ chordShapes: 'barre', chordKinds: 'both' }))).toBe(120);
      expect(ex.questionCount(makeCtx({ chordShapes: 'all', chordKinds: 'sevenths' }))).toBe(83);
      expect(ex.questionCount(bassCtx())).toBe(0);
      expect(ex.questionCount(bassCtx({ chordShapes: 'all', chordKinds: 'both' }))).toBe(0);
    }
  });

  it('bloqueiam só no baixo e não iniciam por uma posição', () => {
    for (const ex of [cn(), cp()]) {
      expect(ex.startBlockers(makeCtx())).toEqual([]);
      expect(ex.startBlockers(makeCtx({ soundEnabled: false }))).toEqual([]);
      expect(ex.startBlockers(bassCtx())).toEqual([BASS_MSG]);
      expect(ex.startsFromPosition(makeCtx())).toBe(false);
      expect(ex.historyLevel).toBeUndefined();
    }
  });

  const ctxAll = (): ExerciseContext => ({
    ...makeCtx({ chordShapes: 'all', chordKinds: 'both' }),
    progress: {},
    limit: 20,
    now: 0,
  });

  it('buildQueue: filas distintas e dentro do pool', () => {
    const qn = cn().buildQueue(ctxAll()) as ChordNameQuestion[];
    const kn = qn.map((q) => cn().itemKey(q, GUITAR));
    expect(qn).toHaveLength(20);
    expect(new Set(kn).size).toBe(20);
    expect(kn.every(isChordNameKey)).toBe(true);
    for (const q of qn) expect(q.options).toHaveLength(4);
    const qp = cp().buildQueue(ctxAll());
    const kp = qp.map((q) => cp().itemKey(q, GUITAR));
    expect(qp).toHaveLength(20);
    expect(new Set(kp).size).toBe(20);
    expect(kp.every(isChordPlayKey)).toBe(true);
  });

  it('a revisão prioriza os vencidos', () => {
    const pool = chordPool('all', 'both');
    expect(pool).toHaveLength(139);
    const due = pool.slice(0, 5).map((i) => cp().itemKey(i, GUITAR));
    const progress: ProgressMap = {};
    for (const item of pool) {
      const k = cp().itemKey(item, GUITAR);
      progress[k] = due.includes(k)
        ? { box: 1, correct: 0, wrong: 1, lastReview: 0, nextReview: -1000 }
        : { box: 1, correct: 1, wrong: 0, lastReview: 0, nextReview: 10 ** 12 };
    }
    const queue = cp().buildQueue({ ...ctxAll(), progress });
    const got = queue.map((q) => cp().itemKey(q, GUITAR));
    for (const k of due) expect(got).toContain(k);
  });

  it('chaves dos itens', () => {
    expect(cn().itemKey({ shape: 'am7', root: 9 }, GUITAR)).toBe('chordname:am7:9');
    expect(cp().itemKey({ shape: 'am7', root: 9 }, GUITAR)).toBe('chordplay:am7:9');
  });

  it('prepareSound carrega as alturas do desenho', () => {
    const preparePitches = vi.fn();
    const sound = { preparePitches } as unknown as Parameters<Exercise['prepareSound']>[0];
    for (const ex of [cn(), cp()]) {
      ex.prepareSound(sound, [{ shape: 'c', root: 0 }], GUITAR);
      expect(preparePitches).toHaveBeenLastCalledWith([48, 52, 55, 60, 64]);
    }
  });
});
