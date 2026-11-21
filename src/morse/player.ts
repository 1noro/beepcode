// The player (SPEC §6.5): text, as tokens (text.ts), turned into a timed
// sequence of events (plan) and played with an injectable clock (ADR 0003):
// play, pause, stop and loop. The letters sound at the speed of the timing
// and, with Farnsworth, the gaps between them stretch (timing.ts sendTiming).
// Each event is timed from the start of the run, not from the one before, so
// late timers do not add up.
//
// It knows nobody: the mode beeps and lights the tree from its events. The
// tone of a letter is best scheduled whole on its `letter` event, by the
// audio clock (SPEC §5); `symbol` is for the lights.
import type { Code, MorseSymbol } from './alphabet.ts';
import type { Clock, TimerHandle } from './clock.ts';
import { systemClock } from './clock.ts';
import type { Emitter } from './emitter.ts';
import { createEmitter } from './emitter.ts';
import type { TextToken } from './text.ts';
import { letterTimeline, type SendTiming, type TimedSymbol } from './timing.ts';

/** A letter starts: `index` is its token; its symbols, from its start. */
export interface LetterEvent {
  readonly type: 'letter';
  readonly atMs: number;
  readonly index: number;
  readonly char: string;
  readonly code: Code;
  readonly symbols: readonly TimedSymbol[];
  readonly durationMs: number;
}

/** A symbol sounds; `sequence`, the code up to it. */
export interface SymbolEvent {
  readonly type: 'symbol';
  readonly atMs: number;
  readonly index: number;
  readonly symbol: MorseSymbol;
  readonly sequence: Code;
  readonly durationMs: number;
}

/** The letter has sounded; `gapMs`, the silence until the next one (0: the end). */
export interface LetterEndEvent {
  readonly type: 'letterEnd';
  readonly atMs: number;
  readonly index: number;
  readonly code: Code;
  readonly gapMs: number;
}

/** The pause of a word starts; `index` is its first blank. */
export interface WordSpaceEvent {
  readonly type: 'wordSpace';
  readonly atMs: number;
  readonly index: number;
  readonly durationMs: number;
}

export type PlanEvent = LetterEvent | SymbolEvent | LetterEndEvent | WordSpaceEvent;

export interface Plan {
  /** In order of time; `atMs` from the start of the plan. */
  readonly events: readonly PlanEvent[];
  /** Until the end of the last letter. */
  readonly durationMs: number;
}

/**
 * The events of the tokens from `from` on. What is skipped takes no time;
 * blanks between two letters, a word gap, however many there are; blanks at
 * the start or the end, nothing.
 */
export function plan(tokens: readonly TextToken[], timing: SendTiming, from = 0): Plan {
  const events: PlanEvent[] = [];
  let at = 0;
  let previous: { index: number; code: Code } | null = null;
  let space: number | null = null;

  for (let index = Math.max(0, from); index < tokens.length; index++) {
    const token = tokens[index];
    if (!token || token.kind === 'skip') continue;
    if (token.kind === 'space') {
      if (previous && space === null) space = index;
      continue;
    }
    if (previous) {
      const gapMs = space === null ? timing.letterGapMs : timing.wordGapMs;
      events.push({ type: 'letterEnd', atMs: at, ...previous, gapMs });
      if (space !== null)
        events.push({ type: 'wordSpace', atMs: at, index: space, durationMs: gapMs });
      at += gapMs;
    }
    space = null;
    const { char, code } = token;
    const { symbols, durationMs } = letterTimeline(code, timing);
    events.push({ type: 'letter', atMs: at, index, char, code, symbols, durationMs });
    symbols.forEach((symbol, i) => {
      events.push({
        type: 'symbol',
        atMs: at + symbol.startMs,
        index,
        symbol: symbol.symbol,
        sequence: code.slice(0, i + 1),
        durationMs: symbol.durationMs,
      });
    });
    at += durationMs;
    previous = { index, code };
  }
  if (previous) events.push({ type: 'letterEnd', atMs: at, ...previous, gapMs: 0 });
  return { events, durationMs: at };
}

export type PlayerState = 'stopped' | 'playing' | 'paused';

export interface PlayerEvents {
  /** `lateMs`: how late its timer fired; the symbols should sound that much sooner. */
  letter: LetterEvent & { lateMs: number };
  symbol: SymbolEvent;
  letterEnd: LetterEndEvent;
  wordSpace: WordSpaceEvent;
  /** The text has been played to the end, without the loop. */
  end: Record<string, never>;
  state: { state: PlayerState };
}

