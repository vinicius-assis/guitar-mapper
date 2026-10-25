import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import type { HistoryEntry } from '../../domain/session';
import { AppProvider } from '../../state/AppState';
import { mockViewport, seededStorage } from '../../test-utils';
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

  describe('reset', () => {
    const renderWith = () => {
      const storage = seededStorage({
        progress: { '6-1': entry(5), '5-1': entry(1) },
        history: [{ mode: 'flashcard', at: 5, total: 2, correct: 1, averageMs: 1000 }],
      });
      render(
        <AppProvider storage={storage}>
          <ConfirmProvider>
            <Progress onSelect={() => {}} />
          </ConfirmProvider>
        </AppProvider>,
      );
      return storage;
    };

    it('puts Zerar progresso right below the map and its legend, before the history', () => {
      renderWith();
      const button = screen.getByRole('button', { name: 'Zerar progresso' });
      const legend = document.querySelector('.legend')!;
      const historyTitle = screen.getByRole('heading', { name: 'Histórico' });
      expect(legend.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(button.compareDocumentPosition(historyTitle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('resets the progress only after confirming, keeping the history', async () => {
      const storage = renderWith();
      const saved = () => JSON.parse(storage.dump()['guitar-mapper:v1']);
      fireEvent.click(screen.getByRole('button', { name: 'Zerar progresso' }));
      const dialog = screen.getByRole('alertdialog', { name: 'Zerar o progresso?' });
      expect(dialog).toHaveTextContent('Isso não pode ser desfeito.');
      fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
      await act(async () => {});
      expect(Object.keys(saved().progress)).toHaveLength(2);

      fireEvent.click(screen.getByRole('button', { name: 'Zerar progresso' }));
      fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Zerar' }));
      await act(async () => {});
      expect(saved().progress).toEqual({});
      expect(saved().history).toHaveLength(1);
      expect(screen.getByText('Nunca vistas: 144')).toBeInTheDocument();
    });
  });

  describe('history', () => {
    const history = [
      { mode: 'flashcard' as const, at: new Date(2026, 9, 24, 19, 5).getTime(), total: 18, correct: 14, averageMs: 4200 },
      { mode: 'position-to-note' as const, at: new Date(2026, 9, 23, 8, 30).getTime(), total: 3, correct: 1, averageMs: 2000 },
    ];
    const renderWith = (h: HistoryEntry[] = history) => {
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

    it('shows the level next to Ouvido sessions only', () => {
      renderWith([
        { mode: 'ear', level: 'hard', at: 9, total: 4, correct: 2, averageMs: 3000 },
        { mode: 'flashcard', at: 8, total: 2, correct: 1, averageMs: 1000 },
      ]);
      const items = screen.getAllByRole('listitem').filter((li) => li.closest('.history'));
      expect(items[0]).toHaveTextContent('Ouvido · Difícil');
      expect(items[1]).toHaveTextContent('Flashcard');
      expect(items[1].querySelector('strong')!.textContent).toBe('Flashcard');
    });

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

describe('Progress layout by width', () => {
  let viewport: ReturnType<typeof mockViewport> | null = null;
  afterEach(() => viewport?.restore());
  function renderAt(width: number) {
    viewport = mockViewport(width);
    return render(
      <AppProvider
        storage={seededStorage({
          history: [{ mode: 'flashcard', at: 5, total: 2, correct: 1, averageMs: 1000 }],
        })}
      >
        <ConfirmProvider>
          <Progress onSelect={() => {}} />
        </ConfirmProvider>
      </AppProvider>,
    );
  }

  it('phone: the map keeps its natural size', () => {
    const { container } = renderAt(390);
    const svg = container.querySelector('svg')!;
    expect(svg.style.width).toBe('');
  });

  it('tablet: the map scales to the column', () => {
    const { container } = renderAt(800);
    const svg = container.querySelector('svg')!;
    expect(svg.style.width).toBe('100%');
    expect(svg.style.minWidth).toBe(`${24 * 56}px`);
  });

  it('desktop: the 24 frets fit without scrolling and the history sits in its own column', () => {
    const { container } = renderAt(1280);
    const svg = container.querySelector('svg')!;
    expect(svg.style.width).toBe('100%');
    expect(svg.style.minWidth).toBe(`${24 * 24}px`);
    const main = container.querySelector('.progress-main')!;
    const side = container.querySelector('.progress-side')!;
    expect(main.querySelector('svg')).not.toBeNull();
    expect(within(side as HTMLElement).getByRole('heading', { name: 'Histórico' })).toBeInTheDocument();
    expect(within(side as HTMLElement).getByRole('button', { name: 'Zerar progresso' })).toBeInTheDocument();
    expect(main.querySelector('.legend')).not.toBeNull();
  });
});
