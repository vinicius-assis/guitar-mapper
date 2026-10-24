import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppProvider } from '../state/AppState';
import { seededStorage } from '../test-utils';
import type { NotePlayer } from './player';
import { SoundProvider, useSound } from './SoundProvider';

const fakePlayer = (): NotePlayer => ({ unlock: vi.fn(), prepare: vi.fn(), play: vi.fn() });

function Probe() {
  const sound = useSound();
  return (
    <>
      <button onClick={() => sound.playPosition({ string: 6, fret: 12 })}>play</button>
      <button
        onClick={() =>
          sound.prepare([
            { string: 1, fret: 24 },
            { string: 6, fret: 1 },
          ])
        }
      >
        prepare
      </button>
      <button onClick={() => sound.unlock()}>unlock</button>
    </>
  );
}

const setup = (soundEnabled: boolean) => {
  const player = fakePlayer();
  render(
    <AppProvider storage={seededStorage({ settings: { soundEnabled } })}>
      <SoundProvider player={player}>
        <Probe />
      </SoundProvider>
    </AppProvider>,
  );
  return player;
};

describe('useSound', () => {
  it('plays the MIDI pitch of a position, prepares pitches and unlocks', () => {
    const player = setup(true);
    fireEvent.click(screen.getByText('play'));
    expect(player.play).toHaveBeenCalledWith(52);
    fireEvent.click(screen.getByText('prepare'));
    expect(player.prepare).toHaveBeenCalledWith([88, 41]);
    fireEvent.click(screen.getByText('unlock'));
    expect(player.unlock).toHaveBeenCalled();
  });

  it('does nothing at all when the sound is off (no loading either)', () => {
    const player = setup(false);
    for (const name of ['play', 'prepare', 'unlock']) fireEvent.click(screen.getByText(name));
    expect(player.play).not.toHaveBeenCalled();
    expect(player.prepare).not.toHaveBeenCalled();
    expect(player.unlock).not.toHaveBeenCalled();
  });

  it('never throws when the player blows up', () => {
    const player = fakePlayer();
    vi.mocked(player.play).mockImplementation(() => {
      throw new Error('boom');
    });
    render(
      <AppProvider storage={seededStorage()}>
        <SoundProvider player={player}>
          <Probe />
        </SoundProvider>
      </AppProvider>,
    );
    expect(() => fireEvent.click(screen.getByText('play'))).not.toThrow();
  });

  it('fails loudly outside a provider', () => {
    expect(() => render(<Probe />)).toThrow(/SoundProvider/);
  });
});
