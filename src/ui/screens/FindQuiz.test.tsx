import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { SoundProvider } from '../../audio/SoundProvider';
import { AppProvider } from '../../state/AppState';
import { activeView, createDefaultData } from '../../state/storage';
import { createMemoryStorage, seededStorage } from '../../test-utils';
import { FindQuiz } from './FindQuiz';
import { fireEvent } from '@testing-library/react';
import { BASS } from '../../domain/instruments';
import { noteAt, positionsOfNote } from '../../domain/fretboard';

// jsdom não guarda scrollLeft; simulamos para observar para onde o braço rola.
beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollLeft', {
    configurable: true,
    get() {
      return (this as unknown as { _sl?: number })._sl ?? 0;
    },
    set(v: number) {
      (this as unknown as { _sl?: number })._sl = v;
    },
  });
});
afterEach(() => {
  delete (HTMLElement.prototype as unknown as { scrollLeft?: number }).scrollLeft;
});

function renderFind(leftHanded: boolean) {
  const settings = activeView(createDefaultData()).settings;
  settings.leftHanded = leftHanded;
  settings.filter = { strings: [6], fretMin: 12, fretMax: 24, naturalsOnly: false };
  const player = { unlock: () => {}, prepare: () => {}, play: () => {} };
  render(
    <AppProvider storage={createMemoryStorage()}>
      <SoundProvider player={player}>
        <FindQuiz
          position={{ string: 6, fret: 20 }}
          settings={settings}
          onAnswer={() => {}}
          onNext={() => {}}
        />
      </SoundProvider>
    </AppProvider>,
  );
  return screen.getByRole('group', { name: 'Braço da guitarra' });
}

describe('FindQuiz', () => {
  it('does not scroll the board to the answer (would give it away)', () => {
    expect(renderFind(false).scrollLeft).toBe(0);
  });

  it('left-handed: starts at the nut side (fretMin), not at the answer', () => {
    // fretMin fica na ponta direita: (24-12)*56 + 28 = 700; a resposta (casa 20) ficaria em 252
    expect(renderFind(true).scrollLeft).toBe(700);
  });
});

describe('FindQuiz (bass)', () => {
  function renderBass(onAnswer = vi.fn()) {
    const settings = { ...activeView(createDefaultData()).settings, notation: 'cifra' as const };
    settings.filter = { strings: [1, 2, 3, 4], fretMin: 1, fretMax: 7, naturalsOnly: false };
    const player = { unlock: () => {}, prepare: () => {}, play: () => {} };
    const { container } = render(
      <AppProvider
        storage={seededStorage({ instrument: 'bass', settings: { instrument: 'bass' } })}
      >
        <SoundProvider player={player}>
          <FindQuiz
            position={{ string: 3, fret: 5 }}
            settings={settings}
            onAnswer={onAnswer}
            onNext={() => {}}
          />
        </SoundProvider>
      </AppProvider>,
    );
    return container;
  }

  it('asks for the bass note on the string; another string with the same note is wrong', () => {
    const onAnswer = vi.fn();
    renderBass(onAnswer);
    // corda 3 (A) casa 5 = D no baixo
    expect(screen.getByText('Encontre D na corda 3')).toBeInTheDocument();
    // corda 1 (G) casa 7 também é D, mas não é a corda pedida
    fireEvent.click(screen.getByTestId('cell-1-7'));
    expect(onAnswer).toHaveBeenCalledWith(false);
  });

  it('hints mark the note only on strings 1-4', () => {
    const container = renderBass();
    fireEvent.click(screen.getByTestId('cell-1-7'));
    const expected = positionsOfNote(noteAt({ string: 3, fret: 5 }, BASS), {
      strings: [1, 2, 3, 4],
      fretMin: 1,
      fretMax: 7,
      naturalsOnly: false,
    }, BASS).filter((p) => p.string !== 3);
    expect(expected.length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.mark--hint')).toHaveLength(expected.length);
    for (const s of [5, 6]) expect(container.querySelector(`[data-testid="cell-${s}-1"]`)).toBeNull();
  });
});
