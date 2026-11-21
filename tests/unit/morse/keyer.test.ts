import { beforeEach, describe, expect, it, vi } from 'vitest';
import { systemClock } from '../../../src/morse/clock.ts';
import { createEmitter } from '../../../src/morse/emitter.ts';
import { createKeyer, type Keyer, type KeyerEvents } from '../../../src/morse/keyer.ts';
import { MIN_MARGIN_MS, PAUSE_WEIGHT, REJECTED_GROWTH } from '../../../src/morse/pauses.ts';
import { keyerTiming } from '../../../src/morse/timing.ts';
import { TREE_V1 } from '../../../src/morse/tree.ts';
import { createFakeClock, type FakeClock } from '../support/fakeClock.ts';

// At 12 WPM with the defaults: u = 100 ms, dash from 200 ms, letter closed
// 450 ms after the last symbol, its path off at 900 ms and, with the word
// margin of 1 s, the word space at 1900 ms (SPEC §3.3, §4.2).
const TIMING = keyerTiming({ wpm: 12 });

let clock: FakeClock;
let keyer: Keyer;
let log: string[];

function record(k: Keyer): void {
  const types: (keyof KeyerEvents)[] = [
    'keyDown',
    'keyUp',
    'symbol',
    'letter',
    'wordSpace',
    'invalid',
    'cancel',
  ];
  for (const type of types) {
    k.on(type, (payload) => {
      if (type === 'keyDown' || type === 'keyUp') return;
      const p = payload as Partial<
        KeyerEvents['symbol'] & KeyerEvents['letter'] & KeyerEvents['invalid']
      >;
      const detail = p.char ?? p.sequence ?? '';
      const node = p.lastValidNode ? `@${p.lastValidNode.char ?? 'ROOT'}` : '';
      log.push(`${type}${detail ? ` ${detail}` : ''}${node}`);
    });
  }
}

/** Holds the key for `ms`, then waits `gap` before the next action. */
function key(ms: number, gap = 100): void {
  keyer.press();
  clock.advance(ms);
  keyer.release();
  clock.advance(gap);
}

beforeEach(() => {
  clock = createFakeClock();
  keyer = createKeyer({ tree: TREE_V1, timing: TIMING, clock });
  log = [];
  record(keyer);
});

describe('classifying presses (SPEC §4.2)', () => {
  it('a press shorter than the dash threshold is a dot; the rest, dashes', () => {
    key(199);
    key(200);
    expect(log).toEqual(['symbol .', 'symbol .-']);
    expect(keyer.sequence).toBe('.-');
  });

  it('ignores a press shorter than the debounce', () => {
    key(14);
    expect(log).toEqual([]);
    key(15);
    expect(log).toEqual(['symbol .']);
  });

  it('emits keyDown and keyUp with the duration, also for a bounce', () => {
    const ups: number[] = [];
    let downs = 0;
    keyer.on('keyDown', () => downs++);
    keyer.on('keyUp', ({ durationMs }) => ups.push(durationMs));
    key(5);
    key(300);
    expect(downs).toBe(2);
    expect(ups).toEqual([5, 300]);
  });

  it('ignores a second press or a release without a press', () => {
    keyer.release();
    keyer.press();
    clock.advance(50);
    keyer.press();
    clock.advance(250);
    keyer.release();
    keyer.release();
    expect(log).toEqual(['symbol -']);
    expect(keyer.pressed).toBe(false);
  });

  it('gives the node of each symbol', () => {
    const nodes: (string | null)[] = [];
    keyer.on('symbol', ({ node }) => nodes.push(node.char));
    key(80);
    key(300);
    key(80);
    expect(nodes).toEqual(['E', 'A', 'R']);
  });
});

