import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundProvider } from '../../audio/SoundProvider';
import type { NotePlayer } from '../../audio/player';
import type { ChordNameQuestion } from '../../domain/chordItems';
import { AppProvider } from '../../state/AppState';
import { activeView, createDefaultData } from '../../state/storage';
import { createMemoryStorage } from '../../test-utils';
import { useQuizShortcuts } from '../useQuizShortcuts';
import { ChordNameQuiz } from './ChordNameQuiz';

const fretboardProps = vi.hoisted(() => ({ calls: [] as Array<{ fit?: boolean; minFretWidth?: number }> }));
vi.mock('../Fretboard', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../Fretboard')>();
  return {
    ...actual,
    Fretboard: (p: React.ComponentProps<typeof actual.Fretboard>) => {
      fretboardProps.calls.push({ fit: p.fit, minFretWidth: p.minFretWidth });
      return actual.Fretboard(p);
    },
  };
});

const fakePlayer = () => ({ unlock: vi.fn(), prepare: vi.fn(), play: vi.fn<NotePlayer['play']>() });

function Harness(props: Parameters<typeof ChordNameQuiz>[0]) {
  useQuizShortcuts(true);
  return <ChordNameQuiz {...props} />;
}

const AM7: ChordNameQuestion = {
  shape: 'am7',
  root: 9,
  options: [
    { root: 9, quality: 'min7' },
    { root: 9, quality: 'dom7' },
    { root: 4, quality: 'min7' },
    { root: 2, quality: 'maj7' },
  ],
};
const E_MAJ: ChordNameQuestion = {
  shape: 'e-maj',
  root: 9,
  options: [
    { root: 9, quality: 'major' },
    { root: 9, quality: 'minor' },
    { root: 4, quality: 'major' },
    { root: 2, quality: 'minor' },
  ],
};

function setup(question: ChordNameQuestion = AM7) {
  const settings = activeView(createDefaultData()).settings;
  settings.notation = 'cifra';
  settings.accidentals = 'auto';
  const player = fakePlayer();
  const onAnswer = vi.fn();
  const onNext = vi.fn();
  const ui = (q: ChordNameQuestion, key: number) => (
    <AppProvider storage={createMemoryStorage()}>
      <SoundProvider player={player}>
        <Harness key={key} question={q} settings={settings} onAnswer={onAnswer} onNext={onNext} />
      </SoundProvider>
    </AppProvider>
  );
  const utils = render(ui(question, 0));
  const mark = (kind: string, pos: string) =>
    utils.container.querySelector(`g.mark--${kind}[data-pos="${pos}"]`);
  const withoutScreen = () => (
    <AppProvider storage={createMemoryStorage()}>
      <SoundProvider player={player}>{null}</SoundProvider>
    </AppProvider>
  );
  return { player, onAnswer, onNext, mark, ui, withoutScreen, ...utils };
}
const buttons = () => [...document.querySelectorAll('.answer-grid .option')] as HTMLButtonElement[];
const pick = (label: string) => fireEvent.click(buttons().find((b) => b.textContent === label)!);
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
const cell = (testid: string) => screen.queryByTestId(testid);

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  fretboardProps.calls.length = 0;
  cleanup();
  vi.useRealTimers();
});

