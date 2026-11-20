import { describe, expect, it } from 'vitest';
import { createRhythm, RHYTHM_MAX_STEP, RHYTHM_WEIGHT } from '../../../src/morse/rhythm.ts';
import { MAX_WPM, MIN_WPM, unitMs } from '../../../src/morse/timing.ts';

describe('the rhythm of whoever keys (SPEC §4.2)', () => {
  it('starts from the unit it is given', () => {
    expect(createRhythm(100).unitMs).toBe(100);
  });

  it('does not move with a standard rhythm: dot 1 u, dash 3 u, gap 1 u', () => {
    const rhythm = createRhythm(100);
    rhythm.mark('dot', 100);
    rhythm.mark('dash', 300);
    rhythm.gap(100);
    expect(rhythm.unitMs).toBe(100);
  });

  it('moves towards a slower or faster rhythm, a step at a time', () => {
    const slower = createRhythm(100);
    slower.mark('dot', 200);
    expect(slower.unitMs).toBe(100 + RHYTHM_WEIGHT * 100);
    slower.gap(200);
    expect(slower.unitMs).toBeGreaterThan(125);

    const faster = createRhythm(100);
    faster.mark('dash', 180);
    expect(faster.unitMs).toBe(100 - RHYTHM_WEIGHT * 40);
  });

  it('bounds an odd sample, a hold of seconds or a hasty tap', () => {
    const long = createRhythm(100);
    long.mark('dash', 6000);
    expect(long.unitMs).toBe(100 + RHYTHM_WEIGHT * (100 * RHYTHM_MAX_STEP - 100));
    const short = createRhythm(100);
    short.gap(1);
    expect(short.unitMs).toBe(100 - RHYTHM_WEIGHT * (100 - 100 / RHYTHM_MAX_STEP));
  });

  it('stays within the speeds of the settings', () => {
    const slow = createRhythm(100);
    const fast = createRhythm(100);
    for (let i = 0; i < 100; i++) {
      slow.gap(10_000);
      fast.gap(1);
    }
    expect(slow.unitMs).toBe(unitMs(MIN_WPM));
    expect(fast.unitMs).toBe(unitMs(MAX_WPM));
  });

  it('starts again on reset', () => {
    const rhythm = createRhythm(100);
    rhythm.gap(200);
    rhythm.reset(60);
    expect(rhythm.unitMs).toBe(60);
  });
});
