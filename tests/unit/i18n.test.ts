import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOCALE,
  LOCALES,
  detectLocale,
  dictionaries,
  format,
  translate,
  type MessageKey,
} from '../../src/i18n/index.ts';
import en from '../../src/i18n/locales/en.json';

const referenceKeys = Object.keys(en).sort();

describe('dictionaries', () => {
  it.each(LOCALES)('%s has exactly the keys of en.json, none empty', (locale) => {
    const dictionary = dictionaries[locale];
    expect(Object.keys(dictionary).sort()).toEqual(referenceKeys);
    for (const value of Object.values(dictionary)) expect(value.trim()).not.toBe('');
  });

  it.each(LOCALES)('%s keeps the {placeholders} of en.json', (locale) => {
    const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const key of referenceKeys as MessageKey[]) {
      expect(placeholders(translate(locale, key)), `${locale}: ${key}`).toEqual(
        placeholders(en[key]),
      );
    }
  });
});

describe('detectLocale', () => {
  it('takes the first supported language, by its base tag', () => {
    expect(detectLocale(['fr-FR', 'gl-ES', 'es'])).toBe('gl');
    expect(detectLocale(['ca'])).toBe('ca');
    expect(detectLocale(['EU-es'])).toBe('eu');
  });

  it('falls back to English', () => {
    expect(detectLocale(['fr', 'de-DE'])).toBe(DEFAULT_LOCALE);
    expect(detectLocale([])).toBe('en');
  });
});

describe('translate', () => {
  it('returns the message in the language', () => {
    expect(translate('es', 'pwa.reload')).toBe('Recargar');
  });

  it('fills {params} and leaves unknown ones as they are', () => {
    expect(format('{a} and {b}, {n}', { a: 'x', n: 3 })).toBe('x and {b}, 3');
    expect(format('no params')).toBe('no params');
    expect(translate('en', 'home.title', { unused: 1 })).toBe('Hello!');
  });
});