describe('ChordNameQuiz', () => {
  it('shows the shape without giving it away', () => {
    const a = setup();
    expect(screen.getByText('Qual é este acorde?')).toBeInTheDocument();
    expect(buttons().map((b) => b.textContent)).toEqual(['Am7', 'A7', 'Em7', 'D7M']);
    expect(document.querySelector('.answer-grid.answer-grid--words')).not.toBeNull();
    expect(a.mark('chord', '4-2')).not.toBeNull();
    expect(a.mark('chord', '2-1')).not.toBeNull();
    expect(a.container.querySelectorAll('.mark--chord')).toHaveLength(2);
    expect(a.container.querySelector('.mark--root')).toBeNull();
    expect(a.container.querySelector('.mark text')).toBeNull();
    expect(screen.getByTestId('string-mark-6')).toHaveTextContent('×');
    expect(screen.getByTestId('string-mark-5')).toHaveTextContent('○');
    expect(screen.getByTestId('string-mark-1')).toHaveTextContent('○');
    expect(screen.getByTestId('string-mark-2')).toHaveTextContent('');
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('Teclado: 1–4')).toBeInTheDocument();
    expect(cell('cell-6-1')).not.toBeNull();
    expect(cell('cell-6-4')).not.toBeNull();
    expect(cell('cell-6-5')).toBeNull();
  });

  it('does not leak the chord name into the DOM before answering', () => {
    const a = setup();
    const outsideOptions = a.container.cloneNode(true) as HTMLElement;
    outsideOptions.querySelector('.answer-grid')?.remove();
    expect(outsideOptions.innerHTML).not.toMatch(/Am7|A7|forma aberta/);
    expect(outsideOptions.querySelector('[title], [data-name], [data-chord]')).toBeNull();
  });

  it('right answer', () => {
    const a = setup();
    pick('Am7');
    expect(a.onAnswer).toHaveBeenCalledWith(true);
    expect(screen.getByRole('status')).toHaveTextContent('Correto! É Am7.');
    expect(screen.getByText('Am7: A C E G · forma aberta')).toBeInTheDocument();
    expect(buttons()[0]).toHaveClass('option--correct');
    expect(a.mark('chord', '4-2')).toHaveTextContent('5');
    expect(a.mark('chord', '2-1')).toHaveTextContent('♭3');
    expect(a.player.play).toHaveBeenCalledWith(45);
    advance(200);
    for (const m of [52, 55, 60, 64]) expect(a.player.play).toHaveBeenCalledWith(m);
    expect(a.onNext).not.toHaveBeenCalled();
    advance(700);
    expect(a.onNext).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Ouvir o acorde' })).toBeInTheDocument();
  });

  it('wrong answer', () => {
    const a = setup();
    fireEvent.keyDown(document, { key: '2' });
    expect(a.onAnswer).toHaveBeenCalledWith(false);
    expect(screen.getByRole('status')).toHaveTextContent('Errado. É Am7.');
    expect(buttons()[1]).toHaveClass('option--wrong');
    expect(buttons()[0]).toHaveClass('option--correct');
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeInTheDocument();
    advance(2000);
    expect(a.onNext).not.toHaveBeenCalled();
    advance(0);
    a.player.play.mockClear();
    fireEvent.keyDown(document, { key: 'r' });
    expect(a.player.play).toHaveBeenCalledWith(45);
  });

  it('answers only once', () => {
    const a = setup();
    pick('A7');
    pick('Am7');
    expect(a.onAnswer).toHaveBeenCalledTimes(1);
  });

  it('draws the barre', () => {
    const a = setup(E_MAJ);
    expect(a.container.querySelector('rect.barre[data-fret="5"]')).not.toBeNull();
    expect(cell('cell-6-4')).not.toBeNull();
    expect(cell('cell-6-8')).not.toBeNull();
    expect(cell('cell-6-9')).toBeNull();
  });

  it('resets when the question changes under a new key', () => {
    const a = setup();
    pick('A7');
    expect(screen.getByRole('status')).toBeInTheDocument();
    a.rerender(a.ui(E_MAJ, 1));
    expect(screen.queryByRole('status')).toBeNull();
    expect(buttons().every((b) => !b.disabled)).toBe(true);
  });

  it('fits the fretboard to the viewport', () => {
    setup();
    expect(fretboardProps.calls[0]).toEqual({ fit: true, minFretWidth: 40 });
  });

  it('stops the strum when the screen unmounts mid-strum', () => {
    const a = setup();
    pick('Am7');
    advance(40);
    expect(a.player.play.mock.calls.length).toBeGreaterThan(1);
    a.player.play.mockClear();
    a.rerender(a.withoutScreen());
    advance(500);
    expect(a.player.play).not.toHaveBeenCalled();
  });
});
