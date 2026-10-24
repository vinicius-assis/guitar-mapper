import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { AppProvider } from '../../state/AppState';
import { readSaved, seededStorage } from '../../test-utils';
import type { Settings } from '../../state/storage';
import { Study } from './Study';

// Uma única posição candidata: corda 6, casa 12 (nota E).
const SINGLE: Settings['filter'] = { strings: [6], fretMin: 12, fretMax: 12, naturalsOnly: true };
// Três posições naturais na corda 6: casa 1 (F), casa 3 (G), casa 5 (A).
const THREE: Settings['filter'] = { strings: [6], fretMin: 1, fretMax: 5, naturalsOnly: true };

function setup(
  settings: Partial<Settings> = {},
  forced?: { string: number; fret: number },
  onChangeFocus: () => void = () => {},
  onSessionChange: (running: boolean) => void = () => {},
) {
  const storage = seededStorage({ settings: { notation: 'cifra', filter: SINGLE, ...settings } });
  render(
    <AppProvider storage={storage}>
      <Study forced={forced ?? null} onChangeFocus={onChangeFocus} onSessionChange={onSessionChange} />
    </AppProvider>,
  );
  return storage;
}

const start = () => fireEvent.click(screen.getByRole('button', { name: /Iniciar/ }));
const tick = (ms: number) => act(() => void vi.setSystemTime(Date.now() + ms));

let confirm: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(1_000_000);
});
afterEach(() => {
  vi.useRealTimers();
  confirm.mockRestore();
});

describe('Study: before the session', () => {
  it('waits for the Iniciar button and says how many questions there will be', () => {
    setup({ filter: THREE });
    expect(screen.getByRole('group', { name: 'Foco' })).toHaveTextContent('Perguntas3');
    expect(screen.queryByText('Qual é esta nota?')).not.toBeInTheDocument();
    start();
    expect(screen.getByText('Qual é esta nota?')).toBeInTheDocument();
  });

  it('describes the selected exercise and follows the mode', () => {
    setup({ mode: 'position-to-note' });
    expect(screen.getByText(/escolha a nota entre 4 opções/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Nota → posição' }));
    expect(screen.queryByText(/escolha a nota entre 4 opções/)).not.toBeInTheDocument();
    expect(screen.getByText(/toca no braço onde ela está/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Flashcard' }));
    expect(screen.getByText(/lembrar a nota de cabeça antes de revelar/)).toBeInTheDocument();
  });

  it('the Iniciar button has a decorative play icon and the plain accessible name', () => {
    setup();
    const button = screen.getByRole('button', { name: 'Iniciar' });
    expect(button).toHaveClass('start');
    expect(button.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  });

  it('shows each focus label on the left and its value in a badge on the right', () => {
    setup({ filter: THREE });
    const card = screen.getByRole('group', { name: 'Foco' });
    const rows: [string, string][] = [
      ['Perguntas', '3'],
      ['Cordas', '6'],
      ['Casas', '1–5'],
      ['Notas', 'Naturais'],
    ];
    for (const [label, value] of rows) {
      const term = within(card).getByText(label);
      expect(term.tagName).toBe('DT');
      expect(term.nextElementSibling).toHaveTextContent(new RegExp(`^${value}$`));
      expect(term.nextElementSibling!.querySelector('.badge')).not.toBeNull();
    }
  });

  it('Alterar foco calls back, also when the focus is empty', () => {
    const onChangeFocus = vi.fn();
    setup({ filter: { ...SINGLE, strings: [] } }, undefined, onChangeFocus);
    fireEvent.click(screen.getByRole('button', { name: 'Alterar foco' }));
    expect(onChangeFocus).toHaveBeenCalledTimes(1);
  });

  it('uses the singular for one question', () => {
    setup();
    expect(screen.getByRole('group', { name: 'Foco' })).toHaveTextContent('Perguntas1');
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
    fireEvent.click(screen.getByRole('button', { name: 'Flashcard' }));
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
    expect(screen.getByText('Era E')).toBeInTheDocument();
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

  it('Finalizar ends early and summarizes only what was answered', () => {
    const storage = setup({ mode: 'flashcard', filter: THREE });
    start();
    flash(1000, 'Acertei');
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar' }));
    expect(screen.getByText('Acertos: 1 de 1 (100%)')).toBeInTheDocument();
    expect(readSaved(storage).history[0]).toMatchObject({ total: 1, correct: 1 });
  });

  it('Finalizar asks for confirmation and keeps the session going when cancelled', () => {
    setup({ mode: 'flashcard', filter: THREE });
    start();
    confirm.mockReturnValue(false);
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar' }));
    expect(confirm).toHaveBeenCalledWith('Finalizar a sessão?');
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

  it('hides the mode bar while a question is running and brings it back in the summary', () => {
    setup({ mode: 'flashcard', filter: THREE });
    const modeBar = () => screen.queryByRole('group', { name: 'Modo de estudo' });
    expect(modeBar()).toBeInTheDocument();
    start();
    expect(modeBar()).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar' }));
    expect(modeBar()).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Encerrar' }));
    expect(modeBar()).toBeInTheDocument();
  });

  it('tells the app when a session starts and ends', () => {
    const onSessionChange = vi.fn();
    setup({ mode: 'flashcard', filter: THREE }, undefined, undefined, onSessionChange);
    expect(onSessionChange).toHaveBeenLastCalledWith(false);
    start();
    expect(onSessionChange).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar' }));
    expect(onSessionChange).toHaveBeenLastCalledWith(false);
  });

  it('a forced position reports a running session right away', () => {
    const onSessionChange = vi.fn();
    setup({ mode: 'flashcard' }, { string: 3, fret: 7 }, undefined, onSessionChange);
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

  it('Finalizar with no answers shows an empty summary and saves nothing', () => {
    const storage = setup({ mode: 'flashcard', filter: THREE });
    start();
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar' }));
    expect(screen.getByText('Nenhuma pergunta respondida.')).toBeInTheDocument();
    expect(readSaved(storage).history).toEqual([]);
  });

  it('Reiniciar restarts the exercise from the first question', () => {
    setup({ mode: 'flashcard', filter: THREE });
    start();
    flash(1000, 'Acertei');
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reiniciar' }));
    expect(screen.getByText(/Pergunta 1 de 3/)).toBeInTheDocument();
    expect(screen.getByLabelText('Acertos: 0')).toBeInTheDocument();
  });

  it('Reiniciar has a decorative icon and both summary buttons share a size class', () => {
    setup({ mode: 'flashcard', filter: THREE });
    start();
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar' }));
    const restart = screen.getByRole('button', { name: 'Reiniciar' });
    expect(restart.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    expect(restart).toHaveClass('summary-button');
    expect(screen.getByRole('button', { name: 'Encerrar' })).toHaveClass('summary-button');
  });

  it('Encerrar goes back to the start screen of the exercise', () => {
    setup({ mode: 'flashcard', filter: THREE });
    start();
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Encerrar' }));
    expect(screen.getByRole('button', { name: /Iniciar/ })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Foco' })).toHaveTextContent('Perguntas3');
  });

  it('a forced position starts a session right away, asking it first', () => {
    setup({ mode: 'note-to-position' }, { string: 3, fret: 7 });
    expect(screen.getByText('Encontre D na corda 3')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Iniciar/ })).not.toBeInTheDocument();
  });
});
