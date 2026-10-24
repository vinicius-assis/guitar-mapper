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
  it('summarises mastery over the 144 positions from fret 1', () => {
    const storage = seededStorage({
      progress: { '6-1': entry(5), '5-1': entry(1), '4-1': entry(2) },
    });
    render(
      <AppProvider storage={storage}>
        <Progress onSelect={() => {}} />
      </AppProvider>,
    );
    expect(screen.getByText('Dominadas: 1')).toBeInTheDocument();
    expect(screen.getByText('Errando: 1')).toBeInTheDocument();
    expect(screen.getByText('Aprendendo: 1')).toBeInTheDocument();
    expect(screen.getByText('Nunca vistas: 141')).toBeInTheDocument();
  });

  it('does not draw the open-string column', () => {
    const { container } = render(
      <AppProvider storage={seededStorage()}>
        <Progress onSelect={() => {}} />
      </AppProvider>,
    );
    expect(container.querySelector('[data-testid="cell-6-0"]')).toBeNull();
    expect(container.querySelector('[data-testid="cell-6-1"]')).not.toBeNull();
  });

  it('colours positions by mastery and reports taps', () => {
    const onSelect = vi.fn();
    const storage = seededStorage({ progress: { '6-1': entry(5) } });
    const { container } = render(
      <AppProvider storage={storage}>
        <Progress onSelect={onSelect} />
      </AppProvider>,
    );
    expect(container.querySelectorAll('.mark--mastered')).toHaveLength(1);
    expect(container.querySelectorAll('.mark--unseen')).toHaveLength(143);
    fireEvent.click(screen.getByTestId('cell-6-1'));
    expect(onSelect).toHaveBeenCalledWith({ string: 6, fret: 1 });
  });
});
