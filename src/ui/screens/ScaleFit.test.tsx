import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SoundProvider } from '../../audio/SoundProvider';
import { AppProvider } from '../../state/AppState';
import { activeView, createDefaultData } from '../../state/storage';
import { createMemoryStorage } from '../../test-utils';
import { ScaleDegreeQuiz } from './ScaleDegreeQuiz';
import { ScalePlayQuiz } from './ScalePlayQuiz';

const fretboardProps = vi.hoisted(() => ({ calls: [] as Array<{ fit?: boolean; minFretWidth?: number }> }));

vi.mock('../useBreakpoint', () => ({ useBreakpoint: () => 'mobile' }));
vi.mock('../Fretboard', () => ({
  Fretboard: (p: { fit?: boolean; minFretWidth?: number }) => {
    fretboardProps.calls.push({ fit: p.fit, minFretWidth: p.minFretWidth });
    return null;
  },
}));

const player = { unlock: vi.fn(), prepare: vi.fn(), play: vi.fn() };
const wrap = (ui: React.ReactNode) =>
  render(
    <AppProvider storage={createMemoryStorage()}>
      <SoundProvider player={player}>{ui}</SoundProvider>
    </AppProvider>,
  );

describe('scale screens on mobile', () => {
  afterEach(() => {
    cleanup();
    fretboardProps.calls.length = 0;
  });
  const settings = activeView(createDefaultData()).settings;

  it('ScaleDegreeQuiz fits the box to the viewport', () => {
    wrap(
      <ScaleDegreeQuiz
        question={{ scale: 'pent-minor', box: 1, string: 3, degree: 1, root: 9 }}
        settings={settings}
        onAnswer={vi.fn()}
        onNext={vi.fn()}
      />,
    );
    expect(fretboardProps.calls[0]).toEqual({ fit: true, minFretWidth: 40 });
  });

  it('ScalePlayQuiz fits the box to the viewport', () => {
    wrap(
      <ScalePlayQuiz
        question={{ scale: 'major', root: 9, box: 1 }}
        settings={settings}
        onAnswer={vi.fn()}
        onNext={vi.fn()}
      />,
    );
    expect(fretboardProps.calls[0]).toEqual({ fit: true, minFretWidth: 40 });
  });
});
