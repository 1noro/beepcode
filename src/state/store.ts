// A simple observable store (SPEC §10.2): get, set and subscribe.

export interface Store<T extends object> {
  get(): T;
  /** Merges the change and notifies, if anything changed. */
  set(change: Partial<T>): void;
  /** Calls the listener on every change; returns the function that unsubscribes. */
  subscribe(listener: (value: T, previous: T) => void): () => void;
}

export function createStore<T extends object>(initial: T): Store<T> {
  let value = initial;
  const listeners = new Set<(value: T, previous: T) => void>();
  return {
    get: () => value,
    set(change) {
      const keys = Object.keys(change) as (keyof T)[];
      if (keys.every((key) => Object.is(change[key], value[key]))) return;
      const previous = value;
      value = { ...value, ...change };
      for (const listener of [...listeners]) listener(value, previous);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
