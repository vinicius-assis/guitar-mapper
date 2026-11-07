import { InstrumentBadge } from '../InstrumentBadge';
import { INTERVALS } from '../../domain/intervals';
import { useAppState } from '../../state/AppState';
import { useFocusFilter, FRET_OPTIONS, FRET_PRESETS } from '../useFocusFilter';
import { ADVANCE_OPTIONS, useIntervalFocus } from '../useIntervalFocus';

export function Focus() {
  const { filter, count, allStrings, toggleString, setRange, setMin, setMax, setNaturalsOnly } =
    useFocusFilter();
  const { data } = useAppState();
  const focus = useIntervalFocus();

  if (data.settings.mode === 'interval') {
    return (
      <section className="screen screen--form">
        <div className="title-row">
          <h2>Foco</h2>
          <InstrumentBadge />
        </div>

        <h3>Intervalos</h3>
        <div className="chips">
          <button
            type="button"
            className="chip chip--wide chip--nowrap"
            aria-pressed={focus.intervals.length === INTERVALS.length}
            onClick={focus.selectAllIntervals}
          >
            Todos
          </button>
          <button
            type="button"
            className="chip chip--wide chip--nowrap"
            title="3ª, 5ª e 7ª"
            aria-pressed={focus.chordTonesSelected}
            onClick={focus.selectChordTones}
          >
            Acordes
          </button>
          {INTERVALS.map((i) => (
            <button
              key={i.id}
              type="button"
              className="chip chip--wide chip--nowrap"
              aria-pressed={focus.intervals.includes(i.id)}
              onClick={() => focus.toggleInterval(i.id)}
            >
              {i.label}
            </button>
          ))}
        </div>

        <h3>Notas</h3>
        <div className="chips">
          <button
            type="button"
            className="chip chip--wide"
            aria-pressed={filter.naturalsOnly}
            onClick={() => setNaturalsOnly(true)}
          >
            Naturais
          </button>
          <button
            type="button"
            className="chip chip--wide"
            aria-pressed={!filter.naturalsOnly}
            onClick={() => setNaturalsOnly(false)}
          >
            Com acidentais
          </button>
        </div>

        <h3>Próxima pergunta</h3>
        <div className="chips">
          {ADVANCE_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              className="chip chip--wide"
              aria-pressed={focus.advance === o.value}
              onClick={() => focus.setAdvance(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>

        <p data-testid="count" className="count">
          {focus.count} perguntas no foco
        </p>
        {focus.count === 0 && <p className="empty">Nenhuma pergunta: selecione ao menos um intervalo.</p>}
      </section>
    );
  }

  return (
    <section className="screen screen--form">
      <div className="title-row">
        <h2>Foco</h2>
        <InstrumentBadge />
      </div>

      <h3>Cordas</h3>
      <div className="chips">
        {allStrings.map((s) => (
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
