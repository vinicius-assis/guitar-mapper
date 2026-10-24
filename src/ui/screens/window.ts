import type { Filter, Position } from '../../domain/fretboard';

/** Janela de casas do braço: a do filtro, ampliada para conter a posição perguntada. */
export function windowFor(filter: Filter, position: Position) {
  return {
    fretMin: Math.min(filter.fretMin, position.fret),
    fretMax: Math.max(filter.fretMax, position.fret),
  };
}
