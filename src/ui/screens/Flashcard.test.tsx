import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { SoundProvider } from '../../audio/SoundProvider';
import type { NotePlayer } from '../../audio/player';
import { AppProvider } from '../../state/AppState';
import { activeView, createDefaultData, type Settings } from '../../state/storage';
import { createMemoryStorage } from '../../test-utils';
import type { Mark } from '../Fretboard';
import { Flashcard } from './Flashcard';

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
        <Flashcard
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

describe('Flashcard', () => {
  it('reveals the note in the chosen spelling', () => {
    setup({ accidentals: 'flat', notation: 'solfejo' });
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar nota' }));
    const marks = captured[captured.length - 1].marks;
    expect(marks.some((m) => m.label === 'Sib')).toBe(true);
  });
});
