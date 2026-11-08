import { useEffect, useRef, useState } from 'react';
import { browserMetronomeDeps, createMetronome, type Metronome as Engine } from '../audio/metronome';
import { BEATS_OPTIONS, BPM_MAX, BPM_MIN, clampBpm } from '../audio/metronomeClock';
import { useAppState } from '../state/AppState';

type EngineFactory = (initial: { bpm: number; beatsPerBar: number }) => Engine;

// Navegadores limitam AudioContexts vivos (o motor não tem close), então o motor padrão é um
// singleton compartilhado entre montagens de Ajustes; cada montagem só reaplica andamento e compasso.
let shared: Engine | null = null;

/** Só para testes: descarta o motor compartilhado. */
export function __resetSharedMetronome() {
  shared = null;
}

const defaultCreateEngine: EngineFactory = (initial) => {
  if (!shared) {
    shared = createMetronome(browserMetronomeDeps(), initial);
  } else {
    shared.setBpm(initial.bpm);
    shared.setBeatsPerBar(initial.beatsPerBar);
  }
  return shared;
};

const STEPS: { delta: number; label: string; aria: string }[] = [
  { delta: -5, label: '−5', aria: 'Diminuir 5 BPM' },
  { delta: -1, label: '−1', aria: 'Diminuir 1 BPM' },
  { delta: 1, label: '+1', aria: 'Aumentar 1 BPM' },
  { delta: 5, label: '+5', aria: 'Aumentar 5 BPM' },
];

export function Metronome({ createEngine = defaultCreateEngine }: { createEngine?: EngineFactory }) {
  const { data, updateSettings } = useAppState();
  const bpm = data.settings.metronomeBpm;
  const beats = data.settings.metronomeBeats;
  // O motor (e seu AudioContext) nasce no primeiro Iniciar, dentro do clique, e vive até desmontar.
  const engineRef = useRef<Engine | null>(null);
  const [running, setRunning] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    engineRef.current?.setBpm(bpm);
  }, [bpm]);

  useEffect(() => {
    engineRef.current?.setBeatsPerBar(beats);
  }, [beats]);

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState !== 'hidden') return;
      engineRef.current?.stop();
      setRunning(false);
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      engineRef.current?.stop();
    };
  }, []);

  function toggle() {
    if (running) {
      engineRef.current?.stop();
      setRunning(false);
      return;
    }
    engineRef.current ??= createEngine({ bpm, beatsPerBar: beats });
    const ok = engineRef.current.start();
    setFailed(!ok);
    setRunning(ok);
  }

  return (
    <section className="metronome" aria-labelledby="metronome-title">
      <h3 id="metronome-title">Metrônomo</h3>
      <p className="metronome-bpm">{bpm} BPM</p>
      <div role="group" aria-label="Ajustar andamento" className="metronome-steps">
        {STEPS.map(({ delta, label, aria }) => (
          <button
            key={delta}
            type="button"
            aria-label={aria}
            onClick={() => updateSettings({ metronomeBpm: clampBpm(bpm + delta) })}
          >
            {label}
          </button>
        ))}
      </div>
      <input
        type="range"
        className="metronome-range"
        min={BPM_MIN}
        max={BPM_MAX}
        step={1}
        value={bpm}
        aria-label="Andamento (BPM)"
        onChange={(e) => updateSettings({ metronomeBpm: clampBpm(Number(e.target.value)) })}
      />
      <div className="level-bar metronome-beats" role="group" aria-label="Compasso">
        {BEATS_OPTIONS.map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={beats === n}
            onClick={() => updateSettings({ metronomeBeats: n })}
          >
            {n === 1 ? 'Sem acento' : n}
          </button>
        ))}
      </div>
      <button type="button" className="primary metronome-toggle" aria-pressed={running} onClick={toggle}>
        {running ? 'Parar' : 'Iniciar'}
      </button>
      {failed && <p className="empty" role="status">Este navegador não toca o metrônomo.</p>}
      <p className="hint">Para sozinho quando você sai desta tela ou do app.</p>
    </section>
  );
}
