// The modes, in the order of the selector. Each phase adds its own (SPEC §13):
// Text → Morse in F2, Learn and Listen in F3, Record in F4.
import { createFreeMode } from './free.ts';
import type { ModeDefinition } from './mode.ts';

export const MODES: readonly ModeDefinition[] = [
  { id: 'free', title: 'mode.free', create: createFreeMode },
];

export const DEFAULT_MODE = 'free';

/** The mode of a location hash ('#/free'), or undefined. */
export function modeOf(hash: string): ModeDefinition | undefined {
  const id = /^#\/([\w-]+)/.exec(hash)?.[1];
  return MODES.find((mode) => mode.id === id);
}