describe('closing letters and words', () => {
  it('types .-.. → L, closed 450 ms after the last symbol', () => {
    key(80);
    key(300);
    key(80);
    key(80, 0);
    clock.advance(449);
    expect(log.at(-1)).toBe('symbol .-..');
    clock.advance(1);
    expect(log.at(-1)).toBe('letter L');
    expect(keyer.sequence).toBe('');
  });

  it('a press inside the letter gap continues the letter', () => {
    key(80, 449);
    key(80, 449);
    clock.advance(1);
    expect(log).toEqual(['symbol .', 'symbol ..', 'letter I']);
  });

  it('inserts one word space 1900 ms after the last symbol, and only one', () => {
    key(80, 0);
    clock.advance(1899);
    expect(log).toEqual(['symbol .', 'letter E']);
    clock.advance(1);
    expect(log.at(-1)).toBe('wordSpace');
    clock.advance(10_000);
    expect(log.filter((e) => e === 'wordSpace')).toHaveLength(1);
  });

  it('the path of the letter holds as long as the letter gap; then, the margin', () => {
    const holds: number[] = [];
    keyer.on('letter', ({ holdMs }) => holds.push(holdMs));
    key(80, 0);
    clock.advance(450);
    // Closed at 450 ms; the path, off at 900 ms; the space, 1 s later.
    expect(holds).toEqual([450]);
    clock.advance(450 + 999);
    expect(log.at(-1)).toBe('letter E');
    clock.advance(1);
    expect(log.at(-1)).toBe('wordSpace');
  });

  it('with Enter, the path holds until 900 ms after the last symbol', () => {
    const holds: number[] = [];
    keyer.on('letter', ({ holdMs }) => holds.push(holdMs));
    keyer.input('dot');
    clock.advance(200);
    keyer.commit();
    expect(holds).toEqual([700]);
  });

  it('never starts with a word space', () => {
    clock.advance(10_000);
    keyer.cancel();
    clock.advance(10_000);
    expect(log).toEqual([]);
  });

  it('a press after the letter but before the word gap avoids the space', () => {
    key(80, 600);
    key(300, 2000);
    expect(log).toEqual(['symbol .', 'letter E', 'symbol -', 'letter T', 'wordSpace']);
  });

  it('writes words: HI THERE-like sequences with spaces between them', () => {
    key(80, 500); // E
    key(80, 2000); // E, then a space
    key(300, 500); // T
    expect(log.filter((e) => !e.startsWith('symbol'))).toEqual([
      'letter E',
      'letter E',
      'wordSpace',
      'letter T',
    ]);
  });
});

describe('direct input of . and - (SPEC §3.6)', () => {
  it('uses the same machine and the same gaps', () => {
    keyer.input('dot');
    keyer.input('dash');
    clock.advance(450);
    expect(log).toEqual(['symbol .', 'symbol .-', 'letter A']);
    clock.advance(1450);
    expect(log.at(-1)).toBe('wordSpace');
  });

  it('is ignored while the key is down', () => {
    keyer.press();
    keyer.input('dot');
    expect(log).toEqual([]);
  });

  it('Enter closes the letter at once', () => {
    keyer.input('dash');
    keyer.input('dash');
    keyer.commit();
    expect(log).toEqual(['symbol -', 'symbol --', 'letter M']);
    // The path and the margin still count from the last symbol.
    clock.advance(1900);
    expect(log.at(-1)).toBe('wordSpace');
  });

  it('Enter does nothing without a sequence or with the key down', () => {
    keyer.commit();
    keyer.input('dot');
    keyer.press();
    keyer.commit();
    expect(log).toEqual(['symbol .']);
  });
});

describe('invalid sequences (SPEC §4.4)', () => {
  it('a symbol to a node that does not exist is invalid, at the last valid node', () => {
    for (const s of ['dot', 'dot', 'dash', 'dash'] as const) keyer.input(s);
    expect(log).toEqual(['symbol .', 'symbol ..', 'symbol ..-', 'invalid ..--@U']);
    expect(keyer.sequence).toBe('');
    clock.advance(450);
    expect(log.some((e) => e.startsWith('letter'))).toBe(false);
  });

  it('more than four symbols is invalid', () => {
    for (let i = 0; i < 5; i++) keyer.input('dot');
    expect(log.at(-1)).toBe('invalid .....@H');
  });

  it('after an invalid sequence a new one starts from the root', () => {
    for (let i = 0; i < 5; i++) keyer.input('dot');
    keyer.input('dash');
    keyer.commit();
    expect(log.at(-1)).toBe('letter T');
  });

  it('a word space can still follow a letter written before', () => {
    keyer.input('dot');
    keyer.commit();
    for (let i = 0; i < 5; i++) keyer.input('dash');
    clock.advance(1900);
    expect(log.at(-1)).toBe('wordSpace');
  });

  it('in a bigger tree, a node without a letter is invalid when closed', () => {
    // The "Pro mode" may have nodes without a letter; v1 has none.
    const noLetter = { ...TREE_V1.root, code: '-', char: null };
    const tree = { ...TREE_V1, node: (code: string) => (code === '-' ? noLetter : undefined) };
    const k = createKeyer({ tree, timing: TIMING, clock });
    const seen: string[] = [];
    k.on('invalid', ({ sequence, lastValidNode }) =>
      seen.push(`${sequence}@${lastValidNode.code}`),
    );
    k.input('dash');
    k.commit();
    expect(seen).toEqual(['-@']);
  });
});

