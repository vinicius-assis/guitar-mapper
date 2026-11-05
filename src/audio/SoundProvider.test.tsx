import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
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

describe('playPitches / preparePitches', () => {
  afterEach(() => vi.useRealTimers());

  function PitchProbe() {
    const sound = useSound();
    return (
      <>
        <button onClick={() => sound.playPitches([36, 43])}>seq</button>
        <button onClick={() => sound.playPitches([40, 47])}>seq2</button>
        <button onClick={() => sound.preparePitches([36, 43])}>prep</button>
      </>
    );
  }
  const mount = (soundEnabled: boolean) => {
    vi.useFakeTimers();
    const player = fakePlayer();
    const view = render(
      <AppProvider storage={seededStorage({ settings: { soundEnabled } })}>
        <SoundProvider player={player}>
          <PitchProbe />
        </SoundProvider>
      </AppProvider>,
    );
    return { player, view };
  };

  it('plays the first now and the next after the gap', () => {
    const { player } = mount(true);
    fireEvent.click(screen.getByText('seq'));
    expect(player.play).toHaveBeenCalledTimes(1);
    expect(player.play).toHaveBeenCalledWith(36);
    vi.advanceTimersByTime(699);
    expect(player.play).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(player.play).toHaveBeenLastCalledWith(43);
  });

  it('a new call cancels pending notes', () => {
    const { player } = mount(true);
    fireEvent.click(screen.getByText('seq'));
    vi.advanceTimersByTime(300);
    fireEvent.click(screen.getByText('seq2'));
    vi.advanceTimersByTime(2000);
    expect(player.play).not.toHaveBeenCalledWith(43);
    expect(player.play).toHaveBeenCalledWith(40);
    expect(player.play).toHaveBeenCalledWith(47);
  });

  it('prepares pitches', () => {
    const { player } = mount(true);
    fireEvent.click(screen.getByText('prep'));
    expect(player.prepare).toHaveBeenCalledWith([36, 43]);
  });

  it('does nothing when sound is off', () => {
    const { player } = mount(false);
    fireEvent.click(screen.getByText('seq'));
    fireEvent.click(screen.getByText('prep'));
    vi.advanceTimersByTime(2000);
    expect(player.play).not.toHaveBeenCalled();
    expect(player.prepare).not.toHaveBeenCalled();
  });

  it('unmounting cancels pending notes', () => {
    const { player, view } = mount(true);
    fireEvent.click(screen.getByText('seq'));
    view.unmount();
    vi.advanceTimersByTime(2000);
    expect(player.play).not.toHaveBeenCalledWith(43);
  });

  it('never throws when the player fails', () => {
    const { player } = mount(true);
    vi.mocked(player.play).mockImplementation(() => {
      throw new Error('boom');
    });
    expect(() => {
      fireEvent.click(screen.getByText('seq'));
      vi.advanceTimersByTime(2000);
    }).not.toThrow();
  });

  function Ctl() {
    const { updateSettings } = useAppState();
    return (
      <>
        <button onClick={() => updateSettings({ soundEnabled: false })}>mute</button>
        <button onClick={() => updateSettings({ instrument: 'bass' })}>to-bass</button>
      </>
    );
  }
  const mountCtl = () => {
    vi.useFakeTimers();
    const player = fakePlayer();
    render(
      <AppProvider storage={seededStorage({ settings: { soundEnabled: true } })}>
        <SoundProvider player={player}>
          <PitchProbe />
          <Ctl />
        </SoundProvider>
      </AppProvider>,
    );
    return player;
  };

  it('turning sound off mid-gap cancels the pending note', () => {
    const player = mountCtl();
    fireEvent.click(screen.getByText('seq'));
    vi.advanceTimersByTime(300);
    fireEvent.click(screen.getByText('mute'));
    vi.advanceTimersByTime(2000);
    expect(player.play).not.toHaveBeenCalledWith(43);
  });

  it('switching instrument mid-gap cancels the pending note', () => {
    const player = mountCtl();
    fireEvent.click(screen.getByText('seq'));
    vi.advanceTimersByTime(300);
    fireEvent.click(screen.getByText('to-bass'));
    vi.advanceTimersByTime(2000);
    expect(player.play).not.toHaveBeenCalledWith(43);
  });
});
