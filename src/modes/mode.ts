// What a mode is, and what it gets from the app (SPEC §6).
import type { Tone, Vibration } from '../audio/tone.ts';
import type { MessageKey } from '../i18n/index.ts';
import type { MorseTree } from '../morse/tree.ts';
import type { Settings } from '../state/settings.ts';
import type { Store } from '../state/store.ts';

export interface ModeContext {
  tree: MorseTree;
  settings: Store<Settings>;
  tone: Tone;
  vibration: Vibration;
  /** Shows a short message. */
  notify(message: string): void;
}

export interface Mode {
  readonly element: HTMLElement;
  dispose(): void;
}

export interface ModeDefinition {
  /** Its route: #/<id>. */
  readonly id: string;
  readonly title: MessageKey;
  create(context: ModeContext): Mode;
}
