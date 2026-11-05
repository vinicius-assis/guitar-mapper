import type { Filter } from '../domain/fretboard';
import { GUITAR, type Instrument } from '../domain/instruments';
import { INTERVALS, type IntervalId } from '../domain/intervals';
import type { IntervalAdvance } from '../state/storage';

export interface FocusSummary {
  strings: string;
  frets: string;
  notes: string;
}

function joinList(items: number[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}

export function describeFocus(filter: Filter, instrument: Instrument = GUITAR): FocusSummary {
  const strings = [...filter.strings].sort((a, b) => a - b);
  return {
    strings:
      strings.length === instrument.stringCount ? 'Todas' : strings.length === 0 ? 'Nenhuma' : joinList(strings),
    frets:
      filter.fretMin === filter.fretMax ? `${filter.fretMin}` : `${filter.fretMin}–${filter.fretMax}`,
    notes: filter.naturalsOnly ? 'Naturais' : 'Com acidentais',
  };
}

export interface IntervalFocusSummary {
  intervals: string;
  notes: string;
  advance: string;
}

const ADVANCE_LABELS: Record<IntervalAdvance, string> = { manual: 'Manual', '3s': '3 s', '5s': '5 s' };

export function describeIntervalFocus(
  intervals: readonly IntervalId[],
  naturalsOnly: boolean,
  advance: IntervalAdvance,
): IntervalFocusSummary {
  const chosen = INTERVALS.filter((i) => intervals.includes(i.id));
  return {
    intervals:
      chosen.length === INTERVALS.length ? 'Todos' : chosen.length === 0 ? 'Nenhum' : chosen.map((i) => i.label).join(', '),
    notes: naturalsOnly ? 'Naturais' : 'Com acidentais',
    advance: ADVANCE_LABELS[advance],
  };
}
