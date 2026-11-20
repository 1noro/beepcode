// The tape (SPEC §3.4): the text written so far, running text that scrolls
// by itself with the newest letter on the right; under it, the sequence in
// progress in · and −; and its actions. The decoded letter is announced to
// screen readers.
import { tAttr, tText } from '../i18n/dom.ts';
import { t } from '../i18n/index.ts';
import { displayCode, type Code } from '../morse/alphabet.ts';
import { el, icon, type IconName } from './dom.ts';

export interface TapeActions {
  deleteLast(): void;
  clear(): void;
  copy(): void;
}

export interface Tape {
  readonly element: HTMLElement;
  setText(text: string): void;
  setSequence(code: Code): void;
  /** Says something to screen readers (aria-live="polite"). */
  announce(message: string): void;
}

function iconButton(
  name: IconName,
  label: Parameters<typeof tAttr>[2],
  action: () => void,
): HTMLButtonElement {
  const button = el('button', { type: 'button', className: 'icon-button' }, [icon(name)]);
  tAttr(button, 'aria-label', label);
  tAttr(button, 'title', label);
  button.addEventListener('click', action);
  return button;
}

export function createTape(actions: TapeActions): Tape {
  const text = el('span', { className: 'tape-text' });
  const placeholder = el('span', { className: 'tape-placeholder' });
  tText(placeholder, 'tape.placeholder');
  const line = el('div', { className: 'tape-line' }, [
    placeholder,
    text,
    el('span', { className: 'tape-cursor', ariaHidden: 'true' }),
  ]);
  tAttr(line, 'aria-label', 'tape.label');
  line.setAttribute('role', 'log');
  const sequence = el('div', { className: 'tape-sequence' });
  tAttr(sequence, 'aria-label', 'tape.sequence');
  const live = el('div', { className: 'visually-hidden' });
  live.setAttribute('aria-live', 'polite');

  const element = el('section', { className: 'tape' }, [
    el('div', { className: 'tape-row' }, [
      el('div', { className: 'tape-main' }, [line, sequence]),
      el('div', { className: 'tape-actions' }, [
        iconButton('backspace', 'tape.deleteLast', actions.deleteLast),
        iconButton('clear', 'tape.clear', actions.clear),
        iconButton('copy', 'tape.copy', actions.copy),
      ]),
    ]),
    live,
  ]);

  return {
    element,
    setText(value) {
      text.textContent = value;
      placeholder.hidden = value !== '';
    },
    setSequence(code) {
      // A non-breaking space keeps the height of the line when it is empty.
      sequence.textContent = code ? displayCode(code) : ' ';
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
