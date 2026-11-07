import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundProvider } from '../../audio/SoundProvider';
import type { NotePlayer } from '../../audio/player';
import type { EarIntervalQuestion } from '../../domain/earTraining';
import type { EarLevel } from '../../domain/quiz';
import { AppProvider } from '../../state/AppState';
import { activeView, createDefaultData, type Settings } from '../../state/storage';
import { createMemoryStorage } from '../../test-utils';
import { useQuizShortcuts } from '../useQuizShortcuts';
import { EarIntervalQuiz } from './EarIntervalQuiz';

const fakePlayer = () => ({ unlock: vi.fn(), prepare: vi.fn(), play: vi.fn<NotePlayer['play']>() });

const UP: EarIntervalQuestion = { root: 0, semitones: 4, direction: 'up', pitches: [48, 52] };

function Harness(props: Parameters<typeof EarIntervalQuiz>[0]) {
  useQuizShortcuts(true);
  return <EarIntervalQuiz {...props} />;
}

function setup(
  level: EarLevel,
  question: EarIntervalQuestion = UP,
  accidentals: Settings['accidentals'] = 'sharp',
) {
  const settings = activeView(createDefaultData()).settings;
  settings.notation = 'cifra';
  settings.accidentals = accidentals;
  settings.earIntervalLevel = level;
  const player = fakePlayer();
  const onAnswer = vi.fn();
  const onNext = vi.fn();
  const utils = render(
    <AppProvider storage={createMemoryStorage()}>
      <SoundProvider player={player}>
        <Harness question={question} settings={settings} onAnswer={onAnswer} onNext={onNext} />
      </SoundProvider>
    </AppProvider>,
  );
  const played = () => player.play.mock.calls.map((c) => c[0]);
  return { player, onAnswer, onNext, played, ...utils };
}
const answers = () =>
  screen.getAllByRole('button').filter((b) => b.classList.contains('option')) as HTMLButtonElement[];
const texts = () => answers().map((b) => b.textContent);
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('EarIntervalQuiz', () => {
  it('plays both notes, 900 ms apart', () => {
    const { played } = setup('easy');
    expect(played()).toEqual([48]);
    advance(899);
    expect(played()).toEqual([48]);
    advance(1);
    expect(played()).toEqual([48, 52]);
  });

  it('shows only the level intervals', () => {
    setup('easy');
    expect(texts()).toEqual(['3ª M', '5ª J', '8ª J']);
    cleanup();
    setup('medium');
    expect(texts()).toEqual(['2ª M', '3ª m', '3ª M', '4ª J', '5ª J', '6ª M', '8ª J']);
    cleanup();
    setup('hard');
    expect(answers()).toHaveLength(13);
    expect(texts()[0]).toBe('Uníssono');
    expect(texts()[6]).toBe('Trítono');
    expect(texts()[12]).toBe('8ª J');
  });

  it('reveals nothing before answering', () => {
    setup('easy');
    expect(screen.queryByText(/C → E/)).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('right answer', () => {
    const { onAnswer, onNext } = setup('easy');
    fireEvent.click(screen.getByRole('button', { name: '3ª M' }));
    expect(onAnswer).toHaveBeenCalledWith(true);
    expect(screen.getByRole('status')).toHaveTextContent('Correto!');
    expect(screen.getByText('C → E · subindo')).toBeInTheDocument();
    advance(700);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('wrong answer', () => {
    const { onAnswer, onNext } = setup('easy');
    fireEvent.click(screen.getByRole('button', { name: '5ª J' }));
    expect(onAnswer).toHaveBeenCalledWith(false);
    expect(screen.getByRole('status')).toHaveTextContent('Errado. Era terça maior, subindo.');
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeInTheDocument();
    advance(2000);
    expect(onNext).not.toHaveBeenCalled();
  });

  it('descending, flats', () => {
    setup('medium', { root: 9, semitones: 7, direction: 'down', pitches: [57, 50] }, 'flat');
    fireEvent.click(screen.getByRole('button', { name: '4ª J' }));
    expect(screen.getByRole('status')).toHaveTextContent('Errado. Era quinta justa, descendo.');
    expect(screen.getByText('A → D · descendo')).toBeInTheDocument();
  });

  it('unison has no direction', () => {
    setup('hard', { root: 7, semitones: 0, direction: 'up', pitches: [55, 55] });
    fireEvent.click(screen.getByRole('button', { name: '2ª m' }));
    expect(screen.getByRole('status')).toHaveTextContent('Errado. Era uníssono.');
    expect(screen.getByText('G → G')).toBeInTheDocument();
  });

  it('replay mid-sequence restarts it', () => {
    const { played } = setup('easy');
    advance(500);
    fireEvent.click(screen.getByRole('button', { name: 'Ouvir de novo' }));
    advance(2000);
    expect(played()).toEqual([48, 48, 52]);
  });

  it('unmounting cancels the pending note', () => {
    const { played, unmount } = setup('easy');
    advance(300);
    unmount();
    advance(2000);
    expect(played()).toEqual([48]);
  });

  it('keyboard', () => {
    const a = setup('easy');
    fireEvent.keyDown(document, { key: '2' });
    expect(a.onAnswer).toHaveBeenCalledWith(false);
    expect(screen.getByRole('button', { name: '5ª J' })).toHaveClass('option--wrong');
    cleanup();

    const b = setup('hard', { root: 0, semitones: 12, direction: 'up', pitches: [48, 60] });
    fireEvent.keyDown(document, { key: 'e' });
    expect(b.onAnswer).toHaveBeenCalledWith(true);
    cleanup();

    const c = setup('hard');
    fireEvent.keyDown(document, { key: 'q' });
    expect(screen.getByRole('button', { name: '7ª m' })).toHaveClass('option--wrong');
    cleanup();

    const d = setup('hard');
    fireEvent.keyDown(document, { key: 'c' });
    fireEvent.keyDown(document, { key: 'C', shiftKey: true });
    expect(d.onAnswer).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: 'r' });
    expect(d.played().filter((m) => m === 48)).toHaveLength(2);
    expect(c.onAnswer).toHaveBeenCalledTimes(1);
  });

  it('hint', () => {
    setup('easy');
    expect(screen.getByText('Teclado: 1–3 · R = ouvir de novo')).toBeInTheDocument();
    cleanup();
    setup('medium');
    expect(screen.getByText('Teclado: 1–7 · R = ouvir de novo')).toBeInTheDocument();
    cleanup();
    setup('hard');
    expect(screen.getByText('Teclado: 1–9, 0, Q, W, E · R = ouvir de novo')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Uníssono' }));
    expect(screen.queryByText(/Teclado:/)).not.toBeInTheDocument();
  });
});
