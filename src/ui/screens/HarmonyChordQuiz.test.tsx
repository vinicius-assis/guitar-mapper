import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundProvider } from '../../audio/SoundProvider';
import type { NotePlayer } from '../../audio/player';
import type { HarmonyItem } from '../../domain/harmonyItems';
import { AppProvider } from '../../state/AppState';
import { activeView, createDefaultData, type Settings } from '../../state/storage';
import { createMemoryStorage } from '../../test-utils';
import { useQuizShortcuts } from '../useQuizShortcuts';
import { HarmonyChordQuiz } from './HarmonyChordQuiz';

const fakePlayer = () => ({ unlock: vi.fn(), prepare: vi.fn(), play: vi.fn<NotePlayer['play']>() });

function Harness(props: Parameters<typeof HarmonyChordQuiz>[0]) {
  useQuizShortcuts(true);
  return <HarmonyChordQuiz {...props} />;
}

function setup(
  item: HarmonyItem,
  extra: { accidentals?: Settings['accidentals']; sevenths?: boolean } = {},
) {
  const settings = activeView(createDefaultData()).settings;
  settings.notation = 'cifra';
  settings.accidentals = extra.accidentals ?? 'auto';
  settings.harmonySevenths = extra.sevenths ?? false;
  const player = fakePlayer();
  const onAnswer = vi.fn();
  const onNext = vi.fn();
  render(
    <AppProvider storage={createMemoryStorage()}>
      <SoundProvider player={player}>
        <Harness item={item} settings={settings} onAnswer={onAnswer} onNext={onNext} />
      </SoundProvider>
    </AppProvider>,
  );
  return { player, onAnswer, onNext };
}
const buttons = () => [...document.querySelectorAll('.note-option')] as HTMLButtonElement[];
const texts = () => buttons().map((b) => b.textContent);
const pick = (label: string) => fireEvent.click(buttons().find((b) => b.textContent === label)!);
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const IV_OF_F: HarmonyItem = { field: 'major', key: 5, degree: 4 };

describe('HarmonyChordQuiz', () => {
  it('asks the IV of F', () => {
    setup(IV_OF_F, { accidentals: 'sharp' });
    expect(screen.getByText('Qual é o IV de F maior?')).toBeInTheDocument();
    expect(texts()).toEqual(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B']);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('Teclado: A–G · Shift = ♯')).toBeInTheDocument();
    expect(document.querySelector('[data-shortcut]')).toBeNull();
  });

  it('labels by the key', () => {
    setup({ field: 'major', key: 6, degree: 7 });
    expect(texts()).toEqual(['C', 'C#', 'D', 'D#', 'E', 'E#', 'F#', 'G', 'G#', 'A', 'A#', 'B']);
    expect(screen.getByText('Qual é o VII de F# maior?')).toBeInTheDocument();
  });

  it('right answer', () => {
    const a = setup(IV_OF_F, { accidentals: 'sharp' });
    pick('Bb');
    expect(a.onAnswer).toHaveBeenCalledWith(true);
    expect(screen.getByRole('status')).toHaveTextContent('Correto! O IV de F maior é Bb.');
    expect(screen.getByText('Bb: Bb D F')).toBeInTheDocument();
    expect(buttons().find((b) => b.textContent === 'Bb')).toHaveClass('option--correct');
    expect(a.player.play).toHaveBeenCalledWith(46);
    advance(300);
    expect(a.player.play).toHaveBeenCalledWith(50);
    expect(a.player.play).toHaveBeenCalledWith(53);
    expect(a.onNext).not.toHaveBeenCalled();
    advance(700);
    expect(a.onNext).toHaveBeenCalledTimes(1);
  });

  it('wrong answer', () => {
    const a = setup(IV_OF_F, { accidentals: 'sharp' });
    pick('A');
    expect(a.onAnswer).toHaveBeenCalledWith(false);
    expect(screen.getByRole('status')).toHaveTextContent('Errado. O IV de F maior é Bb.');
    expect(buttons().find((b) => b.textContent === 'A')).toHaveClass('option--wrong');
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeInTheDocument();
    advance(2000);
    expect(a.onNext).not.toHaveBeenCalled();
  });

  it('keyboard', () => {
    const a = setup(IV_OF_F);
    fireEvent.keyDown(document, { key: 'A', shiftKey: true });
    expect(a.onAnswer).toHaveBeenCalledWith(true);
    expect(screen.queryByText('Teclado: A–G · Shift = ♯')).toBeNull();
    cleanup();
    const b = setup(IV_OF_F);
    fireEvent.keyDown(document, { key: '4' });
    expect(b.onAnswer).not.toHaveBeenCalled();
  });

  it('minor and sevenths', () => {
    setup({ field: 'minor', key: 9, degree: 6 }, { sevenths: true });
    expect(screen.getByText('Qual é o ♭VI de A menor?')).toBeInTheDocument();
    pick('F');
    expect(screen.getByText('F7M: F A C E')).toBeInTheDocument();
  });
});

describe('HarmonyChordQuiz chord arpeggio', () => {
  it('stops the pending notes when the screen unmounts', () => {
    const { player } = setup(IV_OF_F);
    fireEvent.click(buttons()[0]);
    expect(player.play).toHaveBeenCalledTimes(1);
    advance(100);
    cleanup();
    advance(2000);
    expect(player.play).toHaveBeenCalledTimes(1);
  });

  it('keeps arpeggiating while mounted', () => {
    const { player } = setup(IV_OF_F);
    fireEvent.click(buttons()[0]);
    advance(2000);
    expect(player.play.mock.calls.length).toBeGreaterThan(1);
  });
});
