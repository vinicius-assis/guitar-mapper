import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import type { Metronome as Engine } from '../audio/metronome';
import { AppProvider } from '../state/AppState';
import { readRawSettings, seededStorage } from '../test-utils';
import { Metronome, __resetSharedMetronome } from './Metronome';

// Envolve o motor real para espiar o singleton compartilhado.
const engines: Engine[] = [];
vi.mock('../audio/metronome', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../audio/metronome')>();
  return {
    ...actual,
    createMetronome: (...args: Parameters<typeof actual.createMetronome>) => {
      const e = actual.createMetronome(...args);
      vi.spyOn(e, 'setBpm');
      vi.spyOn(e, 'setBeatsPerBar');
      engines.push(e);
      return e;
    },
  };
});

function countingAudioContext() {
  const ctor = vi.fn(function (this: Record<string, unknown>) {
    this.currentTime = 0;
    this.state = 'running';
    this.destination = {};
    this.resume = () => Promise.resolve();
    this.createOscillator = () => ({
      frequency: { value: 0 },
      connect: () => {},
      start: () => {},
      stop: () => {},
    });
    this.createGain = () => ({
      gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
      connect: () => {},
    });
  });
  vi.stubGlobal('AudioContext', ctor);
  return ctor;
}

function fakeEngine() {
  return {
    start: vi.fn(() => true),
    stop: vi.fn(),
    setBpm: vi.fn(),
    setBeatsPerBar: vi.fn(),
    isRunning: vi.fn(() => false),
  } satisfies Engine;
}

function setup(settings: { metronomeBpm?: number; metronomeBeats?: number } = {}) {
  const storage = seededStorage({ settings });
  const engine = fakeEngine();
  const createEngine = vi.fn(() => engine);
  const view = render(
    <AppProvider storage={storage}>
      <Metronome createEngine={createEngine} />
    </AppProvider>,
  );
  return { storage, engine, createEngine, ...view };
}

const toggle = () => screen.getByRole('button', { name: /^(Iniciar|Parar)$/ });
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

function setVisibility(state: 'hidden' | 'visible') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

afterEach(() => {
  setVisibility('visible');
  vi.unstubAllGlobals();
  __resetSharedMetronome();
  engines.length = 0;
});

