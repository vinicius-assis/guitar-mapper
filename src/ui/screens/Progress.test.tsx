import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import type { HistoryEntry } from '../../domain/session';
import { AppProvider } from '../../state/AppState';
import { mockBoardWidth, mockViewport, readSaved, seededStorage } from '../../test-utils';
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
      const saved = () => readSaved(storage);
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

    it('shows the label of the scale modes, with no level', () => {
      renderWith([{ mode: 'scale-play', at: 9, total: 4, correct: 2, averageMs: 3000 }]);
      const items = screen.getAllByRole('listitem').filter((li) => li.closest('.history'));
      expect(items[0]).toHaveTextContent('Toque a escala');
    });

    it('shows the level next to the new ear modes', () => {
      renderWith([{ mode: 'ear-interval', level: 'medium', at: 9, total: 4, correct: 2, averageMs: 3000 }]);
      const items = screen.getAllByRole('listitem').filter((li) => li.closest('.history'));
      expect(items[0]).toHaveTextContent('Ouvir intervalos · Médio');
    });

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
      expect(readSaved(storage).history).toHaveLength(2);
      fireEvent.click(screen.getByRole('button', { name: 'Limpar histórico' }));
      fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Limpar' }));
      await act(async () => {});
      const saved = readSaved(storage);
      expect(saved.history).toEqual([]);
      expect(Object.keys(saved.progress)).toEqual(['6-1']);
      expect(screen.getByText('Nenhuma sessão ainda.')).toBeInTheDocument();
    });
  });
});

describe('Progress layout by width', () => {
  let viewport: ReturnType<typeof mockViewport> | null = null;
  let board: ReturnType<typeof mockBoardWidth> | null = null;
  afterEach(() => {
    viewport?.restore();
    board?.restore();
  });
  function renderAt(width: number, boardWidth: number) {
    viewport = mockViewport(width);
    board = mockBoardWidth(boardWidth);
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
    const { container } = renderAt(390, 330);
    expect(container.querySelector('svg')!.getAttribute('width')).toBe(String(24 * 56));
  });

  it('tablet: the map never gets narrower than 56px per fret (it scrolls)', () => {
    const { container } = renderAt(800, 700);
    expect(container.querySelector('svg')!.getAttribute('width')).toBe(String(24 * 56));
  });

  it('desktop: the 24 frets fill the column without scrolling and the history sits in its own column', () => {
    const { container } = renderAt(1280, 624);
    expect(container.querySelector('svg')!.getAttribute('width')).toBe(String(24 * 26));
    const main = container.querySelector('.progress-main')!;
    const side = container.querySelector('.progress-side')!;
    expect(main.querySelector('svg')).not.toBeNull();
    expect(within(side as HTMLElement).getByRole('heading', { name: 'Histórico' })).toBeInTheDocument();
    expect(within(side as HTMLElement).getByRole('button', { name: 'Zerar progresso' })).toBeInTheDocument();
    expect(main.querySelector('.legend')).not.toBeNull();
  });
});

describe('Progress (bass)', () => {
  function renderBass(progress = {}, guitarProgress = {}) {
    const storage = seededStorage({ instrument: 'guitar', settings: { instrument: 'bass' }, progress: guitarProgress });
    const data = JSON.parse(storage.getItem('guitar-mapper:v2')!);
    data.instruments.bass.progress = progress;
    storage.setItem('guitar-mapper:v2', JSON.stringify(data));
    return render(
      <AppProvider storage={storage}>
        <ConfirmProvider>
          <Progress onSelect={() => {}} />
        </ConfirmProvider>
      </AppProvider>,
    );
  }

  it('maps 4 strings x 24 frets, labelled G D A E', () => {
    const { container } = renderBass();
    expect(container.querySelectorAll('.mark')).toHaveLength(96);
    const labels = [1, 2, 3, 4].map((n) => screen.getByTestId(`string-label-${n}`).textContent);
    expect(labels).toEqual(['G', 'D', 'A', 'E']);
  });

  it("does not show the guitar's progress", () => {
    // '1-3' existe nos dois braços; com o violão ativo conta como dominada.
    renderBass({}, { '1-3': entry(5) });
    expect(screen.getByText('Nunca vistas: 96')).toBeInTheDocument();
    expect(screen.getByText('Dominadas: 0')).toBeInTheDocument();
    cleanup();
    render(
      <AppProvider storage={seededStorage({ progress: { '1-3': entry(5) } })}>
        <ConfirmProvider>
          <Progress onSelect={() => {}} />
        </ConfirmProvider>
      </AppProvider>,
    );
    expect(screen.getByText('Dominadas: 1')).toBeInTheDocument();
  });
});

describe('Progress consistency block', () => {
  const day = { sessions: 1, answered: 2, correct: 2, ms: 4000 };
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 7, 12, 0));
  });
  afterEach(() => vi.useRealTimers());

  function renderWith(overrides: Parameters<typeof seededStorage>[0]) {
    render(
      <AppProvider storage={seededStorage(overrides)}>
        <ConfirmProvider>
          <Progress onSelect={() => {}} />
        </ConfirmProvider>
      </AppProvider>,
    );
  }

  it('shows only the starter text when nothing was studied', () => {
    renderWith({});
    expect(screen.getByText('Termine uma sessão para começar a contar.')).toBeInTheDocument();
    expect(screen.queryByText(/Dias seguidos/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Tempo médio/)).not.toBeInTheDocument();
  });

  it('shows streak, week and average time', () => {
    renderWith({
      stats: { '2026-11-05': day, '2026-11-06': day, '2026-11-07': day },
    });
    expect(screen.getByText('Dias seguidos: 3')).toBeInTheDocument();
    expect(screen.getByText('Esta semana: 3 de 5 dias')).toBeInTheDocument();
    expect(screen.getByText('Tempo médio (7 dias): 2,0 s')).toBeInTheDocument();
  });

  it('uses the weekly goal setting', () => {
    renderWith({ stats: { '2026-11-07': day }, settings: { weeklyGoal: 3 } });
    expect(screen.getByText('Esta semana: 1 de 3 dias')).toBeInTheDocument();
  });

  it('uses the singular for a weekly goal of 1', () => {
    renderWith({ stats: { '2026-11-07': day }, settings: { weeklyGoal: 1 } });
    expect(screen.getByText('Esta semana: 1 de 1 dia')).toBeInTheDocument();
    expect(screen.queryByText(/1 dias/)).not.toBeInTheDocument();
  });

  it('keeps the streak when only yesterday was studied', () => {
    renderWith({ stats: { '2026-11-06': day } });
    expect(screen.getByText('Dias seguidos: 1')).toBeInTheDocument();
  });
});
