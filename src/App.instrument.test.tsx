import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { App } from './App';
import { useAppState } from './state/AppState';
import { seededStorage, mockViewport } from './test-utils';
import { BASS } from './domain/instruments';
import { positionsInFilter } from './domain/fretboard';
import { defaultFilterFor } from './state/storage';

// O seletor de instrumento ainda não existe em Ajustes: esta tela de teste faz o papel dele.
vi.mock('./ui/screens/Settings', () => ({
  Settings: function FakeSettings() {
    const { updateSettings } = useAppState();
    return (
      <button type="button" onClick={() => updateSettings({ instrument: 'bass' })}>
        Baixo
      </button>
    );
  },
}));

describe('App: instrument change', () => {
  it('after a guitar session in progress, Ajustes -> Baixo -> Estudar shows the fresh bass start screen', () => {
    const viewport = mockViewport(1280); // abas sempre visíveis
    try {
      render(<App storage={seededStorage({ settings: { notation: 'cifra' } })} />);
      fireEvent.click(screen.getByRole('button', { name: /Iniciar/ }));
      // duas respostas erradas seguidas (o certo avança sozinho; o errado oferece Próxima)
      for (let i = 0; i < 2; i++) {
        const options = [...document.querySelectorAll<HTMLButtonElement>('.option')];
        fireEvent.click(options[0]);
        const next = screen.queryByRole('button', { name: 'Próxima' });
        if (next) fireEvent.click(next);
      }
      expect(screen.getByRole('progressbar')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Ajustes' }));
      fireEvent.click(screen.getByRole('button', { name: 'Baixo' }));
      fireEvent.click(screen.getByRole('button', { name: 'Estudar' }));

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      const n = positionsInFilter(defaultFilterFor(BASS), BASS).length;
      expect(screen.getByRole('group', { name: 'Foco' })).toHaveTextContent(`Perguntas${n}`);
      expect(screen.getByRole('button', { name: /Iniciar/ })).toBeInTheDocument();
    } finally {
      viewport.restore();
    }
  });
});
