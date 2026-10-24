import { useMemo } from 'react';
import { FIRST_QUIZ_FRET, MAX_FRET, positionsInFilter, type Filter } from '../../domain/fretboard';
import { useAppState } from '../../state/AppState';

const PRESETS = [
  { label: `Casas ${FIRST_QUIZ_FRET}–5`, min: FIRST_QUIZ_FRET, max: 5 },
  { label: 'Casas 5–12', min: 5, max: 12 },
  { label: 'Casas 12–24', min: 12, max: 24 },
];
const FRET_OPTIONS = Array.from({ length: MAX_FRET - FIRST_QUIZ_FRET + 1 }, (_, i) => FIRST_QUIZ_FRET + i);

export function Focus() {
  const { data, updateSettings } = useAppState();
  const { filter } = data.settings;
  const count = useMemo(() => positionsInFilter(filter).length, [filter]);

  const setFilter = (patch: Partial<Filter>) => updateSettings({ filter: { ...filter, ...patch } });

  const toggleString = (s: number) =>
    setFilter({
      strings: filter.strings.includes(s)
        ? filter.strings.filter((x) => x !== s)
        : [...filter.strings, s].sort((a, b) => a - b),
    });

  const setMin = (value: string) => {
    const n = Number(value);
    setFilter({ fretMin: n, fretMax: Math.max(n, filter.fretMax) });
  };
  const setMax = (value: string) => {
    const n = Number(value);
    setFilter({ fretMax: n, fretMin: Math.min(n, filter.fretMin) });
  };

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
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            className="chip chip--wide"
            aria-pressed={filter.fretMin === p.min && filter.fretMax === p.max}
            onClick={() => setFilter({ fretMin: p.min, fretMax: p.max })}
          >
            {p.label}
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
          onChange={(e) => setFilter({ naturalsOnly: e.target.checked })}
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
