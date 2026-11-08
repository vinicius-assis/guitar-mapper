import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import type { Metronome as Engine } from '../audio/metronome';
import { AppProvider } from '../state/AppState';
import { readRawSettings, seededStorage } from '../test-utils';
import { Metronome } from './Metronome';

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

afterEach(() => setVisibility('visible'));

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

  it('has no shortcut hooks', () => {
    const { container } = setup();
    const section = container.querySelector('.metronome')!;
    expect(section.querySelector('[data-shortcut]')).toBeNull();
    expect(section.querySelector('.start')).toBeNull();
  });
});
