import { useEffect, useMemo, useState } from 'react';
import { notePositions } from '../../domain/fretboard';
import {
  intervalAnswer,
  intervalById,
  intervalLink,
  intervalPitches,
  type IntervalItem,
} from '../../domain/intervals';
import { noteLabel, type NoteIndex } from '../../domain/notes';
import { useAppState } from '../../state/AppState';
import { useSound } from '../../audio/SoundProvider';
import type { Settings } from '../../state/storage';
import { Fretboard, type Mark } from '../Fretboard';
import { stringLabels } from '../stringLabels';
import { useAutoAdvance } from '../useAutoAdvance';

export interface IntervalQuizProps {
  item: IntervalItem;
  settings: Settings;
  onAnswer(correct: boolean): void;
  onNext(): void;
}

const NOTES: NoteIndex[] = Array.from({ length: 12 }, (_, i) => i);
const FRET_MIN = 0;
const FRET_MAX = 12;

export function IntervalQuiz({ item, settings, onAnswer, onNext }: IntervalQuizProps) {
  const { notation, leftHanded, intervalAdvance } = settings;
  const { instrument } = useAppState();
  const sound = useSound();
  const interval = intervalById(item.interval);
  const answer = intervalAnswer(item);
  const pitches = useMemo(
    () => intervalPitches(item.root, interval, instrument),
    [item.root, interval, instrument],
  );
  const link = useMemo(
    () => intervalLink(item.root, interval, instrument, FRET_MIN, FRET_MAX),
    [item.root, interval, instrument],
  );
  const [picked, setPicked] = useState<NoteIndex | null>(null);
  const answered = picked !== null;
  const correct = answered && picked === answer;

  const { preparePitches } = sound;
  useEffect(() => preparePitches(pitches), [preparePitches, pitches]);

  // Ao sair da pergunta, a nota de chegada pendente não deve soar depois.
  const { playPitches } = sound;
  useEffect(() => () => playPitches([]), [playPitches]);

  const delay = intervalAdvance === '3s' ? 3000 : intervalAdvance === '5s' ? 5000 : 0;
  useAutoAdvance(answered && delay > 0, onNext, delay);

  function choose(note: NoteIndex) {
    if (answered) return;
    setPicked(note);
    onAnswer(note === answer);
    sound.playPitches(pitches);
  }

  const marks: Mark[] = notePositions(item.root, instrument, FRET_MIN, FRET_MAX).map((position) => ({
    position,
    kind: 'target',
    label: noteLabel(item.root, notation),
  }));
  if (answered) {
    for (const position of notePositions(answer, instrument, FRET_MIN, FRET_MAX)) {
      marks.push({ position, kind: 'correct', label: noteLabel(answer, notation) });
    }
  }

  const rootText = noteLabel(item.root, notation);
  const answerText = noteLabel(answer, notation);
  return (
    <div className="quiz">
      <p className="prompt">Qual é a nota?</p>
      <p className="interval-equation">
        <span>{rootText}</span> + <span className="interval-equation__interval">{interval.label}</span>
        <small className="interval-equation__name">{interval.name}</small> →{' '}
        <strong>{answered ? answerText : '?'}</strong>
      </p>
      <Fretboard
        instrument={instrument}
        fit
        fretMin={FRET_MIN}
        fretMax={FRET_MAX}
        minFretWidth={26}
        leftHanded={leftHanded}
        stringLabels={stringLabels(instrument)}
        marks={marks}
        links={answered && link ? [link] : undefined}
      />
      <div className="note-grid">
        {NOTES.map((note) => (
          <button
            key={note}
            type="button"
            disabled={answered}
            className={[
              'note-option',
              answered && note === answer ? 'option--correct' : '',
              answered && note === picked && !correct ? 'option--wrong' : '',
            ].join(' ')}
            onClick={() => choose(note)}
          >
            {noteLabel(note, notation)}
          </button>
        ))}
      </div>
      {!answered && <p className="keyboard-hint">Teclado: A–G · Shift = ♯</p>}
      {answered && (
        <div className="feedback quiz-actions">
          <p role="status">
            {correct ? 'Correto!' : `Errou. ${rootText} + ${interval.label} = ${answerText}.`}
          </p>
          <button type="button" className="primary" onClick={onNext}>
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
