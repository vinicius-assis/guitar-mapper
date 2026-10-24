import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SoundProvider } from '../../audio/SoundProvider';
import type { NotePlayer } from '../../audio/player';
import type { EarLevel } from '../../domain/quiz';
import { AppProvider } from '../../state/AppState';
import { createDefaultData } from '../../state/storage';
import { createMemoryStorage } from '../../test-utils';
import { EarQuiz } from './EarQuiz';

const fakePlayer = (): NotePlayer => ({ unlock: vi.fn(), prepare: vi.fn(), play: vi.fn() });

// Corda 6, casa 12 = E3 (MIDI 52).
function setup(level: EarLevel, naturalsOnly = true) {
  const settings = createDefaultData().settings;
  settings.notation = 'cifra';
  settings.earLevel = level;
  settings.filter = { strings: [6], fretMin: 12, fretMax: 12, naturalsOnly };
  const player = fakePlayer();
  const onAnswer = vi.fn();
  const onNext = vi.fn();
  render(
    <AppProvider storage={createMemoryStorage()}>
      <SoundProvider player={player}>
        <EarQuiz
          position={{ string: 6, fret: 12 }}
          settings={settings}
          onAnswer={onAnswer}
          onNext={onNext}
        />
      </SoundProvider>
    </AppProvider>,
  );
  return { player, onAnswer, onNext };
}
const options = () =>
  screen.getAllByRole('button').filter((b) => b.classList.contains('option')) as HTMLButtonElement[];
const board = () => screen.queryByRole('group', { name: 'Braço da guitarra' });

describe('EarQuiz', () => {
  it('plays the position as soon as the question appears, and hides the board', () => {
    const { player } = setup('easy');
    expect(player.play).toHaveBeenCalledTimes(1);
    expect(player.play).toHaveBeenCalledWith(52);
    expect(board()).not.toBeInTheDocument();
    expect(screen.getByText('Qual nota você ouviu?')).toBeInTheDocument();
  });

  it('Ouvir de novo plays it again', () => {
    const { player } = setup('easy');
    fireEvent.click(screen.getByRole('button', { name: 'Ouvir de novo' }));
    expect(player.play).toHaveBeenCalledTimes(2);
    expect(player.play).toHaveBeenLastCalledWith(52);
  });

  it('has 2 options on easy, 4 on medium, 7 on hard (naturals) and 12 with accidentals', () => {
    for (const [level, naturalsOnly, count] of [
      ['easy', true, 2],
      ['medium', true, 4],
      ['hard', true, 7],
      ['hard', false, 12],
    ] as const) {
      setup(level, naturalsOnly);
      expect(options(), `${level}/${naturalsOnly}`).toHaveLength(count);
      cleanup();
    }
  });

  it('easy has no limit and no counter', () => {
    const { player } = setup('easy');
    for (let i = 0; i < 8; i++) fireEvent.click(screen.getByRole('button', { name: 'Ouvir de novo' }));
    expect(player.play).toHaveBeenCalledTimes(9);
  });

  it('medium allows 5 listens in total (4 repeats), then the button is disabled', () => {
    const { player } = setup('medium');
    expect(screen.getByRole('button', { name: 'Ouvir de novo (4)' })).toBeEnabled();
    for (const left of [4, 3, 2, 1]) {
      fireEvent.click(screen.getByRole('button', { name: `Ouvir de novo (${left})` }));
    }
    expect(player.play).toHaveBeenCalledTimes(5);
    expect(screen.getByRole('button', { name: 'Sem mais repetições' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Sem mais repetições' }));
    expect(player.play).toHaveBeenCalledTimes(5);
  });

  it('hard allows 2 listens in total (1 repeat)', () => {
    const { player } = setup('hard');
    fireEvent.click(screen.getByRole('button', { name: 'Ouvir de novo (1)' }));
    expect(player.play).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Sem mais repetições' })).toBeDisabled();
  });

  it('after answering, the limit is lifted and the button plays again', () => {
    const { player } = setup('hard');
    fireEvent.click(screen.getByRole('button', { name: 'Ouvir de novo (1)' }));
    fireEvent.click(options().find((b) => b.textContent !== 'E')!);
    const again = screen.getByRole('button', { name: 'Ouvir de novo' });
    expect(again).toBeEnabled();
    fireEvent.click(again);
    fireEvent.click(again);
    expect(player.play).toHaveBeenCalledTimes(4);
  });

  it('a right answer reports it, shows Correto! and reveals the board without replaying', () => {
    const { player, onAnswer } = setup('medium');
    fireEvent.click(options().find((b) => b.textContent === 'E')!);
    expect(onAnswer).toHaveBeenCalledWith(true);
    expect(screen.getByText('Correto!')).toBeInTheDocument();
    expect(board()).toBeInTheDocument();
    expect(player.play).toHaveBeenCalledTimes(1);
  });

  it('a wrong answer reports it, offers Próxima, reveals the board and marks the right option', () => {
    const { player, onAnswer, onNext } = setup('medium');
    fireEvent.click(options().find((b) => b.textContent !== 'E')!);
    expect(onAnswer).toHaveBeenCalledWith(false);
    expect(board()).toBeInTheDocument();
    expect(options().find((b) => b.textContent === 'E')).toHaveClass('option--correct');
    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));
    expect(onNext).toHaveBeenCalled();
    expect(player.play).toHaveBeenCalledTimes(1);
  });
});
