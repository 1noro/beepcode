import { describe, expect, it } from 'vitest';
import {
  createWordPauses,
  MARGIN_PER_PAUSE,
  MAX_MARGIN_MS,
  MIN_MARGIN_MS,
  PAUSE_WEIGHT,
  REJECTED_GROWTH,
} from '../../../src/morse/pauses.ts';

describe('the pauses between letters (SPEC §4.2)', () => {
  it('starts with a margin of 1 s, or the one it is given', () => {
    expect(createWordPauses().marginMs).toBe(1000);
    expect(createWordPauses(700).marginMs).toBe(700);
  });

  it('does not move when the pauses match the margin', () => {
    const pauses = createWordPauses();
    pauses.pause(1000 / MARGIN_PER_PAUSE);
    expect(pauses.marginMs).toBe(1000);
  });

  it('moves a step towards 2.5 times each pause', () => {
    const pauses = createWordPauses();
    pauses.pause(600);
    expect(pauses.marginMs).toBe(1000 + PAUSE_WEIGHT * (1500 - 1000));
    pauses.pause(100);
    expect(pauses.marginMs).toBeLessThan(1125);
  });

  it('counts a letter begun before the path went off as no pause', () => {
    const pauses = createWordPauses();
    pauses.pause(-300);
    expect(pauses.marginMs).toBe(1000 + PAUSE_WEIGHT * (MIN_MARGIN_MS - 1000));
  });

  it('stays between its limits', () => {
    const quick = createWordPauses();
    for (let i = 0; i < 100; i++) quick.pause(0);
    expect(quick.marginMs).toBeCloseTo(MIN_MARGIN_MS);
    expect(quick.marginMs).toBeGreaterThanOrEqual(MIN_MARGIN_MS);
    const slow = createWordPauses(2900);
    for (let i = 0; i < 100; i++) slow.pause(60_000);
    expect(slow.marginMs).toBeCloseTo(MAX_MARGIN_MS);
    expect(slow.marginMs).toBeLessThanOrEqual(MAX_MARGIN_MS);
  });

  it('widens by 30 % with a space deleted at once, up to the limit', () => {
    const pauses = createWordPauses();
    pauses.rejected();
    expect(pauses.marginMs).toBe(1000 * REJECTED_GROWTH);
    for (let i = 0; i < 20; i++) pauses.rejected();
    expect(pauses.marginMs).toBe(MAX_MARGIN_MS);
  });
});
