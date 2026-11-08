import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundProvider } from '../../audio/SoundProvider';
import type { NotePlayer } from '../../audio/player';
import type { ChordItem } from '../../domain/chordItems';
import { AppProvider } from '../../state/AppState';
import { activeView, createDefaultData } from '../../state/storage';
import { createMemoryStorage } from '../../test-utils';
import { useQuizShortcuts } from '../useQuizShortcuts';
import { GuideToneQuiz } from './GuideToneQuiz';

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

function Harness(props: Parameters<typeof GuideToneQuiz>[0]) {
  useQuizShortcuts(true);
  return <GuideToneQuiz {...props} />;
}

const G7: ChordItem = { shape: 'g7', root: 7 };

function setup(question: ChordItem = G7) {
  const settings = activeView(createDefaultData()).settings;
  settings.notation = 'cifra';
  settings.accidentals = 'sharp';
  const player = fakePlayer();
  const onAnswer = vi.fn();
  const onNext = vi.fn();
  const ui = (q: ChordItem, key: number) => (
    <AppProvider storage={createMemoryStorage()}>
      <SoundProvider player={player}>
        <Harness key={key} question={q} settings={settings} onAnswer={onAnswer} onNext={onNext} />
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
    <AppProvider storage={createMemoryStorage()}>
      <SoundProvider player={player}>{null}</SoundProvider>
    </AppProvider>
  );
  return { player, onAnswer, onNext, mark, tap, ui, withoutScreen, ...utils };
}
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  fretboardProps.calls.length = 0;
  cleanup();
  vi.useRealTimers();
});

