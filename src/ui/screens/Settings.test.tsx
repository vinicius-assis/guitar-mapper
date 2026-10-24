import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { AppProvider } from '../../state/AppState';
import { readSaved, seededStorage } from '../../test-utils';
import { ConfirmProvider } from '../ConfirmDialog';
import { Settings } from './Settings';

afterEach(() => vi.restoreAllMocks());

function setup() {
  const storage = seededStorage({
    progress: { '6-0': { box: 3, correct: 1, wrong: 0, lastReview: 0, nextReview: 0 } },
  });
  render(
    <AppProvider storage={storage}>
      <ConfirmProvider>
        <Settings />
      </ConfirmProvider>
    </AppProvider>,
  );
  return storage;
}

describe('Settings', () => {
  it('changes the notation', () => {
    const storage = setup();
    fireEvent.click(screen.getByLabelText('Dó Ré Mi'));
    expect(readSaved(storage).settings.notation).toBe('solfejo');
  });

  it('toggles left-handed mode', () => {
    const storage = setup();
    fireEvent.click(screen.getByLabelText('Mão esquerda'));
    expect(readSaved(storage).settings.leftHanded).toBe(true);
  });

  it('resets progress only after confirming in the dialog', async () => {
    const storage = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Zerar progresso' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Zerar o progresso?' });
    expect(dialog).toHaveTextContent('Isso não pode ser desfeito.');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    await act(async () => {});
    expect(Object.keys(readSaved(storage).progress)).toEqual(['6-0']);

    fireEvent.click(screen.getByRole('button', { name: 'Zerar progresso' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Zerar' }));
    await act(async () => {});
    expect(readSaved(storage).progress).toEqual({});
  });
});
