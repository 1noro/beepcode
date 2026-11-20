import { describe, expect, it } from 'vitest';
import { keyerTiming, letterTimeline, sendTiming, unitMs } from '../../../src/morse/timing.ts';

describe('unitMs (SPEC §4.1)', () => {
  it('is 1200 / wpm', () => {
    expect(unitMs(12)).toBe(100);
    expect(unitMs(20)).toBe(60);
  });
});

describe('keyerTiming (SPEC §4.2)', () => {
  it('gives the example at 12 WPM with the defaults', () => {
    expect(keyerTiming({ wpm: 12 })).toEqual({
      unitMs: 100,
      debounceMs: 15,
      dashThresholdMs: 200,
      letterGapMs: 450,
      wordMarginMs: 1000,
    });
  });

  it('applies the dash threshold and the gap tolerance', () => {
    const timing = keyerTiming({ wpm: 20, dashThreshold: 2.5, gapTolerance: 1, debounceMs: 5 });
    expect(timing.dashThresholdMs).toBe(150);
    expect(timing.letterGapMs).toBe(180);
    expect(timing.wordMarginMs).toBeCloseTo(666.67, 1);
    expect(timing.debounceMs).toBe(5);
  });
});

describe('sendTiming', () => {
  it('uses the standard units without Farnsworth', () => {
    const timing = sendTiming(12);
    expect(timing.dotMs).toBe(100);
    expect(timing.dashMs).toBe(300);
    expect(timing.symbolGapMs).toBe(100);
    expect(timing.letterGapMs).toBeCloseTo(300);
    expect(timing.wordGapMs).toBeCloseTo(700);
  });

  it('stretches only the gaps between letters and words with Farnsworth', () => {
    const timing = sendTiming(18, 5);
    expect(timing.dotMs).toBeCloseTo(66.67, 1);
    expect(timing.symbolGapMs).toBeCloseTo(66.67, 1);
    // ARRL: ta = (60·18 − 37.2·5) / (5·18) s = 9.933 s; letter 3/19, word 7/19.
    expect(timing.letterGapMs).toBeCloseTo(1568.4, 1);
    expect(timing.wordGapMs).toBeCloseTo(3659.6, 1);
  });

  it('never makes the effective speed faster than the letters', () => {
    expect(sendTiming(12, 30)).toEqual(sendTiming(12));
  });

  it('keeps PARIS at the effective speed: 50 units in 60 / wpm seconds', () => {
    // PARIS: 10 dots, 4 dashes, 9 symbol gaps, 4 letter gaps and a word gap.
    const t = sendTiming(20, 10);
    const total = 10 * t.dotMs + 4 * t.dashMs + 9 * t.symbolGapMs + 4 * t.letterGapMs + t.wordGapMs;
    expect(total).toBeCloseTo(6000);
  });
});

describe('letterTimeline', () => {
  it('places each symbol with a unit between them', () => {
    const { symbols, durationMs } = letterTimeline('.-.', sendTiming(12));
    expect(symbols).toEqual([
      { symbol: 'dot', startMs: 0, durationMs: 100 },
      { symbol: 'dash', startMs: 200, durationMs: 300 },
      { symbol: 'dot', startMs: 600, durationMs: 100 },
    ]);
    expect(durationMs).toBe(700);
  });

  it('is empty for an empty code', () => {
    expect(letterTimeline('', sendTiming(12))).toEqual({ symbols: [], durationMs: 0 });
  });
});
