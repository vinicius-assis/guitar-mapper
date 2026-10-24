import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AppProvider } from '../../state/AppState';
import { readSaved, seededStorage } from '../../test-utils';
import type { Settings } from '../../state/storage';
import { Study } from './Study';

// Uma única posição candidata: corda 6, casa 0 (nota E) → sorteio determinístico.
const SINGLE: Settings['filter'] = { strings: [6], fretMin: 0, fretMax: 0, naturalsOnly: true };

function setup(settings: Partial<Settings> = {}, forced?: { string: number; fret: number }) {
  const storage = seededStorage({ settings: { notation: 'cifra', filter: SINGLE, ...settings } });
  render(
    <AppProvider storage={storage}>
      <Study forced={forced ?? null} />
    </AppProvider>,
  );
  return storage;
}

describe('Study', () => {
  it('explains what is missing when the filter has no positions', () => {
    setup({ filter: { ...SINGLE, strings: [] } });
    expect(screen.getByText(/Nenhuma posição no foco/)).toBeInTheDocument();
  });

  it('explains it too when naturals-only leaves nothing (A# on string 5 fret 1)', () => {
    setup({ filter: { strings: [5], fretMin: 1, fretMax: 1, naturalsOnly: true } });
    expect(screen.getByText(/Nenhuma posição no foco/)).toBeInTheDocument();
  });

  it('multiple choice: a correct answer gives feedback and saves progress', () => {
    const storage = setup();
    expect(screen.getByText('Qual é esta nota?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'E' }));
    expect(screen.getByText('Correto!')).toBeInTheDocument();
    expect(readSaved(storage).progress['6-0'].box).toBe(2);
    expect(screen.getByText(/Acertos 1\/1/)).toBeInTheDocument();
  });

  it('multiple choice: a wrong answer shows the right note and a Próxima button', () => {
    const storage = setup();
    const wrong = screen
      .getAllByRole('button')
      .find((b) => b.classList.contains('option') && b.textContent !== 'E')!;
    fireEvent.click(wrong);
    expect(screen.getByText('Era E')).toBeInTheDocument();
    expect(readSaved(storage).progress['6-0'].box).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));
    expect(screen.getByText('Qual é esta nota?')).toBeInTheDocument();
    expect(screen.queryByText('Era E')).not.toBeInTheDocument();
  });

  it('find mode: tapping the right cell is correct, another cell is wrong', () => {
    const storage = setup({ mode: 'note-to-position' });
    expect(screen.getByText('Encontre E na corda 6')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cell-6-0'));
    expect(screen.getByText('Correto!')).toBeInTheDocument();
    expect(readSaved(storage).progress['6-0'].box).toBe(2);
  });

  it('find mode: a wrong tap saves a miss', () => {
    const storage = setup({ mode: 'note-to-position' });
    fireEvent.click(screen.getByTestId('cell-5-0'));
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeInTheDocument();
    expect(readSaved(storage).progress['6-0'].box).toBe(1);
  });

  it('flashcard: reveal then self-grade', () => {
    const storage = setup({ mode: 'flashcard' });
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar nota' }));
    fireEvent.click(screen.getByRole('button', { name: 'Acertei' }));
    expect(readSaved(storage).progress['6-0'].box).toBe(2);
    expect(screen.getByRole('button', { name: 'Mostrar nota' })).toBeInTheDocument();
  });

  it('switches mode from the mode bar and remembers it', () => {
    const storage = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Flashcard' }));
    expect(screen.getByRole('button', { name: 'Mostrar nota' })).toBeInTheDocument();
    expect(readSaved(storage).settings.mode).toBe('flashcard');
  });

  it('starts on the forced position even if it is outside the filter', () => {
    setup({ mode: 'note-to-position' }, { string: 3, fret: 7 });
    expect(screen.getByText('Encontre D na corda 3')).toBeInTheDocument();
  });
});
