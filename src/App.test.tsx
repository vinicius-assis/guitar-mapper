import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, it, expect } from 'vitest';
import { App } from './App';
import { STORAGE_KEY } from './state/storage';
import {
  createMemoryStorage,
  createThrowingStorage,
  mockViewport,
  seededStorage,
} from './test-utils';

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
    fireEvent.click(screen.getByRole('button', { name: 'Progresso' }));
    expect(screen.getByRole('button', { name: 'Zerar progresso' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ajustes' }));
    expect(screen.getByLabelText('Mão esquerda')).toBeInTheDocument();
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

});

describe('App layout by width', () => {
  let viewport: ReturnType<typeof mockViewport> | null = null;
  afterEach(() => viewport?.restore());
  const nav = () => screen.queryByRole('navigation', { name: 'Principal' });
  const app = (container: HTMLElement) => container.querySelector('.app')!;

  it('phone: bottom tabs (no sidebar) that hide while a session runs', () => {
    viewport = mockViewport(390);
    const { container } = render(<App storage={seededStorage()} />);
    expect(app(container)).toHaveClass('app--mobile');
    expect(nav()).not.toHaveClass('sidebar');
    fireEvent.click(screen.getByRole('button', { name: /Iniciar/ }));
    expect(nav()).not.toBeInTheDocument();
    expect(app(container)).toHaveClass('app--session');
  });

  it('tablet: bottom tabs and the tablet column', () => {
    viewport = mockViewport(800);
    const { container } = render(<App storage={seededStorage()} />);
    expect(app(container)).toHaveClass('app--tablet');
    expect(nav()).not.toHaveClass('sidebar');
    fireEvent.click(screen.getByRole('button', { name: /Iniciar/ }));
    expect(nav()).not.toBeInTheDocument();
  });

  it('desktop: a sidebar with the brand that stays visible during a session', () => {
    viewport = mockViewport(1280);
    const { container } = render(<App storage={seededStorage()} />);
    expect(app(container)).toHaveClass('app--desktop');
    expect(nav()).toHaveClass('sidebar');
    expect(within(nav()!).getByRole('img', { name: 'Guitar Mapper' })).toBeInTheDocument();
    expect(nav()).toHaveTextContent('Guitar Mapper');
    fireEvent.click(screen.getByRole('button', { name: /Iniciar/ }));
    expect(nav()).toBeInTheDocument();
    expect(app(container)).not.toHaveClass('app--session');
    fireEvent.click(within(nav()!).getByRole('button', { name: 'Progresso' }));
    expect(within(nav()!).getByRole('button', { name: 'Progresso' })).toHaveAttribute('aria-current', 'page');
  });

  it('switching width swaps the sidebar for tabs without losing the current tab', () => {
    viewport = mockViewport(1280);
    render(<App storage={seededStorage()} />);
    fireEvent.click(within(nav()!).getByRole('button', { name: 'Ajustes' }));
    act(() => viewport!.setWidth(390));
    expect(nav()).not.toHaveClass('sidebar');
    expect(within(nav()!).getByRole('button', { name: 'Ajustes' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByLabelText('Mão esquerda')).toBeInTheDocument();
  });
});
