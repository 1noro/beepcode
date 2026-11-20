// i18n (SPEC §8): flat keys, typed from en.json, which is the reference.
// Every visible string goes through t().
import ca from './locales/ca.json';
import en from './locales/en.json';
import es from './locales/es.json';
import eu from './locales/eu.json';
import gl from './locales/gl.json';

export const LOCALES = ['en', 'es', 'gl', 'ca', 'eu'] as const;
export type Locale = (typeof LOCALES)[number];
export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;
export type Params = Record<string, string | number>;

export const DEFAULT_LOCALE: Locale = 'en';

// Each language in its own name: the same whatever the UI language is.
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  gl: 'Galego',
  ca: 'Català',
  eu: 'Euskara',
};

export const dictionaries: Record<Locale, Partial<Messages>> = { en, es, gl, ca, eu };

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** The first supported language in the browser's list, or English. */
export function detectLocale(languages: readonly string[]): Locale {
  for (const tag of languages) {
    const base = tag.toLowerCase().split('-')[0] ?? '';
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

/** `{name}` takes params.name; unknown placeholders stay as they are. */
export function format(text: string, params?: Params): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match: string, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

/** The message in `locale`, falling back to English. */
export function translate(locale: Locale, key: MessageKey, params?: Params): string {
  return format(dictionaries[locale][key] ?? en[key], params);
}

let current: Locale = DEFAULT_LOCALE;
const listeners = new Set<(locale: Locale) => void>();

export function getLocale(): Locale {
  return current;
}

/** Changes the UI language, updates <html lang> and notifies the listeners. */
export function setLocale(locale: Locale): void {
  current = locale;
  document.documentElement.lang = locale;
  for (const listener of listeners) listener(locale);
}

export function onLocaleChange(listener: (locale: Locale) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function t(key: MessageKey, params?: Params): string {
  return translate(current, key, params);
}
