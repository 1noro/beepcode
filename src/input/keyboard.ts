// The keyboard (SPEC §3.6), caught on window: Space is the straight key, '.'
// and '-' type a symbol, Enter closes the letter, Backspace and Escape
// cancel. Ignored while typing in a field or with a dialog open.

export interface KeyboardHandlers {
  press(): void;
  release(): void;
  dot(): void;
  dash(): void;
  commit(): void;
  backspace(): void;
  escape(): void;
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

/** A control that answers Enter by itself (a button, a letter of the tree). */
function handlesEnter(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return !!target.closest('button, a[href], [role="button"]') && !target.closest('[data-key]');
}

function blocked(event: KeyboardEvent): boolean {
  return (
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    isTyping(event.target) ||
    document.querySelector('dialog[open]') !== null
  );
}

export function attachKeyboard(handlers: KeyboardHandlers): () => void {
  let spaceDown = false;

  const releaseSpace = () => {
    if (!spaceDown) return;
    spaceDown = false;
    handlers.release();
  };

  const keydown = (event: KeyboardEvent) => {
    if (event.key === ' ' && spaceDown) {
      event.preventDefault();
      return;
    }
    if (blocked(event)) return;
    switch (event.key) {
      case ' ':
        // No scrolling, and no activating the focused button.
        event.preventDefault();
        if (event.repeat) return;
        spaceDown = true;
        handlers.press();
        return;
      case '.':
        event.preventDefault();
        if (!event.repeat) handlers.dot();
        return;
      case '-':
        event.preventDefault();
        if (!event.repeat) handlers.dash();
        return;
      case 'Enter':
        if (handlesEnter(event.target)) return;
        event.preventDefault();
        handlers.commit();
        return;
      case 'Backspace':
        event.preventDefault();
        handlers.backspace();
        return;
      case 'Escape':
        handlers.escape();
        return;
    }
  };

  const keyup = (event: KeyboardEvent) => {
    if (event.key !== ' ' || !spaceDown) return;
    event.preventDefault();
    releaseSpace();
  };

  // Losing the focus with Space down must not leave the tone sounding.
  const hidden = () => {
    if (document.visibilityState === 'hidden') releaseSpace();
  };

  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  window.addEventListener('blur', releaseSpace);
  document.addEventListener('visibilitychange', hidden);
  return () => {
    window.removeEventListener('keydown', keydown);
    window.removeEventListener('keyup', keyup);
    window.removeEventListener('blur', releaseSpace);
    document.removeEventListener('visibilitychange', hidden);
  };
}
