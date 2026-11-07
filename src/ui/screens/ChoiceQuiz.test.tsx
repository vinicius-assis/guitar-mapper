import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { SoundProvider } from '../../audio/SoundProvider';
import type { NotePlayer } from '../../audio/player';
import { AppProvider } from '../../state/AppState';
import { activeView, createDefaultData, type Settings } from '../../state/storage';
import { createMemoryStorage } from '../../test-utils';
import type { Mark } from '../Fretboard';
import { ChoiceQuiz } from './ChoiceQuiz';

const captured: { marks: Mark[] }[] = [];
vi.mock('../Fretboard', async (orig) => {
  const mod = await orig<typeof import('../Fretboard')>();
  return {
    ...mod,
    Fretboard: (props: Parameters<typeof mod.Fretboard>[0]) => {
      captured.push({ marks: props.marks ?? [] });
      return mod.Fretboard(props);
    },
  };
});

const fakePlayer = (): NotePlayer => ({ unlock: vi.fn(), prepare: vi.fn(), play: vi.fn() });

function setup(
  opts: { accidentals?: Settings['accidentals']; notation?: Settings['notation'] } = {},
) {
  const settings = { ...activeView(createDefaultData()).settings };
  settings.notation = opts.notation ?? 'cifra';
  if (opts.accidentals) settings.accidentals = opts.accidentals;
  settings.filter = { strings: [5], fretMin: 1, fretMax: 5, naturalsOnly: false };
  captured.length = 0;
  render(
    <AppProvider storage={createMemoryStorage()}>
      <SoundProvider player={fakePlayer()}>
        <ChoiceQuiz
          position={{ string: 5, fret: 1 }}
          settings={settings}
          onAnswer={vi.fn()}
          onNext={vi.fn()}
        />
      </SoundProvider>
    </AppProvider>,
  );
}
afterEach(cleanup);
const options = () => [...document.querySelectorAll<HTMLButtonElement>('.option')];

describe('ChoiceQuiz', () => {
  it('labels options, mark and feedback with flats', () => {
    setup({ accidentals: 'flat' });
    expect(options().every((b) => /^[A-G]b?$/.test(b.textContent ?? ''))).toBe(true);
    expect(options().map((b) => b.textContent)).toContain('Bb');
    fireEvent.click(options().find((b) => b.textContent !== 'Bb')!);
    expect(screen.getByRole('status')).toHaveTextContent('Errado. A resposta certa é Bb.');
    const marks = captured[captured.length - 1].marks;
    expect(marks.some((m) => m.label === 'Bb')).toBe(true);
  });

  it('sharp by default keeps A#', () => {
    setup();
    expect(options().map((b) => b.textContent)).toContain('A#');
  });
});
