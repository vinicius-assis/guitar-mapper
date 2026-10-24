import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ConfirmProvider, useConfirm } from './ConfirmDialog';

let result: boolean | undefined;

function Probe() {
  const confirm = useConfirm();
  return (
    <button
      onClick={async () => {
        result = undefined;
        result = await confirm({
          title: 'Zerar o progresso?',
          message: 'Isso não pode ser desfeito.',
          confirmLabel: 'Zerar',
        });
      }}
    >
      abrir
    </button>
  );
}

const open = () => {
  render(
    <ConfirmProvider>
      <Probe />
    </ConfirmProvider>,
  );
  const opener = screen.getByRole('button', { name: 'abrir' });
  opener.focus(); // um toque de verdade no teclado/mouse deixa o botão focado
  fireEvent.click(opener);
};
const settle = () => act(async () => {});

describe('ConfirmDialog', () => {
  it('shows nothing until asked, then an alertdialog with title, message and labelled buttons', () => {
    render(
      <ConfirmProvider>
        <Probe />
      </ConfirmProvider>,
    );
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'abrir' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Zerar o progresso?' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('Isso não pode ser desfeito.');
    expect(screen.getByRole('button', { name: 'Zerar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
  });

  it('resolves true on the action button and closes', async () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Zerar' }));
    await settle();
    expect(result).toBe(true);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('resolves false on Cancelar', async () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await settle();
    expect(result).toBe(false);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('resolves false on Escape and on a tap outside the card', async () => {
    open();
    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });
    await settle();
    expect(result).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'abrir' }));
    fireEvent.click(screen.getByTestId('confirm-backdrop'));
    await settle();
    expect(result).toBe(false);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('a tap inside the card does not cancel', async () => {
    open();
    fireEvent.click(screen.getByRole('alertdialog'));
    await settle();
    expect(result).toBeUndefined();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('starts focused on Cancelar, keeps Tab inside, and returns focus to the opener', async () => {
    open();
    const cancel = screen.getByRole('button', { name: 'Cancelar' });
    const action = screen.getByRole('button', { name: 'Zerar' });
    expect(cancel).toHaveFocus();
    fireEvent.keyDown(cancel, { key: 'Tab' });
    expect(action).toHaveFocus();
    fireEvent.keyDown(action, { key: 'Tab' });
    expect(cancel).toHaveFocus();
    fireEvent.keyDown(cancel, { key: 'Tab', shiftKey: true });
    expect(action).toHaveFocus();
    fireEvent.click(cancel);
    await settle();
    expect(screen.getByRole('button', { name: 'abrir' })).toHaveFocus();
  });

  it('asking again while open cancels the first question', async () => {
    let first: boolean | undefined;
    function Twice() {
      const confirm = useConfirm();
      return (
        <button
          onClick={() => {
            void confirm({ title: 'Um', confirmLabel: 'Sim' }).then((v) => (first ??= v));
            void confirm({ title: 'Dois', confirmLabel: 'Sim' });
          }}
        >
          duas
        </button>
      );
    }
    render(
      <ConfirmProvider>
        <Twice />
      </ConfirmProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'duas' }));
    await settle();
    expect(first).toBe(false);
    expect(screen.getByRole('alertdialog', { name: 'Dois' })).toBeInTheDocument();
  });

  it('useConfirm outside a provider fails loudly', () => {
    function Bare() {
      useConfirm();
      return null;
    }
    expect(() => render(<Bare />)).toThrow(/ConfirmProvider/);
  });
});
