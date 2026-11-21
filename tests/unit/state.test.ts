import { describe, expect, it } from 'vitest';
import { appendLetter, appendSpace, deleteLast } from '../../src/state/history.ts';
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  effectiveWpm,
  loadSettings,
  migrate,
  sanitize,
  saveSettings,
  wpmChange,
} from '../../src/state/settings.ts';
import { createStore } from '../../src/state/store.ts';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    data,
  };
}

describe('the store', () => {
  it('merges changes and notifies with the previous value', () => {
    const store = createStore({ a: 1, b: 'x' });
    const seen: string[] = [];
    const off = store.subscribe((value, previous) => seen.push(`${previous.a}→${value.a}`));
    store.set({ a: 2 });
    expect(store.get()).toEqual({ a: 2, b: 'x' });
    off();
    store.set({ a: 3 });
    expect(seen).toEqual(['1→2']);
  });

  it('does not notify when nothing changes', () => {
    const store = createStore({ a: 1 });
    let calls = 0;
    store.subscribe(() => calls++);
    store.set({ a: 1 });
    store.set({});
    expect(calls).toBe(0);
  });
});

describe('the settings (SPEC §7)', () => {
  it('load the defaults when there is nothing stored, or it is broken', () => {
    expect(loadSettings(memoryStorage())).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(memoryStorage({ [SETTINGS_KEY]: '{not json' }))).toEqual(DEFAULT_SETTINGS);
    const throwing = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => undefined,
    };
    expect(loadSettings(throwing)).toEqual(DEFAULT_SETTINGS);
  });

  it('survive a save and a load, with their schema version', () => {
    const storage = memoryStorage();
    const settings = {
      ...DEFAULT_SETTINGS,
      locale: 'gl' as const,
      theme: 'gruvbox-dark' as const,
      wpm: 20,
    };
    saveSettings(storage, settings);
    expect(JSON.parse(storage.data.get(SETTINGS_KEY) ?? '')).toMatchObject({ version: 1 });
    expect(loadSettings(storage)).toEqual(settings);
  });

  it('ignore a storage that cannot be written', () => {
    const full = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(() => saveSettings(full, DEFAULT_SETTINGS)).not.toThrow();
    expect(() => saveSettings(null, DEFAULT_SETTINGS)).not.toThrow();
  });

  it('clamp numbers to their range and drop what is invalid, field by field', () => {
    const settings = sanitize({
      locale: 'fr',
      theme: 'brass',
      vision: 'deuteranopia',
      dotColor: '#AABBCC',
      dashColor: 'red',
      wpm: 99.4,
      gapTolerance: 0.2,
      dashThreshold: '2',
      toneHz: 700,
      volume: -5,
      muted: 'yes',
      vibration: false,
    });
    expect(settings).toEqual({
      ...DEFAULT_SETTINGS,
      vision: 'deuteranopia',
      dotColor: '#aabbcc',
      wpm: 40,
      gapTolerance: 1,
      toneHz: 700,
      volume: 0,
      vibration: false,
    });
  });

  it('keep the effective speed (Farnsworth) below the speed, or follow it', () => {
    expect(sanitize({ wpm: 20, effectiveWpm: 9.6 })).toMatchObject({ wpm: 20, effectiveWpm: 10 });
    expect(sanitize({ wpm: 20, effectiveWpm: 2 }).effectiveWpm).toBe(5);
    expect(sanitize({ wpm: 20, effectiveWpm: 20 }).effectiveWpm).toBeNull();
    expect(sanitize({ wpm: 10, effectiveWpm: 15 }).effectiveWpm).toBeNull();
    expect(sanitize({ effectiveWpm: '8' }).effectiveWpm).toBeNull();
    expect(effectiveWpm({ wpm: 20, effectiveWpm: 10 })).toBe(10);
    expect(effectiveWpm({ wpm: 20, effectiveWpm: null })).toBe(20);
    expect(effectiveWpm({ wpm: 8, effectiveWpm: 10 })).toBe(8);
  });

  it('drop the effective speed when the speed comes down to it', () => {
    const farnsworth = { ...DEFAULT_SETTINGS, wpm: 20, effectiveWpm: 10 };
    expect(wpmChange(farnsworth, 25)).toEqual({ wpm: 25, effectiveWpm: 10 });
    expect(wpmChange(farnsworth, 11)).toEqual({ wpm: 11, effectiveWpm: 10 });
    expect(wpmChange(farnsworth, 10)).toEqual({ wpm: 10, effectiveWpm: null });
    expect(wpmChange(DEFAULT_SETTINGS, 30)).toEqual({ wpm: 30, effectiveWpm: null });
  });

  it('migrate only the known versions', () => {
    expect(migrate({ version: 1, settings: { wpm: 20 } })).toEqual({ wpm: 20 });
    expect(migrate({ version: 99, settings: { wpm: 20 } })).toEqual({});
    expect(migrate({ version: 1, settings: null })).toEqual({});
    expect(migrate('x')).toEqual({});
    expect(migrate(null)).toEqual({});
  });
});

describe('the text of the tape (SPEC §3.4)', () => {
  it('appends letters and keeps the last characters', () => {
    expect(appendLetter('HELL', 'O')).toBe('HELLO');
    expect(appendLetter('ABC', 'D', 3)).toBe('BCD');
  });

  it('never starts with a space, nor puts two in a row', () => {
    expect(appendSpace('')).toBe('');
    expect(appendSpace('HI')).toBe('HI ');
    expect(appendSpace('HI ')).toBe('HI ');
    expect(appendLetter('A B', 'C', 3)).toBe('BC');
    expect(appendSpace('ABC', 3)).toBe('BC ');
  });

  it('deletes the last character', () => {
    expect(deleteLast('HI T')).toBe('HI ');
    expect(deleteLast('HI ')).toBe('HI');
    expect(deleteLast('')).toBe('');
  });
});
