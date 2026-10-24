import type { Notation } from '../../domain/notes';
import { useAppState } from '../../state/AppState';

const NOTATIONS: { value: Notation; label: string }[] = [
  { value: 'cifra', label: 'C D E' },
  { value: 'solfejo', label: 'Dó Ré Mi' },
  { value: 'ambos', label: 'Os dois' },
];

export function Settings() {
  const { data, updateSettings, resetProgress } = useAppState();
  const { settings } = data;

  return (
    <section className="screen">
      <h2>Ajustes</h2>

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

      <button
        type="button"
        className="danger"
        onClick={() => {
          if (window.confirm('Apagar todo o progresso? Isso não pode ser desfeito.')) {
            resetProgress();
          }
        }}
      >
        Zerar progresso
      </button>
    </section>
  );
}
