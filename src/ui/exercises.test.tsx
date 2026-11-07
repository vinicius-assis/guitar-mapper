import { describe, expect, it } from 'vitest';
import { QUIZ_MODES } from '../domain/exercises';
import { noteAt, positionKey, positionsInFilter, type Position } from '../domain/fretboard';
import { GUITAR } from '../domain/instruments';
import { intervalItems } from '../domain/intervals';
import { ALL_NOTES } from '../domain/notes';
import { pitchOf, uniquePitchPositions } from '../domain/pitch';
import type { PositionProgress, ProgressMap } from '../domain/scheduler';
import { activeView, createDefaultData, type Settings } from '../state/storage';
import { mulberry32 } from '../test-utils';
import { EXERCISES, exerciseFor, type ExerciseContext } from './exercises';

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
