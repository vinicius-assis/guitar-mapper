import { useMemo } from 'react';
import { FIRST_QUIZ_FRET, MAX_FRET, positionsInFilter, type Filter } from '../domain/fretboard';
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

/** Edição do foco (cordas, casas, notas), compartilhada pela aba Foco e pelo cartão do Estudar. */
export function useFocusFilter() {
  const { data, instrument, updateSettings } = useAppState();
  const { filter } = data.settings;
  const count = useMemo(() => positionsInFilter(filter, instrument).length, [filter, instrument]);
  const allStrings = useMemo(
    () => Array.from({ length: instrument.stringCount }, (_, i) => i + 1),
    [instrument],
  );

  const setFilter = (patch: Partial<Filter>) => updateSettings({ filter: { ...filter, ...patch } });

  return {
    filter,
    count,
    allStrings,
    toggleString: (s: number) =>
      setFilter({
        strings: filter.strings.includes(s)
          ? filter.strings.filter((x) => x !== s)
          : [...filter.strings, s].sort((a, b) => a - b),
      }),
    selectAllStrings: () => setFilter({ strings: allStrings }),
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
