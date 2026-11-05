import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  createMemoryStorage,
  createThrowingStorage,
  readSaved,
  seededStorage,
} from '../test-utils';
import type { PositionProgress } from '../domain/scheduler';
import { AppProvider, useAppState } from './AppState';

const okProgress: PositionProgress = { box: 3, correct: 2, wrong: 1, lastReview: 10, nextReview: 20 };

function Probe() {
  const s = useAppState();
  return (
    <div>
      <button onClick={() => s.recordAnswer({ string: 6, fret: 0 }, true)}>right</button>
      <button onClick={() => s.recordAnswer({ string: 6, fret: 0 }, false)}>wrong</button>
      <button onClick={() => s.updateSettings({ leftHanded: true })}>lefty</button>
      <button onClick={() => s.resetProgress()}>reset</button>
      <button onClick={() => s.recordSession({ mode: 'flashcard', at: 7, total: 2, correct: 1, averageMs: 900 })}>
        session
      </button>
      <button onClick={() => s.clearHistory()}>clear history</button>
      <output data-testid="history">{s.data.history.length}</output>
      <output data-testid="box">{s.data.progress['6-0']?.box ?? 'none'}</output>
      <output data-testid="avail">{String(s.storageAvailable)}</output>
      <output data-testid="left">{String(s.data.settings.leftHanded)}</output>
    </div>
  );
}

const renderWith = (storage: Parameters<typeof AppProvider>[0]['storage'], now = () => 1000) =>
  render(
    <AppProvider storage={storage} now={now}>
      <Probe />
    </AppProvider>,
  );

describe('AppProvider', () => {
  it('records answers and persists them synchronously', () => {
    const storage = createMemoryStorage();
    renderWith(storage);
    fireEvent.click(screen.getByText('right'));
    expect(screen.getByTestId('box')).toHaveTextContent('2');
    expect(readSaved(storage).progress['6-0'].box).toBe(2);
    fireEvent.click(screen.getByText('wrong'));
    expect(screen.getByTestId('box')).toHaveTextContent('1');
  });

  it('applies two answers in the same tick without losing the first', () => {
    const storage = createMemoryStorage();
    renderWith(storage);
    const right = screen.getByText('right');
    fireEvent.click(right);
    fireEvent.click(right);
    expect(readSaved(storage).progress['6-0'].correct).toBe(2);
  });

  it('merges settings patches and persists them', () => {
    const storage = createMemoryStorage();
    renderWith(storage);
    fireEvent.click(screen.getByText('lefty'));
    expect(screen.getByTestId('left')).toHaveTextContent('true');
    expect(readSaved(storage).settings.leftHanded).toBe(true);
  });

  it('resets progress but keeps settings', () => {
    const storage = createMemoryStorage();
    renderWith(storage);
    fireEvent.click(screen.getByText('lefty'));
    fireEvent.click(screen.getByText('right'));
    fireEvent.click(screen.getByText('reset'));
    expect(screen.getByTestId('box')).toHaveTextContent('none');
    expect(readSaved(storage).settings.leftHanded).toBe(true);
    expect(readSaved(storage).progress).toEqual({});
  });

  it('keeps working in memory when there is no storage', () => {
    renderWith(null);
    expect(screen.getByTestId('avail')).toHaveTextContent('false');
    fireEvent.click(screen.getByText('right'));
    expect(screen.getByTestId('box')).toHaveTextContent('2');
  });

  it('flags storage as unavailable when a write throws, and keeps working', () => {
    renderWith(createThrowingStorage('write'));
    expect(screen.getByTestId('avail')).toHaveTextContent('true');
    fireEvent.click(screen.getByText('right'));
    expect(screen.getByTestId('avail')).toHaveTextContent('false');
    expect(screen.getByTestId('box')).toHaveTextContent('2');
  });

  it('records sessions into the history, persists them, and clears them without touching progress', () => {
    const storage = createMemoryStorage();
    renderWith(storage);
    fireEvent.click(screen.getByText('right'));
    fireEvent.click(screen.getByText('session'));
    fireEvent.click(screen.getByText('session'));
    expect(screen.getByTestId('history')).toHaveTextContent('2');
    expect(readSaved(storage).history).toHaveLength(2);
    fireEvent.click(screen.getByText('clear history'));
    expect(screen.getByTestId('history')).toHaveTextContent('0');
    expect(readSaved(storage).history).toEqual([]);
    expect(screen.getByTestId('box')).toHaveTextContent('2');
  });

  it('resetting progress keeps the history', () => {
    renderWith(createMemoryStorage());
    fireEvent.click(screen.getByText('session'));
    fireEvent.click(screen.getByText('reset'));
    expect(screen.getByTestId('history')).toHaveTextContent('1');
  });
});

