// The keyer (SPEC §4): a pure state machine that turns presses of a straight
// key, or symbols typed directly, into symbols, letters and word spaces.
//
//   IDLE ─press→ PRESSED ─release→ GAP ─letterGap→ letter → HOLD ─letterGap→ READY ─margin→ space → IDLE
//
// After the last symbol: the letter gap closes the letter; as long again, its
// path stays lit (HOLD); once it is off, the word margin inserts the space,
// if the spaces are automatic. If not, the space comes with space().
// If it is adaptive, the gaps scale with the rhythm of whoever keys
// (rhythm.ts), and the margin, with their pauses between letters (pauses.ts).
// It emits events (SPEC §4.3) and knows nobody: the UI, the audio and the
// modes subscribe (ADR 0003).
import type { Code, MorseSymbol } from './alphabet.ts';
import { symbolChar } from './alphabet.ts';
import type { Clock, TimerHandle } from './clock.ts';
import { systemClock } from './clock.ts';
import type { Emitter } from './emitter.ts';
import { createEmitter } from './emitter.ts';
import { createWordPauses } from './pauses.ts';
import { createRhythm } from './rhythm.ts';
import { WORD_MARGIN_MS, type KeyerTiming } from './timing.ts';
import type { MorseNode, MorseTree } from './tree.ts';

export interface KeyerEvents {
  keyDown: { at: number };
  keyUp: { at: number; durationMs: number };
  symbol: { symbol: MorseSymbol; sequence: Code; node: MorseNode };
  /**
   * `holdMs`: how long the path of the letter stays lit (SPEC §3.3). Once it
   * is off, the next letter still joins the word for the word margin.
   */
  letter: { char: string; sequence: Code; node: MorseNode; holdMs: number };
  wordSpace: { at: number };
  /** The sequence that does not exist, and the node where it went wrong. */
  invalid: { sequence: Code; lastValidNode: MorseNode };
  cancel: { sequence: Code };
}

export interface Keyer {
  on: Emitter<KeyerEvents>['on'];
  /** The key goes down (pointer or Space). Ignored if it already is. */
  press(): void;
  /** The key goes up: the duration decides dot or dash (SPEC §4.2). */
  release(): void;
  /** A symbol typed directly ('.' / '-'), with the same gap timers. */
  input(symbol: MorseSymbol): void;
  /** Closes the letter in progress now (Enter). */
  commit(): void;
  /**
   * The word space now: closes the letter in progress, if any, and ends the
   * word, if a letter was written since the last space. A space asked for is
   * no sign of the margin: deleting it does not widen it.
   */
  space(): void;
  /** Whether the word margin inserts the space by itself (SPEC §4.2). */
  setAutoSpace(on: boolean): void;
  /**
   * The word space just written was deleted before keying again: it came too
   * soon, and the adaptive margin widens.
   */
  rejectSpace(): void;
  /** Discards the sequence in progress; false if there was none. */
  cancel(): boolean;
  setTiming(timing: KeyerTiming): void;
  /** The code in progress, '' if none. */
  readonly sequence: Code;
  readonly pressed: boolean;
  /** The unit the gaps count with now: the timing's, or the rhythm's. */
  readonly unitMs: number;
  /** The word margin now: the timing's, or adapted to the pauses. */
  readonly wordMarginMs: number;
  /** Stops the timers; the keyer does nothing else after this. */
  dispose(): void;
}

export interface KeyerOptions {
  tree: MorseTree;
  timing: KeyerTiming;
  clock?: Clock;
  /**
   * The letter and word gaps follow the rhythm of the presses, starting from
   * the timing's unit (SPEC §4.2). The dash threshold does not: it stays
   * that of the timing. Typed symbols ('.' / '-') do not count. The word
   * margin follows the pauses between letters, typed ones too.
   */
  adaptive?: boolean;
  /**
   * The word margin inserts the space by itself; by default, yes. Without,
   * only space() does.
   */
  autoSpace?: boolean;
}

