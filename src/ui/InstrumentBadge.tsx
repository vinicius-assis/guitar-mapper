import { useAppState } from '../state/AppState';

/** Etiqueta informativa com o instrumento ativo (não interativa). */
export function InstrumentBadge() {
  const { instrument } = useAppState();
  return <span className="instrument-badge">{instrument.label}</span>;
}
