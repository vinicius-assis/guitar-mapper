import { useEffect, useMemo, useState } from 'react';
import { useSound } from '../../audio/SoundProvider';
import {
  EAR_INTERVAL_LEVELS,
  earInterval,
  earIntervalSequence,
  type EarIntervalQuestion,
} from '../../domain/earTraining';
import { noteLabel } from '../../domain/notes';
import type { Settings } from '../../state/storage';
import { INTERVAL_SHORTCUTS } from '../modeLabels';
import { useAutoAdvance } from '../useAutoAdvance';

interface Props {
  question: EarIntervalQuestion;
  settings: Settings;
  onAnswer(correct: boolean): void;
  onNext(): void;
}

export function EarIntervalQuiz({ question, settings, onAnswer, onNext }: Props) {
  const { notation, accidentals, earIntervalLevel } = settings;
  const sound = useSound();
  const seq = useMemo(() => earIntervalSequence(question), [question]);
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const correct = answered && picked === question.semitones;
  useAutoAdvance(correct, onNext);

  // O som é a pergunta: toca sozinho e é cancelado ao sair.
  useEffect(() => {
    sound.playSequence(seq);
    return () => sound.playSequence([]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const level = EAR_INTERVAL_LEVELS[earIntervalLevel];
  const hint =
    level.length <= 9
      ? `Teclado: 1–${level.length} · R = ouvir de novo`
      : 'Teclado: 1–9, 0, Q, W, E · R = ouvir de novo';

  function choose(semitones: number) {
    if (answered) return;
    setPicked(semitones);
    onAnswer(semitones === question.semitones);
  }

  const name = (midi: number) => noteLabel((midi % 12) as never, notation, accidentals);
  const unison = question.semitones === 0;
  const way = question.direction === 'up' ? 'subindo' : 'descendo';
  const answerName = earInterval(question.semitones).name;

  return (
    <div className="quiz">
      <p className="prompt">Qual é o intervalo?</p>
      <button type="button" className="ear-play" onClick={() => sound.playSequence(seq)}>
        <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false">
          <path
            d="M3 9v6h4l5 4V5L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"
            fill="currentColor"
          />
        </svg>
        Ouvir de novo
      </button>
      <div className="answer-grid">
        {level.map((s, i) => (
          <button
            key={s}
            type="button"
            data-shortcut={INTERVAL_SHORTCUTS[i]}
            disabled={answered}
            className={[
              'option',
              answered && s === question.semitones ? 'option--correct' : '',
              answered && s === picked && !correct ? 'option--wrong' : '',
            ].join(' ')}
            onClick={() => choose(s)}
          >
            {earInterval(s).label}
          </button>
        ))}
      </div>
      {!answered && <p className="keyboard-hint">{hint}</p>}
      {answered && (
        <>
          <p className="ear-detail">
            {`${name(question.pitches[0])} → ${name(question.pitches[1])}`}
            {unison ? '' : ` · ${way}`}
          </p>
          <div className="feedback quiz-actions">
            <p role="status" className={correct ? undefined : 'sr-only'}>
              {correct
                ? 'Correto!'
                : unison
                  ? 'Errado. Era uníssono.'
                  : `Errado. Era ${answerName}, ${way}.`}
            </p>
            {!correct && (
              <button type="button" className="primary" onClick={onNext}>
                Próxima
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
