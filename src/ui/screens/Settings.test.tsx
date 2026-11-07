import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { AppProvider } from '../../state/AppState';
import { IMPORT_ERROR, parseImport } from '../../state/backup';
import { BACKUP_KEY, createDefaultData } from '../../state/storage';
import { readRawSettings, readSaved, seededStorage } from '../../test-utils';
import { ConfirmProvider } from '../ConfirmDialog';
import { Settings } from './Settings';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  Reflect.deleteProperty(URL, 'createObjectURL');
  Reflect.deleteProperty(URL, 'revokeObjectURL');
});

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

  const AUTO_HINT =
    'Automático escreve como os músicos costumam (Db, Eb, F#, Ab, Bb) e, nos Intervalos, dá à nota de chegada o nome do grau (Dó + 3ª m = Mib).';

  it('picks the accidentals, sharp by default', () => {
    const storage = setup();
    expect(screen.getByLabelText('Sustenidos')).toBeChecked();
    fireEvent.click(screen.getByLabelText('Bemóis'));
    expect(readRawSettings(storage).accidentals).toBe('flat');
    fireEvent.click(screen.getByLabelText('Automático'));
    expect(readRawSettings(storage).accidentals).toBe('auto');
  });

  it('places Acidentais right after Notação, with the Automático hint', () => {
    setup();
    const legends = Array.from(document.querySelectorAll('fieldset > legend')).map((l) => l.textContent);
    const i = legends.findIndex((t) => t?.includes('Notação'));
    expect(i).toBeGreaterThanOrEqual(0);
    expect(legends[i + 1]).toContain('Acidentais');
    expect(screen.getByText(AUTO_HINT)).toBeInTheDocument();
  });

  it('keeps accidentals when switching instrument', () => {
    const storage = setup();
    fireEvent.click(screen.getByLabelText('Bemóis'));
    fireEvent.click(screen.getByLabelText('Baixo'));
    expect(readRawSettings(storage).accidentals).toBe('flat');
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

  describe('Dados', () => {
    function otherData(instrument: 'guitar' | 'bass' = 'guitar') {
      const d = createDefaultData();
      d.settings.instrument = instrument;
      d.instruments.guitar.progress = {
        '1-2': { box: 2, correct: 4, wrong: 1, lastReview: 0, nextReview: 0 },
      };
      return d;
    }
    const fileOf = (text: string) => new File([text], 'x.json', { type: 'application/json' });
    const input = () => screen.getByLabelText('Importar dados', { selector: 'input' }) as HTMLInputElement;
    const pick = (text: string) =>
      fireEvent.change(input(), { target: { files: [fileOf(text)] } });

    it('exports the whole data as a dated JSON download', async () => {
      const create = vi.fn(() => 'blob:x');
      const revoke = vi.fn();
      Object.defineProperty(URL, 'createObjectURL', { value: create, configurable: true, writable: true });
      Object.defineProperty(URL, 'revokeObjectURL', { value: revoke, configurable: true, writable: true });
      let download = '';
      let attached = false;
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        download = this.download;
        attached = document.body.contains(this);
      });
      setup();
      vi.useFakeTimers();
      try {
        fireEvent.click(screen.getByRole('button', { name: 'Exportar dados' }));
        expect(create).toHaveBeenCalledTimes(1);
        expect(download).toMatch(/^guitar-mapper-\d{4}-\d{2}-\d{2}\.json$/);
        expect(attached).toBe(true);
        expect(document.querySelector('a[download]')).toBeNull();
        expect(revoke).not.toHaveBeenCalled();
        vi.advanceTimersByTime(60_000);
        expect(revoke).toHaveBeenCalledTimes(1);
        expect(revoke).toHaveBeenCalledWith('blob:x');
      } finally {
        vi.useRealTimers();
      }
      const blob = (create.mock.calls[0] as unknown as [Blob])[0];
      expect(blob.type).toBe('application/json');
      const text = await new Promise<string>((res) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.readAsText(blob);
      });
      const parsed = parseImport(text);
      expect(parsed.ok).toBe(true);
      if (parsed.ok) expect(parsed.data.instruments.guitar.progress['6-0']).toBeDefined();
    });

    it('imports a valid file after confirmation, keeping a backup', async () => {
      const storage = setup();
      const before = storage.dump()['guitar-mapper:v2'] ?? null;
      pick(JSON.stringify(otherData()));
      fireEvent.click(await screen.findByRole('button', { name: 'Importar' }));
      expect(await screen.findByText('Dados importados.')).toBeInTheDocument();
      const saved = readSaved(storage);
      expect(saved.progress['1-2']).toBeDefined();
      expect(saved.progress['6-0']).toBeUndefined();
      const backup = JSON.parse(storage.dump()[BACKUP_KEY]);
      expect(backup.instruments.guitar.progress['6-0']).toBeDefined();
      expect(before).not.toBeNull();
    });

    it('opens the confirmation dialog with the title Importar dados?', async () => {
      setup();
      pick(JSON.stringify(otherData()));
      expect(await screen.findByRole('heading', { name: 'Importar dados?' })).toBeInTheDocument();
    });

    it('changes nothing when the confirmation is cancelled', async () => {
      const storage = setup();
      const before = JSON.stringify(readSaved(storage));
      pick(JSON.stringify(otherData()));
      fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));
      await waitFor(() =>
        expect(screen.queryByRole('heading', { name: 'Importar dados?' })).not.toBeInTheDocument(),
      );
      expect(JSON.stringify(readSaved(storage))).toBe(before);
      expect(storage.dump()[BACKUP_KEY]).toBeUndefined();
      expect(screen.queryByText('Dados importados.')).not.toBeInTheDocument();
    });

    it('rejects an invalid file with an alert, no dialog, no backup, data untouched', async () => {
      const storage = setup();
      const before = JSON.stringify(readSaved(storage));
      pick('não é json');
      expect((await screen.findByRole('alert')).textContent).toBe(IMPORT_ERROR);
      expect(screen.queryByRole('heading', { name: 'Importar dados?' })).not.toBeInTheDocument();
      expect(JSON.stringify(readSaved(storage))).toBe(before);
      expect(storage.dump()[BACKUP_KEY]).toBeUndefined();
    });

    it('resets the input so the same file can be chosen again', async () => {
      setup();
      pick('não é json');
      await screen.findByRole('alert');
      expect(input().value).toBe('');
    });

    it('switches the instrument radio after importing a bass file', async () => {
      setup();
      expect(screen.getByLabelText('Violão')).toBeChecked();
      pick(JSON.stringify(otherData('bass')));
      fireEvent.click(await screen.findByRole('button', { name: 'Importar' }));
      await screen.findByText('Dados importados.');
      expect(screen.getByLabelText('Baixo')).toBeChecked();
    });
  });
});

describe('Settings weekly goal', () => {
  it('defaults to 5, offers 1 to 7 and saves the choice', () => {
    const storage = setup();
    const select = screen.getByLabelText('Meta semanal (dias)') as HTMLSelectElement;
    expect(select.value).toBe('5');
    expect(Array.from(select.options).map((o) => o.value)).toEqual(['1', '2', '3', '4', '5', '6', '7']);
    fireEvent.change(select, { target: { value: '3' } });
    expect(readRawSettings(storage).weeklyGoal).toBe(3);
    expect(screen.getByText('Dias por semana em que você quer terminar ao menos uma sessão.')).toBeInTheDocument();
  });
});
