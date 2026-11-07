import { BASS } from '../../domain/instruments';
import { positionsInFilter } from '../../domain/fretboard';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AppProvider } from '../../state/AppState';
import { readSaved, seededStorage } from '../../test-utils';
import { Focus } from './Focus';

function setup() {
  const storage = seededStorage();
  render(
    <AppProvider storage={storage}>
      <Focus />
    </AppProvider>,
  );
  return storage;
}

describe('Focus', () => {
  it('shows how many positions are in focus', () => {
    setup();
    expect(screen.getByTestId('count')).toHaveTextContent(/^\d+ posições no foco$/);
  });

  it('toggles strings', () => {
    const storage = setup();
    const chip = screen.getByRole('button', { name: 'Corda 6' });
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    expect(readSaved(storage).settings.filter.strings).toEqual([1, 2, 3, 4, 5]);
  });

  it('warns when no string is selected', () => {
    setup();
    for (let s = 1; s <= 6; s++) fireEvent.click(screen.getByRole('button', { name: `Corda ${s}` }));
    expect(screen.getByTestId('count')).toHaveTextContent('0 posições no foco');
    expect(screen.getByText(/Nenhuma posição/)).toBeInTheDocument();
  });

  it('applies fret presets', () => {
    const storage = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Casas 5–12' }));
    expect(screen.getByLabelText('Casa inicial')).toHaveValue('5');
    expect(screen.getByLabelText('Casa final')).toHaveValue('12');
    expect(readSaved(storage).settings.filter).toMatchObject({ fretMin: 5, fretMax: 12 });
  });

  it('keeps the range ordered when one end crosses the other', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Casas 5–12' }));
    fireEvent.change(screen.getByLabelText('Casa final'), { target: { value: '2' } });
    expect(screen.getByLabelText('Casa inicial')).toHaveValue('2');
    expect(screen.getByLabelText('Casa final')).toHaveValue('2');
  });

  it('offers frets from 1 and a 1–5 preset (no open string)', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Casas 1–5' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: 'Casas 0–5' })).not.toBeInTheDocument();
    const options = [...screen.getByLabelText('Casa inicial').querySelectorAll('option')].map((o) => o.value);
    expect(options[0]).toBe('1');
    expect(options).not.toContain('0');
  });

  it('toggles naturals-only', () => {
    const storage = setup();
    fireEvent.click(screen.getByLabelText('Só notas naturais'));
    expect(readSaved(storage).settings.filter.naturalsOnly).toBe(false);
  });
});

describe('Focus (bass)', () => {
  it('shows 4 string chips and counts bass positions', () => {
    const storage = seededStorage({ instrument: 'bass', settings: { instrument: 'bass' } });
    render(
      <AppProvider storage={storage}>
        <Focus />
      </AppProvider>,
    );
    for (let s = 1; s <= 4; s++) expect(screen.getByRole('button', { name: `Corda ${s}` })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Corda 5' })).not.toBeInTheDocument();
    const filter = readSaved(storage, 'bass').settings.filter;
    expect(screen.getByTestId('count')).toHaveTextContent(`${positionsInFilter(filter, BASS).length} posições`);
  });
});

describe('Focus in interval mode', () => {
  function setupInterval() {
    const storage = seededStorage({ settings: { mode: 'interval' } });
    render(
      <AppProvider storage={storage}>
        <Focus />
      </AppProvider>,
    );
    return storage;
  }

  it('Acordes selects the chord tones and is pressed only for that set', () => {
    const storage = setupInterval();
    const chip = screen.getByRole('button', { name: 'Acordes' });
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Todos' }));
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(readSaved(storage).settings.intervals).toEqual(['3m', '3M', '5J', '7m', '7M']);
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows interval controls instead of strings and frets', () => {
    setupInterval();
    expect(screen.getByRole('button', { name: 'Todos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '5ª J' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '2ª m' })).toHaveAttribute('aria-pressed', 'false');
    for (const n of ['Naturais', 'Manual', '3 s', '5 s']) {
      expect(screen.getByRole('button', { name: n })).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: 'Corda 1' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Casa inicial')).not.toBeInTheDocument();
  });

  it('toggles intervals, naturals and persists the advance', () => {
    const storage = setupInterval();
    fireEvent.click(screen.getByRole('button', { name: '2ª m' }));
    expect(readSaved(storage).settings.intervals).toContain('2m');
    fireEvent.click(screen.getByRole('button', { name: 'Com acidentais' }));
    expect(readSaved(storage).settings.filter.naturalsOnly).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: '3 s' }));
    expect(readSaved(storage).settings.intervalAdvance).toBe('3s');
    fireEvent.click(screen.getByRole('button', { name: 'Todos' }));
    expect(screen.getByRole('button', { name: 'Trítono' })).toHaveAttribute('aria-pressed', 'true');
  });
});
