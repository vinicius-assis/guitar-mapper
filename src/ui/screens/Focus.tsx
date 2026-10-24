import { useFocusFilter, FRET_OPTIONS, FRET_PRESETS } from '../useFocusFilter';

export function Focus() {
  const { filter, count, toggleString, setRange, setMin, setMax, setNaturalsOnly } =
    useFocusFilter();

  return (
    <section className="screen">
      <h2>Foco</h2>

      <h3>Cordas</h3>
      <div className="chips">
        {[1, 2, 3, 4, 5, 6].map((s) => (
          <button
            key={s}
            type="button"
            className="chip"
            aria-label={`Corda ${s}`}
            aria-pressed={filter.strings.includes(s)}
            onClick={() => toggleString(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <h3>Casas</h3>
      <div className="chips">
        {FRET_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            className="chip chip--wide"
            aria-pressed={filter.fretMin === p.min && filter.fretMax === p.max}
            onClick={() => setRange(p.min, p.max)}
          >
            Casas {p.label}
          </button>
        ))}
      </div>
      <div className="field-row">
        <label>
          Casa inicial
          <select value={filter.fretMin} onChange={(e) => setMin(e.target.value)}>
            {FRET_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <label>
          Casa final
          <select value={filter.fretMax} onChange={(e) => setMax(e.target.value)}>
            {FRET_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="check">
        <input
          type="checkbox"
          checked={filter.naturalsOnly}
          onChange={(e) => setNaturalsOnly(e.target.checked)}
        />
        Só notas naturais
      </label>

      <p data-testid="count" className="count">
        {count} posições no foco
      </p>
      {count === 0 && (
        <p className="empty">
          Nenhuma posição: selecione ao menos uma corda ou inclua notas com sustenido.
        </p>
      )}
    </section>
  );
}
