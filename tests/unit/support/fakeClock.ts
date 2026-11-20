import type { Clock, TimerHandle } from '../../../src/morse/clock.ts';

/** A clock that only moves when the test says so. */
export interface FakeClock extends Clock {
  /** Moves the time forward, firing the timers that fall due, in order. */
  advance(ms: number): void;
  readonly pending: number;
}

export function createFakeClock(start = 1000): FakeClock {
  let now = start;
  let nextId = 1;
  const timers = new Map<number, { at: number; callback: () => void }>();
  const handle = (id: number) => id as unknown as TimerHandle;
  return {
    now: () => now,
    setTimeout(callback, ms) {
      const id = nextId++;
      timers.set(id, { at: now + Math.max(0, ms), callback });
      return handle(id);
    },
    clearTimeout(h) {
      timers.delete(h as unknown as number);
    },
    advance(ms) {
      const end = now + ms;
      for (;;) {
        let due: [number, { at: number; callback: () => void }] | undefined;
        for (const entry of timers) {
          if (entry[1].at <= end && (!due || entry[1].at < due[1].at)) due = entry;
        }
        if (!due) break;
        timers.delete(due[0]);
        now = due[1].at;
        due[1].callback();
      }
      now = end;
    },
    get pending() {
      return timers.size;
    },
  };
}
