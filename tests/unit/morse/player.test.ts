import { beforeEach, describe, expect, it } from 'vitest';
import { ALPHABET_V1 } from '../../../src/morse/alphabet.ts';
import { systemClock } from '../../../src/morse/clock.ts';
import {
  createPlayer,
  plan,
  type PlanEvent,
  type Player,
  type PlayerEvents,
} from '../../../src/morse/player.ts';
import { tokenize } from '../../../src/morse/text.ts';
import { sendTiming } from '../../../src/morse/timing.ts';
import { createFakeClock, type FakeClock } from '../support/fakeClock.ts';

const codeOf = (char: string) => ALPHABET_V1[char];

// At 12 WPM: a unit of 100 ms; a dot 100, a dash 300, 100 between symbols,
// 300 between letters and 700 between words (SPEC §4.1).
const TIMING = sendTiming(12);
const tokens = (text: string) => tokenize(text, codeOf);

const brief = (event: PlanEvent) => {
  const at = Math.round(event.atMs);
  switch (event.type) {
    case 'letter':
      return `${at} ${event.char}`;
    case 'symbol':
      return `${at} ${event.sequence}`;
    case 'letterEnd':
      return `${at} end+${Math.round(event.gapMs)}`;
    case 'wordSpace':
      return `${at} space@${event.index}`;
  }
};

describe('plan (SPEC §6.5)', () => {
  it('times each symbol, letter and gap at the speed of the timing', () => {
    const { events, durationMs } = plan(tokens('ET A'), TIMING);
    expect(events.map(brief)).toEqual([
      '0 E',
      '0 .',
      '100 end+300',
      '400 T',
      '400 -',
      '700 end+700',
      '700 space@2',
      '1400 A',
      '1400 .',
      '1600 .-',
      '1900 end+0',
    ]);
    expect(durationMs).toBe(1900);
  });

  it('plays PARIS in 43 units, and with its word gap the 50 of one word a minute', () => {
    for (const wpm of [5, 12, 20, 40]) {
      const timing = sendTiming(wpm);
      const { durationMs } = plan(tokens('PARIS'), timing);
      expect(durationMs).toBeCloseTo(43 * timing.dotMs);
      expect(durationMs + timing.wordGapMs).toBeCloseTo(60000 / wpm);
    }
  });

  it('keeps the letters at their speed with Farnsworth, and the word at the effective one', () => {
    const timing = sendTiming(20, 10);
    const { events, durationMs } = plan(tokens('PARIS'), timing);
    const p = events.filter((e) => e.type === 'symbol' && e.index === 0);
    expect(p.map((e) => e.atMs)).toEqual([0, 120, 360, 600].map((ms) => expect.closeTo(ms, 6)));
    expect(durationMs + timing.wordGapMs).toBeCloseTo(6000);
  });

  it('skips what is not in the alphabet, without time', () => {
    expect(plan(tokens('E!ñE'), TIMING).events.map(brief)).toEqual([
      '0 E',
      '0 .',
      '100 end+300',
      '400 E',
      '400 .',
      '500 end+0',
    ]);
  });

  it('makes one word gap of any blanks, and none at the start or the end', () => {
    const { events, durationMs } = plan(tokens('  E \n\t E  '), TIMING);
    expect(events.map(brief)).toEqual([
      '0 E',
      '0 .',
      '100 end+700',
      '100 space@3',
      '800 E',
      '800 .',
      '900 end+0',
    ]);
    expect(durationMs).toBeCloseTo(900);
  });

  it('starts at a token', () => {
    expect(plan(tokens('ET'), TIMING, 1).events.map(brief)).toEqual(['0 T', '0 -', '300 end+0']);
    expect(plan(tokens('E'), TIMING, 5)).toEqual({ events: [], durationMs: 0 });
  });

  it('gives nothing for a text without letters', () => {
    expect(plan(tokens(' ¿? 42 '), TIMING)).toEqual({ events: [], durationMs: 0 });
  });
});

