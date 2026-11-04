import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BASS, GUITAR, type Instrument } from '../domain/instruments';
import { AppProvider, useAppState } from '../state/AppState';
import { seededStorage } from '../test-utils';
import type { NotePlayer } from './player';
import { SoundProvider, soundUrl, useSound } from './SoundProvider';

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

function Switch() {
  const { updateSettings } = useAppState();
  return (
    <>
      <button onClick={() => updateSettings({ instrument: 'bass' })}>to-bass</button>
      <button onClick={() => updateSettings({ instrument: 'guitar' })}>to-guitar</button>
    </>
  );
}

describe('soundUrl', () => {
  it('uses the sample folder of the instrument', () => {
    expect(soundUrl(BASS, 28, '/')).toBe('/sounds/bass/28.mp3');
    expect(soundUrl(GUITAR, 52, '/')).toBe('/sounds/nylon/52.mp3');
  });
});

describe('useSound per instrument', () => {
  it('uses bass pitches with the bass instrument', () => {
    const player = fakePlayer();
    render(
      <AppProvider storage={seededStorage({ settings: { instrument: 'bass' } })}>
        <SoundProvider player={player}>
          <BassProbe />
        </SoundProvider>
      </AppProvider>,
    );
    fireEvent.click(screen.getByText('bass-play'));
    expect(player.play).toHaveBeenCalledWith(28);
    fireEvent.click(screen.getByText('bass-prepare'));
    expect(player.prepare).toHaveBeenCalledWith([67]);
  });

  it('creates one player per instrument, lazily, and reuses it when switching back', () => {
    const made: Instrument[] = [];
    const players = new Map<string, NotePlayer>();
    const createPlayer = (i: Instrument) => {
      made.push(i);
      const p = fakePlayer();
      players.set(i.id, p);
      return p;
    };
    render(
      <AppProvider storage={seededStorage()}>
        <SoundProvider createPlayer={createPlayer}>
          <Probe />
          <Switch />
        </SoundProvider>
      </AppProvider>,
    );
    fireEvent.click(screen.getByText('unlock'));
    fireEvent.click(screen.getByText('to-bass'));
    fireEvent.click(screen.getByText('unlock'));
    fireEvent.click(screen.getByText('to-guitar'));
    fireEvent.click(screen.getByText('unlock'));
    expect(made.map((i) => i.id)).toEqual(['guitar', 'bass']);
    expect(players.get('guitar')!.unlock).toHaveBeenCalledTimes(2);
    expect(players.get('bass')!.unlock).toHaveBeenCalledTimes(1);
  });
});

function BassProbe() {
  const sound = useSound();
  return (
    <>
      <button onClick={() => sound.playPosition({ string: 4, fret: 0 })}>bass-play</button>
      <button onClick={() => sound.prepare([{ string: 1, fret: 24 }])}>bass-prepare</button>
    </>
  );
}

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
