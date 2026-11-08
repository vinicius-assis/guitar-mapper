import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundProvider } from '../../audio/SoundProvider';
import type { NotePlayer } from '../../audio/player';
import { CHORD_KIND_SETTINGS, CHORD_SHAPE_SETTINGS } from '../../domain/chordItems';
import { EAR_DIRECTIONS } from '../../domain/earTraining';
import { QUIZ_MODES } from '../../domain/exercises';
import { positionsInFilter } from '../../domain/fretboard';
import { HARMONY_FIELD_SETTINGS, HARMONY_KEY_LEVELS } from '../../domain/harmony';
import { BASS, GUITAR, INSTRUMENTS, type Instrument } from '../../domain/instruments';
import { ACCIDENTALS, type Notation } from '../../domain/notes';
import type { EarLevel, QuizMode } from '../../domain/quiz';
import { SCALES, SCALE_IDS } from '../../domain/scales';
import type { ProgressMap } from '../../domain/scheduler';
import { LEVELED_MODES, type HistoryEntry } from '../../domain/session';
import { dayKey } from '../../domain/stats';
import { AppProvider } from '../../state/AppState';
import { activeView, createDefaultData, defaultFilterFor, type Settings as AppSettings } from '../../state/storage';
import { mulberry32, seededStorage } from '../../test-utils';
import { ConfirmProvider } from '../ConfirmDialog';
import { EXERCISES } from '../exercises';
import { Progress } from './Progress';
import { Settings } from './Settings';
import { Study } from './Study';

/**
 * Varredura de Estudar/Progresso/Ajustes: cada exercício × instrumento × som × as opções da tela
 * de início. Inicia a sessão, responde uma pergunta pela própria tela e finaliza até o resumo.
 */

