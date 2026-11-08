import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundProvider } from '../../audio/SoundProvider';
import type { NotePlayer } from '../../audio/player';
import {
  dictationAdvanceMs,
  dictationPool,
  dictationQuestion,
  type DictationQuestion,
} from '../../domain/dictation';
import { GUITAR } from '../../domain/instruments';
import { scaleBox } from '../../domain/scales';
import { AppProvider } from '../../state/AppState';
import { activeView, createDefaultData } from '../../state/storage';
import { mulberry32, seededStorage } from '../../test-utils';
import { useQuizShortcuts } from '../useQuizShortcuts';
import { DictationQuiz } from './DictationQuiz';

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

const AM: DictationQuestion = { scale: 'pent-minor', root: 9, length: 4, box: 1, pitches: [57, 60, 62, 64] };
const D8: DictationQuestion = {
  scale: 'dorian',
  root: 2,
  length: 8,
  box: 2,
  pitches: [62, 57, 52, 53, 52, 53, 52, 53],
};
const C6: DictationQuestion = { scale: 'major', root: 0, length: 6, box: 1, pitches: [60, 64, 65, 69, 72, 71] };

function Shortcuts({ children }: { children: React.ReactNode }) {
  useQuizShortcuts(true);
  return <>{children}</>;
}

function setup(question: DictationQuestion = AM, instrument: 'guitar' | 'bass' = 'guitar') {
  const settings = activeView(createDefaultData()).settings;
  settings.notation = 'cifra';
  settings.accidentals = 'auto';
  const player = fakePlayer();
  const onAnswer = vi.fn();
  const onNext = vi.fn();
  const ui = (q: DictationQuestion, key: number) => (
    <AppProvider storage={seededStorage({ settings: { instrument } })}>
      <SoundProvider player={player}>
        <Shortcuts>
          <DictationQuiz key={key} question={q} settings={settings} onAnswer={onAnswer} onNext={onNext} />
        </Shortcuts>
      </SoundProvider>
    </AppProvider>
  );
  const utils = render(ui(question, 0));
  const mark = (kind: string, pos: string) =>
    utils.container.querySelector(`g.mark--${kind}[data-pos="${pos}"]`);
  const tap = (pos: string) => {
    const [s, f] = pos.split('-');
    fireEvent.click(screen.getByRole('button', { name: `Corda ${s}, casa ${f}` }));
  };
  const withoutScreen = () => (
    <AppProvider storage={seededStorage({ settings: { instrument } })}>
      <SoundProvider player={player}>{null}</SoundProvider>
    </AppProvider>
  );
  return { player, onAnswer, onNext, mark, tap, ui, withoutScreen, ...utils };
}
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
const posOf = (q: DictationQuestion, pitch: number) => {
  const p = scaleBox(q.scale, q.box, q.root, GUITAR).notes.find((n) => n.pitch === pitch)!.position;
  return `${p.string}-${p.fret}`;
};
const played = (a: { player: { play: { mock: { calls: number[][] } } } }) =>
  a.player.play.mock.calls.map((c) => c[0]);

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  fretboardProps.calls.length = 0;
  cleanup();
  vi.useRealTimers();
});

