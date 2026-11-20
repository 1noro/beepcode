// The text of the tape (SPEC §3.4): letters and word spaces, at most
// HISTORY_MAX characters, never starting with a space nor with two in a row.
// Not persisted between sessions (decided on 2026-11-20).

export const HISTORY_MAX = 500;

export function appendLetter(text: string, char: string, max = HISTORY_MAX): string {
  return (text + char).slice(-max).replace(/^ /, '');
}

export function appendSpace(text: string, max = HISTORY_MAX): string {
  if (text === '' || text.endsWith(' ')) return text;
  return (text + ' ').slice(-max);
}

/** Deletes the last character: a letter or a word space. */
export function deleteLast(text: string): string {
  return text.slice(0, -1);
}
