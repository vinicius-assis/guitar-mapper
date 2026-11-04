import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AppProvider } from '../state/AppState';
import { seededStorage } from '../test-utils';
import { InstrumentBadge } from './InstrumentBadge';

function setup(instrument?: 'bass') {
  const storage = seededStorage(instrument ? { settings: { instrument } } : {});
  return render(
    <AppProvider storage={storage}>
      <InstrumentBadge />
    </AppProvider>,
  );
}

describe('InstrumentBadge', () => {
  it('shows Violão by default, as plain non-interactive text', () => {
    const { container } = setup();
    expect(screen.getByText('Violão')).toHaveClass('instrument-badge');
    expect(container.querySelector('button')).toBeNull();
  });
  it('shows Baixo for the saved bass instrument', () => {
    setup('bass');
    expect(screen.getByText('Baixo')).toBeInTheDocument();
  });
});