describe('GuideToneQuiz', () => {
  it('asks without revealing', () => {
    const a = setup();
    expect(screen.getByText('Toque as notas-guia')).toBeInTheDocument();
    expect(screen.getByText('G7 · forma aberta')).toBeInTheDocument();
    expect(screen.getByText('Faltam 3 notas')).toBeInTheDocument();
    for (const p of ['6-3', '5-2', '4-0', '3-0', '2-0', '1-1']) expect(a.mark('chord', p)).not.toBeNull();
    expect(a.container.querySelectorAll('.mark--chord')).toHaveLength(6);
    for (const kind of ['guide', 'root', 'hint']) expect(a.container.querySelector(`.mark--${kind}`)).toBeNull();
    expect(a.container.querySelector('.mark text')).toBeNull();
    expect(screen.getByTestId('cell-1-0')).toBeInTheDocument();
    expect(screen.queryByTestId('cell-1-5')).toBeNull();
    for (let i = 1; i <= 6; i++) expect(screen.getByTestId(`string-mark-${i}`)).toHaveTextContent('');
    const frame = a.container.querySelector('.fretboard-frame')!;
    for (const el of frame.querySelectorAll('[aria-label]')) {
      expect(el.getAttribute('aria-label')).toMatch(
        /^(Corda \d, casa \d+|Corda \d abafada|Braço da guitarra|Cordas soltas e abafadas)$/,
      );
    }
    expect(frame.querySelector('[title]')).toBeNull();
    for (const el of frame.querySelectorAll('*')) {
      for (const name of el.getAttributeNames()) {
        if (name.startsWith('data-')) expect(['data-pos', 'data-testid', 'data-fret']).toContain(name);
      }
    }
    expect(screen.queryByRole('status')).toBeNull();
    expect(document.body.innerHTML).not.toMatch(/\(♭7\)|notas-guia de|forma aberta<\/p><p class="ear-detail"/);
    expect(document.querySelector('.ear-detail')).toBeNull();
    expect(document.querySelector('.ear-play')).toBeNull();
  });

  it('mutes only with ×', () => {
    setup({ shape: 'd7', root: 2 });
    expect(screen.getByTestId('string-mark-6')).toHaveTextContent('×');
    expect(screen.getByTestId('string-mark-5')).toHaveTextContent('×');
    expect(screen.getByTestId('string-mark-1')).toHaveTextContent('');
  });

  it('finds the guide tones', () => {
    const a = setup();
    a.tap('2-0');
    expect(screen.getByText('Faltam 2 notas')).toBeInTheDocument();
    expect(a.mark('guide', '2-0')).not.toBeNull();
    a.tap('2-0');
    expect(screen.getByText('Faltam 2 notas')).toBeInTheDocument();
    a.tap('3-2');
    expect(a.player.play).toHaveBeenCalledWith(57);
    expect(a.onAnswer).not.toHaveBeenCalled();
    a.tap('5-2');
    a.tap('1-1');
    expect(a.onAnswer).toHaveBeenCalledTimes(1);
    expect(a.onAnswer).toHaveBeenCalledWith(true);
    expect(screen.getByRole('status')).toHaveTextContent('Correto! As notas-guia de G7 são B (3) e F (♭7).');
    expect(screen.getByText('G7: G B D F · forma aberta')).toBeInTheDocument();
    expect(a.mark('root', '6-3')).toHaveTextContent('1');
    expect(a.mark('guide', '1-1')).toHaveTextContent('♭7');
    expect(a.mark('chord', '4-0')).toHaveTextContent('5');
    expect(screen.getByRole('button', { name: 'Ouvir o acorde' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Próxima' })).toBeNull();
    advance(700);
    expect(a.onNext).toHaveBeenCalledTimes(1);
  });

  it('a note outside the shape is neutral, even with a guide pitch class (by position, not label)', () => {
    const a = setup();
    a.tap('3-4');
    expect(a.player.play).toHaveBeenCalledWith(59);
    expect(screen.getByText('Faltam 3 notas')).toBeInTheDocument();
    expect(a.mark('guide', '3-4')).toBeNull();
    expect(a.onAnswer).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('a non-guide note of the shape ends', () => {
    const a = setup();
    a.tap('4-0');
    expect(a.onAnswer).toHaveBeenCalledWith(false);
    expect(screen.getByRole('status')).toHaveTextContent('Errado. D é a 5ª de G7, não nota-guia.');
    expect(a.mark('wrong', '4-0')).not.toBeNull();
    for (const p of ['5-2', '2-0', '1-1']) expect(a.mark('hint', p)).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cell-5-2'));
    expect(a.onAnswer).toHaveBeenCalledTimes(1);
    advance(2000);
    expect(a.onNext).not.toHaveBeenCalled();
  });

  it('tapping the root ends with "a fundamental"', () => {
    const a = setup();
    a.tap('6-3');
    expect(screen.getByRole('status')).toHaveTextContent('Errado. G é a fundamental de G7, não nota-guia.');
  });

  it('barre shape', () => {
    const a = setup({ shape: 'e-7', root: 9 });
    expect(a.container.querySelector('rect.barre[data-fret="5"]')).not.toBeNull();
    expect(screen.getByTestId('cell-6-4')).toBeInTheDocument();
    expect(screen.getByTestId('cell-6-8')).toBeInTheDocument();
    expect(screen.queryByTestId('cell-6-9')).toBeNull();
    expect(screen.getByText('Faltam 2 notas')).toBeInTheDocument();
  });

  it('fits the fretboard to the viewport', () => {
    setup();
    expect(fretboardProps.calls[0]).toEqual({ fit: true, minFretWidth: 40 });
  });

  it('strums after the end and R replays', () => {
    const a = setup();
    a.tap('2-0');
    a.tap('5-2');
    a.tap('1-1');
    expect(a.player.play).toHaveBeenCalledWith(43);
    advance(200);
    for (const m of [47, 50, 55, 59, 65]) expect(a.player.play).toHaveBeenCalledWith(m);
    a.player.play.mockClear();
    fireEvent.keyDown(document, { key: 'r' });
    expect(a.player.play).toHaveBeenCalledWith(43);
  });

  it('stops the strum when the screen unmounts mid-strum', () => {
    const a = setup();
    a.tap('4-0');
    advance(40);
    a.player.play.mockClear();
    a.rerender(a.withoutScreen());
    advance(2000);
    expect(a.player.play).not.toHaveBeenCalled();
  });

  it('resets state when remounted under a new key', () => {
    const a = setup();
    a.tap('4-0');
    expect(screen.getByRole('status')).toBeInTheDocument();
    a.rerender(a.ui({ shape: 'am7', root: 9 }, 1));
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('Faltam 2 notas')).toBeInTheDocument();
    expect(a.container.querySelector('.mark--guide')).toBeNull();
  });
});
