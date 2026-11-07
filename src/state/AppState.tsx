import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { positionKey, type Position } from '../domain/fretboard';
import { addToHistory, type HistoryEntry, type SessionResult } from '../domain/session';
import { addSessionToStats } from '../domain/stats';
import { applyAnswer } from '../domain/scheduler';
import { instrumentById, type Instrument } from '../domain/instruments';
import {
  BACKUP_KEY,
  activeView,
  getBrowserStorage,
  loadData,
  saveData,
  withActive,
  type ActiveData,
  type AppData,
  type Settings,
  type StorageLike,
} from './storage';

interface AppStateValue {
  data: ActiveData;
  instrument: Instrument;
  storageAvailable: boolean;
  recovered: boolean;
  recordAnswer(position: Position, correct: boolean): void;
  /** Resposta a um item de Ouvido/Intervalos (`ear:<midi>`, `interval:<raiz>:<id>`). */
  recordItemAnswer(key: string, correct: boolean): void;
  /** Soma uma sessão terminada às estatísticas do dia local; sessão vazia não grava nada. */
  recordStudyDay(results: SessionResult[]): void;
  updateSettings(patch: Partial<Settings>): void;
  resetProgress(): void;
  recordSession(entry: HistoryEntry): void;
  clearHistory(): void;
  importData(next: AppData): void;
  /** O AppData inteiro (todos os instrumentos), para exportar. */
  exportData(): AppData;
}

const AppStateContext = createContext<AppStateValue | null>(null);

interface AppProviderProps {
  /** Omitido: localStorage do navegador. `null`: sem armazenamento. */
  storage?: StorageLike | null;
  now?: () => number;
  children: ReactNode;
}

export function AppProvider({ storage, now = Date.now, children }: AppProviderProps) {
  const [init] = useState(() => {
    const resolved = storage === undefined ? getBrowserStorage() : storage;
    return { storage: resolved, ...loadData(resolved) };
  });
  const dataRef = useRef<AppData>(init.data);
  const [appData, setAppData] = useState<AppData>(init.data);
  const [storageAvailable, setStorageAvailable] = useState(init.storageAvailable);

  const commit = useCallback(
    (next: AppData) => {
      dataRef.current = next;
      setAppData(next);
      if (!saveData(init.storage, next)) setStorageAvailable(false);
    },
    [init.storage],
  );

  const recordAnswer = useCallback(
    (position: Position, correct: boolean) => {
      const current = dataRef.current;
      const key = positionKey(position);
      const { progress } = activeView(current);
      commit(withActive(current, { progress: { ...progress, [key]: applyAnswer(progress[key], correct, now()) } }));
    },
    [commit, now],
  );

  const recordItemAnswer = useCallback(
    (key: string, correct: boolean) => {
      const current = dataRef.current;
      const { itemProgress } = activeView(current);
      commit(withActive(current, { items: { ...itemProgress, [key]: applyAnswer(itemProgress[key], correct, now()) } }));
    },
    [commit, now],
  );

  const recordStudyDay = useCallback(
    (results: SessionResult[]) => {
      const current = dataRef.current;
      const stats = addSessionToStats(current.stats, results, new Date(now()));
      if (stats !== current.stats) commit({ ...current, stats });
    },
    [commit, now],
  );

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      const current = dataRef.current;
      const { filter, ...globals } = patch;
      const next: AppData = { ...current, settings: { ...current.settings, ...globals } };
      commit(filter ? withActive(next, { filter }) : next);
    },
    [commit],
  );

  const resetProgress = useCallback(() => {
    commit(withActive(dataRef.current, { progress: {} }));
  }, [commit]);

  const recordSession = useCallback(
    (entry: HistoryEntry) => {
      const current = dataRef.current;
      commit(withActive(current, { history: addToHistory(activeView(current).history, entry) }));
    },
    [commit],
  );

  const clearHistory = useCallback(() => {
    commit(withActive(dataRef.current, { history: [] }));
  }, [commit]);

  const importData = useCallback(
    (next: AppData) => {
      try {
        init.storage?.setItem(BACKUP_KEY, JSON.stringify(dataRef.current));
      } catch {
        // sem backup possível; segue com a importação
      }
      commit(next);
    },
    [commit, init.storage],
  );

  const exportData = useCallback(() => dataRef.current, []);

  const data = useMemo(() => activeView(appData), [appData]);
  const instrument = useMemo(() => instrumentById(appData.settings.instrument), [appData.settings.instrument]);

  const value = useMemo<AppStateValue>(
    () => ({
      data,
      instrument,
      storageAvailable,
      recovered: init.recovered,
      recordAnswer,
      recordItemAnswer,
      recordStudyDay,
      updateSettings,
      resetProgress,
      recordSession,
      clearHistory,
      importData,
      exportData,
    }),
    [
      data,
      instrument,
      storageAvailable,
      init.recovered,
      recordAnswer,
      recordItemAnswer,
      recordStudyDay,
      updateSettings,
      resetProgress,
      recordSession,
      clearHistory,
      importData,
      exportData,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const value = useContext(AppStateContext);
  if (!value) throw new Error('useAppState must be used inside <AppProvider>');
  return value;
}
