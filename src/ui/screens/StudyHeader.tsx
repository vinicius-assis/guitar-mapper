import { MODES, modeLabel } from '../modeLabels';
import type { QuizMode } from '../../domain/quiz';

interface StudyHeaderProps {
  mode: QuizMode;
  menuOpen: boolean;
  onMenuOpenChange(open: boolean): void;
  onSelectMode(mode: QuizMode): void;
}

/** Logo do app à esquerda (com o exercício atual) e o menu de exercícios à direita. */
export function StudyHeader({ mode, menuOpen, onMenuOpenChange, onSelectMode }: StudyHeaderProps) {
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
          {MODES.map(({ mode: m, label }) => (
            <button
              key={m}
              type="button"
              role="menuitemradio"
              aria-checked={m === mode}
              onClick={() => onSelectMode(m)}
            >
              <span>{label}</span>
              {m === mode && <span aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
