// The tone and the vibration (SPEC §5). A sine oscillator that never stops
// and a gain with 5 ms ramps, so that the sidetone starts with no latency and
// no clicks. The AudioContext is created on the first gesture (iOS, Safari).

const RAMP_S = 0.005;
/** The most we schedule ahead of currentTime, even with a large buffer. */
const MAX_LEAD_S = 0.03;

export interface ToneSettings {
  frequency: number;
  /** 0–1. */
  volume: number;
  muted: boolean;
}

export interface Tone {
  /** Creates or resumes the audio; call it inside a user gesture. */
  unlock(): void;
  /** The sidetone: on while the key is down. */
  start(): void;
  stop(): void;
  /** A beep of `durationMs`, `delayMs` from now, timed by the audio clock. */
  beep(delayMs: number, durationMs: number): void;
  /** Cancels the beeps not played yet, and silences. */
  cancel(): void;
  configure(settings: ToneSettings): void;
}

export function createTone(initial: ToneSettings): Tone {
  let settings = initial;
  let context: AudioContext | null = null;
  let oscillator: OscillatorNode | null = null;
  let gain: GainNode | null = null;
  // When the sidetone last went up and down, by the audio clock and by the
  // wall clock.
  let up: { audioAt: number; wallAt: number } | null = null;
  let down: { audioAt: number; wallAt: number } | null = null;

  /**
   * `at`, or, while the change `from` has not sounded yet (the audio clock is
   * still at it or behind), as long after it as the wall clock says. Once
   * the clock has passed it, `at` as is: nothing piles up, not even after the
   * audio has been suspended.
   */
  function after(from: { audioAt: number; wallAt: number } | null, at: number): number {
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
      }
      if (context.state === 'suspended') void context.resume();
    },
    /*
     * A context just created keeps currentTime at 0 until its output starts
     * (tens of ms, more on Android). Going up and down "now" would then fall
     * on the same instant, and the first beep after loading did not sound. So
     * each change keeps, at least, the wall-clock time since the previous
     * one: the length of the press, and the silence between two presses.
     * Once the clock runs, "now" is already that late, and nothing changes.
     */
    start() {
      if (!context) return;
      up = { audioAt: ramp(level(), after(down, now(context))), wallAt: performance.now() };
    },
    stop() {
      if (!context) return;
      down = { audioAt: ramp(0, after(up, now(context))), wallAt: performance.now() };
      up = null;
    },
    beep(delayMs, durationMs) {
      if (!context || !gain) return;
      const start = now(context) + delayMs / 1000;
      const end = start + durationMs / 1000;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(level(), start + RAMP_S);
      gain.gain.setValueAtTime(level(), end);
      gain.gain.linearRampToValueAtTime(0, end + RAMP_S);
    },
    cancel() {
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
