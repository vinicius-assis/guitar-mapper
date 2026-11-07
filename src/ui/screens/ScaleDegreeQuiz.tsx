import { useMemo, useState } from 'react';
import { useSound } from '../../audio/SoundProvider';
import { scaleDegreeTarget, type ScaleDegreeQuestion } from '../../domain/scaleItems';
import { SCALES, scaleBox } from '../../domain/scales';
import { useAppState } from '../../state/AppState';
import type { Settings } from '../../state/storage';
import { Fretboard, type Mark } from '../Fretboard';
import { ScaleLegend } from '../ScaleLegend';
import { scaleNoteName, scaleTitle } from '../scaleText';
import { stringLabels } from '../stringLabels';
import { useAutoAdvance } from '../useAutoAdvance';

interface Props {
  question: ScaleDegreeQuestion;
  settings: Settings;
  onAnswer(correct: boolean): void;
  onNext(): void;
}

export function ScaleDegreeQuiz({ question, settings, onAnswer, onNext }: Props) {
  const { notation, accidentals, leftHanded } = settings;
  const { scale, box, root } = question;
  const { instrument } = useAppState();
  const sound = useSound();
  const degrees = SCALES[scale].degrees;
  const shape = useMemo(() => scaleBox(scale, box, root, instrument), [scale, box, root, instrument]);
  const target = useMemo(() => scaleDegreeTarget(question, instrument), [question, instrument]);
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const correct = picked === target.degree;
  useAutoAdvance(correct, onNext);

  function choose(degree: number) {
    if (answered) return;
    setPicked(degree);
    onAnswer(degree === target.degree);
    sound.playPosition(target.position);
  }

  const marks: Mark[] = shape.notes.map((n) => {
    const isTarget = n.degree === target.degree && n.position.string === target.position.string;
    const label = answered ? degrees[n.degree] : undefined;
    if (answered && isTarget) return { position: n.position, kind: correct ? 'correct' : 'wrong', label };
    if (!answered && isTarget) return { position: n.position, kind: 'target' };
    return { position: n.position, kind: n.degree === 0 ? 'root' : 'scale', label };
  });

  const name = scaleNoteName(scale, root, target.degree, notation, accidentals);

  return (
    <div className="quiz">
      <p className="prompt">Qual grau é a nota destacada?</p>
      <p className="scale-title">{scaleTitle(scale, root, box, notation, accidentals)}</p>
      <Fretboard
        instrument={instrument}
        fit
        minFretWidth={40}
        fretMin={shape.fretMin}
        fretMax={shape.fretMax}
        leftHanded={leftHanded}
        marks={marks}
        stringLabels={stringLabels(instrument)}
      />
      <ScaleLegend target />
      <div className="answer-grid">
        {degrees.map((d, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Grau ${d}`}
            data-shortcut={`${i + 1}`}
            disabled={answered}
            className={[
              'option',
              answered && i === target.degree ? 'option--correct' : '',
              answered && i === picked && !correct ? 'option--wrong' : '',
            ].join(' ')}
            onClick={() => choose(i)}
          >
            {d}
          </button>
        ))}
      </div>
      {!answered && <p className="keyboard-hint">{`Teclado: 1–${degrees.length}`}</p>}
      {answered && (
        <div className="feedback quiz-actions">
          <p role="status">
            {correct
              ? `Correto! É o ${degrees[target.degree]} (${name}).`
              : `Errado. Era o ${degrees[target.degree]} (${name}).`}
          </p>
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