export function createKeyer(options: KeyerOptions): Keyer {
  const { tree } = options;
  const clock = options.clock ?? systemClock;
  const events = createEmitter<KeyerEvents>();
  let timing = options.timing;
  let autoSpace = options.autoSpace ?? true;
  const rhythm = options.adaptive ? createRhythm(timing.unitMs) : null;
  const pauses = options.adaptive ? createWordPauses() : null;
  let pressed = false;
  // The last release of the key, while its letter is open, and the silence
  // before the press in progress: a gap of the rhythm once it is a symbol.
  let releasedAt: number | null = null;
  let pendingGap: number | null = null;
  let pressedAt = 0;
  let sequence: Code = '';
  let lastSymbolAt: number | null = null;
  // A letter was written since the start or the last space.
  let spacePending = false;
  // When the path of the last letter goes off, until the next press or space.
  let readyAt: number | null = null;
  // The last thing the keyer did was a word space.
  let spaceLast = false;
  let timer: TimerHandle | null = null;
  let disposed = false;

  function clearTimer(): void {
    if (timer !== null) clock.clearTimeout(timer);
    timer = null;
  }

  function schedule(at: number, callback: () => void): void {
    timer = clock.setTimeout(
      () => {
        timer = null;
        callback();
      },
      Math.max(0, at - clock.now()),
    );
  }

  function letterGapMs(): number {
    return rhythm ? (timing.letterGapMs * rhythm.unitMs) / timing.unitMs : timing.letterGapMs;
  }

  function wordMarginMs(): number {
    return pauses ? (timing.wordMarginMs * pauses.marginMs) / WORD_MARGIN_MS : timing.wordMarginMs;
  }

  /** Arms the timer that comes next, counting from the last symbol. */
  function arm(): void {
    clearTimer();
    if (pressed || disposed || lastSymbolAt === null) return;
    if (sequence) schedule(lastSymbolAt + letterGapMs(), closeLetter);
    else if (spacePending && autoSpace) {
      schedule(lastSymbolAt + 2 * letterGapMs() + wordMarginMs(), () => wordSpace());
    }
  }

  /** A new letter starts: the pause since the path went off, if it continues a word. */
  function starting(at: number): void {
    if (readyAt !== null && !sequence) pauses?.pause(at - readyAt);
    readyAt = null;
    spaceLast = false;
  }

  function addSymbol(symbol: MorseSymbol): void {
    lastSymbolAt = clock.now();
    const next = sequence + symbolChar(symbol);
    const node = tree.node(next);
    if (node) {
      sequence = next;
      events.emit('symbol', { symbol, sequence, node });
    } else {
      const lastValidNode = tree.node(sequence) ?? tree.root;
      sequence = '';
      events.emit('invalid', { sequence: next, lastValidNode });
    }
    arm();
  }

  function closeLetter(): void {
    const node = tree.node(sequence);
    const code = sequence;
    sequence = '';
    if (node?.char) {
      spacePending = true;
      readyAt = (lastSymbolAt ?? clock.now()) + 2 * letterGapMs();
      const holdMs = Math.max(0, readyAt - clock.now());
      events.emit('letter', { char: node.char, sequence: code, node, holdMs });
    } else {
      // A node without a letter: only possible in a bigger tree.
      events.emit('invalid', { sequence: code, lastValidNode: node?.parent ?? tree.root });
    }
    arm();
  }

  function wordSpace(asked = false): void {
    spacePending = false;
    readyAt = null;
    spaceLast = !asked;
    events.emit('wordSpace', { at: clock.now() });
  }

  return {
    on: events.on,
    press() {
      if (pressed || disposed) return;
      pressed = true;
      pressedAt = clock.now();
      pendingGap = sequence && releasedAt !== null ? pressedAt - releasedAt : null;
      clearTimer();
      events.emit('keyDown', { at: pressedAt });
    },
    release() {
      if (!pressed) return;
      pressed = false;
      const at = clock.now();
      const durationMs = at - pressedAt;
      events.emit('keyUp', { at, durationMs });
      // A bounce: as if the press had not happened.
      if (durationMs < timing.debounceMs) {
        arm();
        return;
      }
      starting(pressedAt);
      const symbol = durationMs < timing.dashThresholdMs ? 'dot' : 'dash';
      if (pendingGap !== null) rhythm?.gap(pendingGap);
      rhythm?.mark(symbol, durationMs);
      releasedAt = at;
      addSymbol(symbol);
    },
    input(symbol) {
      if (pressed || disposed) return;
      starting(clock.now());
      releasedAt = null;
      addSymbol(symbol);
    },
    commit() {
      if (pressed || !sequence) return;
      closeLetter();
    },
    space() {
      if (pressed || disposed) return;
      if (sequence) closeLetter();
      if (!spacePending) return;
      clearTimer();
      wordSpace(true);
    },
    setAutoSpace(on) {
      autoSpace = on;
      arm();
    },
    rejectSpace() {
      if (!spaceLast) return;
      spaceLast = false;
      pauses?.rejected();
    },
    cancel() {
      if (!sequence) return false;
      const code = sequence;
      sequence = '';
      events.emit('cancel', { sequence: code });
      arm();
      return true;
    },
    setTiming(next) {
      timing = next;
      rhythm?.reset(next.unitMs);
      arm();
    },
    get sequence() {
      return sequence;
    },
    get pressed() {
      return pressed;
    },
    get unitMs() {
      return rhythm?.unitMs ?? timing.unitMs;
    },
    get wordMarginMs() {
      return wordMarginMs();
    },
    dispose() {
      disposed = true;
      clearTimer();
    },
  };
}
