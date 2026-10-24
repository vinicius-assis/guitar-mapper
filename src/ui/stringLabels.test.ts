import { describe, it, expect } from 'vitest';
import { stringLabels } from './stringLabels';

describe('stringLabels', () => {
  it('lists the open strings from string 1 to 6 in each notation', () => {
    expect(stringLabels('cifra')).toEqual(['E', 'B', 'G', 'D', 'A', 'E']);
    expect(stringLabels('solfejo')).toEqual(['Mi', 'Si', 'Sol', 'Ré', 'Lá', 'Mi']);
    expect(stringLabels('ambos')[2]).toBe('G · Sol');
  });
});