const LEVELS: readonly EarLevel[] = ['easy', 'medium', 'hard'];
const NOTATIONS: readonly Notation[] = ['cifra', 'solfejo', 'ambos'];
const CHORD_MODES: readonly QuizMode[] = ['chord-name', 'chord-play', 'guide-tones', 'ii-v-i'];
const EAR_MODES: readonly QuizMode[] = ['ear', 'ear-interval', 'ear-degree', 'dictation'];
const BASS_NO_CHORDS = 'Acordes são só para violão. Troque para Violão em Ajustes.';
const EAR_WITHOUT_SOUND = 'Ligue o Som em Ajustes para treinar de ouvido.';
const BROKEN = /undefined|NaN|null|\[object/;

const fakePlayer = (): NotePlayer => ({ unlock: vi.fn(), prepare: vi.fn(), play: vi.fn() });

/** Opções da tela de início de cada exercício (cada valor de enum aparece ao menos uma vez). */
const OPTIONS: Record<QuizMode, Partial<AppSettings>[]> = {
  'position-to-note': [{}],
  'note-to-position': [{}],
  flashcard: [{}],
  ear: LEVELS.map((earLevel) => ({ earLevel })),
  'ear-interval': LEVELS.map((earIntervalLevel, i) => ({ earIntervalLevel, earIntervalDirection: EAR_DIRECTIONS[i] })),
  'ear-degree': LEVELS.map((degreeLevel) => ({ degreeLevel })),
  interval: (['manual', '3s', '5s'] as const).map((intervalAdvance) => ({ intervalAdvance })),
  'scale-degree': SCALE_IDS.map((scale, i) => ({ scale, scaleBox: i % 2 ? ('all' as const) : SCALES[scale].boxCount })),
  'scale-play': SCALE_IDS.map((scale, i) => ({ scale, scaleBox: i % 2 ? 1 : ('all' as const) })),
  arpeggio: SCALE_IDS.map((scale, i) => ({ scale, scaleBox: i % 2 ? ('all' as const) : 2 })),
  'harmony-chord': HARMONY_FIELD_SETTINGS.map((harmonyField, i) => ({
    harmonyField,
    harmonyKeys: HARMONY_KEY_LEVELS[i],
    harmonySevenths: i % 2 === 0,
  })),
  'harmony-degree': HARMONY_FIELD_SETTINGS.map((harmonyField, i) => ({
    harmonyField,
    harmonyKeys: HARMONY_KEY_LEVELS[(i + 1) % 3],
    harmonySevenths: i % 2 === 1,
  })),
  'harmony-quality': HARMONY_FIELD_SETTINGS.map((harmonyField, i) => ({
    harmonyField,
    harmonyKeys: HARMONY_KEY_LEVELS[(i + 2) % 3],
    harmonySevenths: i % 2 === 0,
  })),
  'chord-name': CHORD_SHAPE_SETTINGS.map((chordShapes, i) => ({ chordShapes, chordKinds: CHORD_KIND_SETTINGS[i] })),
  'chord-play': CHORD_SHAPE_SETTINGS.map((chordShapes, i) => ({
    chordShapes,
    chordKinds: CHORD_KIND_SETTINGS[(i + 1) % 3],
  })),
  'guide-tones': CHORD_SHAPE_SETTINGS.map((chordShapes) => ({ chordShapes })),
  'ii-v-i': [{}],
  dictation: LEVELS.map((dictationLevel) => ({ dictationLevel })),
};

function settingsFor(inst: Instrument, extra: Partial<AppSettings>, i: number): AppSettings {
  return {
    ...activeView(createDefaultData()).settings,
    instrument: inst.id,
    filter: { ...defaultFilterFor(inst), naturalsOnly: i % 2 === 0 },
    notation: NOTATIONS[i % 3],
    accidentals: ACCIDENTALS[Math.floor(i / 3) % 3],
    leftHanded: i % 4 === 3,
    ...extra,
  };
}

function mountStudy(settings: AppSettings) {
  return render(
    <AppProvider storage={seededStorage({ settings })}>
      <ConfirmProvider>
        <SoundProvider player={fakePlayer()}>
          <Study />
        </SoundProvider>
      </ConfirmProvider>
    </AppProvider>,
  );
}

/** Responde a pergunta aberta pela tela, sem saber qual é: toca/clica até aparecer o status. */
function answerAnything(c: HTMLElement) {
  const status = () => c.querySelector('[role="status"]');
  const reveal = [...c.querySelectorAll<HTMLButtonElement>('button.primary')].find((b) => b.textContent === 'Mostrar nota');
  if (reveal) {
    fireEvent.click(reveal);
    fireEvent.click(c.querySelector<HTMLButtonElement>('button.option--wrong')!);
    return;
  }
  const choice = c.querySelector<HTMLButtonElement>('.options button, .note-grid button, .answer-grid button');
  if (choice) {
    fireEvent.click(choice);
    expect(status(), 'status after a choice').not.toBeNull();
    return;
  }
  const cells = [...c.querySelectorAll('rect[role="button"]')];
  expect(cells.length, 'tappable cells').toBeGreaterThan(0);
  for (const id of cells.map((el) => el.getAttribute('data-testid'))) {
    const el = c.querySelector(`[data-testid="${id}"][role="button"]`);
    if (!el) break;
    fireEvent.click(el);
    if (status()) break;
  }
  expect(status(), 'status after taps').not.toBeNull();
}

let errors: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  errors = vi.spyOn(console, 'error');
});
afterEach(() => {
  cleanup();
  expect(errors).not.toHaveBeenCalled();
  errors.mockRestore();
});

describe('Study sweep', () => {
  for (const mode of QUIZ_MODES) {
    for (const inst of INSTRUMENTS) {
      it(`${mode} · ${inst.id}: every start option, sound on/off, start → answer → summary`, async () => {
        let i = 0;
        for (const option of OPTIONS[mode]) {
          for (const soundEnabled of [true, false]) {
            const settings = settingsFor(inst, { ...option, mode, soundEnabled }, i++);
            const where = `${mode} ${inst.id} ${JSON.stringify(option)} sound ${soundEnabled}`;
            const { container } = mountStudy(settings);
            expect(container.textContent, where).not.toMatch(BROKEN);
            const start = screen.getByRole('button', { name: 'Iniciar' });
            const blocked = [
              ...(inst === BASS && CHORD_MODES.includes(mode) ? [BASS_NO_CHORDS] : []),
              ...(!soundEnabled && EAR_MODES.includes(mode) ? [EAR_WITHOUT_SOUND] : []),
            ];
            const ctx = {
              settings,
              instrument: inst,
              candidates: positionsInFilter(settings.filter, inst),
              rng: mulberry32(1),
            };
            expect(EXERCISES[mode].startBlockers(ctx), where).toEqual(blocked);
            for (const message of blocked) expect(screen.getByText(message), where).toBeInTheDocument();
            if (blocked.length > 0) {
              expect(start, where).toBeDisabled();
              cleanup();
              continue;
            }
            fireEvent.click(start);
            expect(screen.getByText(/^Pergunta 1 de \d+$/), where).toBeInTheDocument();
            expect(container.textContent, where).not.toMatch(BROKEN);
            try {
              answerAnything(container);
            } catch (e) {
              throw new Error(`${where}: ${(e as Error).message}`);
            }
            expect(container.textContent, where).not.toMatch(BROKEN);
            fireEvent.click(screen.getByRole('button', { name: 'Finalizar' }));
            fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Finalizar' }));
            await act(async () => {});
            expect(screen.getByText('Sessão concluída'), where).toBeInTheDocument();
            expect(screen.getByText(/^Acertos: [01] de 1 \(\d+%\)$/), where).toBeInTheDocument();
            cleanup();
          }
        }
      }, 30_000);
    }
  }
});

