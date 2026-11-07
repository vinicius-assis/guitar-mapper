import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { Position } from '../domain/fretboard';
import type { Instrument, InstrumentId } from '../domain/instruments';
import type { SoundStep } from '../domain/earTraining';
import { pitchOf } from '../domain/pitch';
import { useAppState } from '../state/AppState';
import { createNotePlayer, type AudioContextLike, type NotePlayer } from './player';

interface SoundApi {
  playPosition(position: Position): void;
  prepare(positions: Position[]): void;
  unlock(): void;
  playSequence(steps: SoundStep[]): void;
  playPitches(midis: number[], gapMs?: number): void;
  preparePitches(midis: number[]): void;
}

const SoundContext = createContext<SoundApi | null>(null);

export function soundUrl(instrument: Instrument, midi: number, base: string): string {
  return `${base}sounds/${instrument.soundFolder}/${midi}.mp3`;
}

function browserPlayer(instrument: Instrument): NotePlayer {
  return createNotePlayer({
    createContext: () => {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) throw new Error('Web Audio indisponível');
      return new Ctor() as unknown as AudioContextLike;
    },
    fetchBuffer: async (url) => (await fetch(url)).arrayBuffer(),
    urlFor: (midi) => soundUrl(instrument, midi, import.meta.env.BASE_URL),
  });
}

export function SoundProvider({
  player,
  createPlayer = browserPlayer,
  children,
}: {
  player?: NotePlayer;
  createPlayer?: (instrument: Instrument) => NotePlayer;
  children: ReactNode;
}) {
  const { data, instrument } = useAppState();
  const enabled = data.settings.soundEnabled;
  const players = useRef(new Map<InstrumentId, NotePlayer>());
  let notePlayer = player ?? players.current.get(instrument.id);
  if (!notePlayer) {
    notePlayer = createPlayer(instrument);
    players.current.set(instrument.id, notePlayer);
  }

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cancelPending = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => cancelPending, [enabled, instrument.id]);

  const api = useMemo<SoundApi>(() => {
    const run = (fn: () => void) => {
      if (!enabled) return;
      try {
        fn();
      } catch {
        // som nunca derruba o estudo
      }
    };
    const playSequence = (steps: SoundStep[]) => {
      cancelPending();
      if (!enabled) return;
      steps.forEach(({ midi, atMs }) => {
        const play = () => run(() => notePlayer.play(midi));
        if (atMs <= 0) play();
        else timers.current.push(setTimeout(play, atMs));
      });
    };
    return {
      playPosition: (p) => run(() => notePlayer.play(pitchOf(p, instrument))),
      prepare: (ps) => run(() => notePlayer.prepare(ps.map((p) => pitchOf(p, instrument)))),
      unlock: () => run(() => notePlayer.unlock()),
      playSequence,
      playPitches: (midis, gapMs = 700) =>
        playSequence(midis.map((midi, i) => ({ midi, atMs: i * gapMs }))),
      preparePitches: (midis) => run(() => notePlayer.prepare(midis)),
    };
  }, [enabled, notePlayer, instrument]);

  return <SoundContext.Provider value={api}>{children}</SoundContext.Provider>;
}

export function useSound(): SoundApi {
  const value = useContext(SoundContext);
  if (!value) throw new Error('useSound must be used inside <SoundProvider>');
  return value;
}
