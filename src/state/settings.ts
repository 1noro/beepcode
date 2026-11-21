// The settings (SPEC §7), persisted in localStorage with a schema version so
// that a later version can migrate them. Anything invalid falls back to its
// default, field by field.
import { LOCALES, type Locale } from '../i18n';
import { MAX_WPM, MIN_WPM } from '../morse/timing.ts';

export const THEMES = [
  'system',
  'light',
  'dark',
  'gruvbox-dark',
  'gruvbox-light',
  'high-contrast',
] as const;
export type Theme = (typeof THEMES)[number];

export const VISIONS = [
  'default',
  'protanopia',
  'deuteranopia',
  'tritanopia',
  'achromatopsia',
] as const;
export type Vision = (typeof VISIONS)[number];

export interface Settings {
  /** null: the browser's language, if supported (SPEC §8). */
  locale: Locale | null;
  theme: Theme;
  vision: Vision;
  /** A colour chosen by the user, or null for the theme's. */
  dotColor: string | null;
  dashColor: string | null;
  wpm: number;
  /**
   * Farnsworth (SPEC §7): the overall speed of what is played, with the
   * letters at `wpm` and the gaps stretched. null: the same as `wpm`, and
   * it follows it.
   */
  effectiveWpm: number | null;
  gapTolerance: number;
  /** In units. */
  dashThreshold: number;
  toneHz: number;
  /** 0–100. */
  volume: number;
  muted: boolean;
  vibration: boolean;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = {
  locale: null,
  theme: 'system',
  vision: 'default',
  dotColor: null,
  dashColor: null,
  wpm: 12,
  effectiveWpm: null,
  gapTolerance: 1.5,
  dashThreshold: 2,
  toneHz: 600,
  volume: 70,
  muted: false,
  vibration: false,
};

/** The ranges of the numeric settings, with the step of their control. */
export const RANGES = {
  wpm: { min: MIN_WPM, max: MAX_WPM, step: 1 },
  gapTolerance: { min: 1, max: 3, step: 0.1 },
  dashThreshold: { min: 1.5, max: 2.5, step: 0.1 },
  toneHz: { min: 400, max: 1000, step: 10 },
  volume: { min: 0, max: 100, step: 5 },
} as const satisfies Partial<Record<keyof Settings, { min: number; max: number; step: number }>>;

export const SETTINGS_KEY = 'beepcode.settings';
export const SETTINGS_VERSION = 1;

type Raw = Record<string, unknown>;

function oneOf<T extends string>(options: readonly T[], value: unknown, fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

function inRange(key: keyof typeof RANGES, value: unknown): number {
  const { min, max } = RANGES[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_SETTINGS[key];
  return Math.min(max, Math.max(min, value));
}

function color(value: unknown): string | null {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : null;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/** The effective speed: below the speed, or null for the same. */
function effective(value: unknown, wpm: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const rounded = Math.round(Math.max(MIN_WPM, value));
  return rounded < wpm ? rounded : null;
}

/** The effective speed of what is played: Farnsworth's, or the speed. */
export function effectiveWpm(settings: Pick<Settings, 'wpm' | 'effectiveWpm'>): number {
  return Math.min(settings.effectiveWpm ?? settings.wpm, settings.wpm);
}

/**
 * The change for a new speed: the effective one stays only if it is still
 * below it; otherwise it goes back to following it.
 */
export function wpmChange(settings: Settings, wpm: number): Partial<Settings> {
  return { wpm, effectiveWpm: effective(settings.effectiveWpm, wpm) };
}

/** Valid settings from anything: each field, checked and clamped, or its default. */
export function sanitize(raw: Raw): Settings {
  const wpm = Math.round(inRange('wpm', raw.wpm));
  return {
    locale: (LOCALES as readonly unknown[]).includes(raw.locale) ? (raw.locale as Locale) : null,
    theme: oneOf(THEMES, raw.theme, DEFAULT_SETTINGS.theme),
    vision: oneOf(VISIONS, raw.vision, DEFAULT_SETTINGS.vision),
    dotColor: color(raw.dotColor),
    dashColor: color(raw.dashColor),
    wpm,
    effectiveWpm: effective(raw.effectiveWpm, wpm),
    gapTolerance: inRange('gapTolerance', raw.gapTolerance),
    dashThreshold: inRange('dashThreshold', raw.dashThreshold),
    toneHz: inRange('toneHz', raw.toneHz),
    volume: inRange('volume', raw.volume),
    muted: bool(raw.muted, DEFAULT_SETTINGS.muted),
    vibration: bool(raw.vibration, DEFAULT_SETTINGS.vibration),
  };
}

/**
 * Brings stored data of any version to the current one. There is only
 * version 1: a later schema adds its step here (1 → 2, 2 → 3…).
 */
export function migrate(stored: unknown): Raw {
  if (typeof stored !== 'object' || stored === null) return {};
  const { version, settings } = stored as { version?: unknown; settings?: unknown };
  if (version !== SETTINGS_VERSION || typeof settings !== 'object' || settings === null) return {};
  return settings as Raw;
}

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;

export function loadSettings(storage: Storage | null): Settings {
  try {
    const text = storage?.getItem(SETTINGS_KEY);
    return sanitize(text ? migrate(JSON.parse(text)) : {});
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(storage: Storage | null, settings: Settings): void {
  try {
    storage?.setItem(SETTINGS_KEY, JSON.stringify({ version: SETTINGS_VERSION, settings }));
  } catch {
    // Full or blocked storage (private mode): the settings last until reload.
  }
}
