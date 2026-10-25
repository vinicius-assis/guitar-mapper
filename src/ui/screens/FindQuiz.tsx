import { useMemo, useState } from 'react';
import { positionsOfNote, type Position } from '../../domain/fretboard';
import { noteLabel } from '../../domain/notes';
import { buildFindQuestion, isCorrectFind } from '../../domain/quiz';
import { useSound } from '../../audio/SoundProvider';
import { useBreakpoint } from '../useBreakpoint';
import { Fretboard, type Mark } from '../Fretboard';
import { stringLabels } from '../stringLabels';
import { useAutoAdvance } from '../useAutoAdvance';
import type { QuizProps } from './ChoiceQuiz';
import { windowFor } from './window';

export function FindQuiz({ position, settings, onAnswer, onNext }: QuizProps) {
  const { filter, notation, leftHanded } = settings;
  const sound = useSound();
  const breakpoint = useBreakpoint();
  const fit = breakpoint !== 'mobile';
  const expand = breakpoint === 'desktop';
  const question = useMemo(() => buildFindQuestion(position, filter), [position, filter]);
  const [tapped, setTapped] = useState<Position | null>(null);
  const correct = tapped !== null && isCorrectFind(question, tapped);
  useAutoAdvance(correct, onNext);

  const { fretMin, fretMax } = windowFor(filter, position);

  function tap(p: Position) {
    if (tapped) return;
    setTapped(p);
    onAnswer(isCorrectFind(question, p));
    sound.playPosition(p);
  }

  const marks: Mark[] = [];
  if (tapped) {
    marks.push({ position: tapped, kind: correct ? 'correct' : 'wrong' });
    if (!correct) {
      for (const p of question.validPositions) marks.push({ position: p, kind: 'correct' });
      const everywhere = positionsOfNote(question.target, {
        strings: [1, 2, 3, 4, 5, 6],
        fretMin,
        fretMax,
        naturalsOnly: false,
      });
      for (const p of everywhere) {
        if (p.string !== question.string) marks.push({ position: p, kind: 'hint' });
      }
    }
  }

  return (
    <div className="quiz">
      <p className="prompt">
        Encontre {noteLabel(question.target, notation)} na corda {question.string}
      </p>
      <Fretboard
        fit={fit}
        expand={expand}
        fretMin={fretMin}
        fretMax={fretMax}
        leftHanded={leftHanded}
        // Não rolar até a resposta: isso a entregaria. Canhoto começa no lado da pestana (fretMin).
        scrollToFret={leftHanded ? fretMin : undefined}
        marks={marks}
        stringLabels={stringLabels()}
        onTap={tapped ? undefined : tap}
      />
      {tapped && (
        <div className="feedback quiz-actions" role="status">
          <p>{correct ? 'Correto!' : `Errou. ${noteLabel(question.target, notation)} está marcada no braço.`}</p>
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
