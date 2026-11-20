// Pure helpers for the documentation checker (make docs-check). No I/O here,
// so tests/unit/docs.test.ts can exercise them.

export const TODO_STATES = ['abierto', 'en curso', 'a la espera', 'a futuro', 'cerrado'] as const;
export type TodoState = (typeof TODO_STATES)[number];

/** The markdown without fenced code blocks and inline code spans. */
export function stripCode(markdown: string): string {
  return markdown.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, '').replace(/`[^`\n]*`/g, '');
}

/** Targets of [text](target) and <img src="target"> outside code. */
export function extractLinks(markdown: string): string[] {
  const text = stripCode(markdown);
  const links: string[] = [];
  for (const match of text.matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) {
    if (match[1]) links.push(match[1]);
  }
  for (const match of text.matchAll(/<(?:img|a)\s[^>]*?(?:src|href)="([^"]+)"/g)) {
    if (match[1]) links.push(match[1]);
  }
  return links;
}

/** The repo-relative path a link points to, or null if it is external or an anchor. */
export function localTarget(link: string): string | null {
  if (/^[a-z][a-z0-9+.-]*:/i.test(link) || link.startsWith('#')) return null;
  const path = link.split('#')[0]?.split('?')[0] ?? '';
  return path === '' ? null : decodeURIComponent(path);
}

/** The text of a `## heading` section, up to the next `## `. */
export function section(markdown: string, heading: string): string | null {
  const lines = markdown.split('\n');
  const start = lines.findIndex((line) => line.startsWith(`## ${heading}`));
  if (start === -1) return null;
  const end = lines.findIndex((line, i) => i > start && line.startsWith('## '));
  return lines.slice(start + 1, end === -1 ? undefined : end).join('\n');
}

/** The date after a `**Label:**`, as YYYY-MM-DD, or null. */
export function labelledDate(markdown: string, label: string): string | null {
  const match = new RegExp(`\\*\\*${label}:\\*\\*\\s*(\\d{4}-\\d{2}-\\d{2})`).exec(markdown);
  return match?.[1] ?? null;
}

/** The value after `**Estado:**` in a TODO card, up to the next `·` or line end. */
export function todoState(markdown: string): string | null {
  const match = /\*\*Estado:\*\*\s*([^·\n]+)/.exec(markdown);
  return match?.[1]?.trim() ?? null;
}

export function isTodoState(value: string): value is TodoState {
  return (TODO_STATES as readonly string[]).includes(value);
}

/** Whole days from `from` to `to`, both YYYY-MM-DD. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

/** The numbers N of the TODO(N) markers in a source file. */
export function todoMarkers(source: string): number[] {
  return [...source.matchAll(/TODO\((\d+)\)/g)].map((match) => Number(match[1]));
}
