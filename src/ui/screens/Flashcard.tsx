import { useState } from 'react';
import { noteAt } from '../../domain/fretboard';
import { noteLabel } from '../../domain/notes';
import { Fretboard } from '../Fretboard';
import { stringLabels } from '../stringLabels';
import type { QuizProps } from './ChoiceQuiz';
import { windowFor } from './window';

export function Flashcard({ position, settings, onAnswer, onNext }: QuizProps) {
  const { filter, notation, leftHanded } = settings;
  const [revealed, setRevealed] = useState(false);
  const { fretMin, fretMax } = windowFor(filter, position);

  function grade(correct: boolean) {
    onAnswer(correct);
    onNext();
  }

  return (
    <div className="quiz">
      <p className="prompt">Qual é esta nota?</p>
      <Fretboard
        fretMin={fretMin}
        fretMax={fretMax}
        leftHanded={leftHanded}
        scrollToFret={position.fret}
        stringLabels={stringLabels()}
        marks={[
          {
            position,
            kind: 'target',
            label: revealed ? noteLabel(noteAt(position), notation) : undefined,
          },
        ]}
      />
      {revealed ? (
        <div className="options options--two">
          <button type="button" className="option option--wrong" onClick={() => grade(false)}>
            Errei
          </button>
          <button type="button" className="option option--correct" onClick={() => grade(true)}>
            Acertei
          </button>
        </div>
      ) : (
        <button type="button" className="primary" onClick={() => setRevealed(true)}>
          Mostrar nota
        </button>
      )}
    </div>
  );
}
