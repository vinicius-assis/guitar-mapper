import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundProvider } from '../../audio/SoundProvider';
import type { NotePlayer } from '../../audio/player';
import type { ScaleDegreeQuestion } from '../../domain/scaleItems';
import { AppProvider } from '../../state/AppState';
import { activeView, createDefaultData, type Settings } from '../../state/storage';
import { createMemoryStorage } from '../../test-utils';
import { useQuizShortcuts } from '../useQuizShortcuts';
import { ScaleDegreeQuiz } from './ScaleDegreeQuiz';

const fakePlayer = () => ({ unlock: vi.fn(), prepare: vi.fn(), play: vi.fn<NotePlayer['play']>() });

const Q: ScaleDegreeQuestion = { scale: 'pent-minor', box: 1, string: 3, degree: 1, root: 9 };

function Harness(props: Parameters<typeof ScaleDegreeQuiz>[0]) {
  useQuizShortcuts(true);
  return <ScaleDegreeQuiz {...props} />;
}

function setup(
  question: ScaleDegreeQuestion = Q,
  extra: { accidentals?: Settings['accidentals']; notation?: Settings['notation'] } = {},
) {
  const settings = activeView(createDefaultData()).settings;
  settings.notation = extra.notation ?? 'cifra';
  settings.accidentals = extra.accidentals ?? 'auto';
  const player = fakePlayer();
  const onAnswer = vi.fn();
  const onNext = vi.fn();
  const utils = render(
    <AppProvider storage={createMemoryStorage()}>
      <SoundProvider player={player}>
        <Harness question={question} settings={settings} onAnswer={onAnswer} onNext={onNext} />
      </SoundProvider>
    </AppProvider>,
  );
  const mark = (kind: string, pos: string) =>
    utils.container.querySelector(`g.mark--${kind}[data-pos="${pos}"]`);
  const count = (kind: string) => utils.container.querySelectorAll(`g.mark--${kind}`).length;
  return { player, onAnswer, onNext, mark, count, ...utils };
}
const options = () =>
  screen.getAllByRole('button').filter((b) => b.classList.contains('option')) as HTMLButtonElement[];
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('ScaleDegreeQuiz', () => {
  it('shows the box', () => {
    const a = setup();
    for (const pos of ['6-5', '4-7', '1-5']) expect(a.mark('root', pos)).not.toBeNull();
    expect(a.count('root')).toBe(3);
    expect(a.count('target')).toBe(1);
    expect(a.mark('target', '3-5')).not.toBeNull();
    expect(a.count('scale')).toBe(8);
    expect(a.container.querySelectorAll('g.mark text')).toHaveLength(0);
    expect(screen.getByText('A pentatônica menor · desenho 1')).toBeInTheDocument();
    expect(screen.getByText('Qual grau é a nota destacada?')).toBeInTheDocument();
    expect(options().map((b) => b.textContent)).toEqual(['1', '♭3', '4', '5', '♭7']);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('Nota destacada')).toBeInTheDocument();
  });

  it('right answer', () => {
    const a = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Grau ♭3' }));
    expect(a.onAnswer).toHaveBeenCalledWith(true);
    expect(screen.getByRole('status')).toHaveTextContent('Correto! É o ♭3 (C).');
    expect(a.mark('correct', '3-5')).not.toBeNull();
    const labels = [...a.container.querySelectorAll('g.mark text')].map((t) => t.textContent);
    expect(labels).toHaveLength(12);
    for (const l of labels) expect(['1', '♭3', '4', '5', '♭7']).toContain(l);
    expect(a.mark('root', '6-5')?.textContent).toBe('1');
    expect(a.player.play).toHaveBeenCalledWith(60);
    expect(a.onNext).not.toHaveBeenCalled();
    advance(700);
    expect(a.onNext).toHaveBeenCalledTimes(1);
  });

  it('wrong answer', () => {
    const a = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Grau 4' }));
    expect(a.onAnswer).toHaveBeenCalledWith(false);
    expect(screen.getByRole('status')).toHaveTextContent('Errado. Era o ♭3 (C).');
    expect(a.mark('wrong', '3-5')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeInTheDocument();
    expect(options().find((b) => b.textContent === '4')).toHaveClass('option--wrong');
    expect(options().find((b) => b.textContent === '♭3')).toHaveClass('option--correct');
    advance(2000);
    expect(a.onNext).not.toHaveBeenCalled();
  });

  it('spells by the scale', () => {
    const q: ScaleDegreeQuestion = { scale: 'major', box: 1, string: 5, degree: 3, root: 8 };
    const a = setup(q, { accidentals: 'sharp' });
    expect(screen.getByText('Ab maior · desenho 1')).toBeInTheDocument();
    expect(a.mark('target', '5-4')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Grau 4' }));
    expect(screen.getByRole('status')).toHaveTextContent('Correto! É o 4 (Db).');
    cleanup();
    setup(q, { accidentals: 'sharp', notation: 'solfejo' });
    expect(document.querySelector('.scale-title')?.textContent?.startsWith('Láb')).toBe(true);
  });

  it('keyboard', () => {
    const a = setup();
    expect(screen.getByText('Teclado: 1–5')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: '2' });
    expect(a.onAnswer).toHaveBeenCalledWith(true);
    expect(screen.queryByText('Teclado: 1–5')).toBeNull();
    cleanup();
    const b = setup();
    fireEvent.keyDown(document, { key: 'c' });
    fireEvent.keyDown(document, { key: '9' });
    expect(b.onAnswer).not.toHaveBeenCalled();
    cleanup();
    setup({ scale: 'major', box: 1, string: 5, degree: 3, root: 8 });
    expect(screen.getByText('Teclado: 1–7')).toBeInTheDocument();
  });
});
