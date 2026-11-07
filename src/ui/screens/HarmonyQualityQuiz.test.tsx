import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundProvider } from '../../audio/SoundProvider';
import type { NotePlayer } from '../../audio/player';
import type { QualityQuestion } from '../../domain/harmonyItems';
import { AppProvider } from '../../state/AppState';
import { activeView, createDefaultData } from '../../state/storage';
import { createMemoryStorage } from '../../test-utils';
import { useQuizShortcuts } from '../useQuizShortcuts';
import { HarmonyQualityQuiz } from './HarmonyQualityQuiz';

const fakePlayer = () => ({ unlock: vi.fn(), prepare: vi.fn(), play: vi.fn<NotePlayer['play']>() });

function Harness(props: Parameters<typeof HarmonyQualityQuiz>[0]) {
  useQuizShortcuts(true);
  return <HarmonyQualityQuiz {...props} />;
}

function setup(question: QualityQuestion) {
  const settings = activeView(createDefaultData()).settings;
  settings.notation = 'cifra';
  settings.accidentals = 'auto';
  const player = fakePlayer();
  const onAnswer = vi.fn();
  const onNext = vi.fn();
  render(
    <AppProvider storage={createMemoryStorage()}>
      <SoundProvider player={player}>
        <Harness question={question} settings={settings} onAnswer={onAnswer} onNext={onNext} />
      </SoundProvider>
    </AppProvider>,
  );
  return { player, onAnswer, onNext };
}
const buttons = () => [...document.querySelectorAll('.answer-grid .option')] as HTMLButtonElement[];
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('HarmonyQualityQuiz', () => {
  it('triads', () => {
    const a = setup({ field: 'major', sevenths: false, degree: 6, key: 0 });
    const prompt = screen.getByText('Como é o acorde do VI de C maior?');
    expect(prompt).toBeInTheDocument();
    expect(prompt.textContent).not.toMatch(/VIm|°/);
    expect(buttons().map((b) => b.textContent)).toEqual(['Maior', 'Menor', 'Diminuto']);
    expect(document.querySelector('.answer-grid.answer-grid--words')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Menor' }));
    expect(a.onAnswer).toHaveBeenCalledWith(true);
    expect(screen.getByRole('status')).toHaveTextContent('Correto! O VI de C maior é Am (menor).');
    expect(screen.getByText('Am: A C E')).toBeInTheDocument();
    advance(700);
    expect(a.onNext).toHaveBeenCalledTimes(1);
  });

  it('sevenths', () => {
    const a = setup({ field: 'major', sevenths: true, degree: 7, key: 7 });
    expect(buttons().map((b) => b.getAttribute('aria-label'))).toEqual([
      '7M, maior com 7ª maior',
      '7, dominante',
      'm7, menor com 7ª',
      'm7(♭5), meio-diminuto',
    ]);
    expect(screen.getByText('Teclado: 1–4')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '7, dominante' }));
    expect(a.onAnswer).toHaveBeenCalledWith(false);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Errado. O VII de G maior é F#m7(b5) (meio-diminuto).',
    );
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeInTheDocument();
    advance(2000);
    expect(a.onNext).not.toHaveBeenCalled();
  });

  it('minor', () => {
    const a = setup({ field: 'minor', sevenths: false, degree: 2, key: 4 });
    expect(screen.getByText('Como é o acorde do II de E menor?')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: '3' });
    expect(a.onAnswer).toHaveBeenCalledWith(true);
  });
});
