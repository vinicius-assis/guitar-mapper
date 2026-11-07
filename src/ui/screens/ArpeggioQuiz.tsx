import { useEffect, useMemo, useState } from 'react';
import { useSound } from '../../audio/SoundProvider';
import { arpeggioOf, isArpeggioTap } from '../../domain/arpeggio';
import { noteAt, positionKey, type Position } from '../../domain/fretboard';
import { noteLabel } from '../../domain/notes';
import { pitchOf } from '../../domain/pitch';
import type { ScalePlayItem } from '../../domain/scaleItems';
import { SCALES } from '../../domain/scales';
import { useAppState } from '../../state/AppState';
import type { Settings } from '../../state/storage';
import { ArpeggioLegend } from '../ArpeggioLegend';
import { Fretboard, type Mark } from '../Fretboard';
import { arpeggioSymbol, arpeggioTitle, arpeggioToneNames } from '../m7Text';
import { stringLabels } from '../stringLabels';
import { useAutoAdvance } from '../useAutoAdvance';

interface Props {
  question: ScalePlayItem;
  settings: Settings;
  onAnswer(correct: boolean): void;
  onNext(): void;
}

export function ArpeggioQuiz({ question, settings, onAnswer, onNext }: Props) {
  const { notation, accidentals, leftHanded } = settings;
  const { scale, box, root } = question;
  const { instrument } = useAppState();
  const sound = useSound();
  const { playPitches } = sound;
  const degrees = SCALES[scale].degrees;
  const a = useMemo(() => arpeggioOf(scale, box, root, instrument), [scale, box, root, instrument]);

  const [found, setFound] = useState<ReadonlySet<number>>(a.rootPitches);
  const [played, setPlayed] = useState<Position[]>([]);
  const [wrong, setWrong] = useState<Position | null>(null);
  const [done, setDone] = useState(false);
  const correct = done && wrong === null;
  useAutoAdvance(correct, onNext);
  useEffect(() => () => playPitches([]), [playPitches]);

  const finish = () => playPitches([...a.pitches].sort((x, y) => x - y), 150);

  function tap(p: Position) {
    if (done) return;
    sound.playPosition(p);
    if (!isArpeggioTap(a, p, instrument)) {
      setWrong(p);
      setDone(true);
      onAnswer(false);
      finish();
      return;
    }
    setPlayed((prev) => [...prev, p]);
    const pitch = pitchOf(p, instrument);
    if (found.has(pitch)) return;
    const next = new Set(found).add(pitch);
    setFound(next);
    if (next.size === a.pitches.size) {
      setDone(true);
      onAnswer(true);
      finish();
    }
  }

  const remaining = a.pitches.size - found.size;
  const marks: Mark[] = [];
  if (!done) {
    for (const n of a.notes) if (a.rootPitches.has(n.pitch)) marks.push({ position: n.position, kind: 'root' });
    for (const p of played) {
      if (!marks.some((m) => positionKey(m.position) === positionKey(p))) marks.push({ position: p, kind: 'chord' });
    }
  } else {
    for (const n of a.box.notes) {
      const label = degrees[n.degree];
      if (!a.pitches.has(n.pitch)) marks.push({ position: n.position, kind: 'scale', label });
      else if (a.rootPitches.has(n.pitch)) marks.push({ position: n.position, kind: 'root', label });
      else marks.push({ position: n.position, kind: found.has(n.pitch) ? 'chord' : 'hint', label });
    }
    if (wrong) {
      const key = positionKey(wrong);
      const at = marks.findIndex((m) => positionKey(m.position) === key);
      const label = at >= 0 ? marks[at].label : undefined;
      if (at >= 0) marks.splice(at, 1);
      marks.push({ position: wrong, kind: 'wrong', label });
    }
  }
  const symbol = arpeggioSymbol(scale, root, notation, accidentals);

  return (
    <div className="quiz">
      <p className="prompt">Toque o arpejo</p>
      <p className="scale-title">{arpeggioTitle(question, notation, accidentals)}</p>
      {!done && (
        <p className="scale-remaining" aria-live="polite">
          {`Faltam ${remaining} ${remaining === 1 ? 'nota' : 'notas'}`}
        </p>
      )}
      <Fretboard
        instrument={instrument}
        fit
        minFretWidth={40}
        fretMin={a.box.fretMin}
        fretMax={a.box.fretMax}
        leftHanded={leftHanded}
        marks={marks}
        stringLabels={stringLabels(instrument)}
        onTap={done ? undefined : tap}
      />
      <ArpeggioLegend />
      {done && (
        <div className="feedback quiz-actions">
          <p role="status">
            {correct
              ? 'Correto! Arpejo completo.'
              : `Errado. ${noteLabel(noteAt(wrong as Position, instrument), notation, accidentals)} não está em ${symbol}.`}
          </p>
          <p className="ear-detail">{`${symbol}: ${arpeggioToneNames(scale, root, notation, accidentals)}`}</p>
          <button type="button" className="ear-play" onClick={finish}>
            Ouvir o arpejo
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
