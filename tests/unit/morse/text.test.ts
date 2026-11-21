import { describe, expect, it } from 'vitest';
import { ALPHABET_V1 } from '../../../src/morse/alphabet.ts';
import { normalizeChar, tokenize } from '../../../src/morse/text.ts';

const codeOf = (char: string) => ALPHABET_V1[char];

const kinds = (text: string) =>
  tokenize(text, codeOf)
    .map((token) => (token.kind === 'letter' ? token.char : token.kind === 'space' ? '_' : '?'))
    .join('');

describe('normalizeChar (SPEC §6.5)', () => {
  it('goes to upper case without accents', () => {
    expect(['a', 'é', 'À', 'ï', 'ü', 'ô', 'x'].map(normalizeChar)).toEqual([
      'A',
      'E',
      'A',
      'I',
      'U',
      'O',
      'X',
    ]);
  });

  it('keeps Ñ and Ç, letters of their own', () => {
    expect(normalizeChar('ñ')).toBe('Ñ');
    expect(normalizeChar('ç')).toBe('Ç');
  });

  it('gives one character for one: what would be two stays as it is', () => {
    expect(normalizeChar('ß')).toBe('ß');
    expect(normalizeChar('ﬁ')).toBe('ﬁ');
  });
});

describe('tokenize', () => {
  it('gives one token per character: letters, blanks and what is skipped', () => {
    expect(kinds('Hola, mundo')).toBe('HOLA?_MUNDO');
    expect(kinds('a\tb\nc')).toBe('A_B_C');
    expect(kinds('año 2026')).toBe('A?O_????');
  });

  it('gives each letter its code, and the skipped character normalized', () => {
    expect(tokenize('Lé', codeOf)).toEqual([
      { kind: 'letter', char: 'L', code: '.-..' },
      { kind: 'letter', char: 'E', code: '.' },
    ]);
    expect(tokenize('ç!', codeOf)).toEqual([
      { kind: 'skip', char: 'Ç' },
      { kind: 'skip', char: '!' },
    ]);
  });

  it('counts an accented letter once, composed or not', () => {
    expect(tokenize('é', codeOf)).toEqual([{ kind: 'letter', char: 'E', code: '.' }]);
  });

  it('counts by code point, not by UTF-16 unit', () => {
    expect(kinds('a🙂b')).toBe('A?B');
  });
});
