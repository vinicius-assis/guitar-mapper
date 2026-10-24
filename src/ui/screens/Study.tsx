import { useEffect, useMemo, useRef, useState } from 'react';
import { positionKey, positionsInFilter, type Position } from '../../domain/fretboard';
import type { QuizMode } from '../../domain/quiz';
import { pickNext } from '../../domain/scheduler';
import { useAppState } from '../../state/AppState';
import { ChoiceQuiz } from './ChoiceQuiz';
import { Flashcard } from './Flashcard';
import { FindQuiz } from './FindQuiz';

const MODES: { mode: QuizMode; label: string }[] = [
  { mode: 'position-to-note', label: 'Posição → nota' },
  { mode: 'note-to-position', label: 'Nota → posição' },
  { mode: 'flashcard', label: 'Flashcard' },
];

export function Study({ forced = null }: { forced?: Position | null }) {
  const { data, recordAnswer, updateSettings } = useAppState();
  const { settings } = data;
  const candidates = useMemo(() => positionsInFilter(settings.filter), [settings.filter]);

  const [position, setPosition] = useState<Position | null>(null);
  const [round, setRound] = useState(0);
  const [session, setSession] = useState({ correct: 0, total: 0, streak: 0 });
  const lastKey = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (forced && round === 0) {
      setPosition(forced);
      return;
    }
    if (candidates.length === 0) {
      setPosition(null);
      return;
    }
    setPosition(pickNext(candidates, data.progress, Date.now(), Math.random, lastKey.current));
  }, [round, candidates]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleAnswer(correct: boolean) {
    if (!position) return;
    recordAnswer(position, correct);
    setSession((s) => ({
      correct: s.correct + (correct ? 1 : 0),
      total: s.total + 1,
      streak: correct ? s.streak + 1 : 0,
    }));
  }

  function handleNext() {
    if (position) lastKey.current = positionKey(position);
    setRound((r) => r + 1);
  }

  const quizProps = { settings, onAnswer: handleAnswer, onNext: handleNext };

  return (
    <section className="screen">
      <div className="mode-bar" role="group" aria-label="Modo de estudo">
        {MODES.map(({ mode, label }) => (
          <button
            key={mode}
            type="button"
            aria-pressed={settings.mode === mode}
            onClick={() => updateSettings({ mode })}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="session">
        Acertos {session.correct}/{session.total} · Sequência {session.streak}
      </p>
      {candidates.length === 0 && !forced ? (
        <p className="empty">
          Nenhuma posição no foco atual. Selecione ao menos uma corda ou ajuste as casas e o nível
          de notas em Foco.
        </p>
      ) : (
        position &&
        (settings.mode === 'position-to-note' ? (
          <ChoiceQuiz key={round} position={position} {...quizProps} />
        ) : settings.mode === 'note-to-position' ? (
          <FindQuiz key={round} position={position} {...quizProps} />
        ) : (
          <Flashcard key={round} position={position} {...quizProps} />
        ))
      )}
    </section>
  );
}
