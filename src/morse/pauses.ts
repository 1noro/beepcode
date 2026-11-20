// The pauses between letters of whoever keys (SPEC §4.2): how long they take
// to start the next letter of a word once the path of the last one is off.
// The word space waits a margin of a few of those pauses, so that whoever
// stops to think is not cut short and whoever goes on quickly gets their
// spaces sooner. Only the pauses that arrived in time are seen, never those
// that ran into a space: a space deleted at once says the margin fell short.
import { WORD_MARGIN_MS } from './timing.ts';

/** The margin is this many times the usual pause. */
export const MARGIN_PER_PAUSE = 2.5;
export const MIN_MARGIN_MS = 400;
export const MAX_MARGIN_MS = 3000;
/** How much each new pause moves the margin (an exponential average). */
export const PAUSE_WEIGHT = 0.25;
/** A space deleted at once widens the margin by this much. */
export const REJECTED_GROWTH = 1.3;

export interface WordPauses {
  /** The margin now, in ms, before the gap tolerance. */
  readonly marginMs: number;
  /** A pause before a letter that continued the word; 0 if it began earlier. */
  pause(durationMs: number): void;
  /** The space was not wanted: it was deleted before keying again. */
  rejected(): void;
}

const clamp = (value: number) => Math.min(MAX_MARGIN_MS, Math.max(MIN_MARGIN_MS, value));

export function createWordPauses(initialMarginMs: number = WORD_MARGIN_MS): WordPauses {
  let margin = initialMarginMs;
  return {
    get marginMs() {
      return margin;
    },
    pause(durationMs) {
      const target = clamp(MARGIN_PER_PAUSE * Math.max(0, durationMs));
      margin = clamp(margin + PAUSE_WEIGHT * (target - margin));
    },
    rejected() {
      margin = clamp(margin * REJECTED_GROWTH);
    },
  };
}
