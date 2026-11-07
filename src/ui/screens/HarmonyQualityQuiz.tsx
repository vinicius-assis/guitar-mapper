import { useEffect, useState } from 'react';
import { useSound } from '../../audio/SoundProvider';
import {
  SEVENTH_QUALITIES,
  TRIAD_QUALITIES,
  chordPitches,
  degreeQuality,
  romanNumeral,
  type ChordQuality,
} from '../../domain/harmony';
import type { QualityQuestion } from '../../domain/harmonyItems';
import { useAppState } from '../../state/AppState';
import type { Settings } from '../../state/storage';
import { QUALITY_TEXT, chordDetail, chordName, keyName } from '../harmonyText';
import { useAutoAdvance } from '../useAutoAdvance';

interface Props {
  question: QualityQuestion;
  settings: Settings;
  onAnswer(correct: boolean): void;
  onNext(): void;
}

export function HarmonyQualityQuiz({ question, settings, onAnswer, onNext }: Props) {
  const { notation, accidentals } = settings;
  const { field, key, degree, sevenths } = question;
  const { instrument } = useAppState();
  const { playPitches } = useSound();
  useEffect(() => () => playPitches([]), [playPitches]);
  const [picked, setPicked] = useState<ChordQuality | null>(null);
  const answered = picked !== null;
  const answer = degreeQuality(field, degree, sevenths);
  const correct = picked === answer;
  useAutoAdvance(correct, onNext);

  const options = sevenths ? SEVENTH_QUALITIES : TRIAD_QUALITIES;
  const roman = romanNumeral(field, degree);
  const tonality = keyName(field, key, notation, accidentals);
  const chord = chordName(field, key, degree, sevenths, notation, accidentals);

  function choose(q: ChordQuality) {
    if (answered) return;
    setPicked(q);
    onAnswer(q === answer);
    playPitches(chordPitches(field, key, degree, sevenths, instrument), 150);
  }

  return (
    <div className="quiz">
      <p className="prompt">{`Como é o acorde do ${roman} de ${tonality}?`}</p>
      <div className="answer-grid answer-grid--words">
        {options.map((q, i) => {
          const { label, name } = QUALITY_TEXT[q];
          return (
            <button
              key={q}
              type="button"
              data-shortcut={`${i + 1}`}
              aria-label={sevenths ? `${label}, ${name}` : label}
              disabled={answered}
              className={[
                'option',
                answered && q === answer ? 'option--correct' : '',
                answered && q === picked && !correct ? 'option--wrong' : '',
              ].join(' ')}
              onClick={() => choose(q)}
            >
              {label}
              {sevenths && <small className="option__name">{name}</small>}
            </button>
          );
        })}
      </div>
      {!answered && <p className="keyboard-hint">{`Teclado: 1–${options.length}`}</p>}
      {answered && (
        <div className="feedback quiz-actions">
          <p role="status">
            {`${correct ? 'Correto!' : 'Errado.'} O ${roman} de ${tonality} é ${chord} (${QUALITY_TEXT[answer].name}).`}
          </p>
          <p className="ear-detail">
            {chordDetail(field, key, degree, sevenths, notation, accidentals)}
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
