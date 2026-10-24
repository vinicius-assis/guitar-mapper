import { useEffect, useMemo, useRef, useState } from 'react';
import type { QuizMode } from '../../domain/quiz';
import { useSound } from '../../audio/SoundProvider';
import { positionsInFilter, type Position } from '../../domain/fretboard';
import {
  buildQueue,
  makeHistoryEntry,
  summarize,
  type SessionResult,
  type SessionSummary,
} from '../../domain/session';
import { useAppState } from '../../state/AppState';
import { useConfirm } from '../ConfirmDialog';
import { formatSeconds } from '../format';
import { EAR_LEVELS, MODE_DESCRIPTIONS } from '../modeLabels';
import { ChoiceQuiz } from './ChoiceQuiz';
import { EarQuiz } from './EarQuiz';
import { Flashcard } from './Flashcard';
import { FindQuiz } from './FindQuiz';
import { FocusSheet } from './FocusSheet';
import { StudyHeader } from './StudyHeader';

type Phase = 'idle' | 'running' | 'summary';

interface StudyProps {
  forced?: Position | null;
  /** Avisa o app quando uma pergunta está em andamento (para esconder as abas). */
  onSessionChange?(running: boolean): void;
}

export function Study({ forced = null, onSessionChange }: StudyProps) {
  const { data, recordAnswer, updateSettings, recordSession } = useAppState();
  const confirm = useConfirm();
  const sound = useSound();
  const { settings } = data;
  const candidates = useMemo(() => positionsInFilter(settings.filter), [settings.filter]);

  // Ouvido precisa de som: sem ele, uma posição vinda do Progresso não inicia a sessão.
  const earWithoutSound = settings.mode === 'ear' && !settings.soundEnabled;
  const startsRunning = Boolean(forced) && !earWithoutSound;
  // Só um painel por vez: o menu de exercícios ou o cartão de Foco.
  const [openPanel, setOpenPanel] = useState<'menu' | 'focus' | null>(null);
  const [phase, setPhase] = useState<Phase>(startsRunning ? 'running' : 'idle');
  const [queue, setQueue] = useState<Position[]>(() =>
    startsRunning
      ? buildQueue(positionsInFilter(settings.filter), Math.random, forced, {
          avoidSameNote: settings.mode === 'ear',
        })
      : [],
  );
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<SessionResult[]>([]);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const resultsRef = useRef<SessionResult[]>([]);
  const questionStart = useRef(Date.now());

  useEffect(() => {
    onSessionChange?.(phase === 'running');
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => onSessionChange?.(false), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Posição vinda do Progresso: a sessão já começa, então carrega o som dela logo.
  useEffect(() => {
    if (startsRunning) sound.prepare(queue);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const canStart = candidates.length > 0 && !earWithoutSound;

  function begin() {
    if (!canStart) return;
    const nextQueue = buildQueue(candidates, Math.random, null, {
      avoidSameNote: settings.mode === 'ear',
    });
    sound.unlock(); // dentro do toque em Iniciar: libera o áudio no iPhone
    sound.prepare(nextQueue);
    setQueue(nextQueue);
    setIndex(0);
    resultsRef.current = [];
    setResults([]);
    setSummary(null);
    questionStart.current = Date.now();
    setPhase('running');
  }

  function finish() {
    const done = resultsRef.current;
    const entry = makeHistoryEntry(settings.mode, Date.now(), done, settings.earLevel);
    if (entry) recordSession(entry);
    setSummary(summarize(done));
    setPhase('summary');
  }

  async function confirmFinish() {
    const ok = await confirm({
      title: 'Finalizar a sessão?',
      message: 'O resultado até aqui será salvo no histórico.',
      confirmLabel: 'Finalizar',
    });
    if (ok) finish();
  }

  function handleAnswer(correct: boolean) {
    const position = queue[index];
    if (!position) return;
    if (settings.mode !== 'ear') recordAnswer(position, correct); // ouvido não mexe no mapa
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

  function changeMode(mode: QuizMode) {
    updateSettings({ mode });
    setPhase('idle');
    setOpenPanel(null);
  }

  // Esc fecha o painel aberto.
  useEffect(() => {
    if (!openPanel) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenPanel(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openPanel]);

  const position = queue[index];
  const quizProps = { settings, onAnswer: handleAnswer, onNext: handleNext };
  const hits = results.filter((r) => r.correct).length;
  let streak = 0;
  for (let i = results.length - 1; i >= 0 && results[i].correct; i--) streak++;

  return (
    <section className="screen screen--study">
      {phase !== 'running' && (
        <StudyHeader
          mode={settings.mode}
          menuOpen={openPanel === 'menu'}
          onMenuOpenChange={(open) => setOpenPanel(open ? 'menu' : null)}
          onSelectMode={changeMode}
        />
      )}
      {phase !== 'running' && openPanel && (
        <div
          className="overlay-backdrop"
          data-testid={`${openPanel}-backdrop`}
          onClick={() => setOpenPanel(null)}
        />
      )}

      {phase === 'idle' && (
        <div className="session-start">
          <p className="mode-description">{MODE_DESCRIPTIONS[settings.mode]}</p>
          {settings.mode === 'ear' && (
            <>
              <div className="level-bar" role="group" aria-label="Nível">
                {EAR_LEVELS.map(({ level, label }) => (
                  <button
                    key={level}
                    type="button"
                    aria-pressed={settings.earLevel === level}
                    onClick={() => updateSettings({ earLevel: level })}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mode-description">
                {EAR_LEVELS.find((l) => l.level === settings.earLevel)!.description}
              </p>
              {earWithoutSound && (
                <p className="empty">Ligue o Som em Ajustes para treinar de ouvido.</p>
              )}
            </>
          )}
          {candidates.length === 0 && (
            <p className="empty">
              Nenhuma posição no foco atual. Abra o Foco abaixo e selecione ao menos uma corda ou
              inclua notas com acidentais.
            </p>
          )}
          <FocusSheet
            open={openPanel === 'focus'}
            onOpenChange={(open) => setOpenPanel(open ? 'focus' : null)}
          />
          <button
            type="button"
            className="primary start"
            disabled={!canStart}
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
            <p className="session-title">
              Pergunta {index + 1} de {queue.length}
            </p>
            <button
              type="button"
              className="stop-button"
              aria-label="Finalizar"
              title="Finalizar"
              onClick={confirmFinish}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
                <rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" />
              </svg>
            </button>
          </div>
          <div
            className="progress-bar"
            role="progressbar"
            aria-label="Progresso da sessão"
            aria-valuemin={0}
            aria-valuemax={queue.length}
            aria-valuenow={results.length}
          >
            <span style={{ width: `${(results.length / queue.length) * 100}%` }} />
          </div>
          <p className="session-stats">
            <span className="stat stat--ok" aria-label={`Acertos: ${hits}`}>
              ✓ {hits}
            </span>
            <span className="stat stat--bad" aria-label={`Erros: ${results.length - hits}`}>
              ✗ {results.length - hits}
            </span>
            <span className="stat">Sequência {streak}</span>
          </p>
          {settings.mode === 'ear' ? (
            <EarQuiz key={index} position={position} {...quizProps} />
          ) : settings.mode === 'position-to-note' ? (
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
            <button type="button" className="primary start summary-button" onClick={begin}>
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                <path
                  d="M12 5V2L7 6.5 12 11V8a5 5 0 1 1-5 5H5a7 7 0 1 0 7-8z"
                  fill="currentColor"
                />
              </svg>
              Reiniciar
            </button>
            <button type="button" className="summary-button" onClick={() => setPhase('idle')}>
              Encerrar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
