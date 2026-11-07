import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundProvider } from '../../audio/SoundProvider';
import type { NotePlayer } from '../../audio/player';
import type { HarmonyItem } from '../../domain/harmonyItems';
import { AppProvider } from '../../state/AppState';
import { activeView, createDefaultData } from '../../state/storage';
import { createMemoryStorage } from '../../test-utils';
import { useQuizShortcuts } from '../useQuizShortcuts';
import { HarmonyDegreeQuiz } from './HarmonyDegreeQuiz';

const fakePlayer = () => ({ unlock: vi.fn(), prepare: vi.fn(), play: vi.fn<NotePlayer['play']>() });

function Harness(props: Parameters<typeof HarmonyDegreeQuiz>[0]) {
  useQuizShortcuts(true);
  return <HarmonyDegreeQuiz {...props} />;
}

function setup(item: HarmonyItem, extra: { sevenths?: boolean } = {}) {
  const settings = activeView(createDefaultData()).settings;
  settings.notation = 'cifra';
  settings.accidentals = 'auto';
  settings.harmonySevenths = extra.sevenths ?? false;
  const player = fakePlayer();
  const onAnswer = vi.fn();
  const onNext = vi.fn();
  render(
    <AppProvider storage={createMemoryStorage()}>
      <SoundProvider player={player}>
        <Harness item={item} settings={settings} onAnswer={onAnswer} onNext={onNext} />
      </SoundProvider>
    </AppProvider>,
  );
  return { player, onAnswer, onNext };
}
const buttons = () => [...document.querySelectorAll('.answer-grid .option')] as HTMLButtonElement[];
const texts = () => buttons().map((b) => b.textContent);
const pick = (label: string) => fireEvent.click(screen.getByRole('button', { name: label }));
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const G_IN_D: HarmonyItem = { field: 'major', key: 2, degree: 4 };

describe('HarmonyDegreeQuiz', () => {
  it('asks G in D', () => {
    const a = setup(G_IN_D);
    expect(screen.getByText('Que grau é G em D maior?')).toBeInTheDocument();
    expect(texts()).toEqual(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']);
    expect(screen.queryByRole('status')).toBeNull();
    pick('Grau IV');
    expect(a.onAnswer).toHaveBeenCalledWith(true);
    expect(screen.getByRole('status')).toHaveTextContent('Correto! G é o IV de D maior.');
    expect(screen.getByText('G: G B D')).toBeInTheDocument();
    expect(buttons()[3]).toHaveClass('option--correct');
    expect(a.player.play).toHaveBeenCalledWith(55);
    advance(700);
    expect(a.onNext).toHaveBeenCalledTimes(1);
  });

  it('wrong', () => {
    const a = setup(G_IN_D);
    pick('Grau V');
    expect(a.onAnswer).toHaveBeenCalledWith(false);
    expect(screen.getByRole('status')).toHaveTextContent('Errado. G é o IV de D maior.');
    expect(buttons()[4]).toHaveClass('option--wrong');
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeInTheDocument();
    advance(2000);
    expect(a.onNext).not.toHaveBeenCalled();
  });

  it('sevenths', () => {
    const a = setup({ field: 'major', key: 2, degree: 2 }, { sevenths: true });
    expect(screen.getByText('Que grau é Em7 em D maior?')).toBeInTheDocument();
    pick('Grau II');
    expect(a.onAnswer).toHaveBeenCalledWith(true);
    expect(screen.getByRole('status')).toHaveTextContent('Correto! Em7 é o IIm7 de D maior.');
  });

  it('minor numerals', () => {
    setup({ field: 'minor', key: 9, degree: 7 });
    expect(texts()).toEqual(['I', 'II', '♭III', 'IV', 'V', '♭VI', '♭VII']);
    expect(screen.getByText('Que grau é G em A menor?')).toBeInTheDocument();
  });

  it('keyboard', () => {
    const a = setup(G_IN_D);
    expect(screen.getByText('Teclado: 1–7')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: '4' });
    expect(a.onAnswer).toHaveBeenCalledWith(true);
    cleanup();
    const b = setup(G_IN_D);
    fireEvent.keyDown(document, { key: 'g' });
    fireEvent.keyDown(document, { key: '8' });
    expect(b.onAnswer).not.toHaveBeenCalled();
  });
});
