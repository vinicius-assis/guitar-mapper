import { fireEvent, render, screen } from '@testing-library/react';
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
    expect(screen.getByRole('button', { name: 'Estudar' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('Qual é esta nota?')).toBeInTheDocument();
    // a nota da posição 6-12 (E) está entre as opções
    expect(screen.getByRole('button', { name: 'E' })).toBeInTheDocument();
  });

  it('warns when storage is unavailable and still works', () => {
    render(<App storage={null} />);
    expect(screen.getByText(/progresso não será salvo/i)).toBeInTheDocument();
    expect(screen.getByText('Qual é esta nota?')).toBeInTheDocument();
  });

  it('warns after the first answer when writes fail', () => {
    const { container } = render(<App storage={createThrowingStorage('write')} />);
    expect(screen.queryByText(/progresso não será salvo/i)).not.toBeInTheDocument();
    fireEvent.click(container.querySelector('.option')!);
    expect(screen.getByText(/progresso não será salvo/i)).toBeInTheDocument();
  });

  it('tells the user when saved data was corrupted and reset', () => {
    render(<App storage={createMemoryStorage({ [STORAGE_KEY]: '{oops' })} />);
    expect(screen.getByText(/dados salvos estavam corrompidos/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }));
    expect(screen.queryByText(/dados salvos estavam corrompidos/i)).not.toBeInTheDocument();
  });
});