describe('the player', () => {
  let clock: FakeClock;
  let player: Player;
  let log: string[];

  function create(timing = TIMING): Player {
    const p = createPlayer({ timing, clock });
    const types: (keyof PlayerEvents)[] = [
      'letter',
      'symbol',
      'letterEnd',
      'wordSpace',
      'end',
      'state',
    ];
    const start = clock.now();
    for (const type of types) {
      p.on(type, (payload) => {
        const at = Math.round(clock.now() - start);
        const p = payload as {
          state?: string;
          char?: string;
          sequence?: string;
          gapMs?: number;
        };
        const gap = p.gapMs === undefined ? '' : Math.round(p.gapMs);
        const detail = p.state ?? p.char ?? p.sequence ?? gap;
        log.push(`${at} ${type}${detail === '' ? '' : ` ${detail}`}`);
      });
    }
    return p;
  }

  beforeEach(() => {
    clock = createFakeClock();
    log = [];
    player = create();
  });

  it('plays the text, each event at its time, and stops at the end', () => {
    player.load(tokens('E T'));
    player.play();
    expect(player.state).toBe('playing');
    clock.advance(5000);
    expect(log).toEqual([
      '0 state playing',
      '0 letter E',
      '0 symbol .',
      '100 letterEnd 700',
      '100 wordSpace',
      '800 letter T',
      '800 symbol -',
      '1100 letterEnd 0',
      '1100 state stopped',
      '1100 end',
    ]);
    expect(player.state).toBe('stopped');
    expect(player.position).toBeNull();
    expect(clock.pending).toBe(0);
  });

  it('times every event from the start, so that late timers do not add up', () => {
    const late = {
      ...clock,
      setTimeout: (callback: () => void, ms: number) => clock.setTimeout(callback, ms + 7),
    };
    const p = createPlayer({ timing: TIMING, clock: late });
    const letters: [number, number][] = [];
    const start = clock.now();
    p.on('letter', ({ lateMs }) => letters.push([clock.now() - start, lateMs]));
    p.load(tokens('EEE'));
    p.play();
    clock.advance(2000);
    // Each one 7 ms late, never 14 or 21.
    expect(letters).toEqual([
      [7, 7],
      [407, 7],
      [807, 7],
    ]);
  });

  it('says which letter plays', () => {
    player.load(tokens('a b'));
    player.play();
    expect(player.position).toBeNull();
    clock.advance(0);
    expect(player.position).toBe(0);
    clock.advance(1100); // .- and the word gap: B at 1200
    expect(player.position).toBe(0);
    clock.advance(100);
    expect(player.position).toBe(2);
  });

  it('does nothing without letters, or when already playing', () => {
    player.play();
    player.load(tokens('?! 7'));
    player.play();
    expect(player.state).toBe('stopped');
    player.load(tokens('E'));
    player.play();
    player.play();
    clock.advance(1000);
    expect(log.filter((line) => line.includes('letter E'))).toHaveLength(1);
  });

  it('pauses, and plays again from the letter that was interrupted', () => {
    player.load(tokens('ET'));
    player.play();
    clock.advance(500); // in the dash of T
    player.pause();
    expect(player.state).toBe('paused');
    expect(player.position).toBe(1);
    clock.advance(5000);
    expect(log.at(-1)).toBe('500 state paused');
    player.play();
    clock.advance(5000);
    expect(log.slice(-6)).toEqual([
      '5500 state playing',
      '5500 letter T',
      '5500 symbol -',
      '5800 letterEnd 0',
      '5800 state stopped',
      '5800 end',
    ]);
  });

  it('after a pause in a gap, goes on with the next letter', () => {
    player.load(tokens('ET'));
    player.play();
    clock.advance(200); // between E and T
    player.pause();
    player.play();
    clock.advance(1000);
    expect(log.filter((line) => line.includes(' letter '))).toEqual(['0 letter E', '200 letter T']);
  });

  it('paused after the last letter, playing again is the end', () => {
    player.load(tokens('E'));
    const off = player.on('letterEnd', () => player.pause());
    player.play();
    clock.advance(100);
    off();
    expect(player.state).toBe('paused');
    player.play();
    clock.advance(0);
    expect(log.slice(-4)).toEqual([
      '100 state paused',
      '100 state playing',
      '100 state stopped',
      '100 end',
    ]);
    expect(clock.pending).toBe(0);
  });

  it('plays again from a listener without doubling the timers', () => {
    player.load(tokens('ET'));
    let restarted = false;
    player.on('letterEnd', () => {
      if (restarted) return;
      restarted = true;
      player.stop();
      player.play();
    });
    player.play();
    clock.advance(100);
    expect(clock.pending).toBe(1);
    clock.advance(5000);
    expect(log.filter((line) => line.includes(' letter '))).toEqual([
      '0 letter E',
      '100 letter E',
      '500 letter T',
    ]);
  });

  it('stops and goes back to the start', () => {
    player.load(tokens('ET'));
    player.play();
    clock.advance(500);
    player.stop();
    expect(player.state).toBe('stopped');
    expect(player.position).toBeNull();
    expect(clock.pending).toBe(0);
    player.play();
    clock.advance(0);
    expect(log.at(-1)).toBe('500 symbol .');
    // Paused, stop also forgets where it was.
    player.pause();
    player.stop();
    player.play();
    clock.advance(0);
    expect(log.at(-2)).toBe('500 letter E');
  });

  it('loops with a word gap between the end and the start', () => {
    player.setLoop(true);
    expect(player.loop).toBe(true);
    player.load(tokens('ET'));
    player.play();
    clock.advance(1450);
    expect(log).toEqual([
      '0 state playing',
      '0 letter E',
      '0 symbol .',
      '100 letterEnd 300',
      '400 letter T',
      '400 symbol -',
      '700 letterEnd 700',
      '1400 letter E',
      '1400 symbol .',
    ]);
    player.setLoop(false);
    clock.advance(5000);
    expect(log.slice(-2)).toEqual(['2100 state stopped', '2100 end']);
  });

  it('loops after a pause past the last letter', () => {
    player.setLoop(true);
    player.load(tokens('E'));
    player.play();
    clock.advance(150);
    player.pause();
    player.play();
    clock.advance(700);
    expect(log.at(-2)).toBe('850 letter E');
  });

  it('takes a new timing from the next letter on', () => {
    player.load(tokens('EEE'));
    player.play();
    clock.advance(50);
    player.setTiming(sendTiming(24));
    clock.advance(2000);
    // The first E and its gap at 12 WPM; from the second one, at 24.
    expect(log.filter((line) => / letter(End)? /.test(line))).toEqual([
      '0 letter E',
      '100 letterEnd 300',
      '400 letter E',
      '450 letterEnd 150',
      '600 letter E',
      '650 letterEnd 0',
    ]);
  });

  it('uses a new timing when playing again, also when it changed while stopped', () => {
    player.setTiming(sendTiming(24));
    player.load(tokens('E'));
    player.play();
    clock.advance(1000);
    expect(log).toContain('50 letterEnd 0');
  });

  it('stops when the text changes', () => {
    player.load(tokens('ET'));
    player.play();
    player.load(tokens('A'));
    expect(player.state).toBe('stopped');
    expect(clock.pending).toBe(0);
  });

  it('does nothing more after dispose', () => {
    player.load(tokens('ET'));
    player.play();
    player.dispose();
    expect(clock.pending).toBe(0);
  });

  it('uses the system clock by default', () => {
    const p = createPlayer({ timing: TIMING, loop: true });
    expect(p.loop).toBe(true);
    expect(p.state).toBe('stopped');
    expect(systemClock.now()).toBeGreaterThan(0);
  });
});
