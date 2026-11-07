import { useAppState } from '../../state/AppState';
import { INTERVALS } from '../../domain/intervals';
import { describeFocus, describeIntervalFocus } from '../focusSummary';
import { ADVANCE_OPTIONS } from '../useIntervalFocus';
import {
  FRET_OPTIONS,
  FRET_PRESETS,
  useFocusFilter,
} from '../useFocusFilter';
import { useIntervalFocus } from '../useIntervalFocus';

interface FocusSheetProps {
  /** Quantas perguntas a sessão terá (posições, ou sons distintos no Ouvido). */
  questionCount: number;
  /** Painel sempre aberto, sem botão de abrir e fechar (computador). */
  fixed?: boolean;
  open: boolean;
  onOpenChange(open: boolean): void;
}

function summaryText(strings: string, frets: string, notes: string): string {
  const cordas =
    strings === 'Todas' ? 'Todas as cordas' : strings === 'Nenhuma' ? 'Nenhuma corda' : `Cordas ${strings}`;
  return `${cordas} · Casas ${frets} · ${notes}`;
}

/** Cartão do Foco: recolhido mostra o resumo; aberto edita cordas, casas e notas na hora. */
export function FocusSheet({
  questionCount,
  fixed = false,
  open: openProp,
  onOpenChange,
}: FocusSheetProps) {
  const { instrument, data } = useAppState();
  const intervalMode = data.settings.mode === 'interval';
  const focus = useIntervalFocus();
  const count = intervalMode ? focus.count : questionCount;
  const open = fixed || openProp;
  const { filter, allStrings, toggleString, selectAllStrings, setRange, setMin, setMax, setNaturalsOnly } =
    useFocusFilter();
  const summary = describeFocus(filter, instrument);
  const intervalSummary = describeIntervalFocus(focus.intervals, filter.naturalsOnly, focus.advance);
  const allSelected = allStrings.every((s) => filter.strings.includes(s));

  return (
    <div className={fixed ? 'focus-slot focus-slot--fixed' : 'focus-slot'}>
      <div
        className={`focus-card${open ? ' focus-card--open' : ''}${fixed ? ' focus-card--fixed' : ''}`}
        role="group"
        aria-label="Foco"
      >
      {fixed ? (
        <div className="focus-card__head focus-card__head--static">
          <span className="focus-card__title">Foco</span>
        </div>
      ) : (
        <button
          type="button"
          className="focus-card__head"
          aria-expanded={open}
          aria-controls={open ? 'focus-card-body' : undefined}
          onClick={() => onOpenChange(!open)}
        >
          <span className="focus-card__title">Foco</span>
          {!open && (
            <span className="static-value">
              {count} {count === 1 ? 'pergunta' : 'perguntas'}
            </span>
          )}
          <svg className="focus-card__chevron" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
            <path d="M7 14l5-5 5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {!open && (
            <span className="focus-card__summary">
              {intervalMode
                ? `${intervalSummary.intervals} · ${intervalSummary.notes} · ${intervalSummary.advance}`
                : summaryText(summary.strings, summary.frets, summary.notes)}
            </span>
          )}
        </button>
      )}
      {open && (
        <div className="focus-card__body" id="focus-card-body">
          <dl className="focus-rows focus-rows--stacked">
            <dt>Perguntas</dt>
            <dd className="focus-count">
              <span className="static-value">{count}</span>
            </dd>

            {intervalMode ? (
              <>
                <dt>Intervalos</dt>
                <dd className="focus-controls">
                  <button
                    type="button"
                    className="badge badge--button"
                    aria-pressed={focus.intervals.length === INTERVALS.length}
                    onClick={focus.selectAllIntervals}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    className="badge badge--button"
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
                      className="badge badge--button"
                      aria-pressed={focus.intervals.includes(i.id)}
                      onClick={() => focus.toggleInterval(i.id)}
                    >
                      {i.label}
                    </button>
                  ))}
                </dd>
              </>
            ) : (
              <>
            <dt>Cordas</dt>
            <dd className="focus-controls">
              <button
                type="button"
                className="badge badge--button"
                aria-pressed={allSelected}
                onClick={selectAllStrings}
              >
                Todas
              </button>
              {allStrings.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="badge badge--button"
                  aria-label={`Corda ${s}`}
                  aria-pressed={filter.strings.includes(s)}
                  onClick={() => toggleString(s)}
                >
                  {s}
                </button>
              ))}
            </dd>

            <dt>Casas</dt>
            <dd className="focus-controls">
              {FRET_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className="badge badge--button"
                  aria-label={`Casas ${p.label}`}
                  aria-pressed={filter.fretMin === p.min && filter.fretMax === p.max}
                  onClick={() => setRange(p.min, p.max)}
                >
                  {p.label}
                </button>
              ))}
            </dd>

            <dt>De / até</dt>
            <dd className="focus-controls">
              <select
                className="badge badge--select"
                aria-label="Casa inicial"
                value={filter.fretMin}
                onChange={(e) => setMin(e.target.value)}
              >
                {FRET_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <select
                className="badge badge--select"
                aria-label="Casa final"
                value={filter.fretMax}
                onChange={(e) => setMax(e.target.value)}
              >
                {FRET_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </dd>
              </>
            )}

            <dt>Notas</dt>
            <dd className="focus-controls">
              <button
                type="button"
                className="badge badge--button"
                aria-pressed={filter.naturalsOnly}
                onClick={() => setNaturalsOnly(true)}
              >
                Naturais
              </button>
              <button
                type="button"
                className="badge badge--button"
                aria-pressed={!filter.naturalsOnly}
                onClick={() => setNaturalsOnly(false)}
              >
                Com acidentais
              </button>
            </dd>
            {intervalMode && (
              <>
                <dt>Próxima pergunta</dt>
                <dd className="focus-controls">
                  {ADVANCE_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      className="badge badge--button"
                      aria-pressed={focus.advance === o.value}
                      onClick={() => focus.setAdvance(o.value)}
                    >
                      {o.label}
                    </button>
                  ))}
                </dd>
              </>
            )}
          </dl>
          {count === 0 && !intervalMode && (
            <p className="empty">Nenhuma posição: selecione ao menos uma corda ou inclua acidentais.</p>
          )}
          {count === 0 && intervalMode && <p className="empty">Nenhuma pergunta: selecione ao menos um intervalo.</p>}
        </div>
      )}
      </div>
    </div>
  );
}
