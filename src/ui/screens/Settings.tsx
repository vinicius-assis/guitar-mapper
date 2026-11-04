import type { Notation } from '../../domain/notes';
import { INSTRUMENTS } from '../../domain/instruments';
import { useAppState } from '../../state/AppState';

const NOTATIONS: { value: Notation; label: string }[] = [
  { value: 'cifra', label: 'C D E' },
  { value: 'solfejo', label: 'Dó Ré Mi' },
  { value: 'ambos', label: 'Os dois' },
];

export function Settings() {
  const { data, updateSettings } = useAppState();
  const { settings } = data;

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
