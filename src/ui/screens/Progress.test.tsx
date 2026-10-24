import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppProvider } from '../../state/AppState';
import { seededStorage } from '../../test-utils';
import { Progress } from './Progress';

const entry = (box: 1 | 2 | 3 | 4 | 5) => ({
  box,
  correct: 1,
  wrong: 0,
  lastReview: 0,
  nextReview: 0,
});

describe('Progress', () => {
  it('summarises mastery over all 150 positions', () => {
    const storage = seededStorage({
      progress: { '6-0': entry(5), '5-0': entry(1), '4-0': entry(2) },
    });
    render(
      <AppProvider storage={storage}>
        <Progress onSelect={() => {}} />
      </AppProvider>,
    );
    expect(screen.getByText('Dominadas: 1')).toBeInTheDocument();
    expect(screen.getByText('Errando: 1')).toBeInTheDocument();
    expect(screen.getByText('Aprendendo: 1')).toBeInTheDocument();
    expect(screen.getByText('Nunca vistas: 147')).toBeInTheDocument();
  });

  it('colours positions by mastery and reports taps', () => {
    const onSelect = vi.fn();
    const storage = seededStorage({ progress: { '6-0': entry(5) } });
    const { container } = render(
      <AppProvider storage={storage}>
        <Progress onSelect={onSelect} />
      </AppProvider>,
    );
    expect(container.querySelectorAll('.mark--mastered')).toHaveLength(1);
    expect(container.querySelectorAll('.mark--unseen')).toHaveLength(149);
    fireEvent.click(screen.getByTestId('cell-6-0'));
    expect(onSelect).toHaveBeenCalledWith({ string: 6, fret: 0 });
  });
});
