import { useState } from 'react';
import type { Position } from './domain/fretboard';
import { AppProvider, useAppState } from './state/AppState';
import type { StorageLike } from './state/storage';
import { SoundProvider } from './audio/SoundProvider';
import { ConfirmProvider } from './ui/ConfirmDialog';
import { Focus } from './ui/screens/Focus';
import { Progress } from './ui/screens/Progress';
import { Settings } from './ui/screens/Settings';
import { Study } from './ui/screens/Study';
import { useBreakpoint } from './ui/useBreakpoint';

type Tab = 'study' | 'progress' | 'focus' | 'settings';

const TABS: { tab: Tab; label: string }[] = [
  { tab: 'study', label: 'Estudar' },
  { tab: 'progress', label: 'Progresso' },
  { tab: 'focus', label: 'Foco' },
  { tab: 'settings', label: 'Ajustes' },
];

function Shell() {
  const { storageAvailable, recovered } = useAppState();
  const [tab, setTab] = useState<Tab>('study');
  const [forced, setForced] = useState<Position | null>(null);
  const [sessionRunning, setSessionRunning] = useState(false);
  const [recoveredDismissed, setRecoveredDismissed] = useState(false);
  const breakpoint = useBreakpoint();
  const desktop = breakpoint === 'desktop';

  const go = (next: Tab) => {
    setForced(null);
    setTab(next);
  };

  return (
    <div
      className={['app', `app--${breakpoint}`, sessionRunning && !desktop ? 'app--session' : '']
        .filter(Boolean)
        .join(' ')}
    >
      <header className="banners">
        {!storageAvailable && (
          <p className="banner">O progresso não será salvo neste navegador (armazenamento indisponível).</p>
        )}
        {recovered && !recoveredDismissed && (
          <p className="banner">
            Os dados salvos estavam corrompidos e foram reiniciados. Uma cópia foi guardada.
            <button type="button" aria-label="Fechar aviso" onClick={() => setRecoveredDismissed(true)}>
              ×
            </button>
          </p>
        )}
      </header>

      <main>
        {tab === 'study' && (
          <Study
            forced={forced}
            onSessionChange={setSessionRunning}
          />
        )}
        {tab === 'progress' && (
          <Progress
            onSelect={(position) => {
              setForced(position);
              setTab('study');
            }}
          />
        )}
        {tab === 'focus' && <Focus />}
        {tab === 'settings' && <Settings />}
      </main>

      {(desktop || !sessionRunning) && (
        <nav className={desktop ? 'tabs sidebar' : 'tabs'} aria-label="Principal">
          {desktop && (
            <div className="sidebar__brand">
              <img
                src={`${import.meta.env.BASE_URL}pwa-64x64.png`}
                width="32"
                height="32"
                alt="Guitar Mapper"
              />
              <span>Guitar Mapper</span>
            </div>
          )}
          {TABS.map(({ tab: t, label }) => (
            <button
              key={t}
              type="button"
              aria-current={tab === t ? 'page' : undefined}
              onClick={() => go(t)}
            >
              {label}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

export function App({ storage }: { storage?: StorageLike | null }) {
  return (
    <AppProvider storage={storage}>
      <ConfirmProvider>
        <SoundProvider>
          <Shell />
        </SoundProvider>
      </ConfirmProvider>
    </AppProvider>
  );
}
