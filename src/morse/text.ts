// Text for Morse (SPEC §6.5): each character, upper case and without its
// accents ('é' → 'E'), is a letter of the alphabet, a word space or something
// to skip. Ñ and Ç are letters of their own, not N and C with an accent: v1
// has no code for them, so they are skipped (SPEC §6.2 drops them from the
// word lists for the same reason).
import type { Code } from './alphabet.ts';

/** Letters that keep their mark: they are not the plain letter in Morse. */
const OWN_LETTERS = new Set(['Ñ', 'Ç']);

export type TextToken =
  | { readonly kind: 'letter'; readonly char: string; readonly code: Code }
  | { readonly kind: 'space'; readonly char: string }
  | { readonly kind: 'skip'; readonly char: string };

/**
 * The character in upper case and, unless it is Ñ or Ç, without marks. One
 * character in, one out: one whose upper case is two ('ß' → 'SS') stays as
 * it is, so that the text played lies letter on letter under the one typed.
 */
export function normalizeChar(char: string): string {
  const upper = char.toUpperCase();
  if ([...upper].length > 1) return char;
  if (OWN_LETTERS.has(upper)) return upper;
  return upper.normalize('NFD').replace(/\p{M}/gu, '');
}

/**
 * One token per character of the text (by code point, after composing it to
 * NFC, so that 'é' is one character however it was typed). `char` is the
 * normalized character; a space token, any blank. `codeOf` says which letters
 * there are: those of the alphabet, or of the tree (tree.nodeOf).
 */
export function tokenize(text: string, codeOf: (char: string) => Code | undefined): TextToken[] {
  return Array.from(text.normalize('NFC'), (raw) => {
    if (/\s/u.test(raw)) return { kind: 'space', char: ' ' } as const;
    const char = normalizeChar(raw);
    const code = codeOf(char);
    return code ? ({ kind: 'letter', char, code } as const) : ({ kind: 'skip', char } as const);
  });
}
