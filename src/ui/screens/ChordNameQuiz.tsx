import { useEffect, useMemo, useState } from 'react';
import { useSound } from '../../audio/SoundProvider';
import type { ChordName, ChordNameQuestion } from '../../domain/chordItems';
import { chordVoicing, voicingPitches } from '../../domain/chords';
import { GUITAR } from '../../domain/instruments';
import type { Settings } from '../../state/storage';
import { chordSymbol, chordToneNames, shapeName } from '../chordText';
import { ChordLegend } from '../ChordLegend';
import { Fretboard, type Mark } from '../Fretboard';
import { stringLabels } from '../stringLabels';
import { useAutoAdvance } from '../useAutoAdvance';

interface Props {
  question: ChordNameQuestion;
  settings: Settings;
  onAnswer(correct: boolean): void;
  onNext(): void;
}

export function ChordNameQuiz({ question, settings, onAnswer, onNext }: Props) {
  const { notation, accidentals, leftHanded } = settings;
  const { shape, root, options } = question;
  const { playPitches } = useSound();
  const v = useMemo(() => chordVoicing(shape, root), [shape, root]);
  const answer: ChordName = { root: v.root, quality: v.quality };
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const isRight = (o: ChordName) => o.root === answer.root && o.quality === answer.quality;
  const correct = answered && isRight(options[picked]);
  useAutoAdvance(correct, onNext);
  useEffect(() => () => playPitches([]), [playPitches]);

  const strum = () => playPitches(voicingPitches(v), 40);
  function choose(i: number) {
    if (answered) return;
    setPicked(i);
    onAnswer(isRight(options[i]));
    strum();
  }

  const marks: Mark[] = v.fretted.map((n) =>
    answered
      ? { position: n.position, kind: n.isRoot ? 'root' : 'chord', label: n.func }
      : { position: n.position, kind: 'chord' },
  );
  const symbol = chordSymbol(answer, notation, accidentals);

  return (
    <div className="quiz">
      <p className="prompt">Qual é este acorde?</p>
      <Fretboard
        instrument={GUITAR}
        fit
        minFretWidth={40}
        fretMin={v.fretMin}
        fretMax={v.fretMax}
        leftHanded={leftHanded}
        marks={marks}
        stringMarks={v.stringMarks}
        barres={v.barre ? [v.barre] : []}
        stringLabels={stringLabels(GUITAR)}
      />
      <ChordLegend />
      <div className="answer-grid answer-grid--words">
        {options.map((o, i) => (
          <button
            key={`${o.root}-${o.quality}`}
            type="button"
            data-shortcut={`${i + 1}`}
            disabled={answered}
            className={[
              'option',
              answered && isRight(o) ? 'option--correct' : '',
              answered && i === picked && !correct ? 'option--wrong' : '',
            ].join(' ')}
            onClick={() => choose(i)}
          >
            {chordSymbol(o, notation, accidentals)}
          </button>
        ))}
      </div>
      {!answered && <p className="keyboard-hint">Teclado: 1–4</p>}
      {answered && (
        <div className="feedback quiz-actions">
          <p role="status">{`${correct ? 'Correto!' : 'Errado.'} É ${symbol}.`}</p>
          <p className="ear-detail">
            {`${symbol}: ${chordToneNames(answer, notation, accidentals)} · ${shapeName(shape, notation)}`}
          </p>
          <button type="button" className="ear-play" onClick={strum}>
            Ouvir o acorde
          </button>
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
