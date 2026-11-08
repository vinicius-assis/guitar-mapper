import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundProvider } from '../../audio/SoundProvider';
import type { NotePlayer } from '../../audio/player';
import type { IiViItem } from '../../domain/progressions';
import { iiViQuestion } from '../../domain/progressions';
import { AppProvider } from '../../state/AppState';
import { activeView, createDefaultData } from '../../state/storage';
import { createMemoryStorage, seededStorage } from '../../test-utils';
import { useQuizShortcuts } from '../useQuizShortcuts';
import { IiViQuiz } from './IiViQuiz';

const fretboardProps = vi.hoisted(() => ({
  calls: [] as Array<{ fit?: boolean; minFretWidth?: number; instrument: string; links: unknown }>,
}));
vi.mock('../Fretboard', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../Fretboard')>();
  return {
    ...actual,
    Fretboard: (p: React.ComponentProps<typeof actual.Fretboard>) => {
      fretboardProps.calls.push({ fit: p.fit, minFretWidth: p.minFretWidth, instrument: p.instrument?.id ?? '', links: p.links });
      return actual.Fretboard(p);
    },
  };
});

const fakePlayer = () => ({ unlock: vi.fn(), prepare: vi.fn(), play: vi.fn<NotePlayer['play']>() });

function Harness(props: Parameters<typeof IiViQuiz>[0]) {
  useQuizShortcuts(true);
  return <IiViQuiz {...props} />;
}

const C_IIV: IiViItem = { key: 0, grip: 1, step: 'ii-v' };