describe('cancelling (Escape, Backspace)', () => {
  it('discards the sequence in progress and says whether there was one', () => {
    keyer.input('dot');
    expect(keyer.cancel()).toBe(true);
    expect(log).toEqual(['symbol .', 'cancel .']);
    expect(keyer.cancel()).toBe(false);
    clock.advance(450);
    expect(log).toHaveLength(2);
  });
});

describe('changing the timing', () => {
  it('re-arms the pending gap with the new one', () => {
    keyer.input('dot');
    clock.advance(300);
    keyer.setTiming(keyerTiming({ wpm: 24 })); // letter gap 225 ms: already due
    clock.advance(0);
    expect(log.at(-1)).toBe('letter E');
  });

  it('classifies with the new threshold', () => {
    keyer.setTiming(keyerTiming({ wpm: 24 })); // dash from 100 ms
    key(120);
    expect(log).toEqual(['symbol -']);
  });
});

describe('a bounce while a letter is in progress', () => {
  it('keeps the letter gap counting from the last real symbol', () => {
    key(80, 300);
    key(5, 0); // a bounce, 385 ms after the dot
    clock.advance(144);
    expect(log).toEqual(['symbol .']);
    clock.advance(1);
    expect(log).toEqual(['symbol .', 'letter E']);
  });

  it('closes at once if the gap ran out during the bounce', () => {
    key(80, 440);
    key(10, 0);
    clock.advance(0);
    expect(log).toEqual(['symbol .', 'letter E']);
  });
});

describe('adaptive gaps (SPEC §4.2)', () => {
  let adaptive: Keyer;

  beforeEach(() => {
    keyer.dispose();
    adaptive = createKeyer({ tree: TREE_V1, timing: TIMING, clock, adaptive: true });
    keyer = adaptive;
    record(adaptive);
  });

  it('with a standard rhythm, closes letters and words as the fixed keyer', () => {
    key(100);
    key(300, 449);
    expect(log).toEqual(['symbol .', 'symbol .-']);
    clock.advance(1);
    expect(log).toEqual(['symbol .', 'symbol .-', 'letter A']);
    clock.advance(1900 - 450);
    expect(log.at(-1)).toBe('wordSpace');
    expect(adaptive.unitMs).toBe(100);
  });

  it('keying slower than the set speed does not split the letter', () => {
    key(180, 500);
    key(180, 500);
    key(180, 0);
    clock.advance(2000);
    expect(log).toEqual(['symbol .', 'symbol ..', 'symbol ...', 'letter S']);
    expect(adaptive.unitMs).toBeGreaterThan(150);
    // The hold grew too, 2 × 3 u × 1.5 of the new unit; then the margin.
    clock.advance(900 * (adaptive.unitMs / 100) + 1000 - 2000);
    expect(log.at(-1)).toBe('wordSpace');
  });

  it('a slower rhythm also holds the path longer', () => {
    const holds: number[] = [];
    adaptive.on('letter', ({ holdMs }) => holds.push(holdMs));
    key(180, 500);
    key(180, 500);
    key(180, 0);
    clock.advance(2000);
    // Closed at 3 u × 1.5, and held as long again.
    expect(holds).toHaveLength(1);
    expect(holds[0]).toBeCloseTo(4.5 * adaptive.unitMs, 0);
    expect(holds[0]).toBeGreaterThan(450);
  });

  it('the same presses split the letter with fixed gaps', () => {
    const fixed = createKeyer({ tree: TREE_V1, timing: TIMING, clock });
    const letters: string[] = [];
    fixed.on('letter', ({ char }) => letters.push(char));
    for (let i = 0; i < 3; i++) {
      fixed.press();
      clock.advance(180);
      fixed.release();
      clock.advance(500);
    }
    expect(letters).toEqual(['E', 'E', 'E']);
    fixed.dispose();
  });

  it('the dash threshold does not adapt', () => {
    for (let i = 0; i < 3; i++) key(190, 300);
    expect(adaptive.unitMs).toBeGreaterThan(150);
    key(200);
    expect(log.at(-1)).toBe('symbol ...-');
  });

  it('counts neither bounces, typed symbols nor the silence between letters', () => {
    key(5);
    adaptive.input('dot');
    clock.advance(300);
    adaptive.input('dot');
    clock.advance(450);
    expect(log.at(-1)).toBe('letter I');
    clock.advance(5000);
    key(100);
    expect(adaptive.unitMs).toBe(100);
  });

  it('starts again from the new unit when the timing changes', () => {
    key(199);
    expect(adaptive.unitMs).toBeGreaterThan(100);
    adaptive.setTiming(keyerTiming({ wpm: 20 }));
    expect(adaptive.unitMs).toBe(60);
  });

  it('the fixed keyer counts with the unit of its timing', () => {
    const fixed = createKeyer({ tree: TREE_V1, timing: TIMING, clock });
    expect(fixed.unitMs).toBe(100);
    fixed.dispose();
  });
});

