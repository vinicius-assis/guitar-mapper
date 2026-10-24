import { describe, it, expect, vi } from 'vitest';
import { createNotePlayer, type AudioContextLike } from './player';

function fakeEnv() {
  const log: string[] = [];
  let contexts = 0;
  const context: AudioContextLike = {
    state: 'suspended',
    destination: {},
    resume: vi.fn(async () => {}),
    decodeAudioData: vi.fn(async (data: ArrayBuffer) => ({ id: new TextDecoder().decode(data) })),
    createBufferSource() {
      let id = '';
      return {
        set buffer(value: unknown) {
          id = (value as { id: string }).id;
        },
        get buffer() {
          return null;
        },
        connect() {},
        start() {
          log.push(`start ${id}`);
        },
        stop() {
          log.push(`stop ${id}`);
        },
      };
    },
  };
  const fetchBuffer = vi.fn(async (url: string) => new TextEncoder().encode(url).buffer as ArrayBuffer);
  const deps = {
    createContext: () => {
      contexts++;
      return context;
    },
    fetchBuffer,
    urlFor: (m: number) => `n${m}`,
  };
  return { deps, log, context, fetchBuffer, contextCount: () => contexts };
}
const settle = () => new Promise((r) => setTimeout(r, 0));

describe('createNotePlayer', () => {
  it('creates the AudioContext only when unlocked or first used, and resumes it', () => {
    const env = fakeEnv();
    const player = createNotePlayer(env.deps);
    expect(env.contextCount()).toBe(0);
    player.unlock();
    player.unlock();
    expect(env.contextCount()).toBe(1);
    expect(env.context.resume).toHaveBeenCalled();
  });

  it('plays a note after loading it, and reuses the decoded buffer next time', async () => {
    const env = fakeEnv();
    const player = createNotePlayer(env.deps);
    player.play(64);
    await settle();
    expect(env.log).toEqual(['start n64']);
    player.play(64);
    await settle();
    expect(env.fetchBuffer).toHaveBeenCalledTimes(1);
    expect(env.log).toEqual(['start n64', 'stop n64', 'start n64']);
  });

  it('a new note cuts the previous one', async () => {
    const env = fakeEnv();
    const player = createNotePlayer(env.deps);
    player.play(40);
    await settle();
    player.play(45);
    await settle();
    expect(env.log).toEqual(['start n40', 'stop n40', 'start n45']);
  });

  it('a slow note never plays over a newer request', async () => {
    const env = fakeEnv();
    let release!: () => void;
    env.fetchBuffer.mockImplementationOnce(
      (url) =>
        new Promise((resolve) => {
          release = () => resolve(new TextEncoder().encode(url).buffer as ArrayBuffer);
        }),
    );
    const player = createNotePlayer(env.deps);
    player.play(40); // lento
    player.play(45); // mais novo
    await settle();
    release();
    await settle();
    expect(env.log).toEqual(['start n45']);
  });

  it('prepare loads notes in advance without playing', async () => {
    const env = fakeEnv();
    const player = createNotePlayer(env.deps);
    player.prepare([40, 45, 40]);
    await settle();
    expect(env.fetchBuffer).toHaveBeenCalledTimes(2);
    expect(env.log).toEqual([]);
    player.play(45);
    await settle();
    expect(env.fetchBuffer).toHaveBeenCalledTimes(2);
    expect(env.log).toEqual(['start n45']);
  });

  it('stays silent and never throws when anything fails', async () => {
    const noContext = createNotePlayer({
      createContext: () => {
        throw new Error('no audio');
      },
      fetchBuffer: async () => new ArrayBuffer(1),
      urlFor: String,
    });
    expect(() => {
      noContext.unlock();
      noContext.prepare([40]);
      noContext.play(40);
    }).not.toThrow();

    const env = fakeEnv();
    env.fetchBuffer.mockRejectedValue(new Error('offline'));
    const failing = createNotePlayer(env.deps);
    failing.play(40);
    await settle();
    expect(env.log).toEqual([]);
    env.fetchBuffer.mockResolvedValue(new TextEncoder().encode('n40').buffer as ArrayBuffer);
    failing.play(40); // tenta de novo depois da falha
    await settle();
    expect(env.log).toEqual(['start n40']);
  });
});
