import { useEffect, useMemo, useState } from 'react';
import { useSound } from '../../audio/SoundProvider';
import { dictationAdvanceMs, dictationSequence, isDictationTap, type DictationQuestion } from '../../domain/dictation';
import { noteAt, positionKey, type Position } from '../../domain/fretboard';
import { pitchOf } from '../../domain/pitch';
import { noteLabel, type NoteIndex } from '../../domain/notes';
import { SCALES, scaleBox, scaleDegreeOf } from '../../domain/scales';
import { useAppState } from '../../state/AppState';
import type { Settings } from '../../state/storage';
import { Fretboard, type Mark } from '../Fretboard';
import { ScaleLegend } from '../ScaleLegend';
import { dictationDegrees, dictationNames, ordinalNote } from '../dictationText';
import { scaleNoteName, scaleTitle } from '../scaleText';
import { stringLabels } from '../stringLabels';
import { useAutoAdvance } from '../useAutoAdvance';

interface Props {
  question: DictationQuestion;
  settings: Settings;
  onAnswer(correct: boolean): void;
  onNext(): void;
}

export function DictationQuiz({ question, settings, onAnswer, onNext }: Props) {
  const { notation, accidentals, leftHanded } = settings;
  const { scale, root, box: boxId, pitches, length } = question;
  const { instrument } = useAppState();
  const sound = useSound();
  const { playSequence } = sound;
  const box = useMemo(() => scaleBox(scale, boxId, root, instrument), [scale, boxId, root, instrument]);
  const seq = useMemo(() => dictationSequence(question), [question]);

  const [taps, setTaps] = useState<Position[]>([]);
  const [wrong, setWrong] = useState<Position | null>(null);
  const [done, setDone] = useState(false);
  const correct = done && wrong === null;
  // A melodia final soa até (n − 1) × 600 ms mais 1 s; o avanço espera por ela.
  useAutoAdvance(correct, onNext, dictationAdvanceMs(length));
  useEffect(() => {
    playSequence(seq);
    return () => playSequence([]);
    // Só na montagem e no desmonte: a pergunta nova remonta a tela pela key.
  }, []);

  function tap(p: Position) {
    if (done) return;
    const index = taps.length;
    if (isDictationTap(question, index, p, instrument)) {
      setTaps([...taps, p]);
      if (index < length - 1) {
        sound.playPosition(p);
        return;
      }
      setDone(true);
      onAnswer(true);
      playSequence(seq);
      return;
    }
    sound.playPosition(p);
    setWrong(p);
    setDone(true);
    onAnswer(false);
    playSequence(seq);
  }

  function missText(w: Position): string {
    const expected = pitches[taps.length];
    const degree = scaleDegreeOf((expected % 12) as NoteIndex, root, scale);
    const name =
      degree < 0
        ? noteLabel((expected % 12) as NoteIndex, notation, accidentals)
        : scaleNoteName(scale, root, degree, notation, accidentals);
    const head = `A ${ordinalNote(taps.length)} nota era ${name}`;
    const tapped = pitchOf(w, instrument);
    if (tapped % 12 === expected % 12) return `${head}, mas uma oitava ${tapped > expected ? 'acima' : 'abaixo'}.`;
    return `${head}, não ${noteLabel(noteAt(w, instrument), notation, accidentals)}.`;
  }

  const remaining = length - taps.length;
  const marks: Mark[] = [];
  const put = (m: Mark) => {
    const key = positionKey(m.position);
    const at = marks.findIndex((x) => positionKey(x.position) === key);
    if (at >= 0) marks.splice(at, 1);
    marks.push(m);
  };
  for (const n of box.notes) if (n.degree === 0) put({ position: n.position, kind: 'root' });
  if (!done) {
    for (const p of taps) put({ position: p, kind: 'scale' });
  } else {
    pitches.forEach((pitch, i) => {
      const label = SCALES[scale].degrees[scaleDegreeOf((pitch % 12) as NoteIndex, root, scale)];
      if (i < taps.length) put({ position: taps[i], kind: 'scale', label });
      else {
        const at = box.notes.find((n) => n.pitch === pitch);
        if (at) put({ position: at.position, kind: 'hint', label });
      }
    });
    if (wrong) put({ position: wrong, kind: 'wrong' });
  }

  // Só calculado com um toque errado: depois do último acerto não há nota esperada.
  const misses = wrong !== null ? missText(wrong) : null;

  return (
    <div className="quiz">
      <p className="prompt">Toque a melodia</p>
      <p className="scale-title">{scaleTitle(scale, root, boxId, notation, accidentals)}</p>
      {!done && (
        <p className="scale-remaining" aria-live="polite">
          {`Faltam ${remaining} ${remaining === 1 ? 'nota' : 'notas'}`}
        </p>
      )}
      <Fretboard
        instrument={instrument}
        fit
        minFretWidth={40}
        fretMin={box.fretMin}
        fretMax={box.fretMax}
        leftHanded={leftHanded}
        marks={marks}
        stringLabels={stringLabels(instrument)}
        onTap={done ? undefined : tap}
      />
      <ScaleLegend />
      <div className="feedback quiz-actions">
        {done && (
          <>
            <p role="status">
              {correct
                ? 'Correto! Melodia completa.'
                : `Errado. ${misses}`}
            </p>
            <p className="ear-detail">{`Melodia: ${dictationNames(question, notation, accidentals)} · ${dictationDegrees(question)}`}</p>
          </>
        )}
        <button type="button" className="ear-play" onClick={() => playSequence(seq)}>
          Ouvir de novo
        </button>
        {done && !correct && (
          <button type="button" className="primary" onClick={onNext}>
            Próxima
          </button>
        )}
      </div>
    </div>
  );
}
