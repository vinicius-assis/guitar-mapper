import { useRef, useState, type ChangeEvent } from 'react';
import type { Notation } from '../../domain/notes';
import { INSTRUMENTS } from '../../domain/instruments';
import { useAppState } from '../../state/AppState';
import { IMPORT_ERROR, exportFilename, parseImport, serializeData } from '../../state/backup';
import { useConfirm } from '../ConfirmDialog';

function readText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

const NOTATIONS: { value: Notation; label: string }[] = [
  { value: 'cifra', label: 'C D E' },
  { value: 'solfejo', label: 'Dó Ré Mi' },
  { value: 'ambos', label: 'Os dois' },
];

export function Settings() {
  const { data, updateSettings, exportData, importData } = useAppState();
  const { settings } = data;
  const confirm = useConfirm();
  const fileInput = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [imported, setImported] = useState(false);

  function handleExport() {
    const blob = new Blob([serializeData(exportData())], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = exportFilename(new Date());
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    input.value = '';
    setImportError(null);
    setImported(false);
    if (!file) return;
    let text: string;
    try {
      text = await readText(file);
    } catch {
      setImportError(IMPORT_ERROR);
      return;
    }
    const result = parseImport(text);
    if (!result.ok) {
      setImportError(result.error);
      return;
    }
    const ok = await confirm({
      title: 'Importar dados?',
      message:
        'Isto substitui todo o progresso, histórico e ajustes atuais. Uma cópia dos dados atuais fica guardada no aparelho.',
      confirmLabel: 'Importar',
    });
    if (!ok) return;
    importData(result.data);
    setImported(true);
  }

  return (
    <section className="screen screen--form">
      <h2>Ajustes</h2>

      <fieldset>
        <legend>Instrumento</legend>
        {INSTRUMENTS.map(({ id, label }) => (
          <label key={id} className="check">
            <input
              type="radio"
              name="instrument"
              checked={settings.instrument === id}
              onChange={() => updateSettings({ instrument: id })}
            />
            {label}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Notação</legend>
        {NOTATIONS.map(({ value, label }) => (
          <label key={value} className="check">
            <input
              type="radio"
              name="notation"
              checked={settings.notation === value}
              onChange={() => updateSettings({ notation: value })}
            />
            {label}
          </label>
        ))}
      </fieldset>

      <label className="check">
        <input
          type="checkbox"
          checked={settings.leftHanded}
          onChange={(e) => updateSettings({ leftHanded: e.target.checked })}
        />
        Mão esquerda
      </label>

      <label className="check">
        <input
          type="checkbox"
          checked={settings.soundEnabled}
          onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
        />
        Som
      </label>
      <p className="hint">No iPhone, o som não toca com o aparelho no modo silencioso.</p>

      <section aria-labelledby="data-title">
        <h3 id="data-title">Dados</h3>
        <button type="button" onClick={handleExport}>
          Exportar dados
        </button>
        <button type="button" onClick={() => fileInput.current?.click()}>
          Importar dados
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          aria-label="Importar dados"
          onChange={handleFile}
        />
        {importError && (
          <p role="alert" className="empty">
            {importError}
          </p>
        )}
        {imported && (
          <p role="status" className="hint">
            Dados importados.
          </p>
        )}
        <p className="hint">
          Guarde o arquivo exportado: se o navegador limpar os dados do site, é por ele que você
          recupera o progresso.
        </p>
      </section>

      <section aria-labelledby="credits-title">
        <h3 id="credits-title">Créditos</h3>
        <p className="hint">
          Sons de violão de nylon e de baixo (Electric Bass (finger)): FluidR3 GM, licença MIT
          (autor original do FluidR3) e Creative Commons Attribution 3.0, empacotados por
          midi-js-soundfonts (Benjamin Gleitzman).
        </p>
      </section>
    </section>
  );
}