function setup(question: IiViItem = C_IIV, instrument: 'guitar' | 'bass' = 'guitar') {
  const settings = activeView(createDefaultData()).settings;
  settings.notation = 'cifra';
  settings.accidentals = 'sharp';
  const player = fakePlayer();
  const onAnswer = vi.fn();
  const onNext = vi.fn();
  const storage = instrument === 'bass' ? seededStorage({ instrument: 'bass', settings: { instrument: 'bass' } }) : createMemoryStorage();
  const ui = (q: IiViItem, key: number) => (
    <AppProvider storage={storage}>
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

describe('IiViQuiz', () => {
  it('shows the source chord only', () => {
    const a = setup();
    expect(screen.getByText('Toque as notas-guia de G7')).toBeInTheDocument();
    expect(screen.getByText('Dm7 → G7 · ii–V–I em C')).toBeInTheDocument();
    expect(screen.getByText('Faltam 2 notas')).toBeInTheDocument();
    expect(a.mark('root', '5-5')).toHaveTextContent('1');
    expect(a.mark('guide', '4-3')).toHaveTextContent('♭3');
    expect(a.mark('guide', '3-5')).toHaveTextContent('♭7');
    expect(a.container.querySelectorAll('.mark')).toHaveLength(3);
    expect(a.container.querySelector('line.link')).toBeNull();
    expect(a.container.querySelector('[data-pos="3-4"].mark')).toBeNull();
    expect(screen.getByTestId('cell-6-2')).toBeInTheDocument();
    expect(screen.getByTestId('cell-6-6')).toBeInTheDocument();
    expect(screen.queryByTestId('cell-6-7')).toBeNull();
  });

  it('reveals nothing about the target before the end', () => {
    const a = setup();
    a.tap('3-4');
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
    expect(a.container.querySelector('line.link')).toBeNull();
    expect(a.container.querySelector('.mark--hint')).toBeNull();
    expect(a.container.querySelector('.mark--scale')).toBeNull();
    expect(fretboardProps.calls.every((c) => c.links === undefined)).toBe(true);
    expect(screen.queryByRole('status')).toBeNull();
    expect(document.querySelector('.ear-detail')).toBeNull();
    expect(document.querySelector('.ear-play')).toBeNull();
    expect(document.body.innerHTML).not.toMatch(/desce meio tom|mais perto são|Correto|Errado/);
    expect(a.mark('guide', '3-4')).not.toHaveTextContent(/\S/);
  });

  it('right answer', () => {
    const a = setup();
    a.tap('3-4');
    expect(screen.getByText('Faltam 1 nota')).toBeInTheDocument();
    expect(a.player.play).toHaveBeenCalledWith(59);
    a.tap('3-4');
    expect(screen.getByText('Faltam 1 nota')).toBeInTheDocument();
    expect(a.onAnswer).not.toHaveBeenCalled();
    a.tap('4-3');
    expect(a.onAnswer).toHaveBeenCalledTimes(1);
    expect(a.onAnswer).toHaveBeenCalledWith(true);
    expect(screen.getByRole('status')).toHaveTextContent('Correto!');
    expect(screen.getByText('C (♭7) desce meio tom para B (3) · F (♭3) fica e vira a ♭7')).toBeInTheDocument();
    expect(a.mark('root', '6-3')).toHaveTextContent('1');
    expect(a.mark('guide', '3-4')).toHaveTextContent('3');
    expect(a.mark('guide', '4-3')).toHaveTextContent('♭7');
    expect(a.mark('scale', '5-5')).not.toBeNull();
    expect(a.container.querySelectorAll('line.link')).toHaveLength(1);
    expect(a.player.play).toHaveBeenCalledWith(50);
    advance(1000);
    for (const m of [43, 53, 59]) expect(a.player.play).toHaveBeenCalledWith(m);
    advance(700);
    expect(a.onNext).toHaveBeenCalledTimes(1);
  });

  it('other octave is wrong', () => {
    const a = setup();
    a.tap('5-2');
    expect(a.onAnswer).toHaveBeenCalledWith(false);
    expect(screen.getByRole('status')).toHaveTextContent('Errado. As notas-guia de G7 mais perto são B e F.');
    expect(a.mark('wrong', '5-2')).not.toBeNull();
    expect(a.mark('hint', '3-4')).not.toBeNull();
    expect(a.mark('hint', '4-3')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeInTheDocument();
    advance(2000);
    expect(a.onNext).not.toHaveBeenCalled();
    a.player.play.mockClear();
    fireEvent.keyDown(document, { key: 'r' });
    expect(a.player.play).toHaveBeenCalledWith(50);
  });

  it('draws links only for the moving voice', () => {
    // G7 -> C7M: o B fica parado (traço de comprimento zero não é desenhado); só o F desce para E.
    const a = setup({ key: 0, grip: 1, step: 'v-i' });
    a.tap('4-2');
    a.tap('3-4');
    expect(a.container.querySelectorAll('line.link')).toHaveLength(1);
  });

  it('V to I', () => {
    const a = setup({ key: 0, grip: 1, step: 'v-i' });
    expect(screen.getByText('G7 → C7M · ii–V–I em C')).toBeInTheDocument();
    expect(a.mark('root', '6-3')).toHaveTextContent('1');
    expect(a.mark('guide', '4-3')).toHaveTextContent('♭7');
    expect(a.mark('guide', '3-4')).toHaveTextContent('3');
    a.tap('4-2');
    a.tap('3-4');
    expect(screen.getByRole('status')).toHaveTextContent('Correto!');
  });

  it('fits the fretboard to the viewport, pinned to the guitar', () => {
    setup();
    expect(fretboardProps.calls[0]).toMatchObject({ fit: true, minFretWidth: 40, instrument: 'guitar' });
  });

  it('stays on the guitar even when the app instrument is bass', () => {
    setup(C_IIV, 'bass');
    expect(fretboardProps.calls.every((c) => c.instrument === 'guitar')).toBe(true);
    expect(screen.getByRole('group', { name: 'Braço da guitarra' })).toBeInTheDocument();
  });

  it('stops the sound when the screen unmounts', () => {
    const a = setup();
    a.tap('5-2');
    advance(40);
    a.player.play.mockClear();
    a.rerender(a.withoutScreen());
    advance(2000);
    expect(a.player.play).not.toHaveBeenCalled();
  });

  it('lets the whole closing sound play before auto-advancing', () => {
    const a = setup();
    a.tap('3-4');
    a.player.play.mockClear();
    a.tap('4-3');
    const q = iiViQuestion(C_IIV);
    const expected = [...q.from.notes, ...q.to.notes].map((n) => n.pitch);
    for (let t = 0; t < 5000 && a.onNext.mock.calls.length === 0; t += 50) advance(50);
    expect(a.onNext).toHaveBeenCalledTimes(1);
    a.rerender(a.withoutScreen());
    advance(3000);
    const played = a.player.play.mock.calls.map((c) => c[0]);
    for (const m of expected) expect(played).toContain(m);
  });

  it('resets state when remounted under a new key', () => {
    const a = setup();
    a.tap('5-2');
    expect(screen.getByRole('status')).toBeInTheDocument();
    a.rerender(a.ui({ key: 2, grip: 2, step: 'v-i' }, 1));
    expect(screen.queryByRole('status')).toBeNull();
    expect(a.container.querySelector('line.link')).toBeNull();
    expect(screen.getByText('A7 → D7M · ii–V–I em D')).toBeInTheDocument();
  });
});
