import { describe, expect, it } from 'vitest';
import { QUIZ_MODES } from '../../domain/exercises';
import { SWEEP_GROUPS, sweepModes } from './sweepHarness';

sweepModes(SWEEP_GROUPS.braco);

describe('sweep groups', () => {
  it('cover every registered exercise exactly once', () => {
    const swept = Object.values(SWEEP_GROUPS).flat();
    expect([...swept].sort()).toEqual([...QUIZ_MODES].sort());
  });
});
