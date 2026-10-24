import { useEffect, useMemo, useState } from 'react';
import { useSound } from '../../audio/SoundProvider';
import { noteLabel, type NoteIndex } from '../../domain/notes';
import { buildEarQuestion } from '../../domain/quiz';
import { Fretboard } from '../Fretboard';
import { stringLabels } from '../stringLabels';
import { useAutoAdvance } from '../useAutoAdvance';
import type { QuizProps } from './ChoiceQuiz';
import { windowFor } from './window';

export function EarQuiz({ position, settings, onAnswer, onNext }: QuizProps) {
  const { filter, notation, leftHanded, earLevel } = settings;
  const sound = useSound();
  const question = useMemo(
    () => buildEarQuestion(position, earLevel, filter.naturalsOnly, Math.random),
    [position, earLevel, filter.naturalsOnly],
  );
  const [picked, setPicked] = useState<NoteIndex | null>(null);
  const answered = picked !== null;
  const correct = answered && picked === question.answer;
  useAutoAdvance(correct, onNext);

  // O som é a pergunta: toca sozinho quando ela aparece.
  useEffect(() => {
    sound.playPosition(position);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function choose(note: NoteIndex) {
    if (answered) return;
    setPicked(note);
    onAnswer(note === question.answer);
  }

  const { fretMin, fretMax } = windowFor(filter, position);
  return (
    <div className="quiz">
      <p className="prompt">Qual nota você ouviu?</p>
      <button type="button" className="ear-play" onClick={() => sound.playPosition(position)}>
        <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false">
          <path
            d="M3 9v6h4l5 4V5L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"
            fill="currentColor"
          />
        </svg>
        Ouvir de novo
      </button>
      <div className={`options${question.options.length > 4 ? ' options--many' : ''}`}>
        {question.options.map((note) => (
          <button
            key={note}
            type="button"
            disabled={answered}
            className={[
              'option',
              answered && note === question.answer ? 'option--correct' : '',
              answered && note === picked && !correct ? 'option--wrong' : '',
            ].join(' ')}
            onClick={() => choose(note)}
          >
            {noteLabel(note, notation)}
          </button>
        ))}
      </div>
      {answered && (
        <>
          <Fretboard
            fretMin={fretMin}
            fretMax={fretMax}
            leftHanded={leftHanded}
            scrollToFret={position.fret}
            stringLabels={stringLabels()}
            marks={[
              {
                position,
                kind: correct ? 'correct' : 'wrong',
                label: noteLabel(question.answer, notation),
              },
            ]}
          />
          <div className="feedback quiz-actions">
            <p role="status" className={correct ? undefined : 'sr-only'}>
              {correct
                ? 'Correto!'
                : `Errado. A resposta certa é ${noteLabel(question.answer, notation)}.`}
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
