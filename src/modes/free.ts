// The Free mode (SPEC §6.1): type with the key or the keyboard, the path
// lights up and the letters pile up on the tape. Explore: clicking a letter
// of the tree lights its path step by step and plays its code, without
// writing it. Composes keyer, board, tape and audio through the keyer's
// events (ADR 0003).
import { attachKeyboard } from '../input/keyboard.ts';
import { attachPointerKey } from '../input/pointer.ts';
import { tAttr, tText } from '../i18n/dom.ts';
import { t } from '../i18n/index.ts';
import { createKeyer } from '../morse/keyer.ts';
import { keyerTiming, letterTimeline, sendTiming } from '../morse/timing.ts';
import type { MorseNode } from '../morse/tree.ts';
import { appendLetter, appendSpace, deleteLast } from '../state/history.ts';
import type { Settings } from '../state/settings.ts';
import { createBoard } from '../ui/board.ts';
import { el, icon } from '../ui/dom.ts';
import { copyText, createTape } from '../ui/tape.ts';
import type { Mode, ModeContext } from './mode.ts';

/** How long Explore keeps the path of a letter lit, its fade included. */
const EXPLORE_HOLD_MS = 1500;

function timingOf(settings: Settings) {
  return keyerTiming({
    wpm: settings.wpm,
    dashThreshold: settings.dashThreshold,
    gapTolerance: settings.gapTolerance,
  });
}

