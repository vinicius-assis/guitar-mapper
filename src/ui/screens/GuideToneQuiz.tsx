import { useEffect, useMemo, useState } from 'react';
import { useSound } from '../../audio/SoundProvider';
import type { ChordItem } from '../../domain/chordItems';
import { chordVoicing, voicingPitches } from '../../domain/chords';
import { noteAt, positionKey, type Position } from '../../domain/fretboard';
import { classifyGuideTap, guideNotes, guideWindow } from '../../domain/guideTones';
import { GUITAR } from '../../domain/instruments';
import { noteLabel } from '../../domain/notes';
import { pitchOf } from '../../domain/pitch';
import type { Settings } from '../../state/storage';
import { chordSymbol, chordTitle, chordToneNames, shapeName } from '../chordText';
import { Fretboard, type Mark } from '../Fretboard';
import { GuideLegend } from '../GuideLegend';
import { functionName, guideNames } from '../m7Text';
import { stringLabels } from '../stringLabels';
import { useAutoAdvance } from '../useAutoAdvance';

interface Props {
  question: ChordItem;
  settings: Settings;
  onAnswer(correct: boolean): void;
  onNext(): void;
}

export function GuideToneQuiz({ question, settings, onAnswer, onNext }: Props) {
  const { notation, accidentals, leftHanded } = settings;
  const { playPitches } = useSound();
  const v = useMemo(() => chordVoicing(question.shape, question.root), [question.shape, question.root]);
  const guides = useMemo(() => guideNotes(v), [v]);
  const window = guideWindow(v);
  const [found, setFound] = useState<ReadonlySet<string>>(new Set());
  const [wrong, setWrong] = useState<Position | null>(null);
  const [done, setDone] = useState(false);
  const correct = done && wrong === null;
  useAutoAdvance(correct, onNext);
  useEffect(() => () => playPitches([]), [playPitches]);

  const strum = () => playPitches(voicingPitches(v), 40);

  function tap(p: Position) {
    if (done) return;
    const key = positionKey(p);
    const kind = classifyGuideTap(v, p);
    if (kind === 'guide') {
      const next = new Set(found).add(key);
      if (found.has(key) || next.size < guides.length) {
        setFound(next);
        playPitches([pitchOf(p, GUITAR)]);
        return;
      }
      setFound(next);
      setDone(true);
      onAnswer(true);
      strum();
      return;
    }
    if (kind === 'outside') {
      playPitches([pitchOf(p, GUITAR)]);
      return;
    }
    setWrong(p);
    setDone(true);
    onAnswer(false);
    strum();
  }

  const wrongKey = wrong ? positionKey(wrong) : null;
  const guideKeys = new Set(guides.map((n) => positionKey(n.position)));
  const marks: Mark[] = v.notes.map((n) => {
    const key = positionKey(n.position);
    if (!done) return { position: n.position, kind: found.has(key) ? 'guide' : 'chord' };
    const kind = key === wrongKey ? 'wrong' : n.isRoot ? 'root' : guideKeys.has(key) ? (found.has(key) ? 'guide' : 'hint') : 'chord';
    return { position: n.position, kind, label: n.func };
  });
  const remaining = guides.length - found.size;
  const symbol = chordSymbol({ root: v.root, quality: v.quality }, notation, accidentals);
  const wrongNote = wrongKey === null ? undefined : v.notes.find((n) => positionKey(n.position) === wrongKey);

  return (
    <div className="quiz">
      <p className="prompt">Toque as notas-guia</p>
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
        fretMin={window.fretMin}
        fretMax={window.fretMax}
        leftHanded={leftHanded}
        marks={marks}
        stringMarks={v.stringMarks.map((m) => (m === 'open' ? null : m))}
        barres={v.barre ? [v.barre] : []}
        stringLabels={stringLabels(GUITAR)}
        onTap={done ? undefined : tap}
      />
      <GuideLegend />
      {done && (
        <div className="feedback quiz-actions">
          <p role="status">
            {correct
              ? `Correto! As notas-guia de ${symbol} são ${guideNames(v, notation, accidentals)}.`
              : `Errado. ${noteLabel(noteAt(wrong as Position, GUITAR), notation, accidentals)} é ${functionName((wrongNote as { func: string }).func)} de ${symbol}, não nota-guia.`}
          </p>
          <p className="ear-detail">
            {`${symbol}: ${chordToneNames({ root: v.root, quality: v.quality }, notation, accidentals)} · ${shapeName(v.shape, notation)}`}
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
