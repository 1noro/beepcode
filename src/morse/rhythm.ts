// The rhythm of whoever keys (SPEC §4.2): an estimate of their unit from
// their own dots, dashes and gaps between symbols, as an operator's ear
// adapts to the sender. The keyer scales the letter and word gaps with it,
// so that keying slower than the set speed does not split letters or insert
// spaces nobody meant.
import type { MorseSymbol } from './alphabet.ts';
import { MAX_WPM, MIN_WPM, unitMs } from './timing.ts';

/** How much each new sample moves the estimate (an exponential average). */
export const RHYTHM_WEIGHT = 0.25;
/** A sample counts as at most this many times the estimate, or 1/this. */
export const RHYTHM_MAX_STEP = 2;

export interface Rhythm {
  /** The current estimate of the unit, in ms. */
  readonly unitMs: number;
  /** A dot lasts 1 unit; a dash, 3. */
  mark(symbol: MorseSymbol, durationMs: number): void;
  /** The silence between two symbols of a letter: 1 unit. */
  gap(durationMs: number): void;
  /** Starts again from `unit` (a new speed in the settings). */
  reset(unit: number): void;
}

const MIN_UNIT_MS = unitMs(MAX_WPM);
const MAX_UNIT_MS = unitMs(MIN_WPM);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function createRhythm(initialUnitMs: number): Rhythm {
  let unit = initialUnitMs;

  // A single odd sample (a hold of seconds, a hasty tap) moves the estimate
  // only so far; a change of pace takes a few symbols.
  function sample(value: number): void {
    const bounded = clamp(value, unit / RHYTHM_MAX_STEP, unit * RHYTHM_MAX_STEP);
    unit = clamp(unit + RHYTHM_WEIGHT * (bounded - unit), MIN_UNIT_MS, MAX_UNIT_MS);
  }

  return {
    get unitMs() {
      return unit;
    },
    mark(symbol, durationMs) {
      sample(symbol === 'dot' ? durationMs : durationMs / 3);
    },
    gap(durationMs) {
      sample(durationMs);
    },
    reset(next) {
      unit = next;
    },
  };
}
