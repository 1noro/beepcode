// A small typed event emitter: the keyer emits and knows nobody (ADR 0003).

export type Listener<T> = (payload: T) => void;

export interface Emitter<Events extends object> {
  /** Subscribes; returns the function that unsubscribes. */
  on<K extends keyof Events>(type: K, listener: Listener<Events[K]>): () => void;
  emit<K extends keyof Events>(type: K, payload: Events[K]): void;
}

export function createEmitter<Events extends object>(): Emitter<Events> {
  const listeners = new Map<keyof Events, Set<Listener<never>>>();
  return {
    on(type, listener) {
      let set = listeners.get(type);
      if (!set) listeners.set(type, (set = new Set()));
      set.add(listener);
      return () => void set.delete(listener);
    },
    emit(type, payload) {
      const set = listeners.get(type) as Set<Listener<typeof payload>> | undefined;
      // A copy, so that a listener can unsubscribe while being called.
      for (const listener of [...(set ?? [])]) listener(payload);
    },
  };
}
