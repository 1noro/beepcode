// The Text → Morse mode (SPEC §6.5): a text, normalized to A–Z without
// accents, played in Morse at the speed of the settings, with Farnsworth.
// What is not in the alphabet is shown faded and skipped. While it plays, the
// current character is highlighted, its path lights up and the tone sounds;
// the whole transcription in · and − is shown. Composes player, board and
// audio through the player's events (ADR 0003).
import { tAttr, tText } from '../i18n/dom.ts';
import { t, type MessageKey } from '../i18n/index.ts';
import { displayCode, symbolsOf } from '../morse/alphabet.ts';
import { createPlayer } from '../morse/player.ts';
import { tokenize, type TextToken } from '../morse/text.ts';
import { sendTiming } from '../morse/timing.ts';
import { effectiveWpm, type Settings } from '../state/settings.ts';
import { createBoard } from '../ui/board.ts';
import { el, icon, type IconName } from '../ui/dom.ts';
import type { Mode, ModeContext } from './mode.ts';

/** How long the path of the last letter stays lit, its fade included. */
const END_HOLD_MS = 1500;

/**
 * The longest text: some 3 minutes at 12 WPM, enough to practise, and what
 * fits under the field. Counted as the field counts (UTF-16 units).
 */
const TEXT_MAX = 200;

/** The text, kept while the app is open, when going to another mode and back. */
let lastText = '';

function timingOf(settings: Settings) {
  return sendTiming(settings.wpm, effectiveWpm(settings));
}

/**
 * While there is no text: the name of the app in Morse, as the tree draws
 * it (round dots, long dashes, in their colours), with a slow wave of light
 * running along it, as if it were being sent; and what will appear there.
 */
function emptyState(codeOf: (char: string) => string | undefined): HTMLElement {
  const ornament = el('div', { className: 'text-empty-morse' });
  ornament.setAttribute('aria-hidden', 'true');
  let step = 0;
  for (const token of tokenize(t('app.name'), codeOf)) {
    if (token.kind !== 'letter') continue;
    const letter = el('span', { className: 'text-empty-letter' });
    for (const symbol of symbolsOf(token.code)) {
      const mark = el('span', { className: `text-empty-${symbol}` });
      mark.style.setProperty('--step', String(step++));
      letter.append(mark);
    }
    ornament.append(letter);
  }
  ornament.style.setProperty('--steps', String(step));
  const caption = el('p', { className: 'text-empty-caption' });
  tText(caption, 'text.empty');
  return el('div', { className: 'text-empty' }, [ornament, caption]);
}

function button(name: IconName, label: MessageKey): HTMLButtonElement {
  const text = el('span');
  tText(text, label);
  return el('button', { type: 'button', className: 'player-button' }, [icon(name), text]);
}

/** Changes the icon and the text of a button made by button(). */
function relabel(target: HTMLButtonElement, name: IconName, label: MessageKey): void {
  const text = el('span');
  tText(text, label);
  target.replaceChildren(icon(name), text);
}

