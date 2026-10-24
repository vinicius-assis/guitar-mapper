import type { Notation } from '../../domain/notes';
import { useConfirm } from '../ConfirmDialog';
import { useAppState } from '../../state/AppState';

const NOTATIONS: { value: Notation; label: string }[] = [
  { value: 'cifra', label: 'C D E' },
  { value: 'solfejo', label: 'Dó Ré Mi' },
  { value: 'ambos', label: 'Os dois' },
];

export function Settings() {
  const { data, updateSettings, resetProgress } = useAppState();
  const confirm = useConfirm();
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
        onClick={async () => {
          const ok = await confirm({
            title: 'Zerar o progresso?',
            message: "Todas as posições voltam a ser 'nunca vistas'. Isso não pode ser desfeito.",
            confirmLabel: 'Zerar',
          });
          if (ok) resetProgress();
        }}
      >
        Zerar progresso
      </button>
    </section>
  );
}
