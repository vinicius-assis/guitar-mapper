import { useEffect, useState } from 'react';
import { useSound } from '../../audio/SoundProvider';
import { chordPitches, degreeNumeral, romanNumeral } from '../../domain/harmony';
import type { HarmonyItem } from '../../domain/harmonyItems';
import { useAppState } from '../../state/AppState';
import type { Settings } from '../../state/storage';
import { chordDetail, chordName, keyName } from '../harmonyText';
import { useAutoAdvance } from '../useAutoAdvance';

interface Props {
  item: HarmonyItem;
  settings: Settings;
  onAnswer(correct: boolean): void;
  onNext(): void;
}

const DEGREES = [1, 2, 3, 4, 5, 6, 7];

export function HarmonyDegreeQuiz({ item, settings, onAnswer, onNext }: Props) {
  const { notation, accidentals, harmonySevenths } = settings;
  const { field, key, degree } = item;
  const { instrument } = useAppState();
  const { playPitches } = useSound();
  useEffect(() => () => playPitches([]), [playPitches]);
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const correct = picked === degree;
  useAutoAdvance(correct, onNext);

  const chord = chordName(field, key, degree, harmonySevenths, notation, accidentals);
  const tonality = keyName(field, key, notation, accidentals);

  function choose(d: number) {
    if (answered) return;
    setPicked(d);
    onAnswer(d === degree);
    playPitches(chordPitches(field, key, degree, harmonySevenths, instrument), 150);
  }

  return (
    <div className="quiz">
      <p className="prompt">{`Que grau é ${chord} em ${tonality}?`}</p>
      <div className="answer-grid">
        {DEGREES.map((d, i) => (
          <button
            key={d}
            type="button"
            data-shortcut={`${i + 1}`}
            aria-label={`Grau ${romanNumeral(field, d)}`}
            disabled={answered}
            className={[
              'option',
              answered && d === degree ? 'option--correct' : '',
              answered && d === picked && !correct ? 'option--wrong' : '',
            ].join(' ')}
            onClick={() => choose(d)}
          >
            {romanNumeral(field, d)}
          </button>
        ))}
      </div>
      {!answered && <p className="keyboard-hint">Teclado: 1–7</p>}
      {answered && (
        <div className="feedback quiz-actions">
          <p role="status">
            {`${correct ? 'Correto!' : 'Errado.'} ${chord} é o ${degreeNumeral(field, degree, harmonySevenths)} de ${tonality}.`}
          </p>
          <p className="ear-detail">
            {chordDetail(field, key, degree, harmonySevenths, notation, accidentals)}
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