export interface Player {
  on: Emitter<PlayerEvents>['on'];
  /** New text: stops what was playing. */
  load(tokens: readonly TextToken[]): void;
  /** From the start, or from the letter where it was paused. Nothing without letters. */
  play(): void;
  /** Stops now; play() starts the interrupted letter again. */
  pause(): void;
  /** Stops and goes back to the start. */
  stop(): void;
  /** At the end, a word gap and from the start again. */
  setLoop(loop: boolean): void;
  /** While playing, from the next letter on. */
  setTiming(timing: SendTiming): void;
  readonly state: PlayerState;
  /** The token of the letter playing or paused; null when stopped. */
  readonly position: number | null;
  readonly loop: boolean;
  dispose(): void;
}

export interface PlayerOptions {
  timing: SendTiming;
  clock?: Clock;
  loop?: boolean;
}

export function createPlayer(options: PlayerOptions): Player {
  const clock = options.clock ?? systemClock;
  const events = createEmitter<PlayerEvents>();
  let timing = options.timing;
  let loop = options.loop ?? false;
  let tokens: readonly TextToken[] = [];
  let state: PlayerState = 'stopped';
  let position: number | null = null;
  // Where play() goes on after a pause: the letter that was interrupted, or
  // the one after it if it had already sounded.
  let resumeFrom = 0;
  let timingChanged = false;
  let timer: TimerHandle | null = null;
  // The run in progress: its plan, when it started and its next event.
  let run: { plan: Plan; startAt: number; next: number } | null = null;

  function setState(next: PlayerState): void {
    if (state === next) return;
    state = next;
    events.emit('state', { state });
  }

  function clearTimer(): void {
    if (timer !== null) clock.clearTimeout(timer);
    timer = null;
  }

  /** Plans from `from` and plays it from `startAt` (absolute). */
  function start(from: number, startAt: number): void {
    const next = plan(tokens, timing, from);
    timingChanged = false;
    if (next.events.length === 0) {
      // Paused after the last letter: the end, as if it had been played.
      if (from > 0) finish(startAt);
      else stop();
      return;
    }
    run = { plan: next, startAt, next: 0 };
    schedule();
  }

  function schedule(): void {
    if (!run) return;
    const event = run.plan.events[run.next];
    const at = run.startAt + (event ? event.atMs : run.plan.durationMs);
    timer = clock.setTimeout(event ? fire : () => finish(at), at - clock.now());
  }

  function fire(): void {
    timer = null;
    if (!run) return;
    const event = run.plan.events[run.next];
    if (!event) return;
    const dueAt = run.startAt + event.atMs;
    // A new timing starts with a letter: planned again from it, at its time.
    if (event.type === 'letter' && timingChanged) {
      start(event.index, dueAt);
      return;
    }
    const current = run;
    run.next++;
    switch (event.type) {
      case 'letter':
        position = event.index;
        resumeFrom = event.index;
        events.emit('letter', { ...event, lateMs: Math.max(0, clock.now() - dueAt) });
        break;
      case 'symbol':
        events.emit('symbol', event);
        break;
      case 'letterEnd': {
        resumeFrom = event.index + 1;
        const last = run.next >= run.plan.events.length;
        events.emit('letterEnd', last && loop ? { ...event, gapMs: timing.wordGapMs } : event);
        break;
      }
      case 'wordSpace':
        events.emit('wordSpace', event);
        break;
    }
    // Unless a listener paused, stopped or started again.
    if (run === current) schedule();
  }

  /** The end of the text at `at`: again after a word gap, or stop. */
  function finish(at: number): void {
    timer = null;
    run = null;
    if (loop) {
      start(0, at + timing.wordGapMs);
      return;
    }
    stop();
    events.emit('end', {});
  }

  function stop(): void {
    clearTimer();
    run = null;
    position = null;
    resumeFrom = 0;
    timingChanged = false;
    setState('stopped');
  }

  return {
    on: events.on,
    load(next) {
      stop();
      tokens = next;
    },
    play() {
      if (state === 'playing' || !tokens.some((token) => token.kind === 'letter')) return;
      const from = state === 'paused' ? resumeFrom : 0;
      setState('playing');
      start(from, clock.now());
    },
    pause() {
      if (state !== 'playing') return;
      clearTimer();
      run = null;
      setState('paused');
    },
    stop,
    setLoop(value) {
      loop = value;
    },
    setTiming(next) {
      timing = next;
      if (state === 'playing') timingChanged = true;
    },
    get state() {
      return state;
    },
    get position() {
      return position;
    },
    get loop() {
      return loop;
    },
    dispose() {
      clearTimer();
      run = null;
    },
  };
}
