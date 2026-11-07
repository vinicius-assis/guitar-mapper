import { describe, expect, it } from 'vitest';
import { QUIZ_MODES } from '../domain/exercises';
import { noteAt, positionKey, positionsInFilter, type Position } from '../domain/fretboard';
import { GUITAR } from '../domain/instruments';
import { uniquePitchPositions } from '../domain/pitch';
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
    expect(exerciseFor('position-to-note').itemKey({ string: 3, fret: 5 })).toBe('3-5');
    expect(exerciseFor('interval').itemKey({ root: 0, interval: '5J' })).toBe('0:5J');
  });
});
