import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AppProvider } from '../../state/AppState';
import { readSaved, seededStorage } from '../../test-utils';
import { FocusSheet } from './FocusSheet';

function setup(mode: 'interval' | 'position-to-note', open: boolean) {
  const storage = seededStorage({ settings: { mode } });
  render(
    <AppProvider storage={storage}>
      <FocusSheet questionCount={9} open={open} onOpenChange={() => {}} />
    </AppProvider>,
  );
  return storage;
}

describe('FocusSheet', () => {
  it('shows interval controls when open in interval mode', () => {
    const storage = setup('interval', true);
    expect(screen.getByRole('button', { name: '5ª J' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: 'Corda 1' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Casa inicial')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '5 s' }));
    expect(readSaved(storage).settings.intervalAdvance).toBe('5s');
  });

  it('summarises the interval focus when closed', () => {
    setup('interval', false);
    expect(screen.getByRole('group', { name: 'Foco' })).toHaveTextContent(
      '3ª m, 3ª M, 5ª J, 7ª m, 7ª M · Naturais · Manual',
    );
  });

  it('keeps strings and frets in other modes', () => {
    setup('position-to-note', true);
    expect(screen.getByRole('button', { name: 'Corda 1' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Todos' })).not.toBeInTheDocument();
  });
});
