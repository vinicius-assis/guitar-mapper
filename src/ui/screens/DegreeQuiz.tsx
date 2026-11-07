import { useEffect, useMemo, useState } from 'react';
import { useSound } from '../../audio/SoundProvider';
import {
  DEGREE_LEVELS,
  degreeSequence,
  degreeTarget,
  type DegreeQuestion,
} from '../../domain/earTraining';
import { intervalById } from '../../domain/intervals';
import { noteLabel, type NoteIndex } from '../../domain/notes';
import { spellInterval, spellingLabel } from '../../domain/spelling';
import type { Settings } from '../../state/storage';
import { useAutoAdvance } from '../useAutoAdvance';

interface Props {
  question: DegreeQuestion;
  settings: Settings;
  onAnswer(correct: boolean): void;
  onNext(): void;
}

const DEGREE_INTERVALS = ['2M', '3M', '4J', '5J', '6M', '7M'] as const;

export function DegreeQuiz({ question, settings, onAnswer, onNext }: Props) {
  const { notation, accidentals, degreeLevel } = settings;
  const sound = useSound();
  const seq = useMemo(() => degreeSequence(question, degreeLevel), [question, degreeLevel]);
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const correct = answered && picked === question.degree;
  useAutoAdvance(correct, onNext);

  useEffect(() => {
    sound.playSequence(seq);
    return () => sound.playSequence([]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const degrees = DEGREE_LEVELS[degreeLevel];

  function choose(degree: number) {
    if (answered) return;
    setPicked(degree);
    onAnswer(degree === question.degree);
  }

  const target =
    accidentals === 'auto' && question.degree >= 2
      ? spellingLabel(
          spellInterval(
            question.tonic,
            intervalById(DEGREE_INTERVALS[question.degree - 2]),
            'auto',
          ),
          notation,
        )
      : noteLabel((degreeTarget(question) % 12) as NoteIndex, notation, accidentals);

  return (
    <div className="quiz">
      <p className="prompt">Qual grau da escala maior?</p>
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
        {degrees.map((d) => (
          <button
            key={d}
            type="button"
            aria-label={`Grau ${d}`}
            data-shortcut={`${d}`}
            disabled={answered}
            className={[
              'option',
              answered && d === question.degree ? 'option--correct' : '',
              answered && d === picked && !correct ? 'option--wrong' : '',
            ].join(' ')}
            onClick={() => choose(d)}
          >
            {d}
          </button>
        ))}
      </div>
      {!answered && (
        <p className="keyboard-hint">{`Teclado: ${degrees.join(', ')} · R = ouvir de novo`}</p>
      )}
      {answered && (
        <>
          <p className="ear-detail">
            {`Tônica ${noteLabel(question.tonic, notation, accidentals)} · grau ${question.degree} = ${target}`}
          </p>
          <div className="feedback quiz-actions">
            <p role="status" className={correct ? undefined : 'sr-only'}>
              {correct ? 'Correto!' : `Errado. Era o grau ${question.degree}.`}
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
