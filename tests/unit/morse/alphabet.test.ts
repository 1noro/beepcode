import { describe, expect, it } from 'vitest';
import {
  ALPHABET_V1,
  displayCode,
  isCode,
  symbolChar,
  symbolsOf,
} from '../../../src/morse/alphabet.ts';

describe('the v1 alphabet (SPEC §2.1)', () => {
  it('has the 26 letters A–Z, each with a different code of 1 to 4 symbols', () => {
    expect(Object.keys(ALPHABET_V1).sort().join('')).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    const codes = Object.values(ALPHABET_V1);
    expect(new Set(codes).size).toBe(26);
    for (const code of codes) expect(code).toMatch(/^[.-]{1,4}$/);
  });

  it('has the codes of international Morse', () => {
    expect(ALPHABET_V1.E).toBe('.');
    expect(ALPHABET_V1.T).toBe('-');
    expect(ALPHABET_V1.L).toBe('.-..');
    expect(ALPHABET_V1.Q).toBe('--.-');
  });
});

describe('helpers', () => {
  it('converts between symbols and codes', () => {
    expect(symbolsOf('.-')).toEqual(['dot', 'dash']);
    expect(symbolsOf('').map(symbolChar)).toEqual([]);
    expect(symbolChar('dot') + symbolChar('dash')).toBe('.-');
  });

  it('recognises a code', () => {
    expect(isCode('.-..')).toBe(true);
    expect(isCode('')).toBe(false);
    expect(isCode('.x')).toBe(false);
  });

  it('shows a code with · and −', () => {
    expect(displayCode('.-..')).toBe('·−··');
  });
});
