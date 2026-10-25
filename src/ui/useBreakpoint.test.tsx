import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, it, expect } from 'vitest';
import { mockViewport } from '../test-utils';
import { useBreakpoint } from './useBreakpoint';

function Probe() {
  return <output>{useBreakpoint()}</output>;
}
let viewport: ReturnType<typeof mockViewport> | null = null;
afterEach(() => viewport?.restore());

describe('useBreakpoint', () => {
  it('is mobile when matchMedia does not exist', () => {
    render(<Probe />);
    expect(screen.getByRole('status')).toHaveTextContent('mobile');
  });

  it.each([
    [390, 'mobile'],
    [639, 'mobile'],
    [640, 'tablet'],
    [1023, 'tablet'],
    [1024, 'desktop'],
    [1600, 'desktop'],
  ])('width %i is %s', (width, expected) => {
    viewport = mockViewport(width);
    render(<Probe />);
    expect(screen.getByRole('status')).toHaveTextContent(expected);
  });

  it('reacts when the window is resized', () => {
    viewport = mockViewport(1280);
    render(<Probe />);
    expect(screen.getByRole('status')).toHaveTextContent('desktop');
    act(() => viewport!.setWidth(700));
    expect(screen.getByRole('status')).toHaveTextContent('tablet');
    act(() => viewport!.setWidth(390));
    expect(screen.getByRole('status')).toHaveTextContent('mobile');
  });
});
