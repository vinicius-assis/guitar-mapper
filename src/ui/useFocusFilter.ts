import { useMemo } from 'react';
import { FIRST_QUIZ_FRET, MAX_FRET, STRING_COUNT, positionsInFilter, type Filter } from '../domain/fretboard';
import { useAppState } from '../state/AppState';

export const FRET_PRESETS = [
  { label: `${FIRST_QUIZ_FRET}–5`, min: FIRST_QUIZ_FRET, max: 5 },
  { label: '5–12', min: 5, max: 12 },
  { label: '12–24', min: 12, max: 24 },
];
export const FRET_OPTIONS = Array.from(
  { length: MAX_FRET - FIRST_QUIZ_FRET + 1 },
  (_, i) => FIRST_QUIZ_FRET + i,
);
export const ALL_STRINGS = Array.from({ length: STRING_COUNT }, (_, i) => i + 1);

/** Edição do foco (cordas, casas, notas), compartilhada pela aba Foco e pelo cartão do Estudar. */
export function useFocusFilter() {
  const { data, updateSettings } = useAppState();
  const { filter } = data.settings;
  const count = useMemo(() => positionsInFilter(filter).length, [filter]);

  const setFilter = (patch: Partial<Filter>) => updateSettings({ filter: { ...filter, ...patch } });

  return {
    filter,
    count,
    toggleString: (s: number) =>
      setFilter({
        strings: filter.strings.includes(s)
          ? filter.strings.filter((x) => x !== s)
          : [...filter.strings, s].sort((a, b) => a - b),
      }),
    selectAllStrings: () => setFilter({ strings: ALL_STRINGS }),
    setRange: (min: number, max: number) => setFilter({ fretMin: min, fretMax: max }),
    setMin: (value: string) => {
      const n = Number(value);
      setFilter({ fretMin: n, fretMax: Math.max(n, filter.fretMax) });
    },
    setMax: (value: string) => {
      const n = Number(value);
      setFilter({ fretMax: n, fretMin: Math.min(n, filter.fretMin) });
    },
    setNaturalsOnly: (naturalsOnly: boolean) => setFilter({ naturalsOnly }),
  };
}
