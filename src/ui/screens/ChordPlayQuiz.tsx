import { useEffect, useMemo, useState } from 'react';
import { useSound } from '../../audio/SoundProvider';
import type { ChordItem } from '../../domain/chordItems';
import { chordSemitones, chordVoicing, voicingPitches } from '../../domain/chords';
import { noteAt, positionKey, type Position } from '../../domain/fretboard';
import { GUITAR } from '../../domain/instruments';
import { noteLabel } from '../../domain/notes';
import { pitchOf } from '../../domain/pitch';
import type { Settings } from '../../state/storage';
import { chordSymbol, chordTitle } from '../chordText';
import { ChordLegend } from '../ChordLegend';
import { Fretboard, type Mark } from '../Fretboard';
import { stringLabels } from '../stringLabels';
import { useAutoAdvance } from '../useAutoAdvance';

interface Props {
  question: ChordItem;
  settings: Settings;
  onAnswer(correct: boolean): void;
  onNext(): void;
}

const NO_MARKS: ('open' | 'muted' | null)[] = [null, null, null, null, null, null];

export function ChordPlayQuiz({ question, settings, onAnswer, onNext }: Props) {
  const { notation, accidentals, leftHanded } = settings;
  const { playPitches } = useSound();
  const v = useMemo(() => chordVoicing(question.shape, question.root), [question.shape, question.root]);
  const [found, setFound] = useState<ReadonlySet<string>>(new Set());
  const [wrong, setWrong] = useState<Position | null>(null);
  const [done, setDone] = useState(false);
  const correct = done && wrong === null;
  useAutoAdvance(correct, onNext);
  useEffect(() => () => playPitches([]), [playPitches]);

  const strum = () => playPitches(voicingPitches(v), 40);
  const shapeKeys = useMemo(() => new Set(v.fretted.map((n) => positionKey(n.position))), [v]);
  const tones = chordSemitones(v.quality);

  function tap(p: Position) {
    if (done) return;
    const key = positionKey(p);
    if (shapeKeys.has(key)) {
      if (found.has(key)) {
        playPitches([pitchOf(p, GUITAR)]);
        return;
      }
      const next = new Set(found).add(key);
      setFound(next);
      if (next.size === shapeKeys.size) {
        setDone(true);
        onAnswer(true);
        strum();
      } else {
        playPitches([pitchOf(p, GUITAR)]);
      }
      return;
    }
    if (tones.includes((((pitchOf(p, GUITAR) - v.root) % 12) + 12) % 12)) {
      playPitches([pitchOf(p, GUITAR)]);
      return;
    }
    setWrong(p);
    setDone(true);
    onAnswer(false);
    strum();
  }

  const remaining = shapeKeys.size - found.size;
  const marks: Mark[] = [];
  for (const n of v.fretted) {
    const isFound = found.has(positionKey(n.position));
    if (!done) {
      if (isFound) marks.push({ position: n.position, kind: 'chord' });
    } else {
      const kind = !isFound ? 'hint' : n.isRoot ? 'root' : 'chord';
      marks.push({ position: n.position, kind, label: n.func });
    }
  }
  if (done && wrong) marks.push({ position: wrong, kind: 'wrong' });
  const symbol = chordSymbol({ root: v.root, quality: v.quality }, notation, accidentals);

  return (
    <div className="quiz">
      <p className="prompt">Monte o acorde</p>
      <p className="scale-title">{chordTitle(question, notation, accidentals)}</p>
      {!done && (
        <p className="scale-remaining" aria-live="polite">
          {`Faltam ${remaining} ${remaining === 1 ? 'nota' : 'notas'}`}
        </p>
      )}
      <Fretboard
        instrument={GUITAR}
        fit
        minFretWidth={40}
        fretMin={v.fretMin}
        fretMax={v.fretMax}
        leftHanded={leftHanded}
        marks={marks}
        stringMarks={done ? v.stringMarks : NO_MARKS}
        barres={done && v.barre ? [v.barre] : []}
        stringLabels={stringLabels(GUITAR)}
        onTap={done ? undefined : tap}
      />
      <ChordLegend />
      {done && (
        <div className="feedback quiz-actions">
          <p role="status">
            {correct
              ? `Correto! ${symbol} montado.`
              : `Errado. ${noteLabel(noteAt(wrong as Position, GUITAR), notation, accidentals)} não está em ${symbol}.`}
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
