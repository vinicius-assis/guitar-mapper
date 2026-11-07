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
