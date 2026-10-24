import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  createMemoryStorage,
  createThrowingStorage,
  readSaved,
} from '../test-utils';
import { AppProvider, useAppState } from './AppState';

function Probe() {
  const s = useAppState();
  return (
    <div>
      <button onClick={() => s.recordAnswer({ string: 6, fret: 0 }, true)}>right</button>
      <button onClick={() => s.recordAnswer({ string: 6, fret: 0 }, false)}>wrong</button>
      <button onClick={() => s.updateSettings({ leftHanded: true })}>lefty</button>
      <button onClick={() => s.resetProgress()}>reset</button>
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
});
