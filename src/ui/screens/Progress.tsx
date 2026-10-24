import { useMemo } from 'react';
import { MAX_FRET, allPositions, positionKey, type Position } from '../../domain/fretboard';
import { masteryOf, type Mastery } from '../../domain/scheduler';
import { useAppState } from '../../state/AppState';
import { Fretboard, type Mark } from '../Fretboard';
import { stringLabels } from '../stringLabels';

const LEGEND: { mastery: Mastery; label: string }[] = [
  { mastery: 'mastered', label: 'Dominadas' },
  { mastery: 'learning', label: 'Aprendendo' },
  { mastery: 'wrong', label: 'Errando' },
  { mastery: 'unseen', label: 'Nunca vistas' },
];

export function Progress({ onSelect }: { onSelect(position: Position): void }) {
  const { data } = useAppState();
  const { progress, settings } = data;

  const { marks, counts } = useMemo(() => {
    const counts: Record<Mastery, number> = { unseen: 0, wrong: 0, learning: 0, mastered: 0 };
    const marks: Mark[] = allPositions().map((position) => {
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
        fretMin={0}
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
    </section>
  );
}
