import { useEffect, useMemo, useState } from 'react';
import { useSound } from '../../audio/SoundProvider';
import { positionKey, type Position } from '../../domain/fretboard';
import { GUITAR } from '../../domain/instruments';
import { pitchOf } from '../../domain/pitch';
import { iiViQuestion, isIiViTarget, type IiViItem, type ShellNote } from '../../domain/progressions';
import type { Settings } from '../../state/storage';
import { Fretboard, type Mark } from '../Fretboard';
import { GuideLegend } from '../GuideLegend';
import { iiViChordSymbol, iiViDetail, iiViTargetNames, iiViTitle } from '../m7Text';
import { stringLabels } from '../stringLabels';
import { useAutoAdvance } from '../useAutoAdvance';

interface Props {
  question: IiViItem;
  settings: Settings;
  onAnswer(correct: boolean): void;
  onNext(): void;
}

export function IiViQuiz({ question, settings, onAnswer, onNext }: Props) {
  const { notation, accidentals, leftHanded } = settings;
  const { playPitches, playSequence } = useSound();
  const q = useMemo(() => iiViQuestion(question), [question]);
  const [found, setFound] = useState<ReadonlySet<number>>(new Set());
  const [wrong, setWrong] = useState<Position | null>(null);
  const [done, setDone] = useState(false);
  const correct = done && wrong === null;
  // A troca soa até ~980 ms; o desmonte cancela o que faltar.
  useAutoAdvance(correct, onNext, 1500);
  useEffect(() => () => playPitches([]), [playPitches]);

  const swap = () =>
    playSequence([
      ...q.from.notes.map((n, i) => ({ midi: n.pitch, atMs: i * 40 })),
      ...q.to.notes.map((n, i) => ({ midi: n.pitch, atMs: 900 + i * 40 })),
    ]);

  function tap(p: Position) {
    if (done) return;
    const pitch = pitchOf(p, GUITAR);
    if (isIiViTarget(q, pitch)) {
      if (found.has(pitch)) return;
      const next = new Set(found).add(pitch);
      setFound(next);
      if (next.size < q.targets.length) {
        playPitches([pitch]);
        return;
      }
      setDone(true);
      onAnswer(true);
      swap();
      return;
    }
    setWrong(p);
    setDone(true);
    onAnswer(false);
    swap();
  }

  const source = (n: ShellNote): Mark => ({
    position: n.position,
    kind: n.isRoot ? 'root' : 'guide',
    label: n.func,
  });
  const marks: Mark[] = [];
  if (!done) {
    marks.push(...q.from.notes.map(source));
    for (const pitch of found) {
      const t = q.targets.find((x) => x.pitch === pitch)!;
      marks.push({ position: t.position, kind: 'guide' });
    }
  } else {
    marks.push(...q.from.notes.map((n): Mark => ({ position: n.position, kind: 'scale' })));
    for (const n of q.to.notes) {
      const kind = n.isRoot ? 'root' : found.has(n.pitch) ? 'guide' : 'hint';
      marks.push({ position: n.position, kind, label: n.func });
    }
    if (wrong) marks.push({ position: wrong, kind: 'wrong' });
  }
  // Uma casa só recebe uma marca: a última da lista vale.
  const lastAt = new Map(marks.map((m, i) => [positionKey(m.position), i]));
  const shown = marks.filter((m, i) => lastAt.get(positionKey(m.position)) === i);

  const links = q.moves
    .filter((m) => m.semitones !== 0)
    .map((m) => ({ from: m.from.position, to: m.to.position }));
  const remaining = q.targets.length - found.size;
  const para = iiViChordSymbol(q.item.key, q.to, notation, accidentals);

  return (
    <div className="quiz">
      <p className="prompt">{`Toque as notas-guia de ${para}`}</p>
      <p className="scale-title">{iiViTitle(q, notation, accidentals)}</p>
      {!done && (
        <p className="scale-remaining" aria-live="polite">
          {`Faltam ${remaining} ${remaining === 1 ? 'nota' : 'notas'}`}
        </p>
      )}
      <Fretboard
        instrument={GUITAR}
        fit
        minFretWidth={40}
        fretMin={q.fretMin}
        fretMax={q.fretMax}
        leftHanded={leftHanded}
        marks={shown}
        links={done ? links : undefined}
        stringLabels={stringLabels(GUITAR)}
        onTap={done ? undefined : tap}
      />
      <GuideLegend />
      {done && (
        <div className="feedback quiz-actions">
          <p role="status">
            {correct
              ? 'Correto!'
              : `Errado. As notas-guia de ${para} mais perto são ${iiViTargetNames(q, notation, accidentals)}.`}
          </p>
          <p className="ear-detail">{iiViDetail(q, notation, accidentals)}</p>
          <button type="button" className="ear-play" onClick={swap}>
            Ouvir a troca
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
