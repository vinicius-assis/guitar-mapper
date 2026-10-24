export interface BufferSourceLike {
  buffer: unknown;
  connect(node: unknown): void;
  start(): void;
  stop(): void;
}

export interface AudioContextLike {
  state: string;
  destination: unknown;
  resume(): Promise<void>;
  decodeAudioData(data: ArrayBuffer): Promise<unknown>;
  createBufferSource(): BufferSourceLike;
}

export interface PlayerDeps {
  createContext(): AudioContextLike;
  fetchBuffer(url: string): Promise<ArrayBuffer>;
  urlFor(midi: number): string;
}

export interface NotePlayer {
  /** Chamar dentro de um gesto do aluno: cria/retoma o AudioContext. */
  unlock(): void;
  prepare(midis: number[]): void;
  play(midi: number): void;
}

export function createNotePlayer(deps: PlayerDeps): NotePlayer {
  let context: AudioContextLike | null = null;
  let current: BufferSourceLike | null = null;
  let latest = 0;
  const buffers = new Map<number, Promise<unknown>>();

  function ensureContext(): AudioContextLike | null {
    if (context) return context;
    try {
      context = deps.createContext();
    } catch {
      return null;
    }
    return context;
  }

  function unlock() {
    const ctx = ensureContext();
    if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
  }

  function load(midi: number): Promise<unknown> | null {
    const ctx = ensureContext();
    if (!ctx) return null;
    let pending = buffers.get(midi);
    if (!pending) {
      pending = deps
        .fetchBuffer(deps.urlFor(midi))
        .then((data) => ctx.decodeAudioData(data))
        .catch((error) => {
          buffers.delete(midi); // permite tentar de novo
          throw error;
        });
      buffers.set(midi, pending);
    }
    return pending;
  }

  function prepare(midis: number[]) {
    for (const midi of new Set(midis)) load(midi)?.catch(() => {});
  }

  function play(midi: number) {
    const request = ++latest;
    unlock();
    const pending = load(midi);
    if (!pending) return;
    pending
      .then((buffer) => {
        const ctx = context;
        if (!ctx || request !== latest) return; // chegou tarde: há um pedido mais novo
        try {
          current?.stop();
        } catch {
          // já tinha terminado
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start();
        current = source;
      })
      .catch(() => {});
  }

  return { unlock, prepare, play };
}
