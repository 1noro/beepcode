// The tone and the vibration (SPEC §5). A sine oscillator that never stops
// and a gain with 5 ms ramps, so that the sidetone starts with no latency and
// no clicks. The AudioContext is created on the first gesture (iOS, Safari).
//
// The audio cannot start before a gesture, and does not sound at once: just
// created or resumed, its clock stays still until the output starts (tens of
// ms, hundreds on Android or with Bluetooth), and then races to fill the
// buffer. Anything scheduled on the still clock sounded wrong: the first beep
// was lost, or a short one came out long. So, until the clock moves, what is
// asked waits with its wall-clock times and sounds when it does, as long as
// it was asked for: a little late, the first time, but right.

const RAMP_S = 0.005;
/** The most we schedule ahead of currentTime, even with a large buffer. */
const MAX_LEAD_S = 0.03;
/** How often to look whether the audio clock has started to move. */
const POLL_MS = 10;
/** What waited for the audio and ended longer ago than this no longer sounds. */
const STALE_MS = 1000;
/** The longest whenReady() waits. */
const READY_TIMEOUT_MS = 1000;
/**
 * A signal that never stops, too low to hear (−80 dBFS, and constant: no
 * pitch). After some seconds of exact silence Chrome swaps the output for a
 * fake one to save power, and the system may put the device to sleep; the
 * first beep afterwards woke it all up and came late and misshapen.
 */
const KEEP_ALIVE = 1e-4;

export interface ToneSettings {
  frequency: number;
  /** 0–1. */
  volume: number;
  muted: boolean;
}

export interface Tone {
  /** Creates or resumes the audio; call it inside a user gesture, any of them. */
  unlock(): void;
  /** Stops the audio, while the page is hidden; unlock() resumes it. */
  suspend(): void;
  /** Resolves when the audio clock moves (or there is no audio, or after a while). */
  whenReady(): Promise<void>;
  /** The sidetone: on while the key is down. */
  start(): void;
  stop(): void;
  /** A beep of `durationMs`, `delayMs` from now, timed by the audio clock. */
  beep(delayMs: number, durationMs: number): void;
  /** Cancels the beeps not played yet, and silences. */
  cancel(): void;
  configure(settings: ToneSettings): void;
}

/** A change of the sidetone, by the audio clock and by the wall clock. */
interface Change {
  audioAt: number;
  wallAt: number;
  /** It started late, waiting for the audio: it lasts the whole press anyway. */
  whole?: boolean;
}

/** Something asked while the audio clock was still, by the wall clock (ms). */
interface Waiting {
  from: number;
  /** null: the key is still down. */
  to: number | null;
}

