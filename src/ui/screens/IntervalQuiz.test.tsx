import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { SoundProvider } from '../../audio/SoundProvider';
import type { NotePlayer } from '../../audio/player';
import type { IntervalItem } from '../../domain/intervals';
import { AppProvider } from '../../state/AppState';
import { activeView, createDefaultData, type Settings } from '../../state/storage';
import { seededStorage } from '../../test-utils';
import { useQuizShortcuts } from '../useQuizShortcuts';
import type { Mark } from '../Fretboard';
import { IntervalQuiz } from './IntervalQuiz';

const captured: { marks: Mark[] }[] = [];
vi.mock('../Fretboard', async (orig) => {
  const mod = await orig<typeof import('../Fretboard')>();
  return {
    ...mod,
    Fretboard: (props: Parameters<typeof mod.Fretboard>[0]) => {
      captured.push({ marks: props.marks ?? [] });
      return mod.Fretboard(props);
    },
  };
});

const fakePlayer = (): NotePlayer => ({ unlock: vi.fn(), prepare: vi.fn(), play: vi.fn() });
const item: IntervalItem = { root: 0, interval: '5J' };

function Shortcuts() {
  useQuizShortcuts(true);
  return null;
}

function setup(
  opts: {
    instrument?: 'bass' | 'guitar';
    advance?: Settings['intervalAdvance'];
    leftHanded?: boolean;
    notation?: Settings['notation'];
  } = {},
) {
  const { instrument = 'bass', advance = 'manual', leftHanded = false, notation = 'cifra' } = opts;
  const storage = seededStorage({ instrument, settings: { instrument } });
  const settings = { ...activeView(createDefaultData()).settings };
  settings.notation = notation;
  settings.intervalAdvance = advance;
  settings.leftHanded = leftHanded;
  const player = fakePlayer();
  const onAnswer = vi.fn();
  const onNext = vi.fn();
  const utils = render(
    <AppProvider storage={storage}>
      <SoundProvider player={player}>
        <Shortcuts />
        <IntervalQuiz item={item} settings={settings} onAnswer={onAnswer} onNext={onNext} />
      </SoundProvider>
    </AppProvider>,
  );
  return { player, onAnswer, onNext, ...utils };
}
const noteBtn = (name: string) => screen.getByRole('button', { name }) as HTMLButtonElement;
const noteButtons = () =>
  [...document.querySelectorAll('.note-option')] as HTMLButtonElement[];

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('IntervalQuiz', () => {
  it('shows the question, 12 notes and the 4 positions of C on the bass', () => {
    const { container } = setup();
    expect(screen.getByText('Qual é a nota?')).toBeInTheDocument();
    expect(screen.getByText('5ª J')).toBeInTheDocument();
    expect(noteButtons()).toHaveLength(12);
    expect(document.querySelectorAll('.option')).toHaveLength(0);
    expect(container.querySelectorAll('line.string')).toHaveLength(4);
    expect(container.querySelectorAll('g.mark--target')).toHaveLength(4);
    expect(container.querySelectorAll('g.mark--correct')).toHaveLength(0);
    expect(container.querySelectorAll('line.link')).toHaveLength(0);
  });

  it('answering right marks G everywhere, links and plays both pitches', () => {
    const { container, onAnswer, player } = setup();
    fireEvent.click(noteBtn('G'));
    expect(noteBtn('G')).toHaveClass('option--correct');
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith(true);
    expect(container.querySelectorAll('g.mark--correct')).toHaveLength(5);
    expect(container.querySelectorAll('line.link')).toHaveLength(1);
    expect(screen.getByText('Correto!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeInTheDocument();
    expect(player.play).toHaveBeenCalledTimes(1);
    expect(player.play).toHaveBeenCalledWith(36);
    act(() => void vi.advanceTimersByTime(700));
    expect(player.play).toHaveBeenLastCalledWith(43);
  });

  it('answering wrong shows the right one, disables buttons', () => {
    const { onAnswer } = setup();
    fireEvent.click(noteBtn('E'));
    expect(onAnswer).toHaveBeenCalledWith(false);
    expect(noteBtn('E')).toHaveClass('option--wrong');
    expect(noteBtn('G')).toHaveClass('option--correct');
    expect(screen.getByRole('status')).toHaveTextContent(/Errou.*G/);
    expect(noteButtons().every((b) => b.disabled)).toBe(true);
    fireEvent.click(noteBtn('G'));
    expect(onAnswer).toHaveBeenCalledTimes(1);
  });

  it('puts the root C on exactly {1,5},{2,10},{3,3},{4,8} on the bass', () => {
    captured.length = 0;
    setup();
    const targets = captured[captured.length - 1].marks
      .filter((m) => m.kind === 'target')
      .map((m) => `${m.position.string}-${m.position.fret}`)
      .sort();
    expect(targets).toEqual(['1-5', '2-10', '3-3', '4-8']);
  });

  it('labels the answer marks and buttons in solfejo when notation is solfejo', () => {
    const { container } = setup({ notation: 'solfejo' });
    expect(noteButtons().map((b) => b.textContent)).toContain('Sol');
    fireEvent.click(noteBtn('Sol'));
    const labels = [...container.querySelectorAll('g.mark--correct text')].map((t) => t.textContent);
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.every((l) => l === 'Sol')).toBe(true);
  });

  it.each([
    ['manual', 0],
    ['3s', 3000],
    ['5s', 5000],
  ] as const)('advance %s', (advance, ms) => {
    const { onNext } = setup({ advance });
    fireEvent.click(noteBtn('E'));
    if (ms === 0) {
      act(() => void vi.advanceTimersByTime(60000));
      expect(onNext).not.toHaveBeenCalled();
      return;
    }
    act(() => void vi.advanceTimersByTime(ms - 1));
    expect(onNext).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(1));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('does not call onNext after unmount', () => {
    const { onNext, unmount } = setup({ advance: '3s' });
    fireEvent.click(noteBtn('G'));
    unmount();
    act(() => void vi.advanceTimersByTime(10000));
    expect(onNext).not.toHaveBeenCalled();
  });

  it('key 1 picks nothing; Enter after answering goes to next', () => {
    const { onAnswer, onNext } = setup();
    fireEvent.keyDown(document, { key: '1' });
    expect(onAnswer).not.toHaveBeenCalled();
    fireEvent.click(noteBtn('G'));
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('guitar has 6 strings and plays 48 then 55', () => {
    const { container, player } = setup({ instrument: 'guitar' });
    expect(container.querySelectorAll('line.string')).toHaveLength(6);
    fireEvent.click(noteBtn('G'));
    expect(player.play).toHaveBeenCalledWith(48);
    act(() => void vi.advanceTimersByTime(700));
    expect(player.play).toHaveBeenLastCalledWith(55);
  });

  it('left-handed mirrors the link', () => {
    const { container } = setup({ leftHanded: true });
    fireEvent.click(noteBtn('G'));
    const l = container.querySelector('line.link')!;
    expect(Number(l.getAttribute('x2'))).toBeLessThan(Number(l.getAttribute('x1')));
  });
});
