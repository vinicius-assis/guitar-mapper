import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundProvider } from '../../audio/SoundProvider';
import type { NotePlayer } from '../../audio/player';
import type { ScalePlayItem } from '../../domain/scaleItems';
import { AppProvider } from '../../state/AppState';
import { activeView, createDefaultData, type Settings } from '../../state/storage';
import { createMemoryStorage } from '../../test-utils';
import { ScalePlayQuiz } from './ScalePlayQuiz';

const fakePlayer = () => ({ unlock: vi.fn(), prepare: vi.fn(), play: vi.fn<NotePlayer['play']>() });

const PENT: ScalePlayItem = { scale: 'pent-minor', root: 9, box: 1 };
const MAJOR: ScalePlayItem = { scale: 'major', root: 9, box: 1 };

function setup(question: ScalePlayItem = PENT, extra: { accidentals?: Settings['accidentals'] } = {}) {
  const settings = activeView(createDefaultData()).settings;
  settings.notation = 'cifra';
  settings.accidentals = extra.accidentals ?? 'auto';
  const player = fakePlayer();
  const onAnswer = vi.fn();
  const onNext = vi.fn();
  const utils = render(
    <AppProvider storage={createMemoryStorage()}>
      <SoundProvider player={player}>
        <ScalePlayQuiz question={question} settings={settings} onAnswer={onAnswer} onNext={onNext} />
      </SoundProvider>
    </AppProvider>,
  );
  const mark = (kind: string, pos: string) =>
    utils.container.querySelector(`g.mark--${kind}[data-pos="${pos}"]`);
  const count = (kind: string) => utils.container.querySelectorAll(`g.mark--${kind}`).length;
  const tap = (pos: string) => {
    const [s, f] = pos.split('-');
    fireEvent.click(screen.getByRole('button', { name: `Corda ${s}, casa ${f}` }));
  };
  return { player, onAnswer, onNext, mark, count, tap, ...utils };
}
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('ScalePlayQuiz', () => {
  it('starts with the roots', () => {
    const a = setup();
    for (const pos of ['6-5', '4-7', '1-5']) expect(a.mark('root', pos)).not.toBeNull();
    expect(a.count('root')).toBe(3);
    expect(screen.getByText('Faltam 9 notas')).toBeInTheDocument();
    expect(screen.getByText('A pentatônica menor · desenho 1')).toBeInTheDocument();
    expect(screen.getByText('Toque a escala')).toBeInTheDocument();
    expect(screen.queryByText('Nota destacada')).toBeNull();
  });

  it('counts each pitch once', () => {
    const a = setup(MAJOR);
    expect(screen.getByText('Faltam 15 notas')).toBeInTheDocument();
    a.tap('5-5');
    expect(screen.getByText('Faltam 14 notas')).toBeInTheDocument();
    expect(a.mark('scale', '5-5')).not.toBeNull();
    a.tap('6-10');
    expect(a.mark('scale', '6-10')).not.toBeNull();
    expect(screen.getByText('Faltam 14 notas')).toBeInTheDocument();
    a.tap('5-5');
    a.tap('1-5');
    expect(screen.getByText('Faltam 14 notas')).toBeInTheDocument();
    expect(a.onAnswer).not.toHaveBeenCalled();
  });

  it('completes', () => {
    const a = setup();
    for (const pos of ['6-8', '5-5', '5-7', '4-5', '3-5', '3-7', '2-5', '2-8', '1-8']) a.tap(pos);
    expect(a.onAnswer).toHaveBeenCalledTimes(1);
    expect(a.onAnswer).toHaveBeenCalledWith(true);
    expect(screen.getByRole('status')).toHaveTextContent('Correto! Desenho completo.');
    expect(a.container.querySelectorAll('g.mark text')).toHaveLength(12);
    advance(700);
    expect(a.onNext).toHaveBeenCalledTimes(1);
  });

  it('wrong tap ends it', () => {
    const a = setup(PENT, { accidentals: 'sharp' });
    a.tap('3-5');
    a.tap('3-6');
    expect(a.onAnswer).toHaveBeenCalledTimes(1);
    expect(a.onAnswer).toHaveBeenCalledWith(false);
    expect(screen.getByRole('status')).toHaveTextContent('Errado. C# não está na escala.');
    expect(a.mark('wrong', '3-6')).not.toBeNull();
    expect(a.count('hint')).toBe(8);
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Corda 3, casa 7' })).toBeNull();
    advance(2000);
    expect(a.onNext).not.toHaveBeenCalled();
    expect(a.onAnswer).toHaveBeenCalledTimes(1);
  });

  it('plays each tap', () => {
    const a = setup();
    a.tap('3-5');
    expect(a.player.play).toHaveBeenCalledWith(60);
  });
});
