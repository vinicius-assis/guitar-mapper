import type { Filter } from '../domain/fretboard';
import { GUITAR, type Instrument } from '../domain/instruments';

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
