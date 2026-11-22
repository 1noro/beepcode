// The tape (SPEC §3.4): the text written so far, centred with its cursor
// until it takes the whole width, and then running text that scrolls by
// itself with the newest letter on the right; under it, the sequence in
// progress in · and −, or, with nothing written yet, the ornament of the
// Text mode in its place. In its corners, flat, what is done to the text:
// copy on the left and clear on the right, where the Text mode has its
// clear; only with text. The decoded letter is announced to screen readers.
import { tAttr } from '../i18n/dom.ts';
import { t } from '../i18n/index.ts';
import { displayCode, type Code } from '../morse/alphabet.ts';
import { el, icon, type IconName } from './dom.ts';
import { createOrnament } from './ornament.ts';

export interface TapeOptions {
  /** The code of a character, for the ornament. */
  codeOf(char: string): string | undefined;
  copy(): void;
  clear(): void;
}

export interface Tape {
  readonly element: HTMLElement;
  setText(text: string): void;
  setSequence(code: Code): void;
  /** Says something to screen readers (aria-live="polite"). */
  announce(message: string): void;
}

function cornerButton(
  name: IconName,
  label: Parameters<typeof tAttr>[2],
  action: () => void,
): HTMLButtonElement {
  const button = el('button', { type: 'button', className: `icon-button tape-${name}` }, [
    icon(name),
  ]);
  tAttr(button, 'aria-label', label);
  tAttr(button, 'title', label);
  button.addEventListener('click', action);
  return button;
}

export function createTape({ codeOf, copy, clear }: TapeOptions): Tape {
  const text = el('span', { className: 'tape-text' });
  const line = el('div', { className: 'tape-line' }, [
    text,
    el('span', { className: 'tape-cursor', ariaHidden: 'true' }),
  ]);
  tAttr(line, 'aria-label', 'tape.label');
  line.setAttribute('role', 'log');
  const sequence = el('div', { className: 'tape-sequence' });
  tAttr(sequence, 'aria-label', 'tape.sequence');
  const below = el('div', { className: 'tape-below' }, [sequence, createOrnament(codeOf)]);
  const copyButton = cornerButton('copy', 'tape.copy', copy);
  const clearButton = cornerButton('clear', 'tape.clear', clear);
  const live = el('div', { className: 'visually-hidden' });
  live.setAttribute('aria-live', 'polite');

  const element = el('section', { className: 'tape' }, [
    line,
    below,
    copyButton,
    clearButton,
    live,
  ]);
  let written = '';
  let inProgress: Code = '';

  /** The ornament, only before anything: no text and no sequence. */
  function update(): void {
    element.classList.toggle('is-empty', written === '' && inProgress === '');
    copyButton.disabled = written === '';
    clearButton.disabled = written === '';
  }

  return {
    element,
    setText(value) {
      written = value;
      text.textContent = value;
      update();
    },
    setSequence(code) {
      inProgress = code;
      // A non-breaking space keeps the height of the line when it is empty.
      sequence.textContent = code ? displayCode(code) : ' ';
      update();
    },
    announce(message) {
      // Emptied first, so that the same letter twice is announced twice.
      live.textContent = '';
      requestAnimationFrame(() => (live.textContent = message));
    },
  };
}

/** The message for copying the text: done, or why not. */
export async function copyText(value: string): Promise<string> {
  try {
    await navigator.clipboard.writeText(value);
    return t('tape.copied');
  } catch {
    return t('tape.copyFailed');
  }
}
