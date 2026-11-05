import { INTERVALS, type IntervalId } from '../domain/intervals';
import { ALL_NOTES, NATURAL_NOTES } from '../domain/notes';
import { useAppState } from '../state/AppState';
import type { IntervalAdvance } from '../state/storage';

/** Edição do foco de intervalos (quais intervalos e a próxima pergunta); as notas ficam em useFocusFilter. */
export function useIntervalFocus() {
  const { data, updateSettings } = useAppState();
  const { intervals, intervalAdvance, filter } = data.settings;
  const count = (filter.naturalsOnly ? NATURAL_NOTES : ALL_NOTES).length * intervals.length;

  return {
    intervals,
    advance: intervalAdvance,
    count,
    toggleInterval: (id: IntervalId) => {
      const next = intervals.includes(id) ? intervals.filter((x) => x !== id) : [...intervals, id];
      updateSettings({ intervals: INTERVALS.map((i) => i.id).filter((x) => next.includes(x)) });
    },
    selectAllIntervals: () => updateSettings({ intervals: INTERVALS.map((i) => i.id) }),
    setAdvance: (value: IntervalAdvance) => updateSettings({ intervalAdvance: value }),
  };
}

export const ADVANCE_OPTIONS: readonly { value: IntervalAdvance; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: '3s', label: '3 s' },
  { value: '5s', label: '5 s' },
];
