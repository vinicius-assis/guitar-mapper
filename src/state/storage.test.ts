import { describe, it, expect } from 'vitest';
import type { PositionProgress } from '../domain/scheduler';
import { createMemoryStorage, createThrowingStorage } from '../test-utils';
import {
  BACKUP_KEY,
  DEFAULT_SETTINGS,
  LEGACY_STORAGE_KEY,
  STORAGE_KEY,
  activeView,
  createDefaultData,
  loadData,
  saveData,
  withActive,
} from './storage';

const okProgress: PositionProgress = { box: 2, correct: 1, wrong: 0, lastReview: 1, nextReview: 2 };

/** Texto v2 com `settings` globais e os dados do violão; o baixo fica padrão. */
function v2Raw(
  settings: unknown,
  guitar: { filter?: unknown; progress?: unknown; history?: unknown } = {},
  bass?: unknown,
) {
  const base = createDefaultData();
  return JSON.stringify({
    version: 2,
    settings,
    instruments: { guitar: { ...base.instruments.guitar, ...guitar }, bass: bass ?? base.instruments.bass },
  });
}
const loadActive = (raw: string) => {
  const { data } = loadData(createMemoryStorage({ [STORAGE_KEY]: raw }));
  return activeView(data);
};

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
    data.instruments.guitar.progress['6-0'] = { box: 3, correct: 2, wrong: 1, lastReview: 10, nextReview: 20 };
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
    const raw = JSON.stringify({ version: 3, settings: {}, instruments: {} });
    const storage = createMemoryStorage({ [STORAGE_KEY]: raw });
    const result = loadData(storage);
    expect(result.recovered).toBe(true);
    expect(storage.dump()[BACKUP_KEY]).toBe(raw);
  });

  it('fills missing or invalid settings with defaults', () => {
    const raw = v2Raw(
      { notation: 'xyz', leftHanded: true },
      { filter: { strings: [6, 9], fretMin: 8, fretMax: 3 } },
    );
    const data = loadActive(raw);
    expect(data.settings.notation).toBe(DEFAULT_SETTINGS.notation);
    expect(data.settings.leftHanded).toBe(true);
    expect(data.settings.mode).toBe(DEFAULT_SETTINGS.mode);
    expect(data.settings.filter.strings).toEqual([6]);
    expect(data.settings.filter.fretMin).toBe(3);
    expect(data.settings.filter.fretMax).toBe(8);
    expect(data.settings.filter.naturalsOnly).toBe(true);
  });

  it('moves a saved filter that started at the open string to fret 1', () => {
    const data = loadActive(v2Raw({}, { filter: { strings: [6], fretMin: 0, fretMax: 5, naturalsOnly: true } }));
    expect(data.settings.filter.fretMin).toBe(1);
    expect(data.settings.filter.fretMax).toBe(5);
  });

  it('defaults to frets 1..5', () => {
    const { fretMin, fretMax } = activeView(createDefaultData()).settings.filter;
    expect([fretMin, fretMax]).toEqual([1, 5]);
  });

  it('keeps an explicitly empty string selection', () => {
    const data = loadActive(v2Raw({}, { filter: { strings: [], fretMin: 0, fretMax: 5, naturalsOnly: true } }));
    expect(data.settings.filter.strings).toEqual([]);
  });

  it('drops invalid progress entries', () => {
    const data = loadActive(
      v2Raw(
        {},
        {
          progress: {
            '6-0': okProgress,
            '9-0': okProgress,
            '5-0': { ...okProgress, box: 9 },
            '4-0': 'oops',
          },
        },
      ),
    );
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
    loadActive(v2Raw({}, { history })).history;

  it('defaults to an empty history, also for data saved before it existed', () => {
    expect(activeView(createDefaultData()).history).toEqual([]);
    const old = JSON.stringify({ version: 2, settings: {}, instruments: { guitar: {}, bass: {} } });
    const result = loadData(createMemoryStorage({ [STORAGE_KEY]: old }));
    expect(result.recovered).toBe(false);
    expect(activeView(result.data).history).toEqual([]);
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
    loadActive(v2Raw(settings)).settings.soundEnabled;

  it('defaults to on, also for data saved before the option existed', () => {
    expect(DEFAULT_SETTINGS.soundEnabled).toBe(true);
    expect(load({})).toBe(true);
  });

  it('keeps a saved off, and treats invalid values as on', () => {
    expect(load({ soundEnabled: false })).toBe(false);
    expect(load({ soundEnabled: 'no' })).toBe(true);
  });
});

describe('earLevel', () => {
  const load = (settings: unknown) =>
    loadActive(v2Raw(settings)).settings;

  it('defaults to easy, keeps valid levels and fixes invalid ones', () => {
    expect(DEFAULT_SETTINGS.earLevel).toBe('easy');
    expect(load({}).earLevel).toBe('easy');
    expect(load({ earLevel: 'hard' }).earLevel).toBe('hard');
    expect(load({ earLevel: 'impossible' }).earLevel).toBe('easy');
  });

  it('accepts the ear mode', () => {
    expect(load({ mode: 'ear' }).mode).toBe('ear');
  });
});

describe('history level', () => {
  const load = (history: unknown) =>
    loadActive(v2Raw({}, { history })).history;
  const base = { at: 5, total: 4, correct: 3, averageMs: 1500 };

  it('keeps a valid level on ear entries and defaults missing or invalid ones to easy', () => {
    expect(load([{ ...base, mode: 'ear', level: 'hard' }])[0].level).toBe('hard');
    expect(load([{ ...base, mode: 'ear' }])[0].level).toBe('easy');
    expect(load([{ ...base, mode: 'ear', level: 'x' }])[0].level).toBe('easy');
  });

  it('drops the level on non-ear entries', () => {
    expect(load([{ ...base, mode: 'flashcard', level: 'hard' }])[0]).not.toHaveProperty('level');
  });
});

describe('saveData', () => {
  it('returns false when storage is missing or throws', () => {
    expect(saveData(null, createDefaultData())).toBe(false);
    expect(saveData(createThrowingStorage('write'), createDefaultData())).toBe(false);
  });
});

describe('storage v2', () => {
  it('has a v2 default with a guitar and a bass bucket', () => {
    const data = createDefaultData();
    expect(data.version).toBe(2);
    expect(data.settings.instrument).toBe('guitar');
    expect(data.instruments.guitar.filter.strings).toHaveLength(6);
    expect(data.instruments.bass.filter.strings).toEqual([1, 2, 3, 4]);
    expect(data.instruments.bass.filter).toMatchObject({ fretMin: 1, fretMax: 5, naturalsOnly: true });
  });

  describe('migration from v1', () => {
    const v1 = {
      version: 1,
      settings: {
        notation: 'solfejo',
        filter: { strings: [2, 5], fretMin: 3, fretMax: 9, naturalsOnly: false },
      },
      progress: { '5-3': okProgress },
      history: [{ mode: 'flashcard', at: 5, total: 4, correct: 3, averageMs: 1500 }],
    };

    it('moves all v1 data to the guitar, gives the bass defaults and writes v2', () => {
      const rawV1 = JSON.stringify(v1);
      const storage = createMemoryStorage({ [LEGACY_STORAGE_KEY]: rawV1 });
      const result = loadData(storage);
      expect(result.recovered).toBe(false);
      expect(result.storageAvailable).toBe(true);
      expect(result.data.instruments.guitar.filter).toEqual(v1.settings.filter);
      expect(result.data.instruments.guitar.progress['5-3']).toEqual(okProgress);
      expect(result.data.instruments.guitar.history).toEqual(v1.history);
      expect(result.data.settings.notation).toBe('solfejo');
      expect(result.data.instruments.bass).toEqual(createDefaultData().instruments.bass);
      expect(JSON.parse(storage.dump()[STORAGE_KEY])).toEqual(result.data);
      expect(storage.dump()[LEGACY_STORAGE_KEY]).toBe(rawV1);
    });

    it('still migrates when the v2 write fails', () => {
      const real = createMemoryStorage({ [LEGACY_STORAGE_KEY]: JSON.stringify(v1) });
      const storage = { ...real, setItem: () => { throw new Error('full'); } };
      const result = loadData(storage);
      expect(result.data.instruments.guitar.progress['5-3']).toEqual(okProgress);
    });

    it('prefers v2 over v1 when both exist', () => {
      const raw = v2Raw({ notation: 'cifra' });
      const storage = createMemoryStorage({ [STORAGE_KEY]: raw, [LEGACY_STORAGE_KEY]: JSON.stringify(v1) });
      const { data } = loadData(storage);
      expect(data.settings.notation).toBe('cifra');
      expect(data.instruments.guitar.progress).toEqual({});
    });

    it.each([['unparseable', '{bad'], ['wrong version', JSON.stringify({ version: 2, settings: {} })]])(
      'recovers from a %s v1 value, backing it up and leaving v1 untouched',
      (_label, rawV1) => {
        const storage = createMemoryStorage({ [LEGACY_STORAGE_KEY]: rawV1 });
        const result = loadData(storage);
        expect(result.recovered).toBe(true);
        expect(result.storageAvailable).toBe(true);
        expect(result.data).toEqual(createDefaultData());
        expect(storage.dump()[BACKUP_KEY]).toBe(rawV1);
        expect(storage.dump()[LEGACY_STORAGE_KEY]).toBe(rawV1);
      },
    );

    it('does not re-migrate v1 over a corrupted v2', () => {
      const rawV1 = JSON.stringify(v1);
      const storage = createMemoryStorage({ [STORAGE_KEY]: '{bad', [LEGACY_STORAGE_KEY]: rawV1 });
      const result = loadData(storage);
      expect(result.recovered).toBe(true);
      expect(result.data).toEqual(createDefaultData());
      expect(storage.dump()[BACKUP_KEY]).toBe('{bad');
      expect(storage.dump()[LEGACY_STORAGE_KEY]).toBe(rawV1);
    });
  });

  it('backs up and recovers from v2 with an unknown version', () => {
    const raw = JSON.stringify({ version: 3, settings: {}, instruments: {} });
    const storage = createMemoryStorage({ [STORAGE_KEY]: raw });
    expect(loadData(storage).recovered).toBe(true);
    expect(storage.dump()[BACKUP_KEY]).toBe(raw);
    expect(BACKUP_KEY).toBe('guitar-mapper:v2:backup');
  });

  it('sanitizes the bass bucket by its own string count', () => {
    const base = createDefaultData().instruments.bass;
    const raw = v2Raw(
      { instrument: 'bass' },
      {},
      {
        ...base,
        filter: { strings: [1, 5, 6, 2], fretMin: -3, fretMax: 99, naturalsOnly: true },
        progress: { '4-24': okProgress, '5-3': okProgress },
      },
    );
    const data = loadActive(raw);
    expect(data.settings.filter.strings).toEqual([1, 2]);
    expect(data.settings.filter.fretMin).toBe(1);
    expect(data.settings.filter.fretMax).toBe(24);
    expect(Object.keys(data.progress)).toEqual(['4-24']);
  });

  it('turns an invalid active instrument into guitar', () => {
    expect(loadActive(v2Raw({ instrument: 'tuba' })).settings.instrument).toBe('guitar');
  });

  it('activeView and withActive follow the active instrument', () => {
    const data = createDefaultData();
    data.settings.instrument = 'bass';
    data.instruments.bass.progress['4-3'] = okProgress;
    const view = activeView(data);
    expect(view.settings.filter).toEqual(data.instruments.bass.filter);
    expect(view.progress).toEqual({ '4-3': okProgress });
    const next = withActive(data, { history: [{ mode: 'flashcard', at: 1, total: 1, correct: 1, averageMs: 1 }] });
    expect(next.instruments.bass.history).toHaveLength(1);
    expect(next.instruments.guitar).toEqual(data.instruments.guitar);
  });
});