export function createFreeMode(context: ModeContext): Mode {
  const { tree, settings, tone, vibration } = context;
  const keyer = createKeyer({
    tree,
    timing: timingOf(settings.get()),
    adaptive: true,
    autoSpace: settings.get().autoSpace,
  });
  const board = createBoard(tree);
  let text = '';
  let exploring: ReturnType<typeof setTimeout>[] = [];

  const tape = createTape({
    deleteLast() {
      keyer.cancel();
      deleteLastChar();
    },
    clear() {
      keyer.cancel();
      setText('');
    },
    copy() {
      void copyText(text).then(context.notify);
    },
  });
  tape.setText('');
  tape.setSequence('');

  function setText(value: string): void {
    text = value;
    tape.setText(text);
  }

  /** Deleting the space just written tells the keyer it came too soon. */
  function deleteLastChar(): void {
    if (text.endsWith(' ')) keyer.rejectSpace();
    setText(deleteLast(text));
  }

  function stopExploring(): void {
    if (exploring.length === 0) return;
    for (const timer of exploring) clearTimeout(timer);
    exploring = [];
    tone.cancel();
    board.clear();
  }

  function explore(node: MorseNode): void {
    stopExploring();
    if (keyer.pressed) return;
    keyer.cancel();
    tone.unlock();
    const { symbols, durationMs } = letterTimeline(node.code, sendTiming(settings.get().wpm));
    board.clear();
    symbols.forEach((symbol, i) => {
      tone.beep(symbol.startMs, symbol.durationMs);
      exploring.push(setTimeout(() => board.light(node.code.slice(0, i + 1)), symbol.startMs));
    });
    exploring.push(
      setTimeout(() => {
        exploring = [];
        board.light(node.code, { final: true });
        board.turnOffIn(EXPLORE_HOLD_MS);
      }, durationMs),
    );
  }

  // While held, the key takes the colour of the dot and, past the dash
  // threshold, that of the dash, as the tree will (SPEC §3.5). Also with
  // Space: the keyer says when the key is down, whatever the input.
  let dashTimer: ReturnType<typeof setTimeout> | undefined;
  function keyHeld(): void {
    const thresholdMs = timingOf(settings.get()).dashThresholdMs;
    key.style.setProperty('--dash-ms', `${thresholdMs}ms`);
    key.classList.add('is-down', 'is-dot');
    clearTimeout(dashTimer);
    dashTimer = setTimeout(() => key.classList.replace('is-dot', 'is-dash'), thresholdMs);
  }
  function keyFreed(): void {
    clearTimeout(dashTimer);
    key.classList.remove('is-down', 'is-dot', 'is-dash');
  }

  const offs = [
    keyer.on('keyDown', () => {
      keyHeld();
      stopExploring();
      tone.start();
      vibration.tick();
      board.setTransmitting(true);
      // A new press turns off the path of the last letter at once.
      if (!keyer.sequence) board.clear();
    }),
    keyer.on('keyUp', () => {
      keyFreed();
      tone.stop();
      board.setTransmitting(false);
    }),
    keyer.on('symbol', ({ sequence }) => {
      board.light(sequence);
      tape.setSequence(sequence);
    }),
    // The path stays lit for a while, and once it is off there is still
    // time to go on with the word before the space (SPEC §3.3).
    keyer.on('letter', ({ char, sequence, holdMs }) => {
      setText(appendLetter(text, char));
      tape.setSequence('');
      tape.announce(char);
      board.light(sequence, { final: true });
      board.turnOffIn(holdMs);
    }),
    keyer.on('wordSpace', () => {
      const spaced = appendSpace(text);
      if (spaced === text) return;
      setText(spaced);
      tape.announce(t('tape.space'));
    }),
    keyer.on('invalid', ({ lastValidNode }) => {
      board.error(lastValidNode.code);
      tape.setSequence('');
      tape.announce(t('tape.invalid'));
    }),
    keyer.on('cancel', () => {
      board.clear();
      tape.setSequence('');
    }),
    settings.subscribe((value, previous) => {
      if (
        value.wpm !== previous.wpm ||
        value.dashThreshold !== previous.dashThreshold ||
        value.gapTolerance !== previous.gapTolerance
      ) {
        keyer.setTiming(timingOf(value));
      }
      if (value.autoSpace !== previous.autoSpace) keyer.setAutoSpace(value.autoSpace);
    }),
  ];
  board.onSelect(explore);

  const press = () => {
    tone.unlock();
    keyer.press();
  };
  /** A symbol typed directly sounds for its standard length. */
  const typeSymbol = (symbol: 'dot' | 'dash') => {
    if (keyer.pressed) return;
    stopExploring();
    tone.unlock();
    const timing = sendTiming(settings.get().wpm);
    tone.beep(0, symbol === 'dot' ? timing.dotMs : timing.dashMs);
    if (!keyer.sequence) board.clear();
    keyer.input(symbol);
  };

  // The meter sweeps the key in the time a press takes to become a dash.
  const meter = el('span', { className: 'key-meter' }, [
    el('span', { className: 'key-meter-fill' }),
  ]);
  meter.setAttribute('aria-hidden', 'true');
  const key = el('button', { type: 'button', className: 'key' }, [
    el('span', { className: 'key-label' }),
    el('span', { className: 'key-hint' }),
    meter,
  ]);
  key.dataset.key = '';
  const [keyLabel, keyHint] = key.children;
  if (keyLabel instanceof HTMLElement) tText(keyLabel, 'key.label');
  if (keyHint instanceof HTMLElement) tText(keyHint, 'key.hint');

  // The word space, by hand (SPEC §4.2): beside the key and as tall, so that
  // nothing else moves. It closes the letter in progress too.
  const label = el('span', { className: 'space-key-label' });
  tText(label, 'key.space');
  const space = el('button', { type: 'button', className: 'space-key' }, [icon('space'), label]);
  tAttr(space, 'title', 'key.spaceHint');
  space.addEventListener('click', () => keyer.space());
  // A click leaves the focus where it was: Enter goes on closing letters.
  space.addEventListener('mousedown', (event) => event.preventDefault());

  const hints = el('p', { className: 'hints' }, [el('span'), el('span')]);
  const [keysHint, exploreHint] = hints.children;
  if (keysHint instanceof HTMLElement) tText(keysHint, 'hint.keys');
  if (exploreHint instanceof HTMLElement) tText(exploreHint, 'hint.explore');

  // Losing the focus or hiding the page with the key down releases it, so
  // that the tone does not keep sounding (SPEC §3.6).
  const forceRelease = () => keyer.release();
  const hidden = () => {
    if (document.visibilityState === 'hidden') forceRelease();
  };
  window.addEventListener('blur', forceRelease);
  document.addEventListener('visibilitychange', hidden);

  const detachKey = attachPointerKey(key, { press, release: () => keyer.release() });
  const detachKeyboard = attachKeyboard({
    press,
    release: () => keyer.release(),
    dot: () => typeSymbol('dot'),
    dash: () => typeSymbol('dash'),
    // Enter closes the letter; with none in progress, the word.
    commit: () => (keyer.sequence ? keyer.commit() : keyer.space()),
    backspace() {
      if (!keyer.cancel()) deleteLastChar();
    },
    escape: () => keyer.cancel(),
  });

  const element = el('div', { className: 'mode mode-free' }, [
    tape.element,
    el('div', { className: 'board-wrap' }, [board.element]),
    hints,
    el('div', { className: 'key-row' }, [key, space]),
  ]);

  return {
    element,
    dispose() {
      clearTimeout(dashTimer);
      stopExploring();
      keyer.release();
      keyer.dispose();
      board.dispose();
      for (const off of offs) off();
      detachKey();
      detachKeyboard();
      window.removeEventListener('blur', forceRelease);
      document.removeEventListener('visibilitychange', hidden);
    },
  };
}
