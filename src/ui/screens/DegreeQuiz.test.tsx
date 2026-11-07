import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundProvider } from '../../audio/SoundProvider';
import type { NotePlayer } from '../../audio/player';
import type { DegreeQuestion } from '../../domain/earTraining';
import type { EarLevel } from '../../domain/quiz';
import { AppProvider } from '../../state/AppState';
import { activeView, createDefaultData, type Settings } from '../../state/storage';
import { createMemoryStorage } from '../../test-utils';
import { useQuizShortcuts } from '../useQuizShortcuts';
import { DegreeQuiz } from './DegreeQuiz';

const fakePlayer = () => ({ unlock: vi.fn(), prepare: vi.fn(), play: vi.fn<NotePlayer['play']>() });

const Q5: DegreeQuestion = { tonic: 0, degree: 5, tonicMidi: 48 };

function Harness(props: Parameters<typeof DegreeQuiz>[0]) {
  useQuizShortcuts(true);
  return <DegreeQuiz {...props} />;
}

function setup(
  level: EarLevel,
  question: DegreeQuestion = Q5,
  extra: { accidentals?: Settings['accidentals']; notation?: Settings['notation'] } = {},
) {
  const settings = activeView(createDefaultData()).settings;
  settings.notation = extra.notation ?? 'cifra';
  settings.accidentals = extra.accidentals ?? 'auto';
  settings.degreeLevel = level;
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
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('DegreeQuiz', () => {
  it('plays the arpeggio and the target', () => {
    const a = setup('easy');
    advance(1799);
    expect(a.played()).toEqual([48, 52, 55]);
    advance(1);
    expect(a.played()).toEqual([48, 52, 55, 55]);
    cleanup();
    const b = setup('hard', { tonic: 0, degree: 3, tonicMidi: 48 });
    expect(b.played()).toEqual([48]);
    advance(1000);
    expect(b.played()).toEqual([48, 52]);
  });

  it('shows the level degrees', () => {
    setup('easy');
    expect(answers().map((b) => b.textContent)).toEqual(['1', '3', '5']);
    expect(screen.getByRole('button', { name: 'Grau 3' })).toBeInTheDocument();
    cleanup();
    setup('medium');
    expect(answers()).toHaveLength(5);
    cleanup();
    setup('hard');
    expect(answers()).toHaveLength(7);
  });

  it('right answer', () => {
    const { onAnswer, onNext } = setup('easy');
    fireEvent.click(screen.getByRole('button', { name: 'Grau 5' }));
    expect(onAnswer).toHaveBeenCalledWith(true);
    expect(screen.getByRole('status')).toHaveTextContent('Correto!');
    expect(screen.getByText('Tônica C · grau 5 = G')).toBeInTheDocument();
    advance(700);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('wrong answer', () => {
    const { onAnswer } = setup('easy');
    expect(screen.queryByText(/Tônica/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Grau 3' }));
    expect(onAnswer).toHaveBeenCalledWith(false);
    expect(screen.getByRole('status')).toHaveTextContent('Errado. Era o grau 5.');
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeInTheDocument();
  });

  it.each([
    [6, 3, 'auto', 'cifra', 'Tônica F# · grau 3 = A#'],
    [6, 7, 'auto', 'cifra', 'Tônica F# · grau 7 = F'],
    [2, 7, 'auto', 'cifra', 'Tônica D · grau 7 = C#'],
    [10, 1, 'auto', 'cifra', 'Tônica Bb · grau 1 = Bb'],
    [6, 3, 'auto', 'solfejo', 'Tônica Fá# · grau 3 = Lá#'],
    [3, 3, 'sharp', 'cifra', 'Tônica D# · grau 3 = G'],
    [3, 3, 'flat', 'cifra', 'Tônica Eb · grau 3 = G'],
  ] as const)('names the target %#', (tonic, degree, accidentals, notation, detail) => {
    setup('hard', { tonic, degree, tonicMidi: 48 + tonic }, { accidentals, notation });
    fireEvent.click(screen.getByRole('button', { name: degree === 1 ? 'Grau 2' : 'Grau 1' }));
    expect(screen.getByText(detail)).toBeInTheDocument();
  });

  it('keyboard', () => {
    const a = setup('easy');
    fireEvent.keyDown(document, { key: '2' });
    expect(a.onAnswer).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: '3' });
    expect(a.onAnswer).toHaveBeenCalledWith(false);
    cleanup();
    const b = setup('easy');
    fireEvent.keyDown(document, { key: '5' });
    expect(b.onAnswer).toHaveBeenCalledWith(true);
    cleanup();
    setup('easy');
    expect(screen.getByText('Teclado: 1, 3, 5 · R = ouvir de novo')).toBeInTheDocument();
    cleanup();
    setup('hard');
    expect(screen.getByText('Teclado: 1, 2, 3, 4, 5, 6, 7 · R = ouvir de novo')).toBeInTheDocument();
  });

  it('unmounting cancels the target', () => {
    const { played, unmount } = setup('easy');
    advance(1000);
    unmount();
    advance(2000);
    expect(played()).toEqual([48, 52, 55]);
  });
});
