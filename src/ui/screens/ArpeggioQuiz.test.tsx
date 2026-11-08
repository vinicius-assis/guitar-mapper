import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundProvider } from '../../audio/SoundProvider';
import type { NotePlayer } from '../../audio/player';
import { arpeggioOf } from '../../domain/arpeggio';
import { GUITAR } from '../../domain/instruments';
import type { ScalePlayItem } from '../../domain/scaleItems';
import { AppProvider } from '../../state/AppState';
import { activeView, createDefaultData } from '../../state/storage';
import { seededStorage } from '../../test-utils';
import { ArpeggioQuiz } from './ArpeggioQuiz';

const fretboardProps = vi.hoisted(() => ({ calls: [] as Array<{ fit?: boolean; minFretWidth?: number }> }));
vi.mock('../Fretboard', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../Fretboard')>();
  return {
    ...actual,
    Fretboard: (p: React.ComponentProps<typeof actual.Fretboard>) => {
      fretboardProps.calls.push({ fit: p.fit, minFretWidth: p.minFretWidth });
      return actual.Fretboard(p);
    },
  };
});

const fakePlayer = () => ({ unlock: vi.fn(), prepare: vi.fn(), play: vi.fn<NotePlayer['play']>() });

const AM: ScalePlayItem = { scale: 'pent-minor', root: 9, box: 1 };

function setup(question: ScalePlayItem = AM, instrument: 'guitar' | 'bass' = 'guitar') {
  const settings = activeView(createDefaultData()).settings;
  settings.notation = 'cifra';
  settings.accidentals = 'sharp';
  const player = fakePlayer();
  const onAnswer = vi.fn();
  const onNext = vi.fn();
  const ui = (q: ScalePlayItem, key: number) => (
    <AppProvider storage={seededStorage({ settings: { instrument } })}>
      <SoundProvider player={player}>
        <ArpeggioQuiz key={key} question={q} settings={settings} onAnswer={onAnswer} onNext={onNext} />
      </SoundProvider>
    </AppProvider>
  );
  const utils = render(ui(question, 0));
  const mark = (kind: string, pos: string) =>
    utils.container.querySelector(`g.mark--${kind}[data-pos="${pos}"]`);
  const count = (kind: string) => utils.container.querySelectorAll(`g.mark--${kind}`).length;
  const tap = (pos: string) => {
    const [s, f] = pos.split('-');
    fireEvent.click(screen.getByRole('button', { name: `Corda ${s}, casa ${f}` }));
  };
  const withoutScreen = () => (
    <AppProvider storage={seededStorage({ settings: { instrument } })}>
      <SoundProvider player={player}>{null}</SoundProvider>
    </AppProvider>
  );
  return { player, onAnswer, onNext, mark, count, tap, ui, withoutScreen, ...utils };
}
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
const FULL = ['6-8', '5-7', '4-5', '3-5', '2-5', '2-8', '1-8'];

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  fretboardProps.calls.length = 0;
  cleanup();
  vi.useRealTimers();
});