describe('DictationQuiz', () => {
  it('plays the melody on open', () => {
    const a = setup();
    expect(a.player.play).toHaveBeenCalledWith(57);
    advance(1800);
    for (const m of [60, 62, 64]) expect(a.player.play).toHaveBeenCalledWith(m);
  });

  it('asks without revealing', () => {
    const a = setup();
    expect(screen.getByText('Toque a melodia')).toBeInTheDocument();
    expect(screen.getByText('A pentatônica menor · desenho 1')).toBeInTheDocument();
    expect(screen.getByText('Faltam 4 notas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ouvir de novo' })).toBeInTheDocument();
    for (const p of ['6-5', '4-7', '1-5']) expect(a.mark('root', p)).not.toBeNull();
    expect(a.container.querySelectorAll('.mark--root')).toHaveLength(3);
    expect(a.container.querySelectorAll('.mark')).toHaveLength(3);
    expect(a.container.querySelector('.mark text')).toBeNull();
    const outside = a.container.cloneNode(true) as HTMLElement;
    outside.querySelector('.fretboard-frame')?.remove();
    const text = (outside.textContent ?? '').replace('A pentatônica menor · desenho 1', '');
    for (const t of ['C', 'D', 'E', '♭3']) expect(text).not.toContain(t);
    for (const el of a.container.querySelectorAll('.fretboard-frame [aria-label]')) {
      expect(el.getAttribute('aria-label')).toMatch(/^(Corda \d, casa \d+|Braço da guitarra|Braço do baixo)$/);
    }
    expect(a.container.querySelector('[title]')).toBeNull();
    for (const el of a.container.querySelectorAll('*')) {
      for (const attr of el.getAttributeNames()) {
        if (attr.startsWith('data-')) expect(['data-pos', 'data-testid', 'data-fret']).toContain(attr);
      }
    }
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('right melody', () => {
    const a = setup();
    a.tap('4-7');
    expect(screen.getByText('Faltam 3 notas')).toBeInTheDocument();
    expect(a.mark('scale', '4-7')).not.toBeNull();
    expect(a.mark('scale', '4-7')!.textContent).toBe('');
    expect(a.player.play).toHaveBeenCalledWith(57);
    a.tap('3-5');
    a.tap('3-7');
    a.player.play.mockClear();
    a.tap('2-5');
    expect(a.onAnswer).toHaveBeenCalledTimes(1);
    expect(a.onAnswer).toHaveBeenCalledWith(true);
    expect(screen.getByRole('status')).toHaveTextContent('Correto! Melodia completa.');
    expect(screen.getByText('Melodia: A C D E · 1 ♭3 4 5')).toBeInTheDocument();
    expect(a.mark('scale', '2-5')).toHaveTextContent('5');
    expect(a.mark('root', '6-5')).not.toBeNull();
    expect(a.mark('root', '6-5')!.textContent).toBe('');
  });

  it.each([AM, C6, D8])('waits for the closing melody before advancing ($length notes)', (q) => {
    const a = setup(q);
    q.pitches.slice(0, -1).forEach((p) => a.tap(posOf(q, p)));
    a.player.play.mockClear();
    a.tap(posOf(q, q.pitches[q.length - 1]));
    expect(a.onAnswer).toHaveBeenCalledWith(true);
    const total = dictationAdvanceMs(q.length);
    advance(total - 1);
    expect(a.onNext).not.toHaveBeenCalled();
    for (const m of q.pitches) expect(played(a)).toContain(m);
    expect(played(a).filter((m) => m === q.pitches[q.length - 1]).length).toBeGreaterThan(0);
    advance(1);
    expect(a.onNext).toHaveBeenCalledTimes(1);
  });

  it('plays every note of the closing melody by each tick', () => {
    const a = setup(D8);
    D8.pitches.slice(0, -1).forEach((p) => a.tap(posOf(D8, p)));
    a.player.play.mockClear();
    a.tap(posOf(D8, D8.pitches[7]));
    // a última nota da melodia final começa em (n - 1) x 600 e o avanço só depois de 1 s
    advance(7 * 600 - 1);
    expect(a.player.play).toHaveBeenCalledTimes(7);
    advance(1);
    expect(a.player.play).toHaveBeenCalledTimes(8);
    expect(a.onNext).not.toHaveBeenCalled();
  });

  it('replays the melody after a wrong answer without advancing', () => {
    const a = setup();
    a.tap('4-7');
    a.player.play.mockClear();
    a.tap('3-7');
    expect(a.onAnswer).toHaveBeenCalledWith(false);
    for (let t = 0; t < (AM.length - 1) * 600; t += 100) advance(100);
    expect(played(a).slice(-AM.length)).toEqual(AM.pitches);
    advance(10000);
    expect(a.onNext).not.toHaveBeenCalled();
  });

  it('a wrong note ends', () => {
    const a = setup();
    a.tap('4-7');
    a.tap('3-7');
    expect(a.onAnswer).toHaveBeenCalledWith(false);
    expect(screen.getByRole('status')).toHaveTextContent('Errado. A 2ª nota era C, não D.');
    expect(a.mark('wrong', '3-7')).not.toBeNull();
    expect(a.mark('hint', '3-5')).toHaveTextContent('♭3');
    expect(a.mark('hint', '2-5')).toHaveTextContent('5');
    expect(a.mark('scale', '4-7')).toHaveTextContent('1');
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeInTheDocument();
    advance(10000);
    expect(a.onNext).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('cell-2-5'));
    expect(a.onAnswer).toHaveBeenCalledTimes(1);
  });

  it('same pitch on another string counts', () => {
    const a = setup(C6);
    a.tap('4-10');
    a.tap('3-9');
    a.tap('3-10');
    a.tap('2-10');
    a.tap('1-8');
    expect(screen.getByText('Faltam 1 nota')).toBeInTheDocument();
    a.tap('2-12');
    expect(screen.getByRole('status')).toHaveTextContent('Correto! Melodia completa.');
    expect(a.mark('scale', '1-8')).toHaveTextContent('1');
  });

  it('an octave away is wrong', () => {
    const a = setup(C6);
    a.tap('6-8');
    expect(a.onAnswer).toHaveBeenCalledWith(false);
  });

  it('says the octave when the right note is tapped in the wrong octave', () => {
    const up = setup();
    up.tap('1-5');
    expect(screen.getByRole('status')).toHaveTextContent('Errado. A 1ª nota era A, mas uma oitava acima.');
    cleanup();
    const down = setup();
    down.tap('6-5');
    expect(screen.getByRole('status')).toHaveTextContent('Errado. A 1ª nota era A, mas uma oitava abaixo.');
  });

  it('completes a correct answer in a scale without C', () => {
    const q: DictationQuestion = { scale: 'pent-minor', root: 4, length: 4, box: 1, pitches: [64, 67, 69, 67] };
    const a = setup(q);
    q.pitches.forEach((p) => a.tap(posOf(q, p)));
    expect(screen.getByRole('status')).toHaveTextContent('Correto! Melodia completa.');
    expect(a.onAnswer).toHaveBeenCalledWith(true);
  });

  it.each(['easy', 'medium'] as const)('a correct answer never throws, every tonic (%s)', (level) => {
    const rng = mulberry32(7);
    for (const item of dictationPool(level)) {
      for (let k = 0; k < 2; k++) {
        const q = dictationQuestion(item, GUITAR, rng);
        const a = setup(q);
        q.pitches.forEach((p) => a.tap(posOf(q, p)));
        expect(screen.getByRole('status')).toHaveTextContent('Correto! Melodia completa.');
        expect(a.onAnswer).toHaveBeenCalledTimes(1);
        expect(a.onAnswer).toHaveBeenCalledWith(true);
        cleanup();
      }
    }
  });

  it('bass', () => {
    const bass: DictationQuestion = { scale: 'pent-minor', root: 9, length: 4, box: 1, pitches: [45, 48, 50, 48] };
    const a = setup(bass, 'bass');
    expect(screen.queryByTestId('cell-5-5')).toBeNull();
    expect(a.mark('root', '4-5')).not.toBeNull();
    expect(a.mark('root', '2-7')).not.toBeNull();
    expect(a.container.querySelectorAll('.mark--root')).toHaveLength(2);
    a.player.play.mockClear();
    a.tap('2-7');
    expect(a.player.play).toHaveBeenCalledWith(45);
    a.tap('1-5');
    a.tap('1-7');
    a.tap('1-5');
    expect(screen.getByRole('status')).toHaveTextContent('Correto! Melodia completa.');
  });

  it('replays without limit and with R', () => {
    const a = setup();
    for (let i = 0; i < 3; i++) {
      a.player.play.mockClear();
      fireEvent.click(screen.getByRole('button', { name: 'Ouvir de novo' }));
      expect(a.player.play).toHaveBeenCalledWith(57);
    }
    a.player.play.mockClear();
    fireEvent.keyDown(document, { key: 'r' });
    expect(a.player.play).toHaveBeenCalledWith(57);
  });

  it('fits the fretboard to the viewport', () => {
    setup();
    expect(fretboardProps.calls[0]).toEqual({ fit: true, minFretWidth: 40 });
  });

  it('stops the sound when the screen unmounts', () => {
    const a = setup();
    a.tap('3-5');
    advance(600);
    a.player.play.mockClear();
    a.rerender(a.withoutScreen());
    advance(5000);
    expect(a.player.play).not.toHaveBeenCalled();
  });

  it('stops the opening melody when unmounted right away', () => {
    const a = setup();
    a.player.play.mockClear();
    a.rerender(a.withoutScreen());
    advance(5000);
    expect(a.player.play).not.toHaveBeenCalled();
  });

  it('resets state when remounted under a new key', () => {
    const a = setup();
    a.tap('3-5');
    expect(screen.getByRole('status')).toBeInTheDocument();
    a.player.play.mockClear();
    a.rerender(a.ui({ ...AM, pitches: [69, 67, 64, 62] }, 1));
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('Faltam 4 notas')).toBeInTheDocument();
    expect(a.container.querySelector('.mark--scale')).toBeNull();
    expect(a.player.play).toHaveBeenCalledWith(69);
  });
});
