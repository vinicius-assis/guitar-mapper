import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppProvider } from '../../state/AppState';
import { seededStorage } from '../../test-utils';
import { ConfirmProvider } from '../ConfirmDialog';
import { Progress } from './Progress';

const entry = (box: 1 | 2 | 3 | 4 | 5) => ({
  box,
  correct: 1,
  wrong: 0,
  lastReview: 0,
  nextReview: 0,
});

describe('Progress', () => {
  it('summarises mastery over the 144 positions from fret 1', () => {
    const storage = seededStorage({
      progress: { '6-1': entry(5), '5-1': entry(1), '4-1': entry(2) },
    });
    render(
      <AppProvider storage={storage}>
        <ConfirmProvider>
          <Progress onSelect={() => {}} />
        </ConfirmProvider>
      </AppProvider>,
    );
    expect(screen.getByText('Dominadas: 1')).toBeInTheDocument();
    expect(screen.getByText('Errando: 1')).toBeInTheDocument();
    expect(screen.getByText('Aprendendo: 1')).toBeInTheDocument();
    expect(screen.getByText('Nunca vistas: 141')).toBeInTheDocument();
  });

  it('does not draw the open-string column', () => {
    const { container } = render(
      <AppProvider storage={seededStorage()}>
        <ConfirmProvider>
          <Progress onSelect={() => {}} />
        </ConfirmProvider>
      </AppProvider>,
    );
    expect(container.querySelector('[data-testid="cell-6-0"]')).toBeNull();
    expect(container.querySelector('[data-testid="cell-6-1"]')).not.toBeNull();
  });

  it('colours positions by mastery and reports taps', () => {
    const onSelect = vi.fn();
    const storage = seededStorage({ progress: { '6-1': entry(5) } });
    const { container } = render(
      <AppProvider storage={storage}>
        <ConfirmProvider>
          <Progress onSelect={onSelect} />
        </ConfirmProvider>
      </AppProvider>,
    );
    expect(container.querySelectorAll('.mark--mastered')).toHaveLength(1);
    expect(container.querySelectorAll('.mark--unseen')).toHaveLength(143);
    fireEvent.click(screen.getByTestId('cell-6-1'));
    expect(onSelect).toHaveBeenCalledWith({ string: 6, fret: 1 });
  });

  describe('history', () => {
    const history = [
      { mode: 'flashcard' as const, at: new Date(2026, 9, 24, 19, 5).getTime(), total: 18, correct: 14, averageMs: 4200 },
      { mode: 'position-to-note' as const, at: new Date(2026, 9, 23, 8, 30).getTime(), total: 3, correct: 1, averageMs: 2000 },
    ];
    const renderWith = (h = history) => {
      const storage = seededStorage({ history: h });
      render(
        <AppProvider storage={storage}>
          <ConfirmProvider>
            <Progress onSelect={() => {}} />
          </ConfirmProvider>
        </AppProvider>,
      );
      return storage;
    };

    it('says there are no sessions yet, with no clear button', () => {
      renderWith([]);
      expect(screen.getByText('Nenhuma sessão ainda.')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Limpar histórico' })).not.toBeInTheDocument();
    });

    it('lists type, percentage, score and average time, newest first', () => {
      renderWith();
      const items = screen.getAllByRole('listitem').filter((li) => li.closest('.history'));
      expect(items).toHaveLength(2);
      expect(items[0]).toHaveTextContent('Flashcard');
      expect(items[0]).toHaveTextContent('78%');
      expect(items[0]).toHaveTextContent('14/18');
      expect(items[0]).toHaveTextContent('4,2 s');
      expect(items[1]).toHaveTextContent('Posição → nota');
      expect(items[1]).toHaveTextContent('33%');
    });

    it('clears the history only after confirming in the dialog, keeping the progress', async () => {
      const storage = seededStorage({ history, progress: { '6-1': entry(5) } });
      render(
        <AppProvider storage={storage}>
          <ConfirmProvider>
            <Progress onSelect={() => {}} />
          </ConfirmProvider>
        </AppProvider>,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Limpar histórico' }));
      const dialog = screen.getByRole('alertdialog', { name: 'Limpar o histórico?' });
      expect(dialog).toHaveTextContent('Isso não pode ser desfeito.');
      fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
      await act(async () => {});
      expect(JSON.parse(storage.dump()['guitar-mapper:v1']).history).toHaveLength(2);
      fireEvent.click(screen.getByRole('button', { name: 'Limpar histórico' }));
      fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Limpar' }));
      await act(async () => {});
      const saved = JSON.parse(storage.dump()['guitar-mapper:v1']);
      expect(saved.history).toEqual([]);
      expect(Object.keys(saved.progress)).toEqual(['6-1']);
      expect(screen.getByText('Nenhuma sessão ainda.')).toBeInTheDocument();
    });
  });
});
