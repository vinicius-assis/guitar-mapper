import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { AppProvider, useAppState } from '../../state/AppState';
import { mockBoardWidth, mockViewport, readRawSettings, readSaved, seededStorage } from '../../test-utils';
import type { Settings } from '../../state/storage';
import { SoundProvider } from '../../audio/SoundProvider';
import type { NotePlayer } from '../../audio/player';
import { ConfirmProvider } from '../ConfirmDialog';
import { BASS, GUITAR } from '../../domain/instruments';
import { dayKey } from '../../domain/stats';
import { positionsInFilter } from '../../domain/fretboard';
import { uniquePitchPositions } from '../../domain/pitch';
import { defaultFilterFor } from '../../state/storage';
import { EXERCISE_META, TRACKS } from '../../domain/exercises';
import { Study } from './Study';

// Uma única posição candidata: corda 6, casa 12 (nota E).
const SINGLE: Settings['filter'] = { strings: [6], fretMin: 12, fretMax: 12, naturalsOnly: true };
// Três posições naturais na corda 6: casa 1 (F), casa 3 (G), casa 5 (A).
const WIDE_FILTER: Settings['filter'] = {
  strings: [1, 2, 3, 4, 5, 6],
  fretMin: 1,
  fretMax: 5,
  naturalsOnly: true,
};
const THREE: Settings['filter'] = { strings: [6], fretMin: 1, fretMax: 5, naturalsOnly: true };

const fakePlayer = (): NotePlayer => ({ unlock: vi.fn(), prepare: vi.fn(), play: vi.fn() });

function setup(
  settings: Partial<Settings> = {},
  forced?: { string: number; fret: number },
  onSessionChange: (running: boolean) => void = () => {},
  player: NotePlayer = fakePlayer(),
) {
  const storage = seededStorage({ settings: { notation: 'cifra', filter: SINGLE, ...settings } });
  render(
    <AppProvider storage={storage}>
      <ConfirmProvider>
        <SoundProvider player={player}>
          <Study forced={forced ?? null} onSessionChange={onSessionChange} />
        </SoundProvider>
      </ConfirmProvider>
    </AppProvider>,
  );
  return storage;
}

function setupWithPlayer(
  settings: Partial<Settings> = {},
  forced?: { string: number; fret: number },
  player: NotePlayer = fakePlayer(),
) {
  const storage = setup(settings, forced, undefined, player);
  return { storage, player };
}

function chooseMode(label: string) {
  fireEvent.click(screen.getByRole('button', { name: 'Menu de exercícios' }));
  fireEvent.click(screen.getByRole('menuitemradio', { name: label }));
}

const start = () => fireEvent.click(screen.getByRole('button', { name: /Iniciar/ }));
/** Toca no ■ e confirma no diálogo. */
async function finalize() {
  fireEvent.click(screen.getByRole('button', { name: 'Finalizar' }));
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Finalizar' }));
  await act(async () => {});
}
const tick = (ms: number) => act(() => void vi.setSystemTime(Date.now() + ms));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(1_000_000);
});
afterEach(() => vi.useRealTimers());

