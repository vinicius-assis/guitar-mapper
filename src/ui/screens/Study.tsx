import { useMemo, useRef, useState } from 'react';
import { positionsInFilter, type Position } from '../../domain/fretboard';
import {
  buildQueue,
  makeHistoryEntry,
  summarize,
  type SessionResult,
  type SessionSummary,
} from '../../domain/session';
import { useAppState } from '../../state/AppState';
import { formatSeconds } from '../format';
import { MODES, MODE_DESCRIPTIONS } from '../modeLabels';
import { ChoiceQuiz } from './ChoiceQuiz';
import { Flashcard } from './Flashcard';
import { FindQuiz } from './FindQuiz';

type Phase = 'idle' | 'running' | 'summary';

export function Study({ forced = null }: { forced?: Position | null }) {
  const { data, recordAnswer, updateSettings, recordSession } = useAppState();
  const { settings } = data;
  const candidates = useMemo(() => positionsInFilter(settings.filter), [settings.filter]);

  const [phase, setPhase] = useState<Phase>(forced ? 'running' : 'idle');
  const [queue, setQueue] = useState<Position[]>(() =>
    forced ? buildQueue(positionsInFilter(settings.filter), Math.random, forced) : [],
  );
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<SessionResult[]>([]);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const resultsRef = useRef<SessionResult[]>([]);
  const questionStart = useRef(Date.now());

  function begin() {
    if (candidates.length === 0) return;
    setQueue(buildQueue(candidates, Math.random));
    setIndex(0);
    resultsRef.current = [];
    setResults([]);
    setSummary(null);
    questionStart.current = Date.now();
    setPhase('running');
  }

  function finish() {
    const done = resultsRef.current;
    const entry = makeHistoryEntry(settings.mode, Date.now(), done);
    if (entry) recordSession(entry);
    setSummary(summarize(done));
    setPhase('summary');
  }

  function handleAnswer(correct: boolean) {
    const position = queue[index];
    if (!position) return;
    recordAnswer(position, correct);
    resultsRef.current = [...resultsRef.current, { correct, ms: Date.now() - questionStart.current }];
    setResults(resultsRef.current);
  }

  function handleNext() {
    if (index + 1 >= queue.length) {
      finish();
      return;
    }
    questionStart.current = Date.now();
    setIndex(index + 1);
  }

  function changeMode(mode: typeof settings.mode) {
    updateSettings({ mode });
    setPhase('idle');
  }

  const position = queue[index];
  const quizProps = { settings, onAnswer: handleAnswer, onNext: handleNext };
  const hits = results.filter((r) => r.correct).length;
  let streak = 0;
  for (let i = results.length - 1; i >= 0 && results[i].correct; i--) streak++;

  return (
    <section className="screen">
      <div className="mode-bar" role="group" aria-label="Modo de estudo">
        {MODES.map(({ mode, label }) => (
          <button
            key={mode}
            type="button"
            aria-pressed={settings.mode === mode}
            onClick={() => changeMode(mode)}
          >
            {label}
          </button>
        ))}
      </div>

      {phase === 'idle' && (
        <div className="session-start">
          <p className="mode-description">{MODE_DESCRIPTIONS[settings.mode]}</p>
          {candidates.length === 0 ? (
            <p className="empty">
              Nenhuma posição no foco atual. Selecione ao menos uma corda ou ajuste as casas e o
              nível de notas em Foco.
            </p>
          ) : (
            <p>
              {candidates.length} {candidates.length === 1 ? 'pergunta' : 'perguntas'}
            </p>
          )}
          <button
            type="button"
            className="primary start"
            disabled={candidates.length === 0}
            onClick={begin}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
              <path d="M7 4.5v15l13-7.5z" fill="currentColor" />
            </svg>
            Iniciar
          </button>
        </div>
      )}

      {phase === 'running' && position && (
        <>
          <div className="session-bar">
            <p className="session">
              Pergunta {index + 1}/{queue.length} · Acertos {hits}/{results.length} · Sequência{' '}
              {streak}
            </p>
            <button type="button" onClick={finish}>
              Finalizar
            </button>
          </div>
          {settings.mode === 'position-to-note' ? (
            <ChoiceQuiz key={index} position={position} {...quizProps} />
          ) : settings.mode === 'note-to-position' ? (
            <FindQuiz key={index} position={position} {...quizProps} />
          ) : (
            <Flashcard key={index} position={position} {...quizProps} />
          )}
        </>
      )}

      {phase === 'summary' && summary && (
        <div className="session-summary">
          <h2>Sessão concluída</h2>
          {summary.total === 0 ? (
            <p>Nenhuma pergunta respondida.</p>
          ) : (
            <>
              <p>
                Acertos: {summary.correct} de {summary.total} ({summary.percent}%)
              </p>
              <p>Tempo médio por resposta: {formatSeconds(summary.averageMs)}</p>
            </>
          )}
          <div className="options options--two">
            <button type="button" className="primary" onClick={begin}>
              Nova sessão
            </button>
            <button type="button" onClick={() => setPhase('idle')}>
              Encerrar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
