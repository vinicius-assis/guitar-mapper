import { useEffect, useState } from 'react';
import { useSound } from '../../audio/SoundProvider';
import { chordPitches, chordRootClass, keySpelling, romanNumeral, spellChord } from '../../domain/harmony';
import type { HarmonyItem } from '../../domain/harmonyItems';
import { noteLabel } from '../../domain/notes';
import { SCALES } from '../../domain/scales';
import { spellingLabel } from '../../domain/spelling';
import { useAppState } from '../../state/AppState';
import type { Settings } from '../../state/storage';
import { chordDetail, keyName, phrase } from '../harmonyText';
import { useAutoAdvance } from '../useAutoAdvance';

interface Props {
  item: HarmonyItem;
  settings: Settings;
  onAnswer(correct: boolean): void;
  onNext(): void;
}

const NOTES = Array.from({ length: 12 }, (_, i) => i);

export function HarmonyChordQuiz({ item, settings, onAnswer, onNext }: Props) {
  const { notation, accidentals, harmonySevenths } = settings;
  const { field, key, degree } = item;
  const { instrument } = useAppState();
  const sound = useSound();
  const { playPitches } = sound;
  useEffect(() => () => playPitches([]), [playPitches]);
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const answer = chordRootClass(field, key, degree);
  const correct = picked === answer;
  useAutoAdvance(correct, onNext);

  const names = keySpelling(field, key, accidentals);
  const labelOf = (pc: number) => {
    const i = SCALES[field].semitones.findIndex((st) => (key + st) % 12 === pc);
    return i >= 0 ? spellingLabel(names[i], notation) : noteLabel(pc, notation, accidentals);
  };
  const roman = romanNumeral(field, degree);
  const tonality = keyName(field, key, notation, accidentals);
  const root = spellChord(field, key, degree, harmonySevenths, accidentals).root;

  function choose(pc: number) {
    if (answered) return;
    setPicked(pc);
    onAnswer(pc === answer);
    playPitches(chordPitches(field, key, degree, harmonySevenths, instrument), 150);
  }

  return (
    <div className="quiz">
      <p className="prompt">{`Qual é o ${roman} de ${tonality}?`}</p>
      <div className="note-grid">
        {NOTES.map((pc) => (
          <button
            key={pc}
            type="button"
            disabled={answered}
            className={[
              'note-option',
              answered && pc === answer ? 'option--correct' : '',
              answered && pc === picked && !correct ? 'option--wrong' : '',
            ].join(' ')}
            onClick={() => choose(pc)}
          >
            {labelOf(pc)}
          </button>
        ))}
      </div>
      {!answered && <p className="keyboard-hint">Teclado: A–G · Shift = ♯</p>}
      {answered && (
        <div className="feedback quiz-actions">
          <p role="status">
            {`${correct ? 'Correto!' : 'Errado.'} O ${roman} de ${tonality} é ${phrase(root, notation)}.`}
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
