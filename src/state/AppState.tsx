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
import { addToHistory, type HistoryEntry } from '../domain/session';
import { applyAnswer } from '../domain/scheduler';
import {
  getBrowserStorage,
  loadData,
  saveData,
  type AppData,
  type Settings,
  type StorageLike,
} from './storage';

interface AppStateValue {
  data: AppData;
  storageAvailable: boolean;
  recovered: boolean;
  recordAnswer(position: Position, correct: boolean): void;
  updateSettings(patch: Partial<Settings>): void;
  resetProgress(): void;
  recordSession(entry: HistoryEntry): void;
  clearHistory(): void;
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
  const [data, setData] = useState<AppData>(init.data);
  const [storageAvailable, setStorageAvailable] = useState(init.storageAvailable);

  const commit = useCallback(
    (next: AppData) => {
      dataRef.current = next;
      setData(next);
      if (!saveData(init.storage, next)) setStorageAvailable(false);
    },
    [init.storage],
  );

  const recordAnswer = useCallback(
    (position: Position, correct: boolean) => {
      const current = dataRef.current;
      const key = positionKey(position);
      commit({
        ...current,
        progress: { ...current.progress, [key]: applyAnswer(current.progress[key], correct, now()) },
      });
    },
    [commit, now],
  );

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      const current = dataRef.current;
      commit({ ...current, settings: { ...current.settings, ...patch } });
    },
    [commit],
  );

  const resetProgress = useCallback(() => {
    commit({ ...dataRef.current, progress: {} });
  }, [commit]);

  const recordSession = useCallback(
    (entry: HistoryEntry) => {
      const current = dataRef.current;
      commit({ ...current, history: addToHistory(current.history, entry) });
    },
    [commit],
  );

  const clearHistory = useCallback(() => {
    commit({ ...dataRef.current, history: [] });
  }, [commit]);

  const value = useMemo<AppStateValue>(
    () => ({
      data,
      storageAvailable,
      recovered: init.recovered,
      recordAnswer,
      updateSettings,
      resetProgress,
      recordSession,
      clearHistory,
    }),
    [
      data,
      storageAvailable,
      init.recovered,
      recordAnswer,
      updateSettings,
      resetProgress,
      recordSession,
      clearHistory,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const value = useContext(AppStateContext);
  if (!value) throw new Error('useAppState must be used inside <AppProvider>');
  return value;
}
