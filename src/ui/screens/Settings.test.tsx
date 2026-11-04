import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { AppProvider } from '../../state/AppState';
import { readRawSettings, readSaved, seededStorage } from '../../test-utils';
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

  it('no longer has the reset button (it moved to Progresso)', () => {
    setup();
    expect(screen.queryByRole('button', { name: 'Zerar progresso' })).not.toBeInTheDocument();
  });

  it('toggles the sound and keeps it saved', () => {
    const storage = setup();
    const toggle = screen.getByLabelText('Som');
    expect(toggle).toBeChecked();
    fireEvent.click(toggle);
    expect(readSaved(storage).settings.soundEnabled).toBe(false);
  });

  it('explains the iPhone silent switch and credits the sound license', () => {
    setup();
    expect(screen.getByText(/modo silencioso/)).toBeInTheDocument();
    const credits = screen.getByRole('heading', { name: 'Créditos' }).parentElement!;
    expect(credits).toHaveTextContent('FluidR3');
    expect(credits).toHaveTextContent('Creative Commons Attribution 3.0');
  });

  it('picks the instrument globally and leaves the other settings alone', () => {
    const storage = setup();
    expect(screen.getByLabelText('Violão')).toBeChecked();
    // readSaved fixa o instrumento ativo; aqui lemos o valor global cru gravado.
    const saved = () => readRawSettings(storage);
    const before = saved();
    fireEvent.click(screen.getByLabelText('Baixo'));
    const after = saved();
    expect(after.instrument).toBe('bass');
    expect(screen.getByLabelText('Baixo')).toBeChecked();
    expect({ ...after, instrument: 'guitar' }).toEqual({ ...before, instrument: 'guitar' });
    fireEvent.click(screen.getByLabelText('Violão'));
    expect(saved().instrument).toBe('guitar');
  });

  it('places the Instrumento group right before Notação', () => {
    setup();
    const groups = screen.getAllByRole('group').map((g) => g.querySelector('legend')?.textContent);
    expect(groups.indexOf('Instrumento')).toBe(groups.indexOf('Notação') - 1);
  });

  it('credits both the nylon guitar and the bass sounds', () => {
    setup();
    const credits = screen.getByRole('heading', { name: 'Créditos' }).parentElement!;
    expect(credits).toHaveTextContent('violão de nylon');
    expect(credits).toHaveTextContent('baixo');
    expect(credits).toHaveTextContent('Electric Bass (finger)');
  });
});
