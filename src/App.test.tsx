import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { App } from './App';
import { STORAGE_KEY } from './state/storage';
import { createMemoryStorage, createThrowingStorage, seededStorage } from './test-utils';

describe('App', () => {
  it('shows the four tabs and starts on Estudar', () => {
    render(<App storage={createMemoryStorage()} />);
    const nav = screen.getByRole('navigation', { name: 'Principal' });
    for (const name of ['Estudar', 'Progresso', 'Foco', 'Ajustes']) {
      expect(nav).toHaveTextContent(name);
    }
    expect(screen.getByRole('button', { name: 'Estudar' })).toHaveAttribute('aria-current', 'page');
  });

  it('navigates between tabs', () => {
    render(<App storage={createMemoryStorage()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Foco' }));
    expect(screen.getByTestId('count')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ajustes' }));
    expect(screen.getByRole('button', { name: 'Zerar progresso' })).toBeInTheDocument();
  });

  it('tapping a position in Progresso opens it in Estudar', () => {
    render(<App storage={seededStorage({ settings: { notation: 'cifra' } })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Progresso' }));
    fireEvent.click(screen.getByTestId('cell-6-12'));
    expect(screen.getByText('Qual é esta nota?')).toBeInTheDocument();
    // a nota da posição 6-12 (E) está entre as opções
    expect(screen.getByRole('button', { name: 'E' })).toBeInTheDocument();
  });

  it('warns when storage is unavailable and still works', () => {
    render(<App storage={null} />);
    expect(screen.getByText(/progresso não será salvo/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Iniciar/ }));
    expect(screen.getByText('Qual é esta nota?')).toBeInTheDocument();
  });

  it('warns after the first answer when writes fail', () => {
    const { container } = render(<App storage={createThrowingStorage('write')} />);
    expect(screen.queryByText(/progresso não será salvo/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Iniciar/ }));
    fireEvent.click(container.querySelector('.option')!);
    expect(screen.getByText(/progresso não será salvo/i)).toBeInTheDocument();
  });

  it('tells the user when saved data was corrupted and reset', () => {
    render(<App storage={createMemoryStorage({ [STORAGE_KEY]: '{oops' })} />);
    expect(screen.getByText(/dados salvos estavam corrompidos/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }));
    expect(screen.queryByText(/dados salvos estavam corrompidos/i)).not.toBeInTheDocument();
  });

  it('hides the tab bar while a session is running and shows it again after', async () => {
    render(<App storage={seededStorage({ settings: { notation: 'cifra' } })} />);
    const nav = () => screen.queryByRole('navigation', { name: 'Principal' });
    expect(nav()).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Iniciar/ }));
    expect(nav()).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Finalizar' }));
    await act(async () => {});
    expect(nav()).toBeInTheDocument();
  });

  it('opening a position from Progresso starts a session without the tab bar', () => {
    render(<App storage={seededStorage({ settings: { notation: 'cifra' } })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Progresso' }));
    fireEvent.click(screen.getByTestId('cell-6-12'));
    expect(screen.queryByRole('navigation', { name: 'Principal' })).not.toBeInTheDocument();
  });

  it('Alterar foco goes to the Foco tab', () => {
    render(<App storage={seededStorage()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Alterar foco' }));
    expect(screen.getByRole('button', { name: 'Foco' })).toHaveAttribute('aria-current', 'page');
  });
});
