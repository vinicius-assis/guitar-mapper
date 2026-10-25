import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { mockBoardWidth } from '../test-utils';
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

  it('keeps the natural size without fit (phone), whatever the container measures', () => {
    const board = mockBoardWidth(900);
    try {
      const { container } = render(<Fretboard fretMin={1} fretMax={5} marks={[]} />);
      const svg = container.querySelector('svg')!;
      expect(svg.getAttribute('width')).toBe(String(5 * 56));
      expect(svg.getAttribute('height')).toBe(String(28 + 6 * 44));
    } finally {
      board.restore();
    }
  });

  describe('fit (tablet and desktop): the geometry follows the measured container', () => {
    let board: ReturnType<typeof mockBoardWidth>;
    afterEach(() => board?.restore());
    const svgOf = (container: HTMLElement) => container.querySelector('svg')!;

    it('stretches the frets to fill the width: 5 frets in 860px are 172px wide each', () => {
      board = mockBoardWidth(860);
      const { container } = render(<Fretboard fretMin={1} fretMax={5} marks={[]} fit />);
      expect(svgOf(container).getAttribute('width')).toBe('860');
      // casas mais largas pedem cordas mais afastadas (até 60px), sem distorcer
      expect(svgOf(container).getAttribute('height')).toBe(String(28 + 6 * 60));
    });

    it('never goes below minFretWidth: it scrolls instead', () => {
      board = mockBoardWidth(100);
      const { container } = render(<Fretboard fretMin={1} fretMax={5} marks={[]} fit />);
      expect(svgOf(container).getAttribute('width')).toBe(String(5 * 56));
      const small = render(<Fretboard fretMin={1} fretMax={24} marks={[]} fit minFretWidth={24} />);
      expect(small.container.querySelector('svg')!.getAttribute('width')).toBe(String(24 * 24));
    });

    it('fills the 24-fret map without scrolling when the container is wide enough', () => {
      board = mockBoardWidth(624);
      const { container } = render(
        <Fretboard fretMin={1} fretMax={24} marks={[]} fit minFretWidth={24} />,
      );
      expect(svgOf(container).getAttribute('width')).toBe(String(24 * 26));
      expect(svgOf(container).getAttribute('height')).toBe(String(28 + 6 * 44));
    });

    it('caps each fret at 180px and centers the board', () => {
      board = mockBoardWidth(2000);
      const { container } = render(<Fretboard fretMin={1} fretMax={5} marks={[]} fit />);
      expect(svgOf(container).getAttribute('width')).toBe('900');
      expect(svgOf(container).style.marginLeft).toBe('auto');
      expect(svgOf(container).style.marginRight).toBe('auto');
    });

    it('marks grow with the cells but stay round', () => {
      board = mockBoardWidth(860);
      const { container } = render(
        <Fretboard fretMin={1} fretMax={5} marks={[{ position: { string: 3, fret: 2 }, kind: 'target' }]} fit />,
      );
      const r = Number(container.querySelector('.mark circle')!.getAttribute('r'));
      expect(r).toBeGreaterThan(16);
      expect(r).toBeLessThanOrEqual(20);
      const natural = render(
        <Fretboard fretMin={1} fretMax={5} marks={[{ position: { string: 3, fret: 2 }, kind: 'target' }]} />,
      );
      expect(natural.container.querySelector('.mark circle')!.getAttribute('r')).toBe('16');
    });

    it('cells and string labels follow the new spacing', () => {
      board = mockBoardWidth(860);
      const { container } = render(
        <Fretboard fretMin={1} fretMax={5} marks={[]} fit stringLabels={['E', 'B', 'G', 'D', 'A', 'E']} />,
      );
      const gutter = container.querySelector('.string-labels') as HTMLElement;
      expect(gutter.style.gridTemplateRows).toBe('28fr repeat(6, 60fr)');
      const cell = container.querySelector('[data-testid="cell-2-3"]')!;
      expect(cell.getAttribute('width')).toBe('172');
      expect(cell.getAttribute('height')).toBe('60');
      expect(cell.getAttribute('x')).toBe(String(2 * 172));
      expect(cell.getAttribute('y')).toBe(String(28 + 60));
    });
  });

  describe('expand (desktop): more frets, the ones outside the focus are disabled', () => {
    let board: ReturnType<typeof mockBoardWidth>;
    afterEach(() => board?.restore());
    const cell = (c: HTMLElement, s: number, f: number) => c.querySelector(`[data-testid="cell-${s}-${f}"]`);

    it('shows as many frets as fit at about 72px each (864px = 12 frets), from the first fret', () => {
      board = mockBoardWidth(864);
      const { container } = render(<Fretboard fretMin={1} fretMax={5} marks={[]} fit expand />);
      expect(cell(container, 3, 12)).not.toBeNull();
      expect(cell(container, 3, 13)).toBeNull();
      expect(container.querySelector('svg')!.getAttribute('width')).toBe('864');
    });

    it('centers the focus in the wider window and stays inside frets 1 to 24', () => {
      board = mockBoardWidth(864);
      const middle = render(<Fretboard fretMin={10} fretMax={14} marks={[]} fit expand />);
      expect(cell(middle.container, 3, 7)).not.toBeNull();
      expect(cell(middle.container, 3, 6)).toBeNull();
      expect(cell(middle.container, 3, 18)).not.toBeNull();
      expect(cell(middle.container, 3, 19)).toBeNull();
      const end = render(<Fretboard fretMin={20} fretMax={24} marks={[]} fit expand />);
      expect(cell(end.container, 3, 13)).not.toBeNull();
      expect(cell(end.container, 3, 12)).toBeNull();
      expect(cell(end.container, 3, 24)).not.toBeNull();
    });

    it('never shows more than 24 frets', () => {
      board = mockBoardWidth(4000);
      const { container } = render(<Fretboard fretMin={3} fretMax={5} marks={[]} fit expand />);
      expect(cell(container, 1, 1)).not.toBeNull();
      expect(cell(container, 1, 24)).not.toBeNull();
      expect(container.querySelectorAll('[data-testid^="cell-1-"]')).toHaveLength(24);
    });

    it('disables the frets outside the focus: dimmed, no tap', () => {
      board = mockBoardWidth(864);
      const onTap = vi.fn();
      const { container } = render(
        <Fretboard fretMin={1} fretMax={5} marks={[]} fit expand onTap={onTap} />,
      );
      expect(cell(container, 2, 3)).toHaveAttribute('role', 'button');
      expect(cell(container, 2, 9)).not.toHaveAttribute('role');
      expect(cell(container, 2, 9)).toHaveClass('cell--disabled');
      fireEvent.click(cell(container, 2, 9)!);
      expect(onTap).not.toHaveBeenCalled();
      fireEvent.click(cell(container, 2, 3)!);
      expect(onTap).toHaveBeenCalledWith({ string: 2, fret: 3 });
      expect(container.querySelectorAll('.fret-disabled')).toHaveLength(7);
      const numbers = [...container.querySelectorAll('.fret-number')];
      expect(numbers.filter((n) => n.classList.contains('fret-number--disabled'))).toHaveLength(7);
    });

    it('mirrors correctly for left-handed players', () => {
      board = mockBoardWidth(864);
      const { container } = render(
        <Fretboard fretMin={1} fretMax={5} marks={[]} fit expand leftHanded />,
      );
      // casa 12 (desabilitada) fica na ponta esquerda; a 1 na ponta direita
      expect(Number(cell(container, 3, 12)!.getAttribute('x'))).toBe(0);
      expect(Number(cell(container, 3, 1)!.getAttribute('x'))).toBe(11 * 72);
    });

    it('without expand nothing is disabled and the window is the focus', () => {
      board = mockBoardWidth(864);
      const { container } = render(<Fretboard fretMin={1} fretMax={5} marks={[]} fit />);
      expect(cell(container, 3, 6)).toBeNull();
      expect(container.querySelectorAll('.fret-disabled')).toHaveLength(0);
    });
  });

  it('string labels use proportional rows (natural size)', () => {
    const { container } = render(
      <Fretboard fretMin={1} fretMax={5} marks={[]} stringLabels={['E', 'B', 'G', 'D', 'A', 'E']} />,
    );
    const gutter = container.querySelector('.string-labels') as HTMLElement;
    expect(gutter.style.gridTemplateRows).toBe('28fr repeat(6, 44fr)');
    expect(gutter.children).toHaveLength(7);
    expect(gutter.children[0].textContent).toBe('');
    expect(screen.getByTestId('string-label-1')).toHaveTextContent('E');
  });
});