describe('dispose', () => {
  it('stops the timers and ignores the key', () => {
    keyer.input('dot');
    keyer.dispose();
    clock.advance(10_000);
    keyer.press();
    keyer.input('dash');
    expect(log).toEqual(['symbol .']);
    expect(clock.pending).toBe(0);
  });
});

describe('the emitter', () => {
  it('unsubscribes, also from inside a listener', () => {
    const emitter = createEmitter<{ ping: number }>();
    const seen: number[] = [];
    const off = emitter.on('ping', (n) => {
      seen.push(n);
      off();
    });
    emitter.on('ping', (n) => seen.push(n * 10));
    emitter.emit('ping', 1);
    emitter.emit('ping', 2);
    expect(seen).toEqual([1, 10, 20]);
  });
});

describe('the system clock', () => {
  it('uses the real timers', () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const handle = systemClock.setTimeout(spy, 10);
    systemClock.clearTimeout(handle);
    systemClock.setTimeout(spy, 10);
    vi.advanceTimersByTime(10);
    expect(spy).toHaveBeenCalledOnce();
    expect(typeof systemClock.now()).toBe('number');
    vi.useRealTimers();
  });

  it('is the default clock of the keyer', () => {
    vi.useFakeTimers();
    const k = createKeyer({ tree: TREE_V1, timing: TIMING });
    const letters: string[] = [];
    k.on('letter', ({ char }) => letters.push(char));
    k.input('dash');
    vi.advanceTimersByTime(450);
    expect(letters).toEqual(['T']);
    k.dispose();
    vi.useRealTimers();
  });
});