describe('Metronome', () => {
  it('shows the saved tempo and bar', () => {
    const { createEngine } = setup();
    expect(screen.getByText('80 BPM')).toBeInTheDocument();
    const bar = screen.getByRole('group', { name: 'Compasso' });
    expect(within(bar).getByRole('button', { name: '4' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(bar).getByRole('button', { name: '3' })).toHaveAttribute('aria-pressed', 'false');
    expect(toggle()).toHaveTextContent('Iniciar');
    expect(toggle()).toHaveAttribute('aria-pressed', 'false');
    expect(createEngine).not.toHaveBeenCalled();
  });

  it('steps and clamps the tempo', () => {
    const { storage } = setup();
    click('Aumentar 5 BPM');
    expect(screen.getByText('85 BPM')).toBeInTheDocument();
    expect(readRawSettings(storage).metronomeBpm).toBe(85);
    click('Diminuir 1 BPM');
    expect(readRawSettings(storage).metronomeBpm).toBe(84);
    click('Aumentar 1 BPM');
    click('Diminuir 5 BPM');
    expect(readRawSettings(storage).metronomeBpm).toBe(80);
    fireEvent.change(screen.getByLabelText('Andamento (BPM)'), { target: { value: '150' } });
    expect(screen.getByText('150 BPM')).toBeInTheDocument();
    expect(readRawSettings(storage).metronomeBpm).toBe(150);
  });

  it('clamps at the upper bound', () => {
    const { storage } = setup({ metronomeBpm: 218 });
    click('Aumentar 5 BPM');
    expect(readRawSettings(storage).metronomeBpm).toBe(220);
  });

  it('clamps at the lower bound', () => {
    const { storage } = setup({ metronomeBpm: 42 });
    click('Diminuir 5 BPM');
    expect(readRawSettings(storage).metronomeBpm).toBe(40);
  });

  it('exposes a 40 to 220 range', () => {
    setup();
    const range = screen.getByLabelText('Andamento (BPM)');
    expect(range).toHaveAttribute('min', '40');
    expect(range).toHaveAttribute('max', '220');
    expect(range).toHaveAttribute('step', '1');
  });

  it('starts and stops, creating the engine once, inside the click', () => {
    const { engine, createEngine } = setup();
    fireEvent.click(toggle());
    expect(createEngine).toHaveBeenCalledTimes(1);
    expect(createEngine).toHaveBeenCalledWith({ bpm: 80, beatsPerBar: 4 });
    expect(engine.start).toHaveBeenCalledTimes(1);
    expect(toggle()).toHaveTextContent('Parar');
    expect(toggle()).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(toggle());
    expect(engine.stop).toHaveBeenCalledTimes(1);
    expect(toggle()).toHaveTextContent('Iniciar');
    fireEvent.click(toggle());
    expect(createEngine).toHaveBeenCalledTimes(1);
    expect(engine.start).toHaveBeenCalledTimes(2);
  });

  it('does not create a new engine on re-renders', () => {
    const { createEngine } = setup();
    fireEvent.click(toggle());
    click('Aumentar 1 BPM');
    click('3');
    expect(createEngine).toHaveBeenCalledTimes(1);
  });

  it('applies changes while running', () => {
    const { engine, storage } = setup();
    fireEvent.click(toggle());
    click('Aumentar 1 BPM');
    expect(engine.setBpm).toHaveBeenLastCalledWith(81);
    click('3');
    expect(engine.setBeatsPerBar).toHaveBeenLastCalledWith(3);
    expect(readRawSettings(storage).metronomeBeats).toBe(3);
  });

  it('pauses when the tab is hidden and does not restart by itself', () => {
    const { engine } = setup();
    fireEvent.click(toggle());
    setVisibility('hidden');
    expect(engine.stop).toHaveBeenCalledTimes(1);
    expect(toggle()).toHaveTextContent('Iniciar');
    setVisibility('visible');
    expect(engine.start).toHaveBeenCalledTimes(1);
    expect(toggle()).toHaveTextContent('Iniciar');
  });

  it('stops on unmount and stops listening to visibility', () => {
    const { engine, unmount } = setup();
    fireEvent.click(toggle());
    unmount();
    expect(engine.stop).toHaveBeenCalledTimes(1);
    setVisibility('hidden');
    expect(engine.stop).toHaveBeenCalledTimes(1);
  });

  it('shows a message and stays stopped when start fails', () => {
    const { engine } = setup();
    engine.start.mockReturnValue(false);
    fireEvent.click(toggle());
    expect(screen.getByText('Este navegador não toca o metrônomo.')).toBeInTheDocument();
    expect(toggle()).toHaveTextContent('Iniciar');
    expect(toggle()).toHaveAttribute('aria-pressed', 'false');
  });

  it('clears the failure message after a successful start', () => {
    const { engine } = setup();
    engine.start.mockReturnValueOnce(false);
    fireEvent.click(toggle());
    fireEvent.click(toggle());
    expect(screen.queryByText('Este navegador não toca o metrônomo.')).not.toBeInTheDocument();
    expect(toggle()).toHaveTextContent('Parar');
  });

  it('announces the failure message as a status', () => {
    const { engine } = setup();
    engine.start.mockReturnValue(false);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    fireEvent.click(toggle());
    expect(screen.getByRole('status')).toHaveTextContent('Este navegador não toca o metrônomo.');
  });

  it('unmounting while stopped is harmless', () => {
    const { engine, createEngine, unmount } = setup();
    expect(() => unmount()).not.toThrow();
    expect(createEngine).not.toHaveBeenCalled();
    expect(engine.stop).not.toHaveBeenCalled();
  });

  it('shares one engine and one AudioContext across mounts with the default factory', () => {
    const Ctx = countingAudioContext();
    const mount = (settings: { metronomeBpm: number; metronomeBeats: number }) =>
      render(
        <AppProvider storage={seededStorage({ settings })}>
          <Metronome />
        </AppProvider>,
      );
    const first = mount({ metronomeBpm: 80, metronomeBeats: 4 });
    fireEvent.click(toggle());
    expect(Ctx).toHaveBeenCalledTimes(1);
    first.unmount();
    mount({ metronomeBpm: 120, metronomeBeats: 3 });
    fireEvent.click(toggle());
    expect(Ctx).toHaveBeenCalledTimes(1);
    expect(engines).toHaveLength(1);
    expect(engines[0].setBpm).toHaveBeenLastCalledWith(120);
    expect(engines[0].setBeatsPerBar).toHaveBeenLastCalledWith(3);
    expect(engines[0].isRunning()).toBe(true);
    fireEvent.click(toggle());
  });

  it('has no shortcut hooks', () => {
    const { container } = setup();
    const section = container.querySelector('.metronome')!;
    expect(section.querySelector('[data-shortcut]')).toBeNull();
    expect(section.querySelector('.start')).toBeNull();
  });
});