export function createTone(initial: ToneSettings): Tone {
  let settings = initial;
  let context: AudioContext | null = null;
  let oscillator: OscillatorNode | null = null;
  let gain: GainNode | null = null;
  // When the sidetone last went up and down.
  let up: Change | null = null;
  let down: Change | null = null;
  // The audio clock when the audio was last started: until it moves past it,
  // nothing sounds yet.
  let clockAt = 0;
  let waiting: Waiting[] = [];
  let readyWaiters: (() => void)[] = [];
  let poll: ReturnType<typeof setTimeout> | undefined;

  /**
   * `at`, or, while the change `from` has not sounded yet (the audio clock is
   * still at it or behind), as long after it as the wall clock says. Once
   * the clock has passed it, `at` as is: nothing piles up, not even after the
   * audio has been suspended.
   */
  function after(from: Change | null, at: number): number {
    if (!from || from.audioAt < at) return at;
    return from.audioAt + (performance.now() - from.wallAt) / 1000;
  }

  const level = () => (settings.muted ? 0 : settings.volume ** 2);

  /**
   * The first moment that can still be scheduled. On Android currentTime
   * moves in steps of a whole buffer (baseLatency): a ramp scheduled at
   * currentTime may already be in the past for the audio thread and then
   * jumps instead of ramping, which clicks.
   */
  function now(audio: AudioContext): number {
    const lead = audio.baseLatency > 0 ? Math.min(audio.baseLatency, MAX_LEAD_S) : RAMP_S;
    return audio.currentTime + lead;
  }

  /** The audio runs and its clock moves: what is scheduled now will sound. */
  function running(): boolean {
    return !!context && context.state === 'running' && context.currentTime > clockAt;
  }

  /** From whatever the gain is doing at `at`, a 5 ms ramp to `to`. */
  function ramp(to: number, at = context ? now(context) : 0): number {
    if (!gain || !context) return at;
    const param = gain.gain;
    // Holds the value the gain will really have at `at`; reading param.value
    // instead gives a stale one in the middle of a ramp (not in Firefox).
    if (typeof param.cancelAndHoldAtTime === 'function') {
      param.cancelAndHoldAtTime(at);
    } else {
      param.cancelScheduledValues(at);
      param.setValueAtTime(param.value, at);
    }
    param.linearRampToValueAtTime(to, at + RAMP_S);
    return at;
  }

  /** A beep from `start` for `seconds`, by the audio clock. */
  function schedule(start: number, seconds: number): void {
    if (!gain) return;
    const end = start + seconds;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(level(), start + RAMP_S);
    gain.gain.setValueAtTime(level(), end);
    gain.gain.linearRampToValueAtTime(0, end + RAMP_S);
  }

  /** Drops what waited and ended too long ago: it would sound out of place. */
  function dropStale(): void {
    const wall = performance.now();
    waiting = waiting.filter((item) => item.to === null || wall - item.to < STALE_MS);
  }

  /**
   * Until the clock moves, looks every few ms, while something waits; then
   * plays it.
   */
  function watch(): void {
    if (poll !== undefined) return;
    const check = () => {
      poll = undefined;
      if (running()) {
        flush();
        return;
      }
      dropStale();
      if (waiting.length > 0 || readyWaiters.length > 0) poll = setTimeout(check, POLL_MS);
    };
    poll = setTimeout(check, POLL_MS);
  }

  /** What waited, from now, keeping its lengths and the gaps between them. */
  function flush(): void {
    const waiters = readyWaiters;
    readyWaiters = [];
    for (const resolve of waiters) resolve();
    if (!context) return;
    dropStale();
    const kept = waiting;
    waiting = [];
    const first = kept[0];
    if (!first) return;
    const base = now(context);
    for (const item of kept) {
      const at = base + (item.from - first.from) / 1000;
      if (item.to === null) {
        up = { audioAt: ramp(level(), at), wallAt: item.from, whole: true };
      } else {
        schedule(at, (item.to - item.from) / 1000);
      }
    }
  }

  return {
    unlock() {
      if (!context) {
        const AudioContextClass = window.AudioContext as typeof AudioContext | undefined;
        if (!AudioContextClass) return;
        context = new AudioContextClass({ latencyHint: 'interactive' });
        oscillator = context.createOscillator();
        gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = settings.frequency;
        gain.gain.value = 0;
        oscillator.connect(gain).connect(context.destination);
        oscillator.start();
        if (typeof context.createConstantSource === 'function') {
          const keepAlive = context.createConstantSource();
          keepAlive.offset.value = KEEP_ALIVE;
          keepAlive.connect(context.destination);
          keepAlive.start();
        }
        clockAt = context.currentTime;
      }
      // Suspended, or interrupted (Safari): again, on every gesture, until
      // one of them is allowed to start it.
      if (context.state !== 'running') {
        clockAt = context.currentTime;
        context.resume().catch(() => undefined);
      }
      if (waiting.length > 0) watch();
    },
    suspend() {
      waiting = [];
      if (context?.state === 'running') context.suspend().catch(() => undefined);
    },
    whenReady() {
      if (!context || running()) return Promise.resolve();
      return new Promise((resolve) => {
        let done = false;
        const settle = () => {
          if (done) return;
          done = true;
          readyWaiters = readyWaiters.filter((waiter) => waiter !== settle);
          resolve();
        };
        readyWaiters.push(settle);
        setTimeout(settle, READY_TIMEOUT_MS);
        watch();
      });
    },
    /*
     * Once the clock runs, on Android it moves in steps of a whole buffer:
     * going up and down "now" in a short press could fall on the same
     * instant. So each change keeps, at least, the wall-clock time since the
     * previous one, while the clock has not passed it (after()).
     */
    start() {
      if (!context) return;
      if (!running()) {
        waiting.push({ from: performance.now(), to: null });
        watch();
        return;
      }
      up = { audioAt: ramp(level(), after(down, now(context))), wallAt: performance.now() };
    },
    stop() {
      if (!context) return;
      const held = waiting[waiting.length - 1];
      if (held && held.to === null) {
        held.to = performance.now();
        return;
      }
      const at = now(context);
      const end = up?.whole
        ? Math.max(at, up.audioAt + (performance.now() - up.wallAt) / 1000)
        : after(up, at);
      down = { audioAt: ramp(0, end), wallAt: performance.now() };
      up = null;
    },
    beep(delayMs, durationMs) {
      if (!context) return;
      if (!running()) {
        const from = performance.now() + delayMs;
        waiting.push({ from, to: from + durationMs });
        watch();
        return;
      }
      schedule(now(context) + delayMs / 1000, durationMs / 1000);
    },
    cancel() {
      waiting = [];
      up = null;
      down = null;
      ramp(0);
    },
    configure(next) {
      settings = next;
      if (oscillator && context)
        oscillator.frequency.setValueAtTime(next.frequency, context.currentTime);
    },
  };
}

export interface Vibration {
  readonly supported: boolean;
  /** A short tick when the key goes down. */
  tick(): void;
  setEnabled(enabled: boolean): void;
}

const TICK_MS = 30;

/**
 * A tick when the key goes down, where navigator.vibrate exists (not iOS).
 * Not a vibration that lasts while the key is held: on Android (Pixel 7,
 * Brave) neither vibrate(0) nor a new call cut the one in progress, so a held
 * vibration, long or in renewed pulses, went on long after the release. One
 * short call does not need to be cut.
 */
export function createVibration(enabled: boolean): Vibration {
  const supported = typeof navigator.vibrate === 'function';
  let on = enabled;
  return {
    supported,
    tick() {
      if (supported && on) navigator.vibrate(TICK_MS);
    },
    setEnabled(value) {
      on = value;
    },
  };
}