describe('active instrument', () => {
  const entry = { mode: 'flashcard', at: 7, total: 2, correct: 1, averageMs: 900 } as const;
  const filter = { strings: [3], fretMin: 2, fretMax: 7, naturalsOnly: false };
  let api: ReturnType<typeof useAppState>;
  function Capture() {
    api = useAppState();
    return null;
  }
  const mount = (storage: ReturnType<typeof createMemoryStorage>) =>
    render(
      <AppProvider storage={storage} now={() => 1000}>
        <Capture />
      </AppProvider>,
    );

  it('switches to the bass with its own filter, empty progress and keeps the guitar intact', () => {
    const storage = seededStorage({ progress: { '6-3': okProgress } });
    mount(storage);
    act(() => api.updateSettings({ instrument: 'bass' }));
    expect(api.instrument.id).toBe('bass');
    expect(api.data.settings.filter.strings).toEqual([1, 2, 3, 4]);
    expect(api.data.progress).toEqual({});
    act(() => api.updateSettings({ instrument: 'guitar' }));
    expect(api.instrument.id).toBe('guitar');
    expect(api.data.progress['6-3']).toEqual(okProgress);
  });

  it('records bass answers only in the bass bucket', () => {
    const storage = seededStorage({ progress: { '6-3': okProgress } });
    mount(storage);
    act(() => api.updateSettings({ instrument: 'bass' }));
    act(() => api.recordAnswer({ string: 4, fret: 3 }, true));
    expect(readSaved(storage, 'bass').progress['4-3'].box).toBe(2);
    expect(readSaved(storage, 'guitar').progress).toEqual({ '6-3': okProgress });
  });

  it('keeps filters, history, reset and clear separate per instrument', () => {
    const storage = seededStorage({ progress: { '6-3': okProgress }, history: [entry] });
    mount(storage);
    const guitarFilter = readSaved(storage, 'guitar').settings.filter;
    act(() => api.updateSettings({ instrument: 'bass' }));
    act(() => api.updateSettings({ filter }));
    act(() => api.recordSession(entry));
    act(() => api.recordAnswer({ string: 4, fret: 3 }, true));
    expect(readSaved(storage, 'bass').history).toEqual([entry]);
    expect(readSaved(storage, 'guitar').history).toEqual([entry]);
    expect(readSaved(storage, 'guitar').settings.filter).toEqual(guitarFilter);
    expect(readSaved(storage, 'bass').settings.filter).toEqual(filter);
    act(() => api.resetProgress());
    act(() => api.clearHistory());
    expect(readSaved(storage, 'bass').progress).toEqual({});
    expect(readSaved(storage, 'bass').history).toEqual([]);
    expect(readSaved(storage, 'guitar').progress).toEqual({ '6-3': okProgress });
    expect(readSaved(storage, 'guitar').history).toEqual([entry]);
  });

  it('persists the active instrument across reloads', () => {
    const storage = createMemoryStorage();
    const first = mount(storage);
    act(() => api.updateSettings({ instrument: 'bass' }));
    first.unmount();
    mount(storage);
    expect(api.instrument.id).toBe('bass');
  });
});

describe('interval settings', () => {
  it('are global: persisted once and unchanged when switching instruments', () => {
    const storage = createMemoryStorage();
    let api!: ReturnType<typeof useAppState>;
    function Capture() {
      api = useAppState();
      return null;
    }
    render(
      <AppProvider storage={storage} now={() => 1000}>
        <Capture />
      </AppProvider>,
    );
    act(() => api.updateSettings({ intervals: ['5J'], intervalAdvance: '3s' }));
    act(() => api.updateSettings({ instrument: 'bass' }));
    expect(api.data.settings.intervals).toEqual(['5J']);
    expect(api.data.settings.intervalAdvance).toBe('3s');
    const saved = JSON.parse(storage.getItem('guitar-mapper:v2')!);
    expect(saved.settings.intervals).toEqual(['5J']);
    expect(saved.settings.intervalAdvance).toBe('3s');
    expect(saved.instruments.guitar).not.toHaveProperty('intervals');
    expect(saved.instruments.bass).not.toHaveProperty('intervals');
  });
});
