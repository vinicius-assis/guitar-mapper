import { modeLabel } from '../modeLabels';
import { EXERCISE_META, TRACKS } from '../../domain/exercises';
import { InstrumentBadge } from '../InstrumentBadge';
import type { QuizMode } from '../../domain/quiz';

interface StudyHeaderProps {
  /** 'compact': logo + menu (celular e tablet). 'tabs': os 4 exercícios sempre visíveis (computador). */
  layout?: 'compact' | 'tabs';
  mode: QuizMode;
  menuOpen: boolean;
  onMenuOpenChange(open: boolean): void;
  onSelectMode(mode: QuizMode): void;
}

/** Logo do app à esquerda (com o exercício atual) e o menu de exercícios à direita. */
export function StudyHeader({
  layout = 'compact',
  mode,
  menuOpen,
  onMenuOpenChange,
  onSelectMode,
}: StudyHeaderProps) {
  if (layout === 'tabs') {
    return (
      <div className="study-header study-header--tabs" role="group" aria-label="Exercício">
        {TRACKS.flatMap((t) => t.modes).map((m) => (
          <button key={m} type="button" aria-pressed={m === mode} onClick={() => onSelectMode(m)}>
            {EXERCISE_META[m].label}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className="study-header" role="group" aria-label="Exercício">
      <div className="study-header__brand">
        <img
          src={`${import.meta.env.BASE_URL}pwa-64x64.png`}
          width="32"
          height="32"
          alt="Guitar Mapper"
        />
        <span className="study-header__title">{modeLabel(mode)}</span>
        <InstrumentBadge />
      </div>
      <button
        type="button"
        className="menu-button"
        aria-label="Menu de exercícios"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => onMenuOpenChange(!menuOpen)}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
          <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      {menuOpen && (
        <div className="menu" role="menu" aria-label="Exercícios">
          <div className="menu__bar">
            <span className="menu__title">Exercícios</span>
            <button
              type="button"
              className="menu__close"
              aria-label="Fechar menu"
              onClick={() => onMenuOpenChange(false)}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
                <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          {TRACKS.map((track) => (
            <div key={track.id} role="group" aria-label={track.label}>
              <p className="menu__group">{track.label}</p>
              {track.modes.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="menuitemradio"
                  aria-checked={m === mode}
                  onClick={() => onSelectMode(m)}
                >
                  <span>{EXERCISE_META[m].label}</span>
                  {m === mode && <span aria-hidden="true">✓</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
