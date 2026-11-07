import { describe, it, expect } from 'vitest';
import { seededStorage } from '../test-utils';
import { createDefaultData, STORAGE_KEY } from './storage';
import { exportFilename, parseImport, serializeData } from './backup';

const MSG = 'Arquivo não reconhecido. Escolha um arquivo exportado pelo Guitar Mapper.';

describe('backup', () => {
  it('round-trips data', () => {
    const storage = seededStorage({
      settings: { instrument: 'bass' },
      progress: { '4-3': { box: 3, correct: 2, wrong: 1, lastReview: 10, nextReview: 20 } },
      history: [{ mode: 'flashcard', at: 7, total: 2, correct: 1, averageMs: 900 }],
    });
    const d = JSON.parse(storage.dump()[STORAGE_KEY]);
    const r = parseImport(serializeData(d));
    expect(r).toEqual({ ok: true, data: d });
  });

  it('names the file with the local date', () => {
    expect(exportFilename(new Date(2026, 10, 7, 23, 30))).toBe('guitar-mapper-2026-11-07.json');
  });

  it.each([
    '',
    'não é json',
    '[]',
    'null',
    '{"version":1,"instruments":{}}',
    '{"version":3,"instruments":{}}',
    '{"version":2}',
    '{"version":2,"instruments":[]}',
  ])('rejects %j', (text) => {
    expect(parseImport(text)).toEqual({ ok: false, error: MSG });
  });

  it('falls back to defaults for junk inside a valid structure', () => {
    expect(parseImport('{"version":2,"instruments":{"guitar":5}}')).toEqual({
      ok: true,
      data: createDefaultData(),
    });
  });

  it('drops progress with invalid keys', () => {
    const r = parseImport('{"version":2,"instruments":{"guitar":{"progress":{"x":{}}}}}');
    expect(r.ok && r.data.instruments.guitar.progress).toEqual({});
  });
});

describe('backup with items and stats', () => {
  it('preserves valid items and stats on import', () => {
    const d = createDefaultData();
    d.instruments.guitar.items = { 'ear:60': { box: 2, correct: 1, wrong: 0, lastReview: 1, nextReview: 2 } };
    d.stats = { '2026-11-07': { sessions: 1, answered: 2, correct: 1, ms: 4000 } };
    d.settings.weeklyGoal = 3;
    expect(parseImport(serializeData(d))).toEqual({ ok: true, data: d });
  });
});

describe('backup with accidentals', () => {
  it('round-trips the setting', () => {
    const d = createDefaultData();
    d.settings.accidentals = 'auto';
    expect(parseImport(serializeData(d))).toEqual({ ok: true, data: d });
  });

  it.each(['{"version":2,"settings":{"notation":"cifra"},"instruments":{}}', '{"version":2,"settings":{"accidentals":"x"},"instruments":{}}'])(
    'defaults to sharp when absent or invalid: %s',
    (text) => {
      const r = parseImport(text);
      expect(r.ok && r.data.settings.accidentals).toBe('sharp');
    },
  );
});

describe('backup with M3 ear settings and keys', () => {
  it('round-trips earIntervalDirection and a func item', () => {
    const d = createDefaultData();
    d.settings.earIntervalDirection = 'down';
    d.instruments.bass.items = { 'func:3:5': { box: 2, correct: 1, wrong: 0, lastReview: 1, nextReview: 2 } };
    expect(parseImport(serializeData(d))).toEqual({ ok: true, data: d });
  });
});
