import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, it, expect } from 'vitest';
import { AppProvider } from '../state/AppState';
import { readRawSettings, seededStorage } from '../test-utils';
import { useIntervalFocus } from './useIntervalFocus';

function setup(settings = {}) {
  const storage = seededStorage({ settings: { mode: 'interval', ...settings } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AppProvider storage={storage}>{children}</AppProvider>
  );
  return { storage, ...renderHook(() => useIntervalFocus(), { wrapper }) };
}

describe('useIntervalFocus', () => {
  it('counts naturals x intervals with the defaults', () => {
    const { result } = setup();
    expect(result.current.intervals).toEqual(['3m', '3M', '5J', '7m', '7M']);
    expect(result.current.advance).toBe('manual');
    expect(result.current.count).toBe(35);
  });

  it('adds an interval keeping INTERVALS order', () => {
    const { result } = setup();
    act(() => result.current.toggleInterval('2m'));
    expect(result.current.count).toBe(42);
    expect(result.current.intervals[0]).toBe('2m');
  });

  it('toggling twice restores the initial state', () => {
    const { result } = setup();
    act(() => result.current.toggleInterval('5J'));
    act(() => result.current.toggleInterval('5J'));
    expect(result.current.intervals).toEqual(['3m', '3M', '5J', '7m', '7M']);
  });

  it('selects all intervals', () => {
    const { result } = setup();
    act(() => result.current.selectAllIntervals());
    expect(result.current.count).toBe(77);
  });

  it('uses 12 notes with accidentals', () => {
    const { result } = setup({ filter: { strings: [1], fretMin: 1, fretMax: 5, naturalsOnly: false } });
    expect(result.current.count).toBe(60);
  });

  it('persists the advance', () => {
    const { result, storage } = setup();
    act(() => result.current.setAdvance('3s'));
    expect(result.current.advance).toBe('3s');
    expect(readRawSettings(storage).intervalAdvance).toBe('3s');
  });
});
