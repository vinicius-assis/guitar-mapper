import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import { SoundProvider } from '../../audio/SoundProvider';
import { AppProvider } from '../../state/AppState';
import { createDefaultData } from '../../state/storage';
import { createMemoryStorage } from '../../test-utils';
import { FindQuiz } from './FindQuiz';

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
  const settings = createDefaultData().settings;
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
