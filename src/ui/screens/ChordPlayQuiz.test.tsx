import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundProvider } from '../../audio/SoundProvider';
import type { NotePlayer } from '../../audio/player';
import type { ChordItem } from '../../domain/chordItems';
import { AppProvider } from '../../state/AppState';
import { activeView, createDefaultData } from '../../state/storage';
import { createMemoryStorage } from '../../test-utils';
import { ChordPlayQuiz } from './ChordPlayQuiz';

const fakePlayer = () => ({ unlock: vi.fn(), prepare: vi.fn(), play: vi.fn<NotePlayer['play']>() });

const C: ChordItem = { shape: 'c', root: 0 };
const A_BARRE: ChordItem = { shape: 'e-maj', root: 9 };

function setup(question: ChordItem = C) {
  const settings = activeView(createDefaultData()).settings;
  settings.notation = 'cifra';
  settings.accidentals = 'sharp';
  const player = fakePlayer();
  const onAnswer = vi.fn();
  const onNext = vi.fn();
  const ui = (q: ChordItem, key: number) => (
    <AppProvider storage={createMemoryStorage()}>
      <SoundProvider player={player}>
        <ChordPlayQuiz key={key} question={q} settings={settings} onAnswer={onAnswer} onNext={onNext} />
      </SoundProvider>
    </AppProvider>
  );
  const utils = render(ui(question, 0));
  const mark = (kind: string, pos: string) =>
    utils.container.querySelector(`g.mark--${kind}[data-pos="${pos}"]`);
  const tap = (pos: string) => {
    const [s, f] = pos.split('-');
    fireEvent.click(screen.getByRole('button', { name: `Corda ${s}, casa ${f}` }));
  };
  return { player, onAnswer, onNext, mark, tap, ui, ...utils };
}
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('ChordPlayQuiz', () => {
  it('asks without revealing', () => {
    const a = setup();
    expect(screen.getByText('Monte o acorde')).toBeInTheDocument();
    expect(screen.getByText('C · forma aberta')).toBeInTheDocument();
    expect(screen.getByText('Faltam 3 notas')).toBeInTheDocument();
    expect(a.container.querySelector('.mark')).toBeNull();
    expect(a.container.querySelector('rect.barre')).toBeNull();
    for (let i = 1; i <= 6; i++) expect(screen.getByTestId(`string-mark-${i}`)).toHaveTextContent('');
    expect(a.container.querySelector('.fretboard-frame')!.innerHTML).not.toMatch(/Corda \d (solta|abafada)|○|×/);
  });

  it('does not reveal the barre shape before the end', () => {
    const a = setup(A_BARRE);
    expect(a.container.querySelector('rect.barre')).toBeNull();
    expect(a.container.querySelector('.fretboard-frame')!.innerHTML).not.toMatch(/Corda \d (solta|abafada)|○|×/);
  });

  it('complete shape', () => {
    const a = setup();
    a.tap('5-3');
    a.tap('4-2');
    expect(screen.getByText('Faltam 1 nota')).toBeInTheDocument();
    a.tap('4-2');
    expect(screen.getByText('Faltam 1 nota')).toBeInTheDocument();
    a.tap('1-3');
    expect(screen.getByText('Faltam 1 nota')).toBeInTheDocument();
    expect(a.container.querySelector('.mark--wrong')).toBeNull();
    expect(a.onAnswer).not.toHaveBeenCalled();
    expect(a.mark('chord', '1-3')).toBeNull();
    a.tap('2-1');
    expect(a.onAnswer).toHaveBeenCalledTimes(1);
    expect(a.onAnswer).toHaveBeenCalledWith(true);
    expect(screen.getByRole('status')).toHaveTextContent('Correto! C montado.');
    expect(screen.getByTestId('string-mark-6')).toHaveTextContent('×');
    expect(a.mark('root', '5-3')).toHaveTextContent('1');
    expect(screen.getByRole('button', { name: 'Ouvir o acorde' })).toBeInTheDocument();
    advance(700);
    expect(a.onNext).toHaveBeenCalledTimes(1);
  });

  it('wrong note ends', () => {
    const a = setup();
    a.tap('2-2');
    expect(a.onAnswer).toHaveBeenCalledWith(false);
    expect(screen.getByRole('status')).toHaveTextContent('Errado. C# não está em C.');
    expect(a.mark('wrong', '2-2')).not.toBeNull();
    for (const p of ['5-3', '4-2', '2-1']) expect(a.mark('hint', p)).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeInTheDocument();
    advance(2000);
    expect(a.onNext).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('cell-5-3'));
    expect(a.onAnswer).toHaveBeenCalledTimes(1);
  });

  it('barre shape reveals the barre only at the end', () => {
    const a = setup(A_BARRE);
    for (const p of ['6-5', '5-7', '4-7', '3-6', '2-5']) a.tap(p);
    expect(a.container.querySelector('rect.barre')).toBeNull();
    a.tap('1-5');
    expect(screen.getByRole('status')).toHaveTextContent('Correto! A montado.');
    expect(a.container.querySelector('rect.barre[data-fret="5"]')).not.toBeNull();
  });

  it('plays each tap on the guitar', () => {
    const a = setup();
    a.tap('5-3');
    expect(a.player.play).toHaveBeenCalledWith(48);
  });

  it('resets state when remounted under a new key', () => {
    const a = setup();
    a.tap('5-3');
    a.tap('2-2');
    expect(screen.getByRole('status')).toBeInTheDocument();
    a.rerender(a.ui(A_BARRE, 1));
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('Faltam 6 notas')).toBeInTheDocument();
    expect(a.container.querySelector('.mark')).toBeNull();
  });

  it('stops the strum on unmount', () => {
    const a = setup();
    a.tap('2-2');
    advance(40);
    a.player.play.mockClear();
    a.unmount();
    advance(500);
    expect(a.player.play).not.toHaveBeenCalled();
  });
});
