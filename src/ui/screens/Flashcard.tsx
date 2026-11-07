import { useState } from 'react';
import { noteAt } from '../../domain/fretboard';
import { noteLabel } from '../../domain/notes';
import { useAppState } from '../../state/AppState';
import { useSound } from '../../audio/SoundProvider';
import { useBreakpoint } from '../useBreakpoint';
import { Fretboard } from '../Fretboard';
import { stringLabels } from '../stringLabels';
import type { QuizProps } from './ChoiceQuiz';
import { windowFor } from './window';

export function Flashcard({ position, settings, onAnswer, onNext }: QuizProps) {
  const { filter, notation, accidentals, leftHanded } = settings;
  const { instrument } = useAppState();
  const sound = useSound();
  const breakpoint = useBreakpoint();
  const fit = breakpoint !== 'mobile';
  const expand = breakpoint === 'desktop';
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
        instrument={instrument}
        fit={fit}
        expand={expand}
        fretMin={fretMin}
        fretMax={fretMax}
        leftHanded={leftHanded}
        scrollToFret={position.fret}
        stringLabels={stringLabels(instrument)}
        marks={[
          {
            position,
            kind: 'target',
            label: revealed ? noteLabel(noteAt(position, instrument), notation, accidentals) : undefined,
          },
        ]}
      />
      {revealed ? (
        <div className="options options--two quiz-actions">
          <button type="button" className="option option--wrong" onClick={() => grade(false)}>
            Errei
          </button>
          <button type="button" className="option option--correct" onClick={() => grade(true)}>
            Acertei
          </button>
        </div>
      ) : (
        <div className="quiz-actions">
          <button
            type="button"
            className="primary"
            onClick={() => {
              setRevealed(true);
              sound.playPosition(position);
            }}
          >
            Mostrar nota
          </button>
        </div>
      )}
    </div>
  );
}