describe('ArpeggioQuiz', () => {
  it('asks without revealing', () => {
    const a = setup();
    expect(screen.getByText('Toque o arpejo')).toBeInTheDocument();
    expect(screen.getByText('Am7 em A pentatônica menor · desenho 1')).toBeInTheDocument();
    expect(screen.getByText('Faltam 7 notas')).toBeInTheDocument();
    for (const p of ['6-5', '4-7', '1-5']) expect(a.mark('root', p)).not.toBeNull();
    expect(a.container.querySelectorAll('.mark')).toHaveLength(3);
    expect(a.container.querySelector('.mark text')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
    expect(document.querySelector('.ear-detail')).toBeNull();
    expect(document.querySelector('.ear-play')).toBeNull();
    expect(document.body.innerHTML).not.toMatch(/Am7: A C E G/);
  });

  it('complete arpeggio', () => {
    const a = setup();
    FULL.slice(0, 6).forEach((p) => a.tap(p));
    expect(screen.getByText('Faltam 1 nota')).toBeInTheDocument();
    a.tap('6-5');
    expect(screen.getByText('Faltam 1 nota')).toBeInTheDocument();
    expect(a.onAnswer).not.toHaveBeenCalled();
    a.tap('1-8');
    expect(a.onAnswer).toHaveBeenCalledTimes(1);
    expect(a.onAnswer).toHaveBeenCalledWith(true);
    expect(screen.getByRole('status')).toHaveTextContent('Correto! Arpejo completo.');
    expect(screen.getByText('Am7: A C E G')).toBeInTheDocument();
    expect(a.mark('scale', '5-5')).toHaveTextContent('4');
    expect(a.mark('scale', '3-7')).toHaveTextContent('4');
    expect(a.mark('chord', '5-7')).toHaveTextContent('5');
    expect(a.mark('root', '6-5')).toHaveTextContent('1');
    expect(screen.getByRole('button', { name: 'Ouvir o arpejo' })).toBeInTheDocument();
    expect(a.player.play).toHaveBeenCalledWith(45);
    advance(1500);
    expect(a.player.play).toHaveBeenCalledWith(72);
    advance(700);
    expect(a.onNext).toHaveBeenCalledTimes(1);
  });

  it('a scale note outside the chord ends', () => {
    const a = setup();
    a.tap('5-5');
    expect(a.onAnswer).toHaveBeenCalledWith(false);
    expect(screen.getByRole('status')).toHaveTextContent('Errado. D não está em Am7.');
    expect(a.mark('wrong', '5-5')).not.toBeNull();
    expect(a.mark('hint', '6-8')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cell-6-8'));
    expect(a.onAnswer).toHaveBeenCalledTimes(1);
  });

  it('same pitch on another string counts once', () => {
    const a = setup({ scale: 'major', root: 0, box: 1 });
    expect(screen.getByText('Faltam 7 notas')).toBeInTheDocument();
    a.tap('1-8');
    expect(screen.getByText('Faltam 7 notas')).toBeInTheDocument();
    expect(a.count('wrong')).toBe(0);
  });

  it('bass', () => {
    const a = setup(AM, 'bass');
    expect(screen.getByText('Faltam 4 notas')).toBeInTheDocument();
    expect(a.mark('root', '4-5')).not.toBeNull();
    expect(a.mark('root', '2-7')).not.toBeNull();
    expect(a.count('root')).toBe(2);
    expect(screen.queryByTestId('cell-5-5')).toBeNull();
    a.tap('4-8');
    expect(a.player.play).toHaveBeenCalledWith(36);
  });

  it('fits the fretboard to the viewport', () => {
    setup();
    expect(fretboardProps.calls[0]).toEqual({ fit: true, minFretWidth: 40 });
  });

  it('stops the arpeggio when the screen unmounts', () => {
    const a = setup();
    a.tap('5-5');
    advance(150);
    a.player.play.mockClear();
    a.rerender(a.withoutScreen());
    advance(2000);
    expect(a.player.play).not.toHaveBeenCalled();
  });

  it('lets the whole arpeggio play before auto-advancing', () => {
    const a = setup();
    FULL.slice(0, -1).forEach((p) => a.tap(p));
    a.player.play.mockClear();
    a.tap(FULL[FULL.length - 1]);
    expect(a.onAnswer).toHaveBeenCalledWith(true);
    for (let t = 0; t < 8000 && a.onNext.mock.calls.length === 0; t += 50) advance(50);
    expect(a.onNext).toHaveBeenCalledTimes(1);
    a.rerender(a.withoutScreen());
    advance(3000);
    const played = a.player.play.mock.calls.map((c) => c[0]);
    const expected = [...arpeggioOf('pent-minor', 1, 9, GUITAR).pitches];
    expect(expected.length).toBeGreaterThan(4);
    for (const m of expected) expect(played).toContain(m);
  });

  it('resets state when remounted under a new key', () => {
    const a = setup();
    a.tap('6-8');
    a.tap('5-5');
    expect(screen.getByRole('status')).toBeInTheDocument();
    a.rerender(a.ui({ scale: 'pent-minor', root: 9, box: 2 }, 1));
    expect(screen.queryByRole('status')).toBeNull();
    expect(a.container.querySelector('.mark--wrong, .mark--chord, .mark--hint')).toBeNull();
    expect(screen.getByText(/Faltam \d+ notas?/)).toBeInTheDocument();
  });
});
