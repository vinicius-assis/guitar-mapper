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

  describe('string labels', () => {
    const labels = ['E', 'B', 'G', 'D', 'A', 'E'];

    it('shows one label per string, high E on top', () => {
      render(<Fretboard fretMin={0} fretMax={4} marks={[]} stringLabels={labels} />);
      const shown = screen.getAllByTestId(/^string-label-/).map((el) => el.textContent);
      expect(shown).toEqual(labels);
    });

    it('shows nothing when no labels are given', () => {
      render(<Fretboard fretMin={0} fretMax={4} marks={[]} />);
      expect(screen.queryByTestId('string-label-1')).not.toBeInTheDocument();
    });

    it('moves the labels next to the nut for left-handed players', () => {
      const { container } = render(
        <Fretboard fretMin={0} fretMax={4} marks={[]} stringLabels={labels} leftHanded />,
      );
      expect(container.querySelector('.fretboard-frame--mirrored')).not.toBeNull();
    });
  });

  it('keeps the natural size without fit (phone)', () => {
    const { container } = render(<Fretboard fretMin={1} fretMax={5} marks={[]} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe(String(5 * 56));
    expect(svg.style.width).toBe('');
  });

  it('with fit the SVG fills the container but never shrinks below minFretWidth per fret', () => {
    const { container } = render(
      <Fretboard fretMin={1} fretMax={24} marks={[]} fit minFretWidth={34} />,
    );
    const svg = container.querySelector('svg')!;
    expect(svg.style.width).toBe('100%');
    expect(svg.style.minWidth).toBe(`${24 * 34}px`);
    expect(svg.style.height).toBe('auto');
    expect(svg.getAttribute('viewBox')).toBe(`0 0 ${24 * 56} ${28 + 6 * 44}`);
  });

  it('fit caps the scaling at 1.4x so a short window does not become a tall board', () => {
    const { container } = render(<Fretboard fretMin={1} fretMax={5} marks={[]} fit />);
    const svg = container.querySelector('svg')!;
    expect(svg.style.maxWidth).toBe(`${5 * 56 * 1.4}px`);
    expect(svg.style.marginLeft).toBe('auto');
    expect(svg.style.marginRight).toBe('auto');
  });

  it('string labels use rows proportional to the board so they follow it when it scales', () => {
    const { container } = render(
      <Fretboard fretMin={1} fretMax={5} marks={[]} fit stringLabels={['E', 'B', 'G', 'D', 'A', 'E']} />,
    );
    const gutter = container.querySelector('.string-labels') as HTMLElement;
    expect(gutter.style.gridTemplateRows).toBe('28fr repeat(6, 44fr)');
    expect(gutter.style.paddingTop).toBe('');
    // um espaçador (o cabeçalho com os números das casas) + 6 nomes, na mesma proporção do SVG
    expect(gutter.children).toHaveLength(7);
    expect(gutter.children[0].textContent).toBe('');
    expect(screen.getByTestId('string-label-1')).toHaveTextContent('E');
    expect((screen.getByTestId('string-label-1') as HTMLElement).style.height).toBe('');
  });

  it('fit defaults to a 56px minimum per fret', () => {
    const { container } = render(<Fretboard fretMin={1} fretMax={5} marks={[]} fit />);
    expect(container.querySelector('svg')!.style.minWidth).toBe(`${5 * 56}px`);
  });
});