export function createTextMode(context: ModeContext): Mode {
  const { tree, settings, tone } = context;
  const player = createPlayer({ timing: timingOf(settings.get()) });
  const board = createBoard(tree, { interactive: false });
  let tokens: TextToken[] = [];
  let txTimer: ReturnType<typeof setTimeout> | undefined;

  const input = el('textarea', { className: 'text-input', rows: 3, maxLength: TEXT_MAX });
  input.spellcheck = false;
  input.autocapitalize = 'characters';
  tAttr(input, 'aria-label', 'text.input');
  tAttr(input, 'placeholder', 'text.placeholder');
  const clear = el('button', { type: 'button', className: 'icon-button text-clear' }, [
    icon('clear'),
  ]);
  tAttr(clear, 'aria-label', 'text.clear');
  tAttr(clear, 'title', 'text.clear');

  // The text as it will be played, one span per character, and the
  // transcription, one span per letter, both with data-index of the token.
  const preview = el('p', { className: 'text-preview' });
  tAttr(preview, 'aria-label', 'text.preview');
  const transcription = el('p', { className: 'text-code' });
  const output = el('div', { className: 'text-output' }, [
    preview,
    transcription,
    emptyState((char) => tree.nodeOf(char)?.code),
  ]);
  tAttr(transcription, 'aria-label', 'text.transcription');
  // Hidden with a class, not with `hidden`: it keeps its room (app.css).
  const skippedHint = el('p', { className: 'text-hint is-off' });
  tText(skippedHint, 'text.skipped');
  const count = el('p', { className: 'text-count' });

  const play = button('play', 'text.play');
  const stop = button('stop', 'text.stop');
  const loop = button('loop', 'text.loop');
  loop.setAttribute('aria-pressed', 'false');

  function render(): void {
    preview.replaceChildren(
      ...tokens.map((token, index) => {
        const span = el('span', {}, [token.char]);
        span.dataset.index = String(index);
        if (token.kind === 'skip') span.className = 'is-skipped';
        return span;
      }),
    );
    const codes: (Node | string)[] = [];
    let word = false;
    tokens.forEach((token, index) => {
      if (token.kind === 'space') word = codes.length > 0;
      if (token.kind !== 'letter') return;
      if (codes.length > 0) codes.push(word ? ' / ' : ' ');
      word = false;
      const span = el('span', {}, [displayCode(token.code)]);
      span.dataset.index = String(index);
      codes.push(span);
    });
    transcription.replaceChildren(...codes);
    skippedHint.classList.toggle('is-off', !tokens.some((token) => token.kind === 'skip'));
    output.classList.toggle('is-empty', tokens.length === 0);
    tText(count, 'text.count', { count: lastText.length, max: TEXT_MAX });
    play.disabled = !tokens.some((token) => token.kind === 'letter');
    clear.disabled = tokens.length === 0;
  }

  /** Highlights the character of token `index`, and its code; null, none. */
  function highlight(index: number | null): void {
    for (const span of [...preview.children, ...transcription.children]) {
      const current = index !== null && (span as HTMLElement).dataset.index === String(index);
      span.classList.toggle('is-current', current);
      if (current) span.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }

  function load(text: string): void {
    lastText = text;
    tokens = tokenize(text, (char) => tree.nodeOf(char)?.code);
    player.load(tokens);
    render();
  }

  function silence(): void {
    clearTimeout(txTimer);
    tone.cancel();
    board.setTransmitting(false);
  }

  const offs = [
    player.on('letter', ({ index, symbols, lateMs }) => {
      highlight(index);
      board.clear();
      // The symbols of the letter, by the audio clock (SPEC §5).
      for (const symbol of symbols) {
        tone.beep(Math.max(0, symbol.startMs - lateMs), symbol.durationMs);
      }
    }),
    player.on('symbol', ({ sequence, durationMs }) => {
      board.light(sequence);
      board.setTransmitting(true);
      clearTimeout(txTimer);
      txTimer = setTimeout(() => board.setTransmitting(false), durationMs);
    }),
    player.on('letterEnd', ({ code, gapMs }) => {
      board.light(code, { final: true });
      board.turnOffIn(gapMs > 0 ? gapMs : END_HOLD_MS);
    }),
    player.on('wordSpace', ({ index }) => highlight(index)),
    player.on('state', ({ state }) => {
      const playing = state === 'playing';
      relabel(play, playing ? 'pause' : 'play', playing ? 'text.pause' : 'text.play');
      stop.disabled = state === 'stopped';
      if (state === 'paused') {
        silence();
        board.clear();
      }
      if (state === 'stopped') highlight(null);
    }),
    settings.subscribe((value, previous) => {
      if (value.wpm !== previous.wpm || value.effectiveWpm !== previous.effectiveWpm) {
        player.setTiming(timingOf(value));
      }
    }),
  ];

  function edit(text: string): void {
    silence();
    board.clear();
    load(text);
  }
  input.addEventListener('input', () => edit(input.value));
  clear.addEventListener('click', () => {
    input.value = '';
    edit('');
    input.focus();
  });
  play.addEventListener('click', () => {
    if (player.state === 'playing') {
      player.pause();
      return;
    }
    tone.unlock();
    player.play();
  });
  stop.addEventListener('click', () => {
    player.stop();
    silence();
    board.clear();
  });
  loop.addEventListener('click', () => {
    player.setLoop(!player.loop);
    loop.setAttribute('aria-pressed', String(player.loop));
  });

  // Hiding the page pauses: the timers slow down in the background.
  const hidden = () => {
    if (document.visibilityState === 'hidden') player.pause();
  };
  document.addEventListener('visibilitychange', hidden);

  input.value = lastText;
  load(lastText);
  stop.disabled = true;

  const element = el('div', { className: 'mode mode-text' }, [
    el('section', { className: 'text-panel' }, [
      el('div', { className: 'text-field' }, [input, clear]),
      output,
      el('div', { className: 'text-footer' }, [skippedHint, count]),
    ]),
    el('div', { className: 'board-wrap' }, [board.element]),
    el('div', { className: 'player-controls' }, [play, stop, loop]),
  ]);

  return {
    element,
    dispose() {
      player.dispose();
      silence();
      board.dispose();
      for (const off of offs) off();
      document.removeEventListener('visibilitychange', hidden);
    },
  };
}
