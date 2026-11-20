// The alphabet (SPEC §2.1): data, not code, so that the "Pro mode" can load a
// bigger one without touching the logic (ADR 0003).

export type MorseSymbol = 'dot' | 'dash';

/** A code is a string of '.' and '-', e.g. '.-..' for L. */
export type Code = string;

export const DOT = '.';
export const DASH = '-';

/** Letter → code. */
export type Alphabet = Readonly<Record<string, Code>>;

/** The 26 letters A–Z of international Morse (v1). */
export const ALPHABET_V1: Alphabet = {
  A: '.-',
  B: '-...',
  C: '-.-.',
  D: '-..',
  E: '.',
  F: '..-.',
  G: '--.',
  H: '....',
  I: '..',
  J: '.---',
  K: '-.-',
  L: '.-..',
  M: '--',
  N: '-.',
  O: '---',
  P: '.--.',
  Q: '--.-',
  R: '.-.',
  S: '...',
  T: '-',
  U: '..-',
  V: '...-',
  W: '.--',
  X: '-..-',
  Y: '-.--',
  Z: '--..',
};

export function symbolChar(symbol: MorseSymbol): string {
  return symbol === 'dot' ? DOT : DASH;
}

export function symbolsOf(code: Code): MorseSymbol[] {
  return [...code].map((c) => (c === DOT ? 'dot' : 'dash'));
}

export function isCode(text: string): boolean {
  return /^[.-]+$/.test(text);
}

/** The code in display notation: '.-..' → '·−··'. */
export function displayCode(code: Code): string {
  return code.replaceAll(DOT, '·').replaceAll(DASH, '−');
}
