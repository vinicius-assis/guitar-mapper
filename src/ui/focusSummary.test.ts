import { describe, it, expect } from 'vitest';
import type { Filter } from '../domain/fretboard';
import { describeFocus } from './focusSummary';

const base: Filter = { strings: [1, 2, 3, 4, 5, 6], fretMin: 1, fretMax: 5, naturalsOnly: true };

describe('describeFocus', () => {
  it('summarises the default focus', () => {
    expect(describeFocus(base)).toEqual({ strings: 'todas', frets: '1–5', notes: 'só naturais' });
  });

  it('lists a subset of strings', () => {
    expect(describeFocus({ ...base, strings: [6] }).strings).toBe('6');
    expect(describeFocus({ ...base, strings: [5, 6] }).strings).toBe('5 e 6');
    expect(describeFocus({ ...base, strings: [1, 3, 6] }).strings).toBe('1, 3 e 6');
  });

  it('shows a single fret once', () => {
    expect(describeFocus({ ...base, fretMin: 12, fretMax: 12 }).frets).toBe('12');
  });

  it('mentions accidentals when they are on', () => {
    expect(describeFocus({ ...base, naturalsOnly: false }).notes).toBe('com acidentais');
  });
});
