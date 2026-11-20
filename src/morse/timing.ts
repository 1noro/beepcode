// Timing (SPEC §4.1, §4.2): the PARIS standard, the keyer thresholds and
// Farnsworth spacing. All durations in milliseconds.
import type { Code, MorseSymbol } from './alphabet.ts';
import { symbolsOf } from './alphabet.ts';

export const DEFAULT_WPM = 12;
/** The speeds the settings allow, and the rhythm the keyer adapts to. */
export const MIN_WPM = 5;
export const MAX_WPM = 40;
export const DEFAULT_GAP_TOLERANCE = 1.5;
export const DEFAULT_DASH_THRESHOLD = 2;
export const DEFAULT_DEBOUNCE_MS = 15;
/**
 * The silence, once the path of a letter is off, before the word space: the
 * time to think of the next letter. Where it starts; the keyer adapts it to
 * whoever keys (pauses.ts).
 */
export const WORD_MARGIN_MS = 1000;

/** The length of a unit (a dot) at a speed: 1200 / wpm. */
export function unitMs(wpm: number): number {
  return 1200 / wpm;
}

export interface KeyerTimingOptions {
  wpm: number;
  /** In units; a press this long or longer is a dash (default 2). */
  dashThreshold?: number;
  /** Multiplies the letter gap and the word margin (default 1.5, for beginners). */
  gapTolerance?: number;
  debounceMs?: number;
}

export interface KeyerTiming {
  readonly unitMs: number;
  /** Shorter presses are ignored. */
  readonly debounceMs: number;
  /** Shorter presses are dots; the rest, dashes. */
  readonly dashThresholdMs: number;
  /**
   * Silence after the last symbol that closes the letter. The path of the
   * letter stays lit as long again (SPEC §3.3).
   */
  readonly letterGapMs: number;
  /** Silence after the path goes off that inserts a word space. */
  readonly wordMarginMs: number;
}

export function keyerTiming(options: KeyerTimingOptions): KeyerTiming {
  const unit = unitMs(options.wpm);
  const tolerance = options.gapTolerance ?? DEFAULT_GAP_TOLERANCE;
  return {
    unitMs: unit,
    debounceMs: options.debounceMs ?? DEFAULT_DEBOUNCE_MS,
    dashThresholdMs: (options.dashThreshold ?? DEFAULT_DASH_THRESHOLD) * unit,
    letterGapMs: 3 * unit * tolerance,
    wordMarginMs: (WORD_MARGIN_MS * tolerance) / DEFAULT_GAP_TOLERANCE,
  };
}

export interface SendTiming {
  readonly dotMs: number;
  readonly dashMs: number;
  /** Between the symbols of a letter. */
  readonly symbolGapMs: number;
  /** Between letters. */
  readonly letterGapMs: number;
  /** Between words. */
  readonly wordGapMs: number;
}

/**
 * The timing to send at `wpm`, with the letters at that speed and, with
 * Farnsworth, the gaps between letters and words stretched to reach
 * `effectiveWpm` overall (the ARRL formula).
 */
export function sendTiming(wpm: number, effectiveWpm: number = wpm): SendTiming {
  const unit = unitMs(wpm);
  const effective = Math.min(effectiveWpm, wpm);
  // Total extra delay of a PARIS word, spread over its 19 units of spacing.
  const delayMs = ((60 * wpm - 37.2 * effective) / (effective * wpm)) * 1000;
  const spacing = delayMs / 19;
  return {
    dotMs: unit,
    dashMs: 3 * unit,
    symbolGapMs: unit,
    letterGapMs: 3 * spacing,
    wordGapMs: 7 * spacing,
  };
}

export interface TimedSymbol {
  readonly symbol: MorseSymbol;
  /** From the start of the letter. */
  readonly startMs: number;
  readonly durationMs: number;
}

/** When each symbol of a code sounds, and how long the letter lasts. */
export function letterTimeline(
  code: Code,
  timing: SendTiming,
): { symbols: TimedSymbol[]; durationMs: number } {
  let at = 0;
  const symbols = symbolsOf(code).map((symbol, i) => {
    if (i > 0) at += timing.symbolGapMs;
    const durationMs = symbol === 'dot' ? timing.dotMs : timing.dashMs;
    const timed = { symbol, startMs: at, durationMs };
    at += durationMs;
    return timed;
  });
  return { symbols, durationMs: at };
}
