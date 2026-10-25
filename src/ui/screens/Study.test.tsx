import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { AppProvider } from '../../state/AppState';
import { readSaved, seededStorage } from '../../test-utils';
import type { Settings } from '../../state/storage';
import { SoundProvider } from '../../audio/SoundProvider';
import type { NotePlayer } from '../../audio/player';
import { ConfirmProvider } from '../ConfirmDialog';
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

  it('lists the 4 exercises with the current one checked', () => {
    setup({ mode: 'flashcard', filter: THREE });
    fireEvent.click(menuButton());
    expect(menuButton()).toHaveAttribute('aria-expanded', 'true');
    const items = within(screen.getByRole('menu')).getAllByRole('menuitemradio');
    expect(items.map((i) => i.textContent?.replace('✓', ''))).toEqual([
      'Posição → nota',
      'Nota → posição',
      'Flashcard',
      'Ouvido',
    ]);
    expect(items.map((i) => i.getAttribute('aria-checked'))).toEqual(['false', 'false', 'true', 'false']);
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
