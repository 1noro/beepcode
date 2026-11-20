// The key on screen (SPEC §3.5): Pointer Events, never click, for the least
// latency; pointer capture, so that releasing outside the key still counts;
// and one pointer at a time.

export interface KeyHandlers {
  press(): void;
  release(): void;
}

/** Makes `element` a straight key; returns the function that detaches it. */
export function attachPointerKey(element: HTMLElement, handlers: KeyHandlers): () => void {
  let active: number | null = null;

  const down = (event: PointerEvent) => {
    if (active !== null) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    active = event.pointerId;
    try {
      element.setPointerCapture(event.pointerId);
    } catch {
      // A synthetic pointer cannot be captured; the key still works.
    }
    element.classList.add('is-down');
    handlers.press();
  };

  const up = (event: PointerEvent) => {
    if (event.pointerId !== active) return;
    active = null;
    element.classList.remove('is-down');
    handlers.release();
  };

  const noMenu = (event: Event) => event.preventDefault();

  element.addEventListener('pointerdown', down);
  element.addEventListener('pointerup', up);
  element.addEventListener('pointercancel', up);
  element.addEventListener('lostpointercapture', up);
  element.addEventListener('contextmenu', noMenu);
  return () => {
    element.removeEventListener('pointerdown', down);
    element.removeEventListener('pointerup', up);
    element.removeEventListener('pointercancel', up);
    element.removeEventListener('lostpointercapture', up);
    element.removeEventListener('contextmenu', noMenu);
  };
}
