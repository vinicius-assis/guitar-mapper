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
  guitar: { filter?: unknown; progress?: unknown; history?: unknown; items?: unknown } = {},
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

  it('keeps the level on the new ear modes, defaulting to easy', () => {
    expect(load([{ ...base, mode: 'ear-interval', level: 'hard' }])[0].level).toBe('hard');
    expect(load([{ ...base, mode: 'ear-degree' }])[0].level).toBe('easy');
    expect(load([{ ...base, mode: 'ear-degree', level: 'x' }])[0].level).toBe('easy');
  });

  it('accepts the new modes as the saved mode', () => {
    expect(loadActive(v2Raw({ mode: 'ear-degree' })).settings.mode).toBe('ear-degree');
  });

  it('accepts the scale modes, without a level on their history entries', () => {
    expect(load([{ ...base, mode: 'scale-play', level: 'hard' }])[0]).toMatchObject({ mode: 'scale-play' });
    expect(load([{ ...base, mode: 'scale-play', level: 'hard' }])[0]).not.toHaveProperty('level');
    expect(load([{ ...base, mode: 'scale-degree' }])[0]).not.toHaveProperty('level');
    expect(loadActive(v2Raw({ mode: 'scale-degree' })).settings.mode).toBe('scale-degree');
  });

  it('accepts the harmony modes, without a level on their history entries', () => {
    expect(load([{ ...base, mode: 'harmony-quality', level: 'hard' }])[0]).toMatchObject({ mode: 'harmony-quality' });
    expect(load([{ ...base, mode: 'harmony-quality', level: 'hard' }])[0]).not.toHaveProperty('level');
    expect(load([{ ...base, mode: 'harmony-degree' }])[0]).not.toHaveProperty('level');
    expect(loadActive(v2Raw({ mode: 'harmony-chord' })).settings.mode).toBe('harmony-chord');
  });

  it('accepts the M7 modes, without a level on their history entries', () => {
    expect(load([{ ...base, mode: 'arpeggio' }])[0]).toMatchObject({ mode: 'arpeggio' });
    expect(load([{ ...base, mode: 'arpeggio' }])[0]).not.toHaveProperty('level');
    expect(loadActive(v2Raw({ mode: 'ii-v-i' })).settings.mode).toBe('ii-v-i');
  });

  it('accepts the chord modes, without a level on their history entries', () => {
    expect(load([{ ...base, mode: 'chord-name' }])[0]).toMatchObject({ mode: 'chord-name' });
    expect(load([{ ...base, mode: 'chord-name' }])[0]).not.toHaveProperty('level');
    expect(load([{ ...base, mode: 'chord-play', level: 'hard' }])[0]).not.toHaveProperty('level');
    expect(loadActive(v2Raw({ mode: 'chord-play' })).settings.mode).toBe('chord-play');
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

  it.each([['missing', { version: 2, settings: {} }], ['not an object', { version: 2, settings: {}, instruments: 5 }]])(
    'treats a v2 value whose instruments is %s as unreadable: backs it up and recovers',
    (_label, value) => {
      const raw = JSON.stringify(value);
      const rawV1 = JSON.stringify({ version: 1, settings: {}, progress: {}, history: [] });
      const storage = createMemoryStorage({ [STORAGE_KEY]: raw, [LEGACY_STORAGE_KEY]: rawV1 });
      const result = loadData(storage);
      expect(result.recovered).toBe(true);
      expect(result.data).toEqual(createDefaultData());
      expect(storage.dump()[BACKUP_KEY]).toBe(raw);
      expect(storage.dump()[LEGACY_STORAGE_KEY]).toBe(rawV1);
    },
  );

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

describe('interval settings', () => {
  const load = (settings: unknown) => loadActive(v2Raw(settings)).settings;

  it('defaults to the standard intervals and manual advance', () => {
    const d = createDefaultData().settings;
    expect(d.intervals).toEqual(['3m', '3M', '5J', '7m', '7M']);
    expect(d.intervalAdvance).toBe('manual');
    expect(load({}).intervals).toEqual(['3m', '3M', '5J', '7m', '7M']);
    expect(load({}).intervalAdvance).toBe('manual');
  });

  it('sanitizes intervals: order kept, invalid and duplicates dropped, empty stays empty', () => {
    expect(load({ intervals: ['5J', '9M', '3m', '5J'] }).intervals).toEqual(['5J', '3m']);
    expect(load({ intervals: [] }).intervals).toEqual([]);
    expect(load({ intervals: 'x' }).intervals).toEqual(['3m', '3M', '5J', '7m', '7M']);
  });

  it('sanitizes intervalAdvance', () => {
    expect(load({ intervalAdvance: '7s' }).intervalAdvance).toBe('manual');
    expect(load({ intervalAdvance: '5s' }).intervalAdvance).toBe('5s');
  });

  it('accepts the interval mode and keeps interval history without level', () => {
    expect(load({ mode: 'interval' }).mode).toBe('interval');
    const h = loadActive(
      v2Raw({}, { history: [{ mode: 'interval', at: 5, total: 4, correct: 3, averageMs: 1500, level: 'hard' }] }),
    ).history;
    expect(h).toHaveLength(1);
    expect(h[0].mode).toBe('interval');
    expect(h[0]).not.toHaveProperty('level');
  });
});

describe('items, stats and weeklyGoal (additive v2 fields)', () => {
  const okItem: PositionProgress = { box: 3, correct: 2, wrong: 1, lastReview: 10, nextReview: 20 };
  const okDay = { sessions: 2, answered: 10, correct: 7, ms: 12000 };

  it('defaults to empty items, empty stats and a weekly goal of 5', () => {
    const d = createDefaultData();
    expect(d.instruments.guitar.items).toEqual({});
    expect(d.instruments.bass.items).toEqual({});
    expect(d.stats).toEqual({});
    expect(d.settings.weeklyGoal).toBe(5);
    expect(DEFAULT_SETTINGS.weeklyGoal).toBe(5);
  });

  it('loads an old v2 save without the new fields with defaults', () => {
    const old = {
      version: 2,
      settings: { notation: 'cifra' },
      instruments: {
        guitar: { filter: createDefaultData().instruments.guitar.filter, progress: {}, history: [] },
        bass: { filter: createDefaultData().instruments.bass.filter, progress: {}, history: [] },
      },
    };
    const storage = createMemoryStorage({ [STORAGE_KEY]: JSON.stringify(old) });
    const { data } = loadData(storage);
    expect(data.instruments.guitar.items).toEqual({});
    expect(data.instruments.bass.items).toEqual({});
    expect(data.stats).toEqual({});
    expect(data.settings.weeklyGoal).toBe(5);
    // carregar não regrava o armazenamento
    expect(storage.dump()[STORAGE_KEY]).toBe(JSON.stringify(old));
  });

  it('gives a migrated v1 save the defaults', () => {
    const v1 = { version: 1, settings: {}, progress: {}, history: [] };
    const { data } = loadData(createMemoryStorage({ [LEGACY_STORAGE_KEY]: JSON.stringify(v1) }));
    expect(data.instruments.guitar.items).toEqual({});
    expect(data.instruments.bass.items).toEqual({});
    expect(data.stats).toEqual({});
    expect(data.settings.weeklyGoal).toBe(5);
  });

  it('drops invalid item keys and entries, keeps valid ones', () => {
    const items = {
      x: okItem,
      'ear:abc': okItem,
      'interval:99:3m': okItem,
      'interval:0:zz': okItem,
      'ear:61': { ...okItem, box: 9 },
      'ear:60': okItem,
      'interval:0:3m': okItem,
    };
    const { data } = loadData(createMemoryStorage({ [STORAGE_KEY]: v2Raw({}, { items }) }));
    expect(data.instruments.guitar.items).toEqual({ 'ear:60': okItem, 'interval:0:3m': okItem });
  });

  it('drops an ear:60 entry with an invalid box', () => {
    const items = { 'ear:60': { ...okItem, box: 9 } };
    const { data } = loadData(createMemoryStorage({ [STORAGE_KEY]: v2Raw({}, { items }) }));
    expect(data.instruments.guitar.items).toEqual({});
  });

  it('treats non-object items as empty', () => {
    const { data } = loadData(createMemoryStorage({ [STORAGE_KEY]: v2Raw({}, { items: 'x' }) }));
    expect(data.instruments.guitar.items).toEqual({});
  });

  it('drops invalid stats days, keeps valid ones', () => {
    const raw = JSON.parse(v2Raw({}));
    raw.stats = {
      hoje: okDay,
      '2026-11-07': { ...okDay, answered: -1 },
      '2026-11-08': { ...okDay, correct: 11 },
      '2026-11-09': { ...okDay, sessions: 1.5 },
      '2026-11-10': { ...okDay, ms: Infinity },
      '2026-11-11': 'x',
      '2026-11-06': okDay,
    };
    const { data } = loadData(createMemoryStorage({ [STORAGE_KEY]: JSON.stringify(raw) }));
    expect(data.stats).toEqual({ '2026-11-06': okDay });
  });

  it('treats non-object stats as empty', () => {
    const raw = JSON.parse(v2Raw({}));
    raw.stats = [okDay];
    expect(loadData(createMemoryStorage({ [STORAGE_KEY]: JSON.stringify(raw) })).data.stats).toEqual({});
  });

  it.each([
    [0, 5],
    [8, 5],
    [2.5, 5],
    ['5', 5],
    [null, 5],
    [3, 3],
    [1, 1],
    [7, 7],
  ])('sanitizes weeklyGoal %j to %j', (value, expected) => {
    expect(loadActive(v2Raw({ weeklyGoal: value })).settings.weeklyGoal).toBe(expected);
  });

  it('round-trips valid items and stats, and activeView exposes them', () => {
    const storage = createMemoryStorage();
    const data = createDefaultData();
    data.settings.instrument = 'bass';
    data.instruments.bass.items = { 'ear:40': okItem };
    data.instruments.guitar.items = { 'interval:3:5J': okItem };
    data.stats = { '2026-11-07': okDay };
    data.settings.weeklyGoal = 4;
    saveData(storage, data);
    const loaded = loadData(storage).data;
    expect(loaded).toEqual(data);
    const view = activeView(loaded);
    expect(view.itemProgress).toEqual({ 'ear:40': okItem });
    expect(view.stats).toEqual({ '2026-11-07': okDay });
    expect(withActive(loaded, { items: {} }).instruments.bass.items).toEqual({});
  });
});

describe('accidentals (additive v2 field)', () => {
  it('defaults to sharp', () => {
    expect(createDefaultData().settings.accidentals).toBe('sharp');
    expect(DEFAULT_SETTINGS.accidentals).toBe('sharp');
  });

  it('loads an old v2 save without the field, without rewriting it', () => {
    const raw = v2Raw({ notation: 'cifra' });
    const storage = createMemoryStorage({ [STORAGE_KEY]: raw });
    const { data } = loadData(storage);
    expect(data.settings.accidentals).toBe('sharp');
    expect(storage.dump()[STORAGE_KEY]).toBe(raw);
  });

  it.each(['flat', 'auto', 'sharp'])('keeps a valid value (%s)', (accidentals) => {
    expect(loadActive(v2Raw({ accidentals })).settings.accidentals).toBe(accidentals);
  });

  it.each(['Flat', 'bemol', 1, null, true, {}])('falls back to sharp for %j', (accidentals) => {
    expect(loadActive(v2Raw({ accidentals })).settings.accidentals).toBe('sharp');
  });

  it('gives a migrated v1 save sharp', () => {
    const storage = createMemoryStorage({
      [LEGACY_STORAGE_KEY]: JSON.stringify({ version: 1, settings: {}, progress: {}, history: [] }),
    });
    expect(loadData(storage).data.settings.accidentals).toBe('sharp');
  });
});

describe('M3 ear settings (additive v2 fields)', () => {
  const load = (settings: unknown) => loadActive(v2Raw(settings)).settings;

  it('has the M3 defaults', () => {
    expect(DEFAULT_SETTINGS.earIntervalLevel).toBe('easy');
    expect(DEFAULT_SETTINGS.earIntervalDirection).toBe('up');
    expect(DEFAULT_SETTINGS.degreeLevel).toBe('easy');
  });

  it('loads an old v2 save without the fields with defaults and does not rewrite it', () => {
    const old = {
      version: 2,
      settings: { notation: 'cifra' },
      instruments: {
        guitar: { filter: createDefaultData().instruments.guitar.filter, progress: {}, history: [] },
        bass: { filter: createDefaultData().instruments.bass.filter, progress: {}, history: [] },
      },
    };
    const storage = createMemoryStorage({ [STORAGE_KEY]: JSON.stringify(old) });
    const { data } = loadData(storage);
    expect(data.settings.earIntervalLevel).toBe('easy');
    expect(data.settings.earIntervalDirection).toBe('up');
    expect(data.settings.degreeLevel).toBe('easy');
    expect(storage.dump()[STORAGE_KEY]).toBe(JSON.stringify(old));
  });

  it('keeps valid values', () => {
    const s = load({ earIntervalLevel: 'hard', earIntervalDirection: 'both', degreeLevel: 'medium' });
    expect(s.earIntervalLevel).toBe('hard');
    expect(s.earIntervalDirection).toBe('both');
    expect(s.degreeLevel).toBe('medium');
  });

  it.each(['Hard', 1, null, 'sobe', {}])('falls back to the default for %j', (bad) => {
    const s = load({ earIntervalLevel: bad, earIntervalDirection: bad, degreeLevel: bad });
    expect(s.earIntervalLevel).toBe('easy');
    expect(s.earIntervalDirection).toBe('up');
    expect(s.degreeLevel).toBe('easy');
  });
});

describe('M3 item keys', () => {
  const entry: PositionProgress = { box: 3, correct: 2, wrong: 1, lastReview: 10, nextReview: 20 };

  it('keeps earint/func keys and old ones, drops malformed ones', () => {
    const good = ['earint:0:0:up', 'earint:11:12:down', 'func:0:1', 'func:11:7', 'ear:52', 'interval:0:3M'];
    const bad = ['earint:0:0:down', 'earint:12:4:up', 'func:0:8', 'func:00:1', 'earint:0:4'];
    const items = Object.fromEntries([...good, ...bad].map((k) => [k, entry]));
    const { data } = loadData(createMemoryStorage({ [STORAGE_KEY]: v2Raw({}, { items }) }));
    expect(Object.keys(data.instruments.guitar.items).sort()).toEqual([...good].sort());
  });
});

describe('M4 scale settings (additive v2 fields)', () => {
  const load = (settings: unknown) => loadActive(v2Raw(settings)).settings;

  it('has the defaults', () => {
    expect(DEFAULT_SETTINGS.scale).toBe('pent-minor');
    expect(DEFAULT_SETTINGS.scaleBox).toBe(1);
  });

  it('loads an old v2 save without the fields and does not rewrite it', () => {
    const text = v2Raw({ notation: 'cifra' });
    const storage = createMemoryStorage({ [STORAGE_KEY]: text });
    const { data } = loadData(storage);
    expect(data.settings.scale).toBe('pent-minor');
    expect(data.settings.scaleBox).toBe(1);
    expect(storage.dump()[STORAGE_KEY]).toBe(text);
  });

  it('keeps valid values', () => {
    expect(load({ scale: 'locrian', scaleBox: 7 })).toMatchObject({ scale: 'locrian', scaleBox: 7 });
    expect(load({ scale: 'blues', scaleBox: 'all' })).toMatchObject({ scale: 'blues', scaleBox: 'all' });
  });

  it.each(['Blues', 3, null])('falls back for invalid scale %j', (scale) => {
    expect(load({ scale }).scale).toBe('pent-minor');
  });

  it.each([
    [{ scale: 'pent-minor', scaleBox: 7 }],
    [{ scale: 'pent-minor', scaleBox: '3' }],
    [{ scale: 'pent-minor', scaleBox: 0 }],
    [{ scale: 'pent-minor', scaleBox: 'todos' }],
  ])('falls back for invalid scaleBox %j', (settings) => {
    expect(load(settings).scaleBox).toBe(1);
  });

  it('falls back both when the scale is invalid', () => {
    expect(load({ scale: 'x', scaleBox: 6 })).toMatchObject({ scale: 'pent-minor', scaleBox: 1 });
  });
});

describe('M4 item keys', () => {
  const entry: PositionProgress = { box: 3, correct: 2, wrong: 1, lastReview: 10, nextReview: 20 };

  it('keeps scale keys and old ones, drops malformed ones', () => {
    const good = ['scaledeg:pent-minor:1:6:1', 'scaleplay:major:11:7', 'ear:52', 'interval:0:3M', 'func:0:1'];
    const bad = ['scaledeg:pent-minor:6:1:1', 'scaleplay:major:12:1', 'scaledeg:x:1:1:1'];
    const items = Object.fromEntries([...good, ...bad].map((k) => [k, entry]));
    const { data } = loadData(createMemoryStorage({ [STORAGE_KEY]: v2Raw({}, { items }) }));
    expect(Object.keys(data.instruments.guitar.items).sort()).toEqual([...good].sort());
  });
});

describe('M5 harmony settings (additive v2 fields)', () => {
  const load = (settings: unknown) => loadActive(v2Raw(settings)).settings;

  it('has the defaults', () => {
    expect(DEFAULT_SETTINGS).toMatchObject({ harmonyField: 'major', harmonySevenths: false, harmonyKeys: 'easy' });
  });

  it('loads an old v2 save without the fields and does not rewrite it', () => {
    const text = v2Raw({ notation: 'cifra' });
    const storage = createMemoryStorage({ [STORAGE_KEY]: text });
    const { data } = loadData(storage);
    expect(data.settings).toMatchObject({ harmonyField: 'major', harmonySevenths: false, harmonyKeys: 'easy' });
    expect(storage.dump()[STORAGE_KEY]).toBe(text);
  });

  it('keeps valid values', () => {
    expect(load({ harmonyField: 'both', harmonySevenths: true, harmonyKeys: 'all' })).toMatchObject({
      harmonyField: 'both',
      harmonySevenths: true,
      harmonyKeys: 'all',
    });
  });

  it.each(['Major', 'true', 'hard', null])('falls back for invalid %j', (bad) => {
    expect(load({ harmonyField: bad, harmonySevenths: bad, harmonyKeys: bad })).toMatchObject({
      harmonyField: 'major',
      harmonySevenths: false,
      harmonyKeys: 'easy',
    });
  });
});

describe('M5 item keys', () => {
  const entry: PositionProgress = { box: 3, correct: 2, wrong: 1, lastReview: 10, nextReview: 20 };

  it('keeps harmony keys and old ones, drops malformed ones', () => {
    const good = ['hchord:major:5:4', 'hdeg:minor:9:7', 'hqual:major:seventh:7', 'scaledeg:pent-minor:1:6:1', 'func:0:1'];
    const bad = ['hchord:major:5:1', 'hdeg:major:12:2', 'hqual:major:triad:8'];
    const items = Object.fromEntries([...good, ...bad].map((k) => [k, entry]));
    const { data } = loadData(createMemoryStorage({ [STORAGE_KEY]: v2Raw({}, { items }) }));
    expect(Object.keys(data.instruments.guitar.items).sort()).toEqual([...good].sort());
  });
});

describe('M6 chord settings (additive v2 fields)', () => {
  const load = (settings: unknown) => loadActive(v2Raw(settings)).settings;

  it('has the defaults', () => {
    expect(DEFAULT_SETTINGS).toMatchObject({ chordShapes: 'open', chordKinds: 'triads' });
  });

  it('loads an old v2 save without the fields and does not rewrite it', () => {
    const text = v2Raw({ notation: 'cifra' });
    const storage = createMemoryStorage({ [STORAGE_KEY]: text });
    const { data } = loadData(storage);
    expect(data.settings).toMatchObject({ chordShapes: 'open', chordKinds: 'triads' });
    expect(storage.dump()[STORAGE_KEY]).toBe(text);
  });

  it('keeps valid values', () => {
    expect(load({ chordShapes: 'all', chordKinds: 'both' })).toMatchObject({ chordShapes: 'all', chordKinds: 'both' });
  });

  it.each(['Open', 'sevenths ', true, null])('falls back for invalid %j', (bad) => {
    expect(load({ chordShapes: bad, chordKinds: bad })).toMatchObject({ chordShapes: 'open', chordKinds: 'triads' });
  });
});

describe('M6 item keys', () => {
  const entry: PositionProgress = { box: 3, correct: 2, wrong: 1, lastReview: 10, nextReview: 20 };

  it('keeps chord keys and old ones, drops malformed ones', () => {
    const good = ['chordname:c:0', 'chordplay:e-7:4', 'hqual:major:seventh:7', 'scaleplay:blues:3:2'];
    const bad = ['chordname:c:2', 'chordplay:a-maj:12', 'chordname:zz:0'];
    const items = Object.fromEntries([...good, ...bad].map((k) => [k, entry]));
    const { data } = loadData(createMemoryStorage({ [STORAGE_KEY]: v2Raw({}, { items }) }));
    expect(Object.keys(data.instruments.guitar.items).sort()).toEqual([...good].sort());
  });
});

describe('M7 item keys', () => {
  const entry: PositionProgress = { box: 3, correct: 2, wrong: 1, lastReview: 10, nextReview: 20 };

  it('keeps guide and arpeggio keys and old ones, drops malformed ones', () => {
    const good = ['guide:g7:7', 'arp:dorian:2:3', 'chordplay:e-7:4', 'scaleplay:blues:3:2'];
    const bad = ['guide:c:0', 'arp:blues:0:6'];
    const items = Object.fromEntries([...good, ...bad].map((k) => [k, entry]));
    const { data } = loadData(createMemoryStorage({ [STORAGE_KEY]: v2Raw({}, { items }) }));
    expect(Object.keys(data.instruments.guitar.items).sort()).toEqual([...good].sort());
  });

  it('keeps ii-V-I keys, drops malformed ones', () => {
    const good = ['iivi:5:2:v-i'];
    const bad = ['iivi:1:1:ii-v'];
    const items = Object.fromEntries([...good, ...bad].map((k) => [k, entry]));
    const { data } = loadData(createMemoryStorage({ [STORAGE_KEY]: v2Raw({}, { items }) }));
    expect(Object.keys(data.instruments.guitar.items).sort()).toEqual([...good].sort());
  });

  it('does not rewrite a v2 save without the new keys', () => {
    const raw = v2Raw({}, { items: { 'chordplay:e-7:4': entry } });
    const storage = createMemoryStorage({ [STORAGE_KEY]: raw });
    loadData(storage);
    expect(storage.dump()[STORAGE_KEY]).toBe(raw);
  });
});

describe('M8', () => {
  const entry: PositionProgress = { box: 3, correct: 2, wrong: 1, lastReview: 10, nextReview: 20 };

  it('keeps dictation keys and old ones, drops malformed ones', () => {
    const good = ['dict:major:0:6', 'arp:dorian:2:3'];
    const bad = ['dict:dorian:0:6'];
    const items = Object.fromEntries([...good, ...bad].map((k) => [k, entry]));
    const { data } = loadData(createMemoryStorage({ [STORAGE_KEY]: v2Raw({}, { items }) }));
    expect(Object.keys(data.instruments.guitar.items).sort()).toEqual([...good].sort());
  });

  it('sanitizes dictationLevel', () => {
    const level = (settings: unknown) =>
      loadData(createMemoryStorage({ [STORAGE_KEY]: v2Raw(settings) })).data.settings.dictationLevel;
    expect(level({ dictationLevel: 'hard' })).toBe('hard');
    expect(level({ dictationLevel: 'x' })).toBe('easy');
    expect(level({})).toBe('easy');
  });

  it('does not rewrite a v2 save without the new fields', () => {
    const raw = v2Raw({}, { items: { 'arp:dorian:2:3': entry } });
    const storage = createMemoryStorage({ [STORAGE_KEY]: raw });
    loadData(storage);
    expect(storage.dump()[STORAGE_KEY]).toBe(raw);
  });
});
