import { useMemo, useState } from 'react';
import { useSound } from '../../audio/SoundProvider';
import { noteAt, positionKey, type Position } from '../../domain/fretboard';
import { pitchOf } from '../../domain/pitch';
import type { ScalePlayItem } from '../../domain/scaleItems';
import { noteLabel } from '../../domain/notes';
import { SCALES, scaleBox, scaleDegreeOf } from '../../domain/scales';
import { useAppState } from '../../state/AppState';
import type { Settings } from '../../state/storage';
import { Fretboard, type Mark } from '../Fretboard';
import { ScaleLegend } from '../ScaleLegend';
import { scaleTitle } from '../scaleText';
import { stringLabels } from '../stringLabels';
import { useAutoAdvance } from '../useAutoAdvance';
import { useBreakpoint } from '../useBreakpoint';

interface Props {
  question: ScalePlayItem;
  settings: Settings;
  onAnswer(correct: boolean): void;
  onNext(): void;
}

export function ScalePlayQuiz({ question, settings, onAnswer, onNext }: Props) {
  const { notation, accidentals, leftHanded } = settings;
  const { scale, box, root } = question;
  const { instrument } = useAppState();
  const sound = useSound();
  const fit = useBreakpoint() !== 'mobile';
  const degrees = SCALES[scale].degrees;
  const shape = useMemo(() => scaleBox(scale, box, root, instrument), [scale, box, root, instrument]);
  const allPitches = useMemo(() => new Set(shape.notes.map((n) => n.pitch)), [shape]);
  const rootPitches = useMemo(
    () => new Set(shape.notes.filter((n) => n.degree === 0).map((n) => n.pitch)),
    [shape],
  );

  const [found, setFound] = useState<ReadonlySet<number>>(rootPitches);
  const [played, setPlayed] = useState<Position[]>([]);
  const [wrong, setWrong] = useState<Position | null>(null);
  const [done, setDone] = useState(false);
  const correct = done && wrong === null;
  useAutoAdvance(correct, onNext);

  function tap(p: Position) {
    if (done) return;
    sound.playPosition(p);
    const pitch = pitchOf(p, instrument);
    if (scaleDegreeOf(noteAt(p, instrument), root, scale) < 0) {
      setWrong(p);
      setDone(true);
      onAnswer(false);
      return;
    }
    if (!allPitches.has(pitch)) return;
    setPlayed((prev) => [...prev, p]);
    if (found.has(pitch)) return;
    const next = new Set(found).add(pitch);
    setFound(next);
    if (next.size === allPitches.size) {
      setDone(true);
      onAnswer(true);
    }
  }

  const remaining = allPitches.size - found.size;
  const marks: Mark[] = [];
  if (!done) {
    for (const n of shape.notes) if (n.degree === 0) marks.push({ position: n.position, kind: 'root' });
    for (const p of played) {
      if (!marks.some((m) => positionKey(m.position) === positionKey(p))) {
        marks.push({ position: p, kind: 'scale' });
      }
    }
  } else {
    for (const n of shape.notes) {
      const kind = n.degree === 0 ? 'root' : found.has(n.pitch) ? 'scale' : 'hint';
      marks.push({ position: n.position, kind, label: degrees[n.degree] });
    }
    if (wrong) marks.push({ position: wrong, kind: 'wrong' });
  }

  return (
    <div className="quiz">
      <p className="prompt">Toque a escala</p>
      <p className="scale-title">{scaleTitle(scale, root, box, notation, accidentals)}</p>
      {!done && (
        <p className="scale-remaining" aria-live="polite">
          {`Faltam ${remaining} ${remaining === 1 ? 'nota' : 'notas'}`}
        </p>
      )}
      <Fretboard
        instrument={instrument}
        fit={fit}
        minFretWidth={40}
        fretMin={shape.fretMin}
        fretMax={shape.fretMax}
        leftHanded={leftHanded}
        marks={marks}
        stringLabels={stringLabels(instrument)}
        onTap={done ? undefined : tap}
      />
      <ScaleLegend />
      {done && (
        <div className="feedback quiz-actions">
          <p role="status">
            {correct
              ? 'Correto! Desenho completo.'
              : `Errado. ${noteLabel(noteAt(wrong as Position, instrument), notation, accidentals)} não está na escala.`}
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
