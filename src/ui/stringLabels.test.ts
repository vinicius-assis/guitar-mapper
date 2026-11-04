import { BASS } from '../domain/instruments';
import { describe, it, expect } from 'vitest';
import { stringLabels } from './stringLabels';

describe('stringLabels', () => {
  it('lists the open strings E B G D A E, from string 1 to 6, regardless of notation', () => {
    expect(stringLabels()).toEqual(['E', 'B', 'G', 'D', 'A', 'E']);
  });
});

describe('stringLabels (bass)', () => {
  it('lists G D A E for the bass', () => {
    expect(stringLabels(BASS)).toEqual(['G', 'D', 'A', 'E']);
  });
});