describe('Study sweep: a position from Progress', () => {
  for (const mode of QUIZ_MODES) {
    for (const inst of INSTRUMENTS) {
      it(`${mode} · ${inst.id}: starts (or not) from a position outside the focus`, () => {
        const settings = settingsFor(inst, { mode, soundEnabled: true }, 1);
        const forced = { string: inst.stringCount, fret: 20 };
        const { container } = render(
          <AppProvider storage={seededStorage({ settings })}>
            <ConfirmProvider>
              <SoundProvider player={fakePlayer()}>
                <Study forced={forced} />
              </SoundProvider>
            </ConfirmProvider>
          </AppProvider>,
        );
        const running = EXERCISES[mode].recordsPositionProgress || mode === 'ear';
        if (running) {
          expect(screen.getByText(/^Pergunta 1 de \d+$/)).toBeInTheDocument();
          answerAnything(container);
        } else {
          expect(screen.getByRole('button', { name: 'Iniciar' })).toBeInTheDocument();
        }
        expect(container.textContent).not.toMatch(BROKEN);
      });
    }
  }
});

describe('Progress and Settings sweep', () => {
  const now = Date.now();
  const history: HistoryEntry[] = QUIZ_MODES.flatMap((mode, i) =>
    (LEVELED_MODES.includes(mode) ? LEVELS : [undefined]).map((level) => ({
      mode,
      at: now - i * 60_000,
      total: 5,
      correct: i % 6,
      averageMs: 1234,
      ...(level ? { level } : {}),
    })),
  );
  const progress: ProgressMap = {
    '6-1': { box: 1, correct: 0, wrong: 2, lastReview: now, nextReview: now },
    '1-12': { box: 5, correct: 9, wrong: 0, lastReview: now, nextReview: now + 1e9 },
    '2-3': { box: 3, correct: 2, wrong: 1, lastReview: now, nextReview: now + 1e6 },
  };
  const stats = { [dayKey(new Date(now))]: { sessions: 2, answered: 10, correct: 7, ms: 15_000 } };

  for (const inst of [GUITAR, BASS]) {
    for (const weeklyGoal of [1, 7]) {
      it(`Progress · ${inst.id} · goal ${weeklyGoal}: every mode in the history`, () => {
        const settings = settingsFor(inst, { weeklyGoal }, weeklyGoal);
        const { container } = render(
          <AppProvider storage={seededStorage({ settings, history: history.slice(0, 20), progress, stats })}>
            <ConfirmProvider>
              <Progress onSelect={() => {}} />
            </ConfirmProvider>
          </AppProvider>,
        );
        expect(screen.getByText('Histórico')).toBeInTheDocument();
        expect(container.textContent).not.toMatch(BROKEN);
        cleanup();
        // As entradas além do limite de 20 também rendem (um balde importado pode tê-las).
        const rest = render(
          <AppProvider storage={seededStorage({ settings, history: history.slice(20) })}>
            <ConfirmProvider>
              <Progress onSelect={() => {}} />
            </ConfirmProvider>
          </AppProvider>,
        );
        expect(rest.container.textContent).not.toMatch(BROKEN);
      });
    }
  }

  it('Settings: every instrument × notation × accidentals × sound × hand', () => {
    let i = 0;
    for (const inst of INSTRUMENTS) {
      for (const notation of NOTATIONS) {
        for (const accidentals of ACCIDENTALS) {
          const settings = settingsFor(inst, { notation, accidentals, soundEnabled: i % 2 === 0, leftHanded: i % 3 === 0 }, i++);
          const { container } = render(
            <AppProvider storage={seededStorage({ settings })}>
              <ConfirmProvider>
                <Settings />
              </ConfirmProvider>
            </AppProvider>,
          );
          expect(screen.getByRole('heading', { name: 'Ajustes' })).toBeInTheDocument();
          expect(container.textContent).not.toMatch(BROKEN);
          cleanup();
        }
      }
    }
  });
});