describe('Study: before the session', () => {
  it('waits for the Iniciar button and says how many questions there will be', () => {
    setup({ filter: THREE });
    expect(screen.getByRole('group', { name: 'Foco' })).toHaveTextContent('3 perguntas');
    expect(screen.queryByText('Qual é esta nota?')).not.toBeInTheDocument();
    start();
    expect(screen.getByText('Qual é esta nota?')).toBeInTheDocument();
  });

  it('describes the selected exercise and follows the mode', () => {
    setup({ mode: 'position-to-note' });
    expect(screen.getByText(/escolha a nota entre 4 opções/)).toBeInTheDocument();
    chooseMode('Nota → posição');
    expect(screen.queryByText(/escolha a nota entre 4 opções/)).not.toBeInTheDocument();
    expect(screen.getByText(/toca no braço onde ela está/)).toBeInTheDocument();
    chooseMode('Flashcard');
    expect(screen.getByText(/lembrar a nota de cabeça antes de revelar/)).toBeInTheDocument();
  });

  it('the Iniciar button has a decorative play icon and the plain accessible name', () => {
    setup();
    const button = screen.getByRole('button', { name: 'Iniciar' });
    expect(button).toHaveClass('start');
    expect(button.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  });

  it('uses the singular for one question', () => {
    setup();
    expect(screen.getByRole('group', { name: 'Foco' })).toHaveTextContent('1 pergunta');
  });

  it('explains what is missing when the filter has no positions, and cannot start', () => {
    setup({ filter: { ...SINGLE, strings: [] } });
    expect(screen.getByText(/Nenhuma posição no foco/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar/ })).toBeDisabled();
  });

  it('explains it too when naturals-only leaves nothing (A# on string 5 fret 1)', () => {
    setup({ filter: { strings: [5], fretMin: 1, fretMax: 1, naturalsOnly: true } });
    expect(screen.getByText(/Nenhuma posição no foco/)).toBeInTheDocument();
  });

  it('switching mode shows that mode start screen and remembers the mode', () => {
    const storage = setup();
    chooseMode('Flashcard');
    expect(screen.getByRole('button', { name: /Iniciar/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mostrar nota' })).not.toBeInTheDocument();
    expect(readSaved(storage).settings.mode).toBe('flashcard');
    start();
    expect(screen.getByRole('button', { name: 'Mostrar nota' })).toBeInTheDocument();
  });
});

describe('Study: answering', () => {
  it('multiple choice: a correct answer gives feedback and saves progress', () => {
    const storage = setup();
    start();
    fireEvent.click(screen.getByRole('button', { name: 'E' }));
    expect(screen.getByText('Correto!')).toBeInTheDocument();
    expect(readSaved(storage).progress['6-12'].box).toBe(2);
    expect(screen.getByLabelText('Acertos: 1')).toHaveTextContent('1');
    expect(screen.getByLabelText('Erros: 0')).toBeInTheDocument();
  });

  it('multiple choice: a wrong answer shows the right note and a Próxima button', () => {
    const storage = setup();
    start();
    const wrong = screen
      .getAllByRole('button')
      .find((b) => b.classList.contains('option') && b.textContent !== 'E')!;
    fireEvent.click(wrong);
    expect(screen.queryByText('Era E')).not.toBeInTheDocument();
    // a resposta certa é marcada nas opções e anunciada só para leitores de tela
    expect(screen.getByRole('button', { name: 'E' })).toHaveClass('option--correct');
    expect(screen.getByRole('status')).toHaveClass('sr-only');
    expect(screen.getByRole('status')).toHaveTextContent('Errado. A resposta certa é E.');
    expect(readSaved(storage).progress['6-12'].box).toBe(1);
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeInTheDocument();
  });

  it('find mode: tapping the right cell is correct, another cell is wrong', () => {
    const storage = setup({ mode: 'note-to-position' });
    start();
    expect(screen.getByText('Encontre E na corda 6')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cell-6-12'));
    expect(screen.getByText('Correto!')).toBeInTheDocument();
    expect(readSaved(storage).progress['6-12'].box).toBe(2);
  });

  it('find mode: a wrong tap saves a miss', () => {
    const storage = setup({ mode: 'note-to-position' });
    start();
    fireEvent.click(screen.getByTestId('cell-5-12'));
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeInTheDocument();
    expect(readSaved(storage).progress['6-12'].box).toBe(1);
  });

  it('flashcard: reveal then self-grade', () => {
    const storage = setup({ mode: 'flashcard' });
    start();
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar nota' }));
    fireEvent.click(screen.getByRole('button', { name: 'Acertei' }));
    expect(readSaved(storage).progress['6-12'].box).toBe(2);
  });
});

describe('Study: a session', () => {
  /** Responde a pergunta atual no flashcard depois de `ms` e devolve nada. */
  function flash(ms: number, grade: 'Acertei' | 'Errei') {
    tick(ms);
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar nota' }));
    fireEvent.click(screen.getByRole('button', { name: grade }));
  }

  it('asks every position once, never repeating, then shows the summary', () => {
    setup({ mode: 'note-to-position', filter: THREE });
    start();
    const asked: string[] = [];
    for (let i = 0; i < 3; i++) {
      asked.push(screen.getByText(/^Encontre /).textContent!);
      fireEvent.click(screen.getByTestId('cell-1-1')); // errada: outra corda
      fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));
    }
    expect([...asked].sort()).toEqual(['Encontre A na corda 6', 'Encontre F na corda 6', 'Encontre G na corda 6']);
    expect(screen.getByText('Sessão concluída')).toBeInTheDocument();
  });

  it('shows hits, percentage and the average answer time', () => {
    setup({ mode: 'flashcard', filter: THREE });
    start();
    expect(screen.getByText(/Pergunta 1 de 3/)).toBeInTheDocument();
    flash(2000, 'Acertei');
    expect(screen.getByText(/Pergunta 2 de 3/)).toBeInTheDocument();
    flash(4000, 'Errei');
    flash(3000, 'Acertei');
    expect(screen.getByText('Sessão concluída')).toBeInTheDocument();
    expect(screen.getByText('Acertos: 2 de 3 (67%)')).toBeInTheDocument();
    expect(screen.getByText('Tempo médio por resposta: 3,0 s')).toBeInTheDocument();
  });

  it('saves the finished session in the history', () => {
    const storage = setup({ mode: 'flashcard', filter: THREE });
    start();
    flash(2000, 'Acertei');
    flash(2000, 'Acertei');
    flash(2000, 'Errei');
    const [entry] = readSaved(storage).history;
    expect(entry).toMatchObject({ mode: 'flashcard', total: 3, correct: 2, averageMs: 2000 });
    expect(entry.at).toBe(1_006_000);
  });

  it('Finalizar ends early and summarizes only what was answered', async () => {
    const storage = setup({ mode: 'flashcard', filter: THREE });
    start();
    flash(1000, 'Acertei');
    await finalize();
    expect(screen.getByText('Acertos: 1 de 1 (100%)')).toBeInTheDocument();
    expect(readSaved(storage).history[0]).toMatchObject({ total: 1, correct: 1 });
  });

  it('Finalizar asks for confirmation in a dialog and keeps the session going when cancelled', async () => {
    setup({ mode: 'flashcard', filter: THREE });
    start();
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Finalizar a sessão?' });
    expect(dialog).toHaveTextContent('O resultado até aqui será salvo no histórico.');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    await act(async () => {});
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Sessão concluída')).not.toBeInTheDocument();
    expect(screen.getByText(/Pergunta 1 de 3/)).toBeInTheDocument();
  });

  it('shows hits, misses, streak and a progress bar while running', () => {
    setup({ mode: 'flashcard', filter: THREE });
    start();
    const bar = screen.getByRole('progressbar', { name: 'Progresso da sessão' });
    expect(bar).toHaveAttribute('aria-valuenow', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '3');
    flash(1000, 'Acertei');
    flash(1000, 'Errei');
    expect(bar).toHaveAttribute('aria-valuenow', '2');
    expect(screen.getByLabelText('Acertos: 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Erros: 1')).toBeInTheDocument();
    expect(screen.getByText('Sequência 0')).toBeInTheDocument();
  });

  it('the Finalizar button is an icon-only button with a stop icon', () => {
    setup({ mode: 'flashcard', filter: THREE });
    start();
    const button = screen.getByRole('button', { name: 'Finalizar' });
    expect(button).toHaveClass('stop-button');
    expect(button.textContent).toBe('');
    expect(button.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  });

  it('hides the header while a question is running and brings it back in the summary', async () => {
    setup({ mode: 'flashcard', filter: THREE });
    const modeBar = () => screen.queryByRole('group', { name: 'Exercício' });
    expect(modeBar()).toBeInTheDocument();
    start();
    expect(modeBar()).not.toBeInTheDocument();
    await finalize();
    expect(modeBar()).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Encerrar' }));
    expect(modeBar()).toBeInTheDocument();
  });

  it('tells the app when a session starts and ends', async () => {
    const onSessionChange = vi.fn();
    setup({ mode: 'flashcard', filter: THREE }, undefined, onSessionChange);
    expect(onSessionChange).toHaveBeenLastCalledWith(false);
    start();
    expect(onSessionChange).toHaveBeenLastCalledWith(true);
    await finalize();
    expect(onSessionChange).toHaveBeenLastCalledWith(false);
  });

  it('a forced position reports a running session right away', () => {
    const onSessionChange = vi.fn();
    setup({ mode: 'flashcard' }, { string: 3, fret: 7 }, onSessionChange);
    expect(onSessionChange).toHaveBeenLastCalledWith(true);
  });

  it('keeps the answer feedback and the main action pinned to the bottom', () => {
    setup(); // uma só posição: E, então qualquer outra opção erra
    start();
    const wrong = screen
      .getAllByRole('button')
      .find((b) => b.classList.contains('option') && b.textContent !== 'E')!;
    fireEvent.click(wrong);
    expect(screen.getByRole('button', { name: 'Próxima' }).closest('.quiz-actions')).not.toBeNull();
  });

  it('flashcard pins Mostrar nota and the grading buttons to the bottom', () => {
    setup({ mode: 'flashcard', filter: THREE });
    start();
    const reveal = screen.getByRole('button', { name: 'Mostrar nota' });
    expect(reveal.closest('.quiz-actions')).not.toBeNull();
    fireEvent.click(reveal);
    expect(screen.getByRole('button', { name: 'Acertei' }).closest('.quiz-actions')).not.toBeNull();
  });

  it('Finalizar with no answers shows an empty summary and saves nothing', async () => {
    const storage = setup({ mode: 'flashcard', filter: THREE });
    start();
    await finalize();
    expect(screen.getByText('Nenhuma pergunta respondida.')).toBeInTheDocument();
    expect(readSaved(storage).history).toEqual([]);
  });

  it('Reiniciar restarts the exercise from the first question', async () => {
    setup({ mode: 'flashcard', filter: THREE });
    start();
    flash(1000, 'Acertei');
    await finalize();
    fireEvent.click(screen.getByRole('button', { name: 'Reiniciar' }));
    expect(screen.getByText(/Pergunta 1 de 3/)).toBeInTheDocument();
    expect(screen.getByLabelText('Acertos: 0')).toBeInTheDocument();
  });

  it('Reiniciar has a decorative icon and both summary buttons share a size class', async () => {
    setup({ mode: 'flashcard', filter: THREE });
    start();
    await finalize();
    const restart = screen.getByRole('button', { name: 'Reiniciar' });
    expect(restart.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    expect(restart).toHaveClass('summary-button');
    expect(screen.getByRole('button', { name: 'Encerrar' })).toHaveClass('summary-button');
  });

  it('Encerrar goes back to the start screen of the exercise', async () => {
    setup({ mode: 'flashcard', filter: THREE });
    start();
    await finalize();
    fireEvent.click(screen.getByRole('button', { name: 'Encerrar' }));
    expect(screen.getByRole('button', { name: /Iniciar/ })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Foco' })).toHaveTextContent('3 perguntas');
  });

  it('a forced position starts a session right away, asking it first', () => {
    setup({ mode: 'note-to-position' }, { string: 3, fret: 7 });
    expect(screen.getByText('Encontre D na corda 3')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Iniciar/ })).not.toBeInTheDocument();
  });
});

describe('Study: sound', () => {
  it('multiple choice plays the real pitch of the asked position, even on a wrong answer', () => {
    const { player } = setupWithPlayer();
    start();
    const wrong = screen
      .getAllByRole('button')
      .find((b) => b.classList.contains('option') && b.textContent !== 'E')!;
    fireEvent.click(wrong);
    expect(player.play).toHaveBeenCalledTimes(1);
    expect(player.play).toHaveBeenCalledWith(52); // corda 6 casa 12 = E3
  });

  it('find mode plays the cell that was tapped', () => {
    const { player } = setupWithPlayer({ mode: 'note-to-position' });
    start();
    fireEvent.click(screen.getByTestId('cell-5-12')); // errada: corda 5 casa 12 = A3
    expect(player.play).toHaveBeenCalledTimes(1);
    expect(player.play).toHaveBeenCalledWith(57);
  });

  it('flashcard plays on Mostrar nota only, not on Acertei', () => {
    const { player } = setupWithPlayer({ mode: 'flashcard' });
    start();
    expect(player.play).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar nota' }));
    expect(player.play).toHaveBeenCalledTimes(1);
    expect(player.play).toHaveBeenCalledWith(52);
    fireEvent.click(screen.getByRole('button', { name: 'Acertei' }));
    expect(player.play).toHaveBeenCalledTimes(1);
  });

  it('starting a session unlocks the audio and preloads the queue pitches', () => {
    const { player } = setupWithPlayer({ filter: THREE });
    expect(player.prepare).not.toHaveBeenCalled();
    start();
    expect(player.unlock).toHaveBeenCalled();
    const prepared = vi.mocked(player.prepare).mock.calls[0][0];
    expect([...prepared].sort()).toEqual([41, 43, 45]); // F2, G2, A2
  });

  it('a forced position preloads its pitch right away', () => {
    const { player } = setupWithPlayer({ mode: 'flashcard' }, { string: 3, fret: 7 });
    expect(vi.mocked(player.prepare).mock.calls[0][0][0]).toBe(62); // a forçada abre a fila: corda 3 casa 7 = D4
  });

  it('no sound is requested when the sound is off', () => {
    const { player } = setupWithPlayer({ soundEnabled: false, mode: 'flashcard' });
    start();
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar nota' }));
    expect(player.play).not.toHaveBeenCalled();
    expect(player.prepare).not.toHaveBeenCalled();
  });

  it('keeps working when the player blows up', () => {
    const player = fakePlayer();
    vi.mocked(player.play).mockImplementation(() => {
      throw new Error('boom');
    });
    setupWithPlayer({ mode: 'flashcard' }, undefined, player);
    start();
    expect(() =>
      fireEvent.click(screen.getByRole('button', { name: 'Mostrar nota' })),
    ).not.toThrow();
    expect(screen.getByRole('button', { name: 'Acertei' })).toBeInTheDocument();
  });
});

describe('Study: Ouvido', () => {
  const WIDE: Settings['filter'] = { strings: [1, 2, 3, 4, 5, 6], fretMin: 1, fretMax: 5, naturalsOnly: true };

  it('has the Ouvido mode with a level picker and a description per level', () => {
    const storage = setup({ mode: 'ear' });
    const picker = screen.getByRole('group', { name: 'Nível' });
    const level = (name: string) => within(picker).getByRole('button', { name });
    expect(level('Fácil')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('2 opções, com notas bem diferentes. Para começar a reconhecer o som.')).toBeInTheDocument();
    fireEvent.click(level('Médio'));
    expect(level('Médio')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('4 opções, incluindo notas vizinhas. Você pode ouvir 5 vezes cada nota.')).toBeInTheDocument();
    fireEvent.click(level('Difícil'));
    expect(screen.getByText('Sem dicas: todas as notas do seu foco são opções. Você pode ouvir 2 vezes cada nota.')).toBeInTheDocument();
    expect(readSaved(storage).settings.earLevel).toBe('hard');
  });

  it('the Ouvido button is in the mode bar and the level picker only shows in that mode', () => {
    setup();
    expect(screen.queryByRole('group', { name: 'Nível' })).not.toBeInTheDocument();
    chooseMode('Ouvido');
    expect(screen.getByRole('group', { name: 'Nível' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar/ })).toBeEnabled();
  });

  it('plays the first question on start, hides the board, saves no position progress, and records the level', async () => {
    const { storage, player } = setupWithPlayer({ mode: 'ear', earLevel: 'medium' });
    start();
    expect(player.unlock).toHaveBeenCalled();
    expect(player.play).toHaveBeenCalledWith(52); // corda 6 casa 12 = E3
    expect(screen.queryByRole('group', { name: 'Braço da guitarra' })).not.toBeInTheDocument();
    const wrong = screen
      .getAllByRole('button')
      .find((b) => b.classList.contains('option') && b.textContent !== 'E')!;
    fireEvent.click(wrong);
    expect(readSaved(storage).progress).toEqual({});
    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));
    await act(async () => {});
    expect(screen.getByText('Sessão concluída')).toBeInTheDocument();
    expect(readSaved(storage).history[0]).toMatchObject({ mode: 'ear', level: 'medium', total: 1, correct: 0 });
  });

  it('without sound the exercise cannot start and says why', () => {
    setup({ mode: 'ear', soundEnabled: false });
    expect(screen.getByText('Ligue o Som em Ajustes para treinar de ouvido.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar/ })).toBeDisabled();
  });

  it('a position opened from Progresso does not start an ear session without sound', () => {
    setup({ mode: 'ear', soundEnabled: false }, { string: 3, fret: 7 });
    expect(screen.getByRole('button', { name: /Iniciar/ })).toBeDisabled();
    expect(screen.queryByText(/Pergunta 1 de/)).not.toBeInTheDocument();
  });

  it('never repeats the same note twice in a row in the queue', () => {
    for (let run = 0; run < 8; run++) {
      const { player } = setupWithPlayer({ mode: 'ear', filter: WIDE });
      start();
      const queue = vi.mocked(player.prepare).mock.calls[0][0];
      expect(queue.length).toBeGreaterThan(10);
      for (let i = 1; i < queue.length; i++) expect(queue[i] % 12).not.toBe(queue[i - 1] % 12);
      cleanup();
    }
  });
});

describe('Study: focus sheet', () => {
  const sheet = () => screen.getByRole('group', { name: 'Foco' });
  const bar = () => within(sheet()).getByRole('button', { name: /^Foco/ });
  const open = () => fireEvent.click(bar());

  it('has no Alterar foco button (the values are edited right here)', () => {
    setup({ filter: THREE });
    expect(screen.queryByRole('button', { name: 'Alterar foco' })).not.toBeInTheDocument();
  });

  it('starts closed, with the count and a one-line summary', () => {
    setup({ filter: THREE });
    expect(bar()).toHaveAttribute('aria-expanded', 'false');
    expect(sheet()).toHaveTextContent('3 perguntas');
    expect(sheet()).toHaveTextContent('Cordas 6 · Casas 1–5 · Naturais');
    expect(screen.queryByRole('button', { name: 'Corda 6' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('focus-backdrop')).not.toBeInTheDocument();
  });

  it('summarises all strings and accidentals', () => {
    setup({ filter: { strings: [1, 2, 3, 4, 5, 6], fretMin: 1, fretMax: 5, naturalsOnly: false } });
    expect(sheet()).toHaveTextContent('Todas as cordas · Casas 1–5 · Com acidentais');
  });

  it('the question count is plain text, not a badge that looks editable', () => {
    setup({ filter: THREE });
    const closedCount = within(sheet()).getByText('3 perguntas');
    expect(closedCount).toHaveClass('static-value');
    expect(closedCount).not.toHaveClass('badge');
    open();
    const row = within(sheet()).getByText('Perguntas').nextElementSibling!;
    expect(row.querySelector('.static-value')).toHaveTextContent('3');
    expect(row.querySelector('.badge, button')).toBeNull();
  });

  it('while open, the bar does not repeat the count and the summary shown in the card', () => {
    setup({ filter: THREE });
    open();
    expect(within(sheet()).queryByText('3 perguntas')).not.toBeInTheDocument();
    expect(within(sheet()).queryByText(/Cordas 6 · Casas 1–5/)).not.toBeInTheDocument();
    expect(bar()).toHaveTextContent('Foco');
    fireEvent.click(bar());
    expect(within(sheet()).getByText('3 perguntas')).toBeInTheDocument();
    expect(within(sheet()).getByText(/Cordas 6 · Casas 1–5/)).toBeInTheDocument();
  });

  it('is one expanding card: the header stays on top and the body opens below it, with no bar underneath', () => {
    setup({ filter: THREE });
    open();
    const card = sheet();
    const head = bar();
    const body = card.querySelector('dl')!;
    expect(card.firstElementChild).toBe(head);
    expect(head.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(card.querySelectorAll('[aria-expanded]')).toHaveLength(1);
    expect(card.lastElementChild).toBe(card.querySelector('.focus-card__body'));
    expect(card).toHaveClass('focus-card--open');
  });

  it('puts each label on its own line above its options', () => {
    setup({ filter: THREE });
    open();
    for (const label of ['Cordas', 'Casas', 'De / até', 'Notas']) {
      const term = within(sheet()).getByText(label);
      expect(term.tagName).toBe('DT');
      expect(term.nextElementSibling!.tagName).toBe('DD');
    }
    expect(sheet().querySelector('dl')).toHaveClass('focus-rows--stacked');
  });

  it('opens on tap with the editable values and a dimmed backdrop', () => {
    setup({ filter: THREE });
    open();
    expect(bar()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('focus-backdrop')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Corda 6' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Corda 1' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByLabelText('Casa inicial')).toHaveValue('1');
    expect(screen.getByLabelText('Casa final')).toHaveValue('5');
    expect(screen.getByRole('button', { name: 'Naturais' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('closes with the backdrop, the bar again, and Escape', () => {
    setup({ filter: THREE });
    open();
    fireEvent.click(screen.getByTestId('focus-backdrop'));
    expect(bar()).toHaveAttribute('aria-expanded', 'false');
    open();
    fireEvent.click(bar());
    expect(bar()).toHaveAttribute('aria-expanded', 'false');
    open();
    fireEvent.keyDown(sheet(), { key: 'Escape' });
    expect(bar()).toHaveAttribute('aria-expanded', 'false');
  });

  it('edits the strings, saves them and updates the count', () => {
    const storage = setup({ filter: WIDE_FILTER });
    expect(sheet()).toHaveTextContent('18 perguntas');
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Corda 6' }));
    expect(readSaved(storage).settings.filter.strings).toEqual([1, 2, 3, 4, 5]);
    expect(sheet()).toHaveTextContent('Perguntas15');
    fireEvent.click(screen.getByRole('button', { name: 'Todas' }));
    expect(readSaved(storage).settings.filter.strings).toEqual([1, 2, 3, 4, 5, 6]);
    expect(sheet()).toHaveTextContent('Perguntas18');
  });

  it('edits the frets with the presets and the selects, keeping the range ordered', () => {
    const storage = setup({ filter: WIDE_FILTER });
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Casas 5–12' }));
    expect(readSaved(storage).settings.filter).toMatchObject({ fretMin: 5, fretMax: 12 });
    expect(screen.getByLabelText('Casa inicial')).toHaveValue('5');
    fireEvent.change(screen.getByLabelText('Casa final'), { target: { value: '2' } });
    expect(screen.getByLabelText('Casa inicial')).toHaveValue('2');
    expect(readSaved(storage).settings.filter).toMatchObject({ fretMin: 2, fretMax: 2 });
  });

  it('switches between naturals and accidentals', () => {
    const storage = setup({ filter: WIDE_FILTER });
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Com acidentais' }));
    expect(readSaved(storage).settings.filter.naturalsOnly).toBe(false);
    expect(screen.getByRole('button', { name: 'Com acidentais' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Naturais' })).toHaveAttribute('aria-pressed', 'false');
    expect(sheet()).toHaveTextContent('Perguntas30');
  });

  it('with no position left it explains and blocks Iniciar, even while closed', () => {
    setup({ filter: { ...WIDE_FILTER, strings: [] } });
    expect(screen.getByText(/Nenhuma posição no foco/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar/ })).toBeDisabled();
  });

  it('Iniciar stays usable with the sheet open and starts the session', () => {
    setup({ mode: 'flashcard', filter: THREE });
    open();
    start();
    expect(screen.getByText(/Pergunta 1 de 3/)).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Foco' })).not.toBeInTheDocument();
  });
});

describe('Study: header menu', () => {
  const header = () => screen.getByRole('group', { name: 'Exercício' });
  const menuButton = () => within(header()).getByRole('button', { name: 'Menu de exercícios' });

  it('shows the app logo on the left, the current exercise, and the menu button on the right', () => {
    setup({ mode: 'flashcard', filter: THREE });
    const logo = within(header()).getByRole('img', { name: 'Guitar Mapper' });
    expect(header()).toHaveTextContent('Flashcard');
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');
    expect(menuButton()).toHaveAttribute('aria-haspopup', 'menu');
    expect(logo.compareDocumentPosition(menuButton()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('lists the 17 exercises with the current one checked', () => {
    setup({ mode: 'flashcard', filter: THREE });
    fireEvent.click(menuButton());
    expect(menuButton()).toHaveAttribute('aria-expanded', 'true');
    const items = within(screen.getByRole('menu')).getAllByRole('menuitemradio');
    expect(items.map((i) => i.textContent?.replace('✓', ''))).toEqual([
      'Posição → nota',
      'Nota → posição',
      'Flashcard',
      'Ouvido',
      'Ouvir intervalos',
      'Ouvir graus',
      'Intervalos',
      'Grau no desenho',
      'Toque a escala',
      'Arpejo no desenho',
      'Acorde do grau',
      'Grau do acorde',
      'Qualidade do acorde',
      'Nome do acorde',
      'Monte o acorde',
      'Notas-guia',
      'ii–V–I',
    ]);
    expect(items.map((i) => i.getAttribute('aria-checked'))).toEqual([
      'false',
      'false',
      'true',
      'false',
      'false',
      'false',
      'false',
      'false',
      'false',
      'false',
      'false',
      'false',
      'false',
      'false',
      'false',
      'false',
      'false',
    ]);
  });

  it('groups the exercises by track, each group titled and in track order', () => {
    setup({ mode: 'flashcard', filter: THREE });
    fireEvent.click(menuButton());
    const menu = screen.getByRole('menu');
    const labels = (name: string) =>
      within(within(menu).getByRole('group', { name }))
        .getAllByRole('menuitemradio')
        .map((i) => i.textContent?.replace('✓', ''));
    expect(within(menu).getAllByRole('group').map((g) => g.getAttribute('aria-label'))).toEqual([
      'Braço',
      'Ouvido',
      'Teoria',
      'Escalas',
      'Harmonia',
      'Acordes',
    ]);
    expect(labels('Braço')).toEqual(['Posição → nota', 'Nota → posição', 'Flashcard']);
    expect(labels('Ouvido')).toEqual(['Ouvido', 'Ouvir intervalos', 'Ouvir graus']);
    expect(labels('Teoria')).toEqual(['Intervalos']);
    expect(labels('Escalas')).toEqual(['Grau no desenho', 'Toque a escala', 'Arpejo no desenho']);
    expect(labels('Harmonia')).toEqual(['Acorde do grau', 'Grau do acorde', 'Qualidade do acorde']);
    expect(labels('Acordes')).toEqual(['Nome do acorde', 'Monte o acorde', 'Notas-guia', 'ii–V–I']);
    expect(within(menu).getAllByRole('menuitemradio')).toHaveLength(17);
    const braco = within(menu).getByRole('group', { name: 'Braço' });
    expect(braco.querySelector('p.menu__group')).toHaveTextContent('Braço');
  });

  it('choosing an exercise switches mode, saves it, updates the title and closes the menu', () => {
    const storage = setup({ filter: THREE });
    chooseMode('Ouvido');
    expect(readSaved(storage).settings.mode).toBe('ear');
    expect(header()).toHaveTextContent('Ouvido');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Nível' })).toBeInTheDocument();
  });

  it('closes with the backdrop, the button again, and Escape', () => {
    setup({ filter: THREE });
    fireEvent.click(menuButton());
    fireEvent.click(screen.getByTestId('menu-backdrop'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    fireEvent.click(menuButton());
    fireEvent.click(menuButton());
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    fireEvent.click(menuButton());
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('the menu and the focus sheet never stay open together', () => {
    setup({ filter: THREE });
    fireEvent.click(menuButton());
    fireEvent.click(within(screen.getByRole('group', { name: 'Foco' })).getByRole('button', { name: /^Foco/ }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Corda 6' })).toBeInTheDocument();
    fireEvent.click(menuButton());
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Corda 6' })).not.toBeInTheDocument();
  });
});

describe('Study: Ouvido description on the guitar', () => {
  it('uses the same neutral sentence', () => {
    setup({ mode: 'ear' });
    expect(document.querySelector('.mode-description')!.textContent).toBe(
      'Ouça uma nota e descubra qual é. Treina o ouvido, sem ver o braço até responder.',
    );
  });
});

describe('Study: Ouvido counts sounds, not positions', () => {
  const FULL: Settings['filter'] = {
    strings: [1, 2, 3, 4, 5, 6],
    fretMin: 1,
    fretMax: 24,
    naturalsOnly: false,
  };

  it('the Foco card shows 144 questions in the position exercises but 48 sounds in Ouvido', () => {
    const { unmount } = (() => {
      setup({ mode: 'flashcard', filter: FULL });
      return { unmount: () => cleanup() };
    })();
    expect(screen.getByRole('group', { name: 'Foco' })).toHaveTextContent('144 perguntas');
    unmount();
    setup({ mode: 'ear', filter: FULL });
    expect(screen.getByRole('group', { name: 'Foco' })).toHaveTextContent('48 perguntas');
  });

  it('the default focus has 17 sounds out of 18 positions', () => {
    setup({ mode: 'ear', filter: WIDE_FILTER });
    expect(screen.getByRole('group', { name: 'Foco' })).toHaveTextContent('17 perguntas');
  });

  it('an ear session takes up to 20 of the 48 sounds and never repeats a sound', () => {
    const { player } = setupWithPlayer({ mode: 'ear', filter: FULL });
    start();
    expect(screen.getByText('Pergunta 1 de 20')).toBeInTheDocument();
    const pitches = vi.mocked(player.prepare).mock.calls[0][0];
    expect(pitches).toHaveLength(20);
    expect(new Set(pitches).size).toBe(20);
  });
});

describe('Study: desktop layout', () => {
  let viewport: ReturnType<typeof mockViewport>;
  beforeEach(() => {
    viewport = mockViewport(1280);
  });
  afterEach(() => viewport.restore());
  const exercises = () => screen.queryByRole('group', { name: 'Exercício' });

  it('shows the 17 exercises as buttons instead of the menu, and no logo in the header', () => {
    setup({ filter: THREE });
    const group = exercises()!;
    expect(
      within(group)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual([
      'Posição → nota',
      'Nota → posição',
      'Flashcard',
      'Ouvido',
      'Ouvir intervalos',
      'Ouvir graus',
      'Intervalos',
      'Grau no desenho',
      'Toque a escala',
      'Arpejo no desenho',
      'Acorde do grau',
      'Grau do acorde',
      'Qualidade do acorde',
      'Nome do acorde',
      'Monte o acorde',
      'Notas-guia',
      'ii–V–I',
    ]);
    expect(within(group).getByRole('button', { name: 'Posição → nota' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: 'Menu de exercícios' })).not.toBeInTheDocument();
    expect(within(group).queryByRole('img')).not.toBeInTheDocument();
  });

  it('lists the exercise buttons in track order', () => {
    setup({ filter: THREE });
    const order = TRACKS.flatMap((t) => t.modes).map((m) => EXERCISE_META[m].label);
    expect(
      within(exercises()!)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(order);
  });

  it('choosing an exercise switches the mode and saves it', () => {
    const storage = setup({ filter: THREE });
    fireEvent.click(within(exercises()!).getByRole('button', { name: 'Ouvido' }));
    expect(readSaved(storage).settings.mode).toBe('ear');
    expect(within(exercises()!).getByRole('button', { name: 'Ouvido' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('group', { name: 'Nível' })).toBeInTheDocument();
  });

  it('the Foco panel is already open and editable, with no toggle and no backdrop', () => {
    const storage = setup({ filter: WIDE_FILTER });
    const foco = screen.getByRole('group', { name: 'Foco' });
    expect(within(foco).getByRole('button', { name: 'Corda 6' })).toHaveAttribute('aria-pressed', 'true');
    expect(foco.querySelector('[aria-expanded]')).toBeNull();
    expect(screen.queryByTestId('focus-backdrop')).not.toBeInTheDocument();
    expect(foco).toHaveTextContent('Perguntas18');
    fireEvent.click(within(foco).getByRole('button', { name: 'Corda 6' }));
    expect(readSaved(storage).settings.filter.strings).toEqual([1, 2, 3, 4, 5]);
    expect(foco).toHaveTextContent('Perguntas15');
  });

  it('the panel and the exercise buttons disappear during a session and come back after', async () => {
    setup({ mode: 'flashcard', filter: THREE });
    start();
    expect(screen.queryByRole('group', { name: 'Foco' })).not.toBeInTheDocument();
    expect(exercises()).not.toBeInTheDocument();
    await finalize();
    expect(exercises()).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Encerrar' }));
    expect(screen.getByRole('group', { name: 'Foco' })).toBeInTheDocument();
  });

  it('on a phone the menu and the collapsed Foco stay as before', () => {
    viewport.setWidth(390);
    setup({ filter: THREE });
    expect(screen.getByRole('button', { name: 'Menu de exercícios' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Corda 6' })).not.toBeInTheDocument();
  });
});

describe('Study: boards fill the space on tablet and desktop only', () => {
  let viewport: ReturnType<typeof mockViewport>;
  let board: ReturnType<typeof mockBoardWidth>;
  afterEach(() => {
    viewport.restore();
    board.restore();
  });
  const svgWidth = () => document.querySelector('.fretboard svg')!.getAttribute('width');

  it.each([
    [390, 280],
    [800, 700],
    [1280, 860],
  ])('width %i: a 5-fret board measures %i px', (width, expected) => {
    viewport = mockViewport(width);
    board = mockBoardWidth(width === 390 ? 330 : expected);
    setup({ mode: 'flashcard', filter: THREE });
    start();
    expect(svgWidth()).toBe(String(expected));
  });

  it('every exercise board fills the column on tablet', () => {
    viewport = mockViewport(800);
    board = mockBoardWidth(700);
    for (const mode of ['position-to-note', 'note-to-position', 'flashcard'] as const) {
      setup({ mode, filter: THREE });
      start();
      expect(svgWidth(), mode).toBe('700');
      cleanup();
    }
  });
});

describe('Study: keyboard shortcuts', () => {
  const press = (key: string, init: KeyboardEventInit = {}, target: Element = document.body) =>
    fireEvent.keyDown(target, { key, ...init });
  const optionTexts = () =>
    [...document.querySelectorAll('.options:not(.options--two) .option')].map((o) => o.textContent);

  it('Enter on the start screen begins the session; with no positions it does nothing', () => {
    setup({ mode: 'flashcard', filter: THREE });
    press('Enter');
    expect(screen.getByText(/Pergunta 1 de 3/)).toBeInTheDocument();
    cleanup();
    setup({ mode: 'flashcard', filter: { ...THREE, strings: [] } });
    press('Enter');
    expect(screen.queryByText(/Pergunta 1 de/)).not.toBeInTheDocument();
  });

  it('a digit picks that option; Enter then goes to the next question', async () => {
    const storage = setup();
    start();
    const wrongIndex = optionTexts().findIndex((t) => t !== 'E');
    press(String(wrongIndex + 1));
    expect(readSaved(storage).progress['6-12'].box).toBe(1); // errou
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeInTheDocument();
    press('Enter');
    await act(async () => {});
    expect(screen.getByText('Sessão concluída')).toBeInTheDocument();
  });

  it('a digit beyond the number of options does nothing', () => {
    const storage = setup();
    start();
    press('9');
    expect(readSaved(storage).progress).toEqual({});
  });

  it('Enter with a button focused does not fire the shortcut (the browser activates the button)', () => {
    setup();
    start();
    const wrongIndex = optionTexts().findIndex((t) => t !== 'E');
    press(String(wrongIndex + 1));
    const next = screen.getByRole('button', { name: 'Próxima' });
    next.focus();
    press('Enter', {}, next);
    expect(screen.queryByText('Sessão concluída')).not.toBeInTheDocument();
  });

  it('Flashcard: Enter reveals, 1 is Errei and 2 is Acertei', async () => {
    const storage = setup({ mode: 'flashcard' });
    start();
    press('Enter');
    expect(screen.getByRole('button', { name: 'Acertei' })).toBeInTheDocument();
    press('1');
    expect(readSaved(storage).progress['6-12'].box).toBe(1);
    await act(async () => {});
    cleanup();
    const storage2 = setup({ mode: 'flashcard' });
    start();
    press('Enter');
    press('2');
    expect(readSaved(storage2).progress['6-12'].box).toBe(2);
  });

  it('Ouvido: r plays again and respects the listen limit; Ctrl+R is ignored', () => {
    const { player } = setupWithPlayer({ mode: 'ear', earLevel: 'hard' });
    start();
    expect(player.play).toHaveBeenCalledTimes(1);
    press('r', { ctrlKey: true });
    expect(player.play).toHaveBeenCalledTimes(1);
    press('r');
    expect(player.play).toHaveBeenCalledTimes(2);
    press('R');
    expect(player.play).toHaveBeenCalledTimes(2); // Difícil: 2 audições no total
  });

  it('ignores the keys while a dialog is open', async () => {
    const storage = setup({ mode: 'flashcard' });
    start();
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar' }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    press('Enter');
    expect(screen.queryByRole('button', { name: 'Acertei' })).not.toBeInTheDocument();
    press('1');
    expect(readSaved(storage).progress).toEqual({});
  });

  it('ignores the keys while typing in a field', () => {
    const storage = setup();
    start();
    const field = document.createElement('input');
    document.body.appendChild(field);
    field.focus();
    press('1', {}, field);
    press('2', {}, field);
    expect(readSaved(storage).progress).toEqual({});
    field.remove();
  });

  it('ignores digits combined with Ctrl, Alt or Meta', () => {
    const storage = setup();
    start();
    press('1', { ctrlKey: true });
    press('1', { altKey: true });
    press('1', { metaKey: true });
    expect(readSaved(storage).progress).toEqual({});
  });
});

describe('Study: desktop board shows more frets and disables the ones outside the focus', () => {
  let viewport: ReturnType<typeof mockViewport>;
  let board: ReturnType<typeof mockBoardWidth>;
  afterEach(() => {
    viewport.restore();
    board.restore();
  });
  const cell = (s: number, f: number) => screen.queryByTestId(`cell-${s}-${f}`);

  it('desktop: a 1-5 focus shows frets 1 to 12, with 6 to 12 disabled', () => {
    viewport = mockViewport(1280);
    board = mockBoardWidth(864);
    setup({ mode: 'note-to-position', filter: THREE });
    start();
    expect(cell(6, 12)).not.toBeNull();
    expect(cell(6, 3)).toHaveAttribute('role', 'button');
    expect(cell(6, 8)).toHaveClass('cell--disabled');
    expect(cell(6, 8)).not.toHaveAttribute('role');
  });

  it('tapping a disabled fret in Nota → posição is ignored (no answer)', () => {
    viewport = mockViewport(1280);
    board = mockBoardWidth(864);
    const storage = setup({ mode: 'note-to-position', filter: THREE });
    start();
    fireEvent.click(cell(6, 8)!);
    expect(readSaved(storage).progress).toEqual({});
    expect(screen.queryByRole('button', { name: 'Próxima' })).not.toBeInTheDocument();
  });

  it('tablet and phone keep the focus window only', () => {
    for (const width of [800, 390]) {
      viewport = mockViewport(width);
      board = mockBoardWidth(700);
      setup({ mode: 'note-to-position', filter: THREE });
      start();
      expect(cell(6, 8), String(width)).toBeNull();
      cleanup();
      viewport.restore();
      board.restore();
    }
    viewport = mockViewport(390);
    board = mockBoardWidth(330);
  });
});

describe('Study: bass', () => {
  function setupBass(settings: Partial<Settings> = {}) {
    const storage = seededStorage({
      instrument: 'bass',
      settings: { notation: 'cifra', instrument: 'bass', ...settings },
    });
    render(
      <AppProvider storage={storage}>
        <ConfirmProvider>
          <SoundProvider player={fakePlayer()}>
            <Study />
          </SoundProvider>
        </ConfirmProvider>
      </AppProvider>,
    );
    return storage;
  }

  it('starts with the bass focus: all strings and the bass question count', () => {
    setupBass();
    const focus = screen.getByRole('group', { name: 'Foco' });
    expect(focus).toHaveTextContent('Todas as cordas');
    const n = positionsInFilter(defaultFilterFor(BASS), BASS).length;
    expect(focus).toHaveTextContent(`${n} perguntas`);
  });

  it('position-to-note asks about a bass string and the answer is the bass note', () => {
    // corda 4 (E), casa 5 = A no baixo (no violão seria G)
    const storage = setupBass({
      filter: { strings: [4], fretMin: 5, fretMax: 5, naturalsOnly: true },
    });
    start();
    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    expect(readSaved(storage, 'bass').progress['4-5'].correct).toBe(1);
  });

  it('Ouvido description is neutral for the bass (no "violão")', () => {
    setupBass({ mode: 'ear' });
    const text = document.querySelector('.mode-description')!.textContent!;
    expect(text).toBe(
      'Ouça uma nota e descubra qual é. Treina o ouvido, sem ver o braço até responder.',
    );
    expect(text).not.toContain('violão');
  });

  it('Ouvido counts distinct bass sounds', () => {
    setupBass({ mode: 'ear' });
    const f = defaultFilterFor(BASS);
    const n = uniquePitchPositions(positionsInFilter(f, BASS), BASS).length;
    expect(screen.getByRole('group', { name: 'Foco' })).toHaveTextContent(`${n} perguntas`);
  });
});

describe('Study: Intervalos', () => {
  const bass = { instrument: 'bass' as const, mode: 'interval' as const, intervals: ['5J' as const] };
  const NATURALS: Settings['filter'] = { strings: [1, 2, 3, 4], fretMin: 0, fretMax: 12, naturalsOnly: true };

  it('is reachable from the phone menu and shows description and interval chips', () => {
    setup({ filter: NATURALS });
    chooseMode('Intervalos');
    expect(screen.getByText(/escolha a nota de chegada/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Foco/ }));
    expect(screen.queryByText('Corda 1')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /5ª J/ })).toBeInTheDocument();
  });

  it('runs a full session: 7 questions, 12 notes, history entry, no position progress', async () => {
    const storage = setup({ ...bass, filter: NATURALS });
    start();
    expect(screen.getByText('Pergunta 1 de 7')).toBeInTheDocument();
    for (let i = 0; i < 7; i++) {
      expect(document.querySelectorAll('.note-option')).toHaveLength(12);
      const buttons = [...document.querySelectorAll('.note-option')] as HTMLButtonElement[];
      fireEvent.click(i % 2 === 0 ? buttons[0] : buttons[1]);
      fireEvent.click(screen.getByRole('button', { name: /Próxima/ }));
    }
    expect(screen.getByText(/Acertos: \d+ de 7/)).toBeInTheDocument();
    const saved = readSaved(storage, 'bass');
    expect(saved.history).toHaveLength(1);
    expect(saved.history[0]).toMatchObject({ mode: 'interval', total: 7 });
    expect(saved.history[0]).not.toHaveProperty('level');
    expect(saved.progress).toEqual({});
    expect(readSaved(storage, 'guitar').history).toEqual([]);
    expect(readSaved(storage, 'guitar').progress).toEqual({});
  });

  it('prepares the pitches of all questions on start', () => {
    const { player } = setupWithPlayer({ ...bass, filter: NATURALS });
    start();
    expect(player.unlock).toHaveBeenCalled();
    expect(player.prepare).toHaveBeenCalled();
  });

  it('prepares the pitches of the queue', () => {
    const { player } = setupWithPlayer({ ...bass, intervals: ['5J'], filter: NATURALS });
    start();
    const prepared = vi.mocked(player.prepare).mock.calls.flatMap((c) => c[0]);
    expect(prepared).toEqual(expect.arrayContaining([36, 43]));
  });

  it('counts 35 questions for the default intervals (naturals) and 60 with accidentals', () => {
    setup({ instrument: 'bass', mode: 'interval', filter: NATURALS });
    expect(screen.getByText(/35 perguntas/)).toBeInTheDocument();
    cleanup();
    setup({ instrument: 'bass', mode: 'interval', filter: { ...NATURALS, naturalsOnly: false } });
    expect(screen.getByText(/60 perguntas/)).toBeInTheDocument();
  });

  it('starts a 20-question session when the Foco says 35', () => {
    setup({ instrument: 'bass', mode: 'interval', filter: NATURALS });
    expect(screen.getByRole('group', { name: 'Foco' })).toHaveTextContent('35 perguntas');
    start();
    expect(screen.getByText('Pergunta 1 de 20')).toBeInTheDocument();
  });

  it('warns and disables Iniciar when no interval is selected', () => {
    setup({ ...bass, intervals: [], filter: NATURALS });
    expect(
      screen.getByText('Nenhum intervalo no foco. Abra o Foco e marque ao menos um intervalo.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar/ })).toBeDisabled();
  });

  it('ignores a forced position while the saved mode is interval', () => {
    setup({ ...bass, filter: NATURALS }, { string: 4, fret: 3 });
    expect(screen.getByRole('button', { name: /Iniciar/ })).toBeInTheDocument();
    expect(screen.queryByText(/Pergunta/)).not.toBeInTheDocument();
  });

  it('discards the interval session when the instrument changes', () => {
    function Switcher() {
      const { instrument, updateSettings } = useAppState();
      return (
        <>
          <button onClick={() => updateSettings({ instrument: 'guitar' })}>trocar</button>
          <Study key={instrument.id} forced={null} onSessionChange={() => {}} />
        </>
      );
    }
    const storage = seededStorage({ instrument: 'bass', settings: { ...bass, notation: 'cifra', filter: NATURALS } });
    render(
      <AppProvider storage={storage}>
        <ConfirmProvider>
          <SoundProvider player={fakePlayer()}>
            <Switcher />
          </SoundProvider>
        </ConfirmProvider>
      </AppProvider>,
    );
    start();
    expect(screen.getByText(/Pergunta 1 de/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'trocar' }));
    expect(screen.queryByText(/Pergunta/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar/ })).toBeInTheDocument();
  });
});

describe('Study: review sessions of up to 20 questions', () => {
  // Todas as cordas do violão, casas 1–12, com acidentais: 72 posições.
  const FULL12: Settings['filter'] = { strings: [1, 2, 3, 4, 5, 6], fretMin: 1, fretMax: 12, naturalsOnly: false };
  const FIVE: Settings['filter'] = { strings: [6], fretMin: 1, fretMax: 8, naturalsOnly: true }; // F G A B C
  const flashAll = (n: number) => {
    for (let i = 0; i < n; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Mostrar nota' }));
      fireEvent.click(screen.getByRole('button', { name: 'Acertei' }));
    }
  };

  it('the start screen says the session has 20 questions when the focus is larger', () => {
    setup({ mode: 'flashcard', filter: FULL12 });
    expect(screen.getByRole('group', { name: 'Foco' })).toHaveTextContent('72 perguntas');
    const hint = screen.getByText('Sessão de 20 perguntas');
    expect(hint).toHaveClass('hint');
  });

  it('with a 5-position focus the session has 5 questions', () => {
    setup({ mode: 'flashcard', filter: FIVE });
    expect(screen.getByRole('group', { name: 'Foco' })).toHaveTextContent('5 perguntas');
    expect(screen.getByText('Sessão de 5 perguntas')).toBeInTheDocument();
  });

  it('with a 1-position focus the hint is singular', () => {
    setup({ mode: 'flashcard', filter: { strings: [6], fretMin: 1, fretMax: 1, naturalsOnly: true } });
    expect(screen.getByText('Sessão de 1 pergunta')).toBeInTheDocument();
    expect(screen.queryByText(/Sessão de 1 perguntas/)).not.toBeInTheDocument();
  });

  it('with an empty focus no session hint is shown', () => {
    setup({ mode: 'flashcard', filter: { strings: [], fretMin: 1, fretMax: 12, naturalsOnly: false } });
    expect(screen.queryByText(/Sessão de/)).not.toBeInTheDocument();
  });

  it('a started session has 20 questions', () => {
    setup({ mode: 'flashcard', filter: FULL12 });
    start();
    expect(screen.getByText('Pergunta 1 de 20')).toBeInTheDocument();
  });

  it('Ouvido records the answer under ear:<MIDI> and leaves position progress alone', () => {
    const storage = setup({ mode: 'ear' });
    start();
    fireEvent.click(screen.getByRole('button', { name: 'E' }));
    const saved = readSaved(storage);
    expect(saved.itemProgress['ear:52']).toMatchObject({ correct: 1, wrong: 0 });
    expect(saved.progress).toEqual({});
  });

  it('Intervalos records the answer under interval:<root>:<id>', () => {
    const storage = setup({
      instrument: 'bass',
      mode: 'interval',
      intervals: ['5J'],
      filter: { strings: [1, 2, 3, 4], fretMin: 0, fretMax: 12, naturalsOnly: true },
    });
    start();
    fireEvent.click(document.querySelector('.note-option') as HTMLButtonElement);
    const saved = readSaved(storage, 'bass');
    const keys = Object.keys(saved.itemProgress);
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatch(/^interval:\d+:5J$/);
    expect(saved.progress).toEqual({});
  });

  it('a position mode records only position progress, not items', () => {
    const storage = setup({ mode: 'position-to-note' });
    start();
    fireEvent.click(screen.getByRole('button', { name: 'E' }));
    const saved = readSaved(storage);
    expect(saved.progress['6-12'].correct).toBe(1);
    expect(saved.itemProgress).toEqual({});
  });

  it('prioritises due positions: all 8 due ones are asked among the 20', () => {
    const candidates = positionsInFilter(FULL12, GUITAR);
    const entry = (nextReview: number) => ({ box: 1 as const, correct: 1, wrong: 0, lastReview: 0, nextReview });
    const progress: Record<string, ReturnType<typeof entry>> = {};
    const due = candidates.slice(0, 8).map((p) => `${p.string}-${p.fret}`);
    for (const key of due) progress[key] = entry(0);
    for (const p of candidates.slice(8, 38)) progress[`${p.string}-${p.fret}`] = entry(1e13);
    const storage = seededStorage({
      settings: { notation: 'cifra', mode: 'flashcard', filter: FULL12 },
      progress,
    });
    render(
      <AppProvider storage={storage}>
        <ConfirmProvider>
          <SoundProvider player={fakePlayer()}>
            <Study />
          </SoundProvider>
        </ConfirmProvider>
      </AppProvider>,
    );
    start();
    flashAll(20);
    expect(screen.getByText('Sessão concluída')).toBeInTheDocument();
    const saved = readSaved(storage).progress;
    for (const key of due) expect(saved[key].correct + saved[key].wrong, key).toBe(2);
  });

  it('finishing a session records the study day', async () => {
    const storage = setup({ mode: 'flashcard', filter: FULL12 });
    start();
    flashAll(2);
    await finalize();
    const key = dayKey(new Date(Date.now()));
    expect(readSaved(storage).stats[key]).toMatchObject({ sessions: 1, answered: 2, correct: 2 });
  });

  it('finishing with no answers records neither stats nor history', async () => {
    const storage = setup({ mode: 'flashcard', filter: FULL12 });
    start();
    await finalize();
    const saved = readSaved(storage);
    expect(saved.stats).toEqual({});
    expect(saved.history).toEqual([]);
  });

  it('a forced position opens the session with it, in a 20-question session', () => {
    setup({ mode: 'note-to-position', filter: FULL12 }, { string: 3, fret: 7 });
    expect(screen.getByText('Encontre D na corda 3')).toBeInTheDocument();
    expect(screen.getByText('Pergunta 1 de 20')).toBeInTheDocument();
  });
});

describe('Study: ouvir intervalos e graus', () => {
  it('Ouvir intervalos has no Foco card, shows level and direction options', () => {
    const storage = setup();
    chooseMode('Ouvir intervalos');
    expect(screen.queryByRole('group', { name: 'Foco' })).not.toBeInTheDocument();
    expect(screen.getByText('Sessão de 20 perguntas')).toBeInTheDocument();
    const level = screen.getByRole('group', { name: 'Nível' });
    fireEvent.click(within(level).getByRole('button', { name: 'Médio' }));
    expect(readRawSettings(storage).earIntervalLevel).toBe('medium');
    expect(screen.getByText('Sete intervalos, os mais comuns em melodias.')).toBeInTheDocument();
    const direction = screen.getByRole('group', { name: 'Direção' });
    fireEvent.click(within(direction).getByRole('button', { name: 'Os dois' }));
    expect(readRawSettings(storage).earIntervalDirection).toBe('both');
  });

  it.each(['ear-interval', 'ear-degree'] as const)('%s without sound cannot start', (mode) => {
    setup({ soundEnabled: false, mode });
    expect(screen.getByText('Ligue o Som em Ajustes para treinar de ouvido.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar/ })).toBeDisabled();
  });

  it('runs an interval session, records earint: progress and the history level', async () => {
    const storage = setup({ mode: 'ear-interval' });
    start();
    expect(screen.getByText('Pergunta 1 de 20')).toBeInTheDocument();
    expect(screen.getByText('Qual é o intervalo?')).toBeInTheDocument();
    fireEvent.click(document.querySelector('.answer-grid button')!);
    const keys = Object.keys(readSaved(storage).itemProgress);
    expect(keys).toHaveLength(1);
    expect(keys[0].startsWith('earint:')).toBe(true);
    await finalize();
    expect(readSaved(storage).history[0]).toMatchObject({ mode: 'ear-interval', level: 'easy' });
  });

  it('runs a degree session, records func: progress and the history level', async () => {
    const storage = setup({ mode: 'ear-degree', degreeLevel: 'hard' });
    start();
    expect(screen.getByText('Qual grau da escala maior?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Grau 1' }));
    const keys = Object.keys(readSaved(storage).itemProgress);
    expect(keys).toHaveLength(1);
    expect(keys[0].startsWith('func:')).toBe(true);
    await finalize();
    expect(readSaved(storage).history[0]).toMatchObject({ mode: 'ear-degree', level: 'hard' });
  });

  it('desktop: no Foco card, still shows the session sentence and an enabled Iniciar', () => {
    const viewport = mockViewport(1280);
    setup({ mode: 'ear-degree' });
    expect(screen.queryByRole('group', { name: 'Foco' })).not.toBeInTheDocument();
    expect(screen.getByText('Sessão de 20 perguntas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar/ })).toBeEnabled();
    viewport.restore();
  });

  it('a position from Progresso does not start an interval session', () => {
    setup({ mode: 'ear-interval' }, { string: 3, fret: 7 });
    expect(screen.queryByText(/Pergunta 1 de/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar/ })).toBeEnabled();
  });

  it.each([
    ['ear-interval', 'Qual é o intervalo?', () => document.querySelector('.answer-grid button')!],
    ['ear-degree', 'Qual grau da escala maior?', () => screen.getByRole('button', { name: 'Grau 1' })],
  ] as const)('%s: the next question is remounted, plays its sound and clears the answer', async (mode, prompt, answerButton) => {
    const { player } = setupWithPlayer({ mode });
    start();
    expect(screen.getByText(prompt)).toBeInTheDocument();
    const play = vi.mocked(player.play);
    const playedBefore = play.mock.calls.length;
    expect(playedBefore).toBeGreaterThan(0);
    fireEvent.click(answerButton());
    expect(document.querySelector('.ear-detail')).toBeInTheDocument();
    // Errou: botão Próxima. Acertou: avanço automático após 700 ms.
    const next = screen.queryByRole('button', { name: 'Próxima' });
    if (next) fireEvent.click(next);
    else await act(() => new Promise((resolve) => setTimeout(resolve, 800)));
    expect(screen.getByText('Pergunta 2 de 20')).toBeInTheDocument();
    expect(document.querySelector('.ear-detail')).not.toBeInTheDocument();
    for (const b of document.querySelectorAll('.answer-grid button')) expect(b).toBeEnabled();
    expect(play.mock.calls.length).toBeGreaterThan(playedBefore);
  });

  it('existing modes still reset between questions', async () => {
    setup({ mode: 'ear', filter: THREE, earLevel: 'hard' });
    start();
    const options = () => [...document.querySelectorAll('.option')] as HTMLButtonElement[];
    fireEvent.click(options()[0]);
    expect(options().every((b) => b.disabled)).toBe(true);
    // Errou: botão Próxima. Acertou: avanço automático após 700 ms.
    const next = screen.queryByRole('button', { name: 'Próxima' });
    if (next) fireEvent.click(next);
    else await act(() => new Promise((resolve) => setTimeout(resolve, 800)));
    expect(screen.getByText('Pergunta 2 de 3')).toBeInTheDocument();
    expect(options().every((b) => !b.disabled)).toBe(true);
  });
});

describe('Study: escalas', () => {
  it('Grau no desenho has no Foco card and shows the scale and box selectors', () => {
    const storage = setup();
    chooseMode('Grau no desenho');
    expect(screen.queryByRole('group', { name: 'Foco' })).not.toBeInTheDocument();
    expect(screen.getByText('Sessão de 9 perguntas')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Escala' })).toHaveValue('pent-minor');
    fireEvent.click(within(screen.getByRole('group', { name: 'Desenho' })).getByRole('button', { name: 'Todos' }));
    expect(readRawSettings(storage).scaleBox).toBe('all');
    expect(screen.getByText('Sessão de 20 perguntas')).toBeInTheDocument();
  });

  it('changing to a scale with fewer boxes resets the box to 1', () => {
    const storage = setup({ mode: 'scale-degree', scale: 'major', scaleBox: 7 });
    const box = () => within(screen.getByRole('group', { name: 'Desenho' }));
    expect(box().getByRole('button', { name: '7' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.change(screen.getByRole('combobox', { name: 'Escala' }), { target: { value: 'pent-minor' } });
    expect(readRawSettings(storage).scale).toBe('pent-minor');
    expect(readRawSettings(storage).scaleBox).toBe(1);
    expect(box().getByRole('button', { name: '1' })).toHaveAttribute('aria-pressed', 'true');
    expect(box().queryByRole('button', { name: '7' })).not.toBeInTheDocument();
  });

  it('Toque a escala starts, even with the sound off', () => {
    setup({ mode: 'scale-play', soundEnabled: false });
    start();
    expect(screen.getByText('Pergunta 1 de 12')).toBeInTheDocument();
    expect(screen.getByText('Toque a escala')).toBeInTheDocument();
  });

  it('runs a degree session, records scaledeg: progress and a history entry without level', async () => {
    const storage = setup({ mode: 'scale-degree' });
    start();
    fireEvent.click(screen.getByRole('button', { name: 'Grau 1' }));
    const keys = Object.keys(readSaved(storage).itemProgress);
    expect(keys).toHaveLength(1);
    expect(keys[0].startsWith('scaledeg:')).toBe(true);
    await finalize();
    const entry = readSaved(storage).history[0];
    expect(entry).toMatchObject({ mode: 'scale-degree' });
    expect(entry).not.toHaveProperty('level');
  });

  it('desktop: no Foco card, session sentence and an enabled Iniciar', () => {
    const viewport = mockViewport(1280);
    setup({ mode: 'scale-play' });
    expect(screen.queryByRole('group', { name: 'Foco' })).not.toBeInTheDocument();
    expect(screen.getByText('Sessão de 12 perguntas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar/ })).toBeEnabled();
    viewport.restore();
  });

  it('a position from Progresso does not start a scale-degree session', () => {
    setup({ mode: 'scale-degree' }, { string: 3, fret: 7 });
    expect(screen.queryByText(/Pergunta 1 de/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar/ })).toBeEnabled();
  });

  it('scale-degree: the next question is remounted and clears the answer', async () => {
    setup({ mode: 'scale-degree' });
    start();
    fireEvent.click(screen.getByRole('button', { name: 'Grau 1' }));
    expect(screen.getByRole('status')).toBeInTheDocument();
    const next = screen.queryByRole('button', { name: 'Próxima' });
    if (next) fireEvent.click(next);
    else await act(() => new Promise((resolve) => setTimeout(resolve, 800)));
    expect(screen.getByText('Pergunta 2 de 9')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    for (const b of document.querySelectorAll('.answer-grid button')) expect(b).toBeEnabled();
  });

  it('scale-play: the next question is remounted and clears the taps', async () => {
    setup({ mode: 'scale-play' });
    start();
    // Toca casas até uma cair fora da escala (encerra a pergunta com erro).
    const taps = screen.getAllByRole('button', { name: /^Corda \d+, casa \d+$/ });
    for (const t of taps) {
      if (screen.queryByRole('status')) break;
      fireEvent.click(t);
    }
    expect(screen.getByRole('status')).toHaveTextContent(/^Errado/);
    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));
    expect(screen.getByText('Pergunta 2 de 12')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(document.querySelector('g.mark--wrong')).toBeNull();
    expect(screen.getByText(/^Faltam \d+ notas?$/)).toBeInTheDocument();
  });
});

describe('Study: harmonia', () => {
  const pressed = (group: string, name: string) =>
    expect(within(screen.getByRole('group', { name: group })).getByRole('button', { name })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

  it('Acorde do grau has no Foco card and shows the field, chords and keys selectors', () => {
    const storage = setup();
    chooseMode('Acorde do grau');
    expect(screen.queryByRole('group', { name: 'Foco' })).not.toBeInTheDocument();
    expect(screen.getByText('Sessão de 18 perguntas')).toBeInTheDocument();
    pressed('Campo', 'Maior');
    pressed('Acordes', 'Tríades');
    pressed('Tonalidades', 'Fáceis');
    fireEvent.click(within(screen.getByRole('group', { name: 'Tonalidades' })).getByRole('button', { name: 'Todas' }));
    expect(readRawSettings(storage).harmonyKeys).toBe('all');
    expect(screen.getByText('Sessão de 20 perguntas')).toBeInTheDocument();
    expect(screen.getByText('As 12 tonalidades.')).toBeInTheDocument();
  });

  it('Qualidade do acorde counts the field and chords choices', () => {
    const storage = setup();
    chooseMode('Qualidade do acorde');
    expect(screen.getByText('Sessão de 7 perguntas')).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('group', { name: 'Campo' })).getByRole('button', { name: 'Os dois' }));
    expect(screen.getByText('Sessão de 14 perguntas')).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('group', { name: 'Acordes' })).getByRole('button', { name: 'Tétrades' }));
    expect(readRawSettings(storage).harmonySevenths).toBe(true);
  });

  it('runs a Grau do acorde session with the sound off, records hdeg: progress and a history entry without level', async () => {
    const storage = setup({ mode: 'harmony-degree', soundEnabled: false });
    start();
    expect(screen.getByText('Pergunta 1 de 18')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Grau I' }));
    const keys = Object.keys(readSaved(storage).itemProgress);
    expect(keys).toHaveLength(1);
    expect(keys[0].startsWith('hdeg:')).toBe(true);
    await finalize();
    const entry = readSaved(storage).history[0];
    expect(entry).toMatchObject({ mode: 'harmony-degree' });
    expect(entry).not.toHaveProperty('level');
  });

  it('a bass session records under the bass items only', () => {
    const storage = seededStorage({
      instrument: 'bass',
      settings: { notation: 'cifra', instrument: 'bass', mode: 'harmony-chord' },
    });
    render(
      <AppProvider storage={storage}>
        <ConfirmProvider>
          <SoundProvider player={fakePlayer()}>
            <Study />
          </SoundProvider>
        </ConfirmProvider>
      </AppProvider>,
    );
    start();
    fireEvent.click(document.querySelector('.note-option') as HTMLButtonElement);
    const bassKeys = Object.keys(readSaved(storage, 'bass').itemProgress);
    expect(bassKeys).toHaveLength(1);
    expect(bassKeys[0].startsWith('hchord:')).toBe(true);
    expect(readSaved(storage, 'guitar').itemProgress).toEqual({});
  });

  it('desktop: no Foco card and an enabled Iniciar', () => {
    const viewport = mockViewport(1280);
    setup({ mode: 'harmony-quality' });
    expect(screen.queryByRole('group', { name: 'Foco' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar/ })).toBeEnabled();
    viewport.restore();
  });

  it('a position from Progresso does not start a harmony-chord session', () => {
    setup({ mode: 'harmony-chord' }, { string: 3, fret: 7 });
    expect(screen.queryByText(/Pergunta 1 de/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar/ })).toBeEnabled();
  });

  it.each([
    ['harmony-chord', '.note-option'],
    ['harmony-degree', '.answer-grid button'],
    ['harmony-quality', '.answer-grid button'],
  ] as const)('%s: the next question is remounted and clears the answer', async (mode, selector) => {
    setup({ mode });
    start();
    fireEvent.click(document.querySelector(selector) as HTMLButtonElement);
    expect(screen.getByRole('status')).toBeInTheDocument();
    const next = screen.queryByRole('button', { name: 'Próxima' });
    if (next) fireEvent.click(next);
    else await act(() => new Promise((resolve) => setTimeout(resolve, 800)));
    expect(screen.getByText(/^Pergunta 2 de/)).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    for (const b of document.querySelectorAll(selector)) expect(b).toBeEnabled();
  });
});

describe('Study: acordes', () => {
  const BASS_MSG = 'Acordes são só para violão. Troque para Violão em Ajustes.';
  const pressed = (group: string, name: string) =>
    expect(within(screen.getByRole('group', { name: group })).getByRole('button', { name })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

  function setupBass(settings: Partial<Settings>, forced: { string: number; fret: number } | null = null) {
    const storage = seededStorage({
      instrument: 'bass',
      settings: { notation: 'cifra', instrument: 'bass', ...settings },
    });
    render(
      <AppProvider storage={storage}>
        <ConfirmProvider>
          <SoundProvider player={fakePlayer()}>
            <Study forced={forced} />
          </SoundProvider>
        </ConfirmProvider>
      </AppProvider>,
    );
    return storage;
  }

  it('Nome do acorde has no Foco card and shows the shapes and chords selectors', () => {
    const storage = setup();
    chooseMode('Nome do acorde');
    expect(screen.queryByRole('group', { name: 'Foco' })).not.toBeInTheDocument();
    pressed('Formas', 'Abertas');
    pressed('Acordes', 'Tríades');
    expect(screen.getByText('Sessão de 8 perguntas')).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('group', { name: 'Formas' })).getByRole('button', { name: 'Pestana' }));
    expect(readRawSettings(storage).chordShapes).toBe('barre');
    expect(screen.getByText('Sessão de 20 perguntas')).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('group', { name: 'Acordes' })).getByRole('button', { name: 'Tétrades' }));
    expect(readRawSettings(storage).chordKinds).toBe('sevenths');
  });

  it('runs a Monte o acorde session with the sound off, records chordplay: progress and a history entry without level', async () => {
    const storage = setup({ mode: 'chord-play', soundEnabled: false });
    start();
    expect(screen.getByText('Pergunta 1 de 8')).toBeInTheDocument();
    expect(screen.getByText('Monte o acorde')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cell-5-1')); // A# nunca está nos acordes abertos em tríade
    const keys = Object.keys(readSaved(storage).itemProgress);
    expect(keys).toHaveLength(1);
    expect(keys[0].startsWith('chordplay:')).toBe(true);
    await finalize();
    const entry = readSaved(storage).history[0];
    expect(entry).toMatchObject({ mode: 'chord-play' });
    expect(entry).not.toHaveProperty('level');
  });

  it('a guitar session records under the guitar items only', () => {
    const storage = setup({ mode: 'chord-name' });
    start();
    fireEvent.click(document.querySelector('.note-option, .answer-grid button, .options button') as HTMLButtonElement);
    expect(Object.keys(readSaved(storage, 'guitar').itemProgress)[0].startsWith('chordname:')).toBe(true);
    expect(readSaved(storage, 'bass').itemProgress).toEqual({});
  });

  it.each(['chord-name', 'chord-play'] as const)('%s on the bass: message, disabled Iniciar, no session count', (mode) => {
    setupBass({ mode });
    expect(screen.getByText(BASS_MSG)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar/ })).toBeDisabled();
    expect(screen.queryByText(/Sessão de/)).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Foco' })).not.toBeInTheDocument();
  });

  it.each(['chord-name', 'chord-play'] as const)('%s on the bass: a forced position does not start', (mode) => {
    setupBass({ mode }, { string: 3, fret: 7 });
    expect(screen.queryByText(/Pergunta 1 de/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar/ })).toBeDisabled();
  });

  it('switching from bass to guitar enables Iniciar and shows the count', () => {
    function Switch() {
      const { updateSettings } = useAppState();
      return (
        <button type="button" onClick={() => updateSettings({ instrument: 'guitar' })}>
          trocar
        </button>
      );
    }
    const storage = seededStorage({
      instrument: 'bass',
      settings: { notation: 'cifra', instrument: 'bass', mode: 'chord-play' },
    });
    render(
      <AppProvider storage={storage}>
        <ConfirmProvider>
          <SoundProvider player={fakePlayer()}>
            <Switch />
            <Study />
          </SoundProvider>
        </ConfirmProvider>
      </AppProvider>,
    );
    expect(screen.getByRole('button', { name: /Iniciar/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'trocar' }));
    expect(screen.queryByText(BASS_MSG)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar/ })).toBeEnabled();
    expect(screen.getByText('Sessão de 8 perguntas')).toBeInTheDocument();
  });

  it('desktop: no Foco card and an enabled Iniciar', () => {
    const viewport = mockViewport(1280);
    setup({ mode: 'chord-name' });
    expect(screen.queryByRole('group', { name: 'Foco' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar/ })).toBeEnabled();
    viewport.restore();
  });

  it('a position from Progresso does not start a chord-name session on the guitar', () => {
    setup({ mode: 'chord-name' }, { string: 3, fret: 7 });
    expect(screen.queryByText(/Pergunta 1 de/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar/ })).toBeEnabled();
  });

  it.each([
    ['chord-name', '.options button, .answer-grid button, .note-option'],
    ['chord-play', '[data-testid="cell-5-1"]'],
  ] as const)('%s: the next question is remounted and clears the answer', async (mode, selector) => {
    setup({ mode });
    start();
    fireEvent.click(document.querySelector(selector) as HTMLElement);
    expect(screen.getByRole('status')).toBeInTheDocument();
    const next = screen.queryByRole('button', { name: 'Próxima' });
    if (next) fireEvent.click(next);
    else await act(() => new Promise((resolve) => setTimeout(resolve, 800)));
    expect(screen.getByText(/^Pergunta 2 de/)).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('Study: M7', () => {
  const BASS_MSG = 'Acordes são só para violão. Troque para Violão em Ajustes.';
  const pressed = (group: string, name: string) =>
    expect(within(screen.getByRole('group', { name: group })).getByRole('button', { name })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

  function setupBass(settings: Partial<Settings>, forced: { string: number; fret: number } | null = null) {
    const storage = seededStorage({
      instrument: 'bass',
      settings: { notation: 'cifra', instrument: 'bass', soundEnabled: false, ...settings },
    });
    render(
      <AppProvider storage={storage}>
        <ConfirmProvider>
          <SoundProvider player={fakePlayer()}>
            <Study forced={forced} />
          </SoundProvider>
        </ConfirmProvider>
      </AppProvider>,
    );
    return storage;
  }

  it('Notas-guia: shapes selector only, no Acordes group, no Foco', () => {
    const storage = setup({ mode: 'guide-tones' });
    expect(screen.queryByRole('group', { name: 'Foco' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Acordes' })).not.toBeInTheDocument();
    pressed('Formas', 'Abertas');
    expect(screen.getByText('Sessão de 11 perguntas')).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('group', { name: 'Formas' })).getByRole('button', { name: 'Pestana' }));
    expect(readRawSettings(storage).chordShapes).toBe('barre');
    expect(screen.getByText('Sessão de 20 perguntas')).toBeInTheDocument();
  });

  it('ii–V–I: no option groups and a 16-question session', () => {
    setup({ mode: 'ii-v-i' });
    expect(screen.queryByRole('group', { name: 'Formas' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Acordes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Foco' })).not.toBeInTheDocument();
    expect(screen.getByText('Sessão de 16 perguntas')).toBeInTheDocument();
  });

  it.each(['guide-tones', 'ii-v-i'] as const)('%s on the bass: message, disabled Iniciar, no session count', (mode) => {
    setupBass({ mode });
    expect(screen.getByText(BASS_MSG)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar/ })).toBeDisabled();
    expect(screen.queryByText(/Sessão de/)).not.toBeInTheDocument();
  });

  it.each(['guide-tones', 'ii-v-i'] as const)('%s on the bass: a forced position does not start', (mode) => {
    setupBass({ mode }, { string: 3, fret: 7 });
    expect(screen.queryByText(/Pergunta 1 de/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar/ })).toBeDisabled();
  });

  it('switching from bass to guitar enables Iniciar on Notas-guia', () => {
    function Switch() {
      const { updateSettings } = useAppState();
      return (
        <button type="button" onClick={() => updateSettings({ instrument: 'guitar' })}>
          trocar
        </button>
      );
    }
    const storage = seededStorage({
      instrument: 'bass',
      settings: { notation: 'cifra', instrument: 'bass', mode: 'guide-tones' },
    });
    render(
      <AppProvider storage={storage}>
        <ConfirmProvider>
          <SoundProvider player={fakePlayer()}>
            <Switch />
            <Study />
          </SoundProvider>
        </ConfirmProvider>
      </AppProvider>,
    );
    expect(screen.getByRole('button', { name: /Iniciar/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'trocar' }));
    expect(screen.queryByText(BASS_MSG)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar/ })).toBeEnabled();
    expect(screen.getByText('Sessão de 11 perguntas')).toBeInTheDocument();
  });

  it('Arpejo no desenho on the bass: starts with a 4-string board', () => {
    setupBass({ mode: 'arpeggio' });
    expect(screen.getByRole('button', { name: /Iniciar/ })).toBeEnabled();
    expect(screen.getByText('Sessão de 12 perguntas')).toBeInTheDocument();
    start();
    expect(screen.getByText('Toque o arpejo')).toBeInTheDocument();
    // the visible fret window depends on the random item, so no fixed fret here
    expect(screen.getAllByTestId(/^cell-4-\d+$/).length).toBeGreaterThan(0);
    expect(screen.queryAllByTestId(/^cell-5-\d+$/)).toHaveLength(0);
  });

  it('runs an ii–V–I session with the sound off, records iivi: progress and a history entry without level', async () => {
    const storage = setup({ mode: 'ii-v-i', soundEnabled: false });
    start();
    expect(screen.getByText('Pergunta 1 de 16')).toBeInTheDocument();
    const root = document.querySelector('g.mark--root') as SVGElement;
    const [s, f] = root.getAttribute('data-pos')!.split('-');
    fireEvent.click(screen.getByRole('button', { name: `Corda ${s}, casa ${f}` })); // a fundamental nunca é nota-guia
    const keys = Object.keys(readSaved(storage).itemProgress);
    expect(keys).toHaveLength(1);
    expect(keys[0].startsWith('iivi:')).toBe(true);
    await finalize();
    const entry = readSaved(storage).history[0];
    expect(entry).toMatchObject({ mode: 'ii-v-i' });
    expect(entry).not.toHaveProperty('level');
  });

  const tapPos = (pos: string) => {
    const [s, f] = pos.split('-');
    fireEvent.click(screen.getByRole('button', { name: `Corda ${s}, casa ${f}` }));
  };

  it.each(['guide-tones', 'arpeggio', 'ii-v-i'] as const)('%s: the next question is remounted and clears the answer', async (mode) => {
    setup({ mode });
    start();
    if (mode === 'ii-v-i') {
      tapPos(document.querySelector('g.mark--root')!.getAttribute('data-pos')!);
    } else if (mode === 'guide-tones') {
      for (const g of [...document.querySelectorAll('g.mark--chord')]) {
        if (screen.queryByRole('status')) break;
        tapPos(g.getAttribute('data-pos')!);
      }
    } else {
      for (const t of screen.getAllByRole('button', { name: /^Corda \d+, casa \d+$/ })) {
        if (screen.queryByRole('status')) break;
        fireEvent.click(t);
      }
    }
    expect(screen.getByRole('status')).toBeInTheDocument();
    const next = screen.queryByRole('button', { name: 'Próxima' });
    if (next) fireEvent.click(next);
    else await act(() => new Promise((resolve) => setTimeout(resolve, 800)));
    expect(screen.getByText(/^Pergunta 2 de/)).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
