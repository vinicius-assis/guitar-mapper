import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Fretboard } from './Fretboard';

describe('Fretboard', () => {
  it('renders one cell per string and fret in the window', () => {
    const { container } = render(<Fretboard fretMin={0} fretMax={4} marks={[]} />);
    expect(container.querySelectorAll('[data-testid^="cell-"]')).toHaveLength(30);
  });

  it('reports the tapped position', () => {
    const onTap = vi.fn();
    render(<Fretboard fretMin={0} fretMax={12} marks={[]} onTap={onTap} />);
    fireEvent.click(screen.getByTestId('cell-3-7'));
    expect(onTap).toHaveBeenCalledWith({ string: 3, fret: 7 });
    expect(screen.getByTestId('cell-3-7')).toHaveAttribute('aria-label', 'Corda 3, casa 7');
  });

  it('does not make cells interactive without onTap', () => {
    render(<Fretboard fretMin={0} fretMax={4} marks={[]} />);
    expect(screen.getByTestId('cell-1-0')).not.toHaveAttribute('role');
  });

  it('mirrors the drawing for left-handed players but keeps positions correct', () => {
    const onTap = vi.fn();
    const { rerender } = render(<Fretboard fretMin={0} fretMax={4} marks={[]} onTap={onTap} />);
    expect(screen.getByTestId('cell-1-0')).toHaveAttribute('x', '0');
    rerender(<Fretboard fretMin={0} fretMax={4} marks={[]} onTap={onTap} leftHanded />);
    expect(screen.getByTestId('cell-1-0')).toHaveAttribute('x', '224');
    fireEvent.click(screen.getByTestId('cell-1-0'));
    expect(onTap).toHaveBeenCalledWith({ string: 1, fret: 0 });
  });

  it('draws marks with their kind and label, ignoring marks outside the window', () => {
    const { container } = render(
      <Fretboard
        fretMin={0}
        fretMax={4}
        marks={[
          { position: { string: 6, fret: 3 }, kind: 'target', label: 'G' },
          { position: { string: 6, fret: 20 }, kind: 'hint' },
        ]}
      />,
    );
    expect(screen.getByText('G')).toBeInTheDocument();
    expect(container.querySelectorAll('.mark')).toHaveLength(1);
    expect(container.querySelector('.mark--target')).not.toBeNull();
  });

  it('splits a combined label into two lines', () => {
    render(
      <Fretboard
        fretMin={0}
        fretMax={4}
        marks={[{ position: { string: 1, fret: 0 }, kind: 'correct', label: 'E · Mi' }]}
      />,
    );
    expect(screen.getByText('E')).toBeInTheDocument();
    expect(screen.getByText('Mi')).toBeInTheDocument();
  });
});