describe('the word margin adapts to the pauses between letters (SPEC §4.2)', () => {
  let adaptive: Keyer;

  beforeEach(() => {
    keyer.dispose();
    adaptive = createKeyer({ tree: TREE_V1, timing: TIMING, clock, adaptive: true });
    keyer = adaptive;
    record(adaptive);
  });

  /**
   * An E, waiting `pauseMs` after its path goes off (900 ms): the pause is
   * measured when the next letter is keyed.
   */
  function letterThenPause(pauseMs: number, times = 1): void {
    for (let i = 0; i < times; i++) key(100, 900 + pauseMs);
  }

  it('starts at 1 s, and the space comes 1 s after the path goes off', () => {
    expect(adaptive.wordMarginMs).toBe(1000);
    key(100, 1899);
    expect(log.at(-1)).toBe('letter E');
    clock.advance(1);
    expect(log.at(-1)).toBe('wordSpace');
  });

  it('becomes 2.5 times the usual pause, a step at a time', () => {
    letterThenPause(200, 2);
    expect(adaptive.wordMarginMs).toBe(1000 + PAUSE_WEIGHT * (500 - 1000));
    letterThenPause(200, 30);
    expect(adaptive.wordMarginMs).toBeCloseTo(500, 0);
    expect(log).not.toContain('wordSpace');
  });

  it('a quick hand, keying while the path is still lit, gets its spaces sooner', () => {
    for (let i = 0; i < 30; i++) key(100, 600);
    expect(adaptive.wordMarginMs).toBeCloseTo(MIN_MARGIN_MS, 0);
    // The path goes off 300 ms from now; the space, the margin later.
    clock.advance(Math.ceil(300 + adaptive.wordMarginMs) - 1);
    expect(log.at(-1)).toBe('letter E');
    clock.advance(1);
    expect(log.at(-1)).toBe('wordSpace');
  });

  it('whoever stops to think gets a wider margin', () => {
    letterThenPause(800, 30);
    expect(adaptive.wordMarginMs).toBeCloseTo(2000, 0);
    expect(log).not.toContain('wordSpace');
  });

  it('a space deleted at once widens it by 30 %, once', () => {
    key(100, 1900);
    expect(log.at(-1)).toBe('wordSpace');
    adaptive.rejectSpace();
    expect(adaptive.wordMarginMs).toBeCloseTo(1000 * REJECTED_GROWTH);
    adaptive.rejectSpace();
    expect(adaptive.wordMarginMs).toBeCloseTo(1000 * REJECTED_GROWTH);
  });

  it('deleting a space after keying again says nothing', () => {
    key(100, 1900);
    key(100, 0);
    adaptive.rejectSpace();
    expect(adaptive.wordMarginMs).toBe(1000);
  });

  it('neither a bounce nor the first letter after a space count as a pause', () => {
    key(100, 1900); // E, and its space
    key(100, 1000); // the first letter of the next word
    key(5, 0); // a bounce, 100 ms after its path went off
    expect(adaptive.wordMarginMs).toBe(1000);
  });

  it('is multiplied by the gap tolerance', () => {
    adaptive.setTiming(keyerTiming({ wpm: 12, gapTolerance: 3 }));
    expect(adaptive.wordMarginMs).toBe(2000);
  });

  it('the fixed keyer keeps the margin of its timing', () => {
    const fixed = createKeyer({ tree: TREE_V1, timing: TIMING, clock });
    for (let i = 0; i < 5; i++) {
      fixed.input('dot');
      clock.advance(1000);
    }
    fixed.rejectSpace();
    expect(fixed.wordMarginMs).toBe(1000);
    fixed.dispose();
  });
});

describe('word spaces by hand (SPEC §4.2)', () => {
  beforeEach(() => {
    keyer.dispose();
    keyer = createKeyer({ tree: TREE_V1, timing: TIMING, clock, autoSpace: false });
    record(keyer);
  });

  it('without automatic spaces, the margin inserts nothing', () => {
    key(80, 10_000);
    expect(log).toEqual(['symbol .', 'letter E']);
  });

  it('space() ends the word after a letter, once', () => {
    key(80, 600);
    keyer.space();
    keyer.space();
    expect(log).toEqual(['symbol .', 'letter E', 'wordSpace']);
  });

  it('space() closes the letter in progress first', () => {
    key(80, 0);
    key(300, 0);
    keyer.space();
    expect(log).toEqual(['symbol .', 'symbol .-', 'letter A', 'wordSpace']);
  });

  it('space() does nothing at the start, after an invalid letter or with the key down', () => {
    keyer.space();
    keyer.press();
    clock.advance(80);
    keyer.space();
    keyer.release();
    expect(log).toEqual(['symbol .']);
    keyer.cancel();
    keyer.space();
    expect(log).toEqual(['symbol .', 'cancel .']);
  });

  it('a space asked for and deleted does not widen the margin', () => {
    const adaptive = createKeyer({ tree: TREE_V1, timing: TIMING, clock, adaptive: true });
    adaptive.input('dot');
    adaptive.space();
    adaptive.rejectSpace();
    expect(adaptive.wordMarginMs).toBe(1000);
  });

  it('turning them on arms the margin; off, disarms it', () => {
    key(80, 600);
    keyer.setAutoSpace(true);
    clock.advance(1299);
    expect(log.at(-1)).toBe('letter E');
    clock.advance(1);
    expect(log.at(-1)).toBe('wordSpace');
    key(80, 600);
    keyer.setAutoSpace(false);
    clock.advance(10_000);
    expect(log.at(-1)).toBe('letter E');
  });

  it('with automatic spaces too, space() ends the word before the margin', () => {
    keyer.setAutoSpace(true);
    key(80, 600);
    keyer.space();
    clock.advance(10_000);
    expect(log.filter((e) => e === 'wordSpace')).toHaveLength(1);
  });
});
