import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Position } from '../domain/fretboard';
import { pitchOf } from '../domain/pitch';
import { useAppState } from '../state/AppState';
import { createNotePlayer, type AudioContextLike, type NotePlayer } from './player';

interface SoundApi {
  playPosition(position: Position): void;
  prepare(positions: Position[]): void;
  unlock(): void;
}

const SoundContext = createContext<SoundApi | null>(null);

function browserPlayer(): NotePlayer {
  return createNotePlayer({
    createContext: () => {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) throw new Error('Web Audio indisponível');
      return new Ctor() as unknown as AudioContextLike;
    },
    fetchBuffer: async (url) => (await fetch(url)).arrayBuffer(),
    urlFor: (midi) => `${import.meta.env.BASE_URL}sounds/nylon/${midi}.mp3`,
  });
}

export function SoundProvider({ player, children }: { player?: NotePlayer; children: ReactNode }) {
  const { data } = useAppState();
  const enabled = data.settings.soundEnabled;
  const [notePlayer] = useState<NotePlayer>(() => player ?? browserPlayer());

  const api = useMemo<SoundApi>(() => {
    const run = (fn: () => void) => {
      if (!enabled) return;
      try {
        fn();
      } catch {
        // som nunca derruba o estudo
      }
    };
    return {
      playPosition: (p) => run(() => notePlayer.play(pitchOf(p))),
      prepare: (ps) => run(() => notePlayer.prepare(ps.map(pitchOf))),
      unlock: () => run(() => notePlayer.unlock()),
    };
  }, [enabled, notePlayer]);

  return <SoundContext.Provider value={api}>{children}</SoundContext.Provider>;
}

export function useSound(): SoundApi {
  const value = useContext(SoundContext);
  if (!value) throw new Error('useSound must be used inside <SoundProvider>');
  return value;
}
