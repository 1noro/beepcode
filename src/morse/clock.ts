// The time, as a dependency (ADR 0003): the keyer is tested with a fake clock.

export type TimerHandle = ReturnType<typeof globalThis.setTimeout>;

export interface Clock {
  /** Milliseconds, monotonic. */
  now(): number;
  setTimeout(callback: () => void, ms: number): TimerHandle;
  clearTimeout(handle: TimerHandle): void;
}

export const systemClock: Clock = {
  now: () => performance.now(),
  setTimeout: (callback, ms) => globalThis.setTimeout(callback, ms),
  clearTimeout: (handle) => globalThis.clearTimeout(handle),
};
