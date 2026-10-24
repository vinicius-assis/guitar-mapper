import { useMemo } from 'react';
import {
  FIRST_QUIZ_FRET,
  MAX_FRET,
  allPositions,
  positionKey,
  type Position,
} from '../../domain/fretboard';
import { masteryOf, type Mastery } from '../../domain/scheduler';
import { useAppState } from '../../state/AppState';
import { Fretboard, type Mark } from '../Fretboard';
import { useConfirm } from '../ConfirmDialog';
import { formatSeconds } from '../format';
import { modeLabel } from '../modeLabels';
import { stringLabels } from '../stringLabels';

const LEGEND: { mastery: Mastery; label: string }[] = [
  { mastery: 'mastered', label: 'Dominadas' },
  { mastery: 'learning', label: 'Aprendendo' },
  { mastery: 'wrong', label: 'Errando' },
  { mastery: 'unseen', label: 'Nunca vistas' },
];

export function Progress({ onSelect }: { onSelect(position: Position): void }) {
  const { data, clearHistory } = useAppState();
  const confirm = useConfirm();
  const { progress, settings, history } = data;

  const { marks, counts } = useMemo(() => {
    const counts: Record<Mastery, number> = { unseen: 0, wrong: 0, learning: 0, mastered: 0 };
    const marks: Mark[] = allPositions()
      .filter((position) => position.fret >= FIRST_QUIZ_FRET)
      .map((position) => {
        const kind = masteryOf(progress[positionKey(position)]);
        counts[kind] += 1;
        return { position, kind };
      });
    return { marks, counts };
  }, [progress]);

  return (
    <section className="screen">
      <h2>Progresso</h2>
      <Fretboard
        fretMin={FIRST_QUIZ_FRET}
        fretMax={MAX_FRET}
        marks={marks}
        onTap={onSelect}
        leftHanded={settings.leftHanded}
        stringLabels={stringLabels()}
      />
      <ul className="legend">
        {LEGEND.map(({ mastery, label }) => (
          <li key={mastery}>
            <span className={`swatch swatch--${mastery}`} aria-hidden="true" />
            {label}: {counts[mastery]}
          </li>
        ))}
      </ul>
      <p className="hint">Toque numa posição para estudá-la.</p>

      <h2>Histórico</h2>
      {history.length === 0 ? (
        <p className="empty">Nenhuma sessão ainda.</p>
      ) : (
        <>
          <ul className="history">
            {history.map((entry, i) => (
              <li key={`${entry.at}-${i}`}>
                <strong>{modeLabel(entry.mode)}</strong>
                <span>
                  {Math.round((entry.correct / entry.total) * 100)}% · {entry.correct}/{entry.total}{' '}
                  · {formatSeconds(entry.averageMs)}
                </span>
                <time dateTime={new Date(entry.at).toISOString()}>
                  {new Date(entry.at).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="danger"
            onClick={async () => {
              const ok = await confirm({
                title: 'Limpar o histórico?',
                message: 'As últimas sessões serão apagadas. Isso não pode ser desfeito.',
                confirmLabel: 'Limpar',
              });
              if (ok) clearHistory();
            }}
          >
            Limpar histórico
          </button>
        </>
      )}
    </section>
  );
}
