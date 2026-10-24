import { useMemo, useState } from 'react';
import type { Position } from '../../domain/fretboard';
import { noteLabel, type NoteIndex } from '../../domain/notes';
import { buildChoiceQuestion } from '../../domain/quiz';
import type { Settings } from '../../state/storage';
import { Fretboard } from '../Fretboard';
import { stringLabels } from '../stringLabels';
import { useAutoAdvance } from '../useAutoAdvance';
import { windowFor } from './window';

export interface QuizProps {
  position: Position;
  settings: Settings;
  onAnswer(correct: boolean): void;
  onNext(): void;
}

export function ChoiceQuiz({ position, settings, onAnswer, onNext }: QuizProps) {
  const { filter, notation, leftHanded } = settings;
  const question = useMemo(
    () => buildChoiceQuestion(position, filter.naturalsOnly, Math.random),
    [position, filter.naturalsOnly],
  );
  const [picked, setPicked] = useState<NoteIndex | null>(null);
  const answered = picked !== null;
  const correct = answered && picked === question.answer;
  useAutoAdvance(correct, onNext);

  function choose(note: NoteIndex) {
    if (answered) return;
    setPicked(note);
    onAnswer(note === question.answer);
  }

  const { fretMin, fretMax } = windowFor(filter, position);
  return (
    <div className="quiz">
      <p className="prompt">Qual é esta nota?</p>
      <Fretboard
        fretMin={fretMin}
        fretMax={fretMax}
        leftHanded={leftHanded}
        scrollToFret={position.fret}
        stringLabels={stringLabels(notation)}
        marks={[
          {
            position,
            kind: !answered ? 'target' : correct ? 'correct' : 'wrong',
            label: answered ? noteLabel(question.answer, notation) : undefined,
          },
        ]}
      />
      <div className="options">
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
        <div className="feedback" role="status">
          <p>{correct ? 'Correto!' : `Era ${noteLabel(question.answer, notation)}`}</p>
          {!correct && (
            <button type="button" className="primary" onClick={onNext}>
              Próxima
            </button>
          )}
        </div>
      )}
    </div>
  );
}
