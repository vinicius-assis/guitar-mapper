import { describe, it, expect } from 'vitest';
import { createMemoryStorage, createThrowingStorage } from '../test-utils';
import {
  BACKUP_KEY,
  DEFAULT_SETTINGS,
  STORAGE_KEY,
  createDefaultData,
  loadData,
  saveData,
} from './storage';

describe('loadData', () => {
  it('returns defaults and flags unavailable storage when there is none', () => {
    const result = loadData(null);
    expect(result.data).toEqual(createDefaultData());
    expect(result.storageAvailable).toBe(false);
    expect(result.recovered).toBe(false);
  });

  it('returns defaults when nothing was saved', () => {
    const result = loadData(createMemoryStorage());
    expect(result.data).toEqual(createDefaultData());
    expect(result.storageAvailable).toBe(true);
    expect(result.recovered).toBe(false);
  });

  it('round-trips saved data', () => {
    const storage = createMemoryStorage();
    const data = createDefaultData();
    data.settings.leftHanded = true;
    data.progress['6-0'] = { box: 3, correct: 2, wrong: 1, lastReview: 10, nextReview: 20 };
    expect(saveData(storage, data)).toBe(true);
    expect(loadData(storage).data).toEqual(data);
  });

  it('recovers from corrupted JSON, keeping a backup of the raw value', () => {
    const storage = createMemoryStorage({ [STORAGE_KEY]: '{not json' });
    const result = loadData(storage);
    expect(result.recovered).toBe(true);
    expect(result.data).toEqual(createDefaultData());
    expect(storage.dump()[BACKUP_KEY]).toBe('{not json');
  });

  it('recovers from an unknown version, keeping a backup', () => {
    const raw = JSON.stringify({ version: 2, settings: {}, progress: {} });
    const storage = createMemoryStorage({ [STORAGE_KEY]: raw });
    const result = loadData(storage);
    expect(result.recovered).toBe(true);
    expect(storage.dump()[BACKUP_KEY]).toBe(raw);
  });

  it('fills missing or invalid settings with defaults', () => {
    const raw = JSON.stringify({
      version: 1,
      settings: { notation: 'xyz', leftHanded: true, filter: { strings: [6, 9], fretMin: 8, fretMax: 3 } },
      progress: {},
    });
    const { data } = loadData(createMemoryStorage({ [STORAGE_KEY]: raw }));
    expect(data.settings.notation).toBe(DEFAULT_SETTINGS.notation);
    expect(data.settings.leftHanded).toBe(true);
    expect(data.settings.mode).toBe(DEFAULT_SETTINGS.mode);
    expect(data.settings.filter.strings).toEqual([6]);
    expect(data.settings.filter.fretMin).toBe(3);
    expect(data.settings.filter.fretMax).toBe(8);
    expect(data.settings.filter.naturalsOnly).toBe(true);
  });

  it('moves a saved filter that started at the open string to fret 1', () => {
    const raw = JSON.stringify({
      version: 1,
      settings: { filter: { strings: [6], fretMin: 0, fretMax: 5, naturalsOnly: true } },
      progress: {},
    });
    const { data } = loadData(createMemoryStorage({ [STORAGE_KEY]: raw }));
    expect(data.settings.filter.fretMin).toBe(1);
    expect(data.settings.filter.fretMax).toBe(5);
  });

  it('defaults to frets 1..5', () => {
    const { fretMin, fretMax } = createDefaultData().settings.filter;
    expect([fretMin, fretMax]).toEqual([1, 5]);
  });

  it('keeps an explicitly empty string selection', () => {
    const raw = JSON.stringify({
      version: 1,
      settings: { filter: { strings: [], fretMin: 0, fretMax: 5, naturalsOnly: true } },
      progress: {},
    });
    const { data } = loadData(createMemoryStorage({ [STORAGE_KEY]: raw }));
    expect(data.settings.filter.strings).toEqual([]);
  });

  it('drops invalid progress entries', () => {
    const raw = JSON.stringify({
      version: 1,
      settings: {},
      progress: {
        '6-0': { box: 2, correct: 1, wrong: 0, lastReview: 1, nextReview: 2 },
        '9-0': { box: 2, correct: 1, wrong: 0, lastReview: 1, nextReview: 2 },
        '5-0': { box: 9, correct: 1, wrong: 0, lastReview: 1, nextReview: 2 },
        '4-0': 'oops',
      },
    });
    const { data } = loadData(createMemoryStorage({ [STORAGE_KEY]: raw }));
    expect(Object.keys(data.progress)).toEqual(['6-0']);
  });

  it('survives a storage that throws on read', () => {
    const result = loadData(createThrowingStorage('read'));
    expect(result.data).toEqual(createDefaultData());
    expect(result.storageAvailable).toBe(false);
  });
});

describe('history', () => {
  const entry = { mode: 'flashcard', at: 5, total: 4, correct: 3, averageMs: 1500 };
  const load = (history: unknown) =>
    loadData(
      createMemoryStorage({ [STORAGE_KEY]: JSON.stringify({ version: 1, settings: {}, progress: {}, history }) }),
    ).data.history;

  it('defaults to an empty history, also for data saved before it existed', () => {
    expect(createDefaultData().history).toEqual([]);
    const old = JSON.stringify({ version: 1, settings: {}, progress: {} });
    const result = loadData(createMemoryStorage({ [STORAGE_KEY]: old }));
    expect(result.recovered).toBe(false);
    expect(result.data.history).toEqual([]);
  });

  it('round-trips valid entries', () => {
    expect(load([entry])).toEqual([entry]);
  });

  it('drops invalid entries and keeps only the 20 newest', () => {
    const many = Array.from({ length: 25 }, (_, i) => ({ ...entry, at: i }));
    expect(load([entry, { ...entry, mode: 'nope' }, { ...entry, total: 0 }, { ...entry, correct: 9 }, 'x'])).toEqual([
      entry,
    ]);
    expect(load(many)).toHaveLength(20);
    expect(load('garbage')).toEqual([]);
  });
});

describe('soundEnabled', () => {
  const load = (settings: unknown) =>
    loadData(
      createMemoryStorage({ [STORAGE_KEY]: JSON.stringify({ version: 1, settings, progress: {} }) }),
    ).data.settings.soundEnabled;

  it('defaults to on, also for data saved before the option existed', () => {
    expect(DEFAULT_SETTINGS.soundEnabled).toBe(true);
    expect(load({})).toBe(true);
  });

  it('keeps a saved off, and treats invalid values as on', () => {
    expect(load({ soundEnabled: false })).toBe(false);
    expect(load({ soundEnabled: 'no' })).toBe(true);
  });
});

describe('saveData', () => {
  it('returns false when storage is missing or throws', () => {
    expect(saveData(null, createDefaultData())).toBe(false);
    expect(saveData(createThrowingStorage('write'), createDefaultData())).toBe(false);
  });
});
