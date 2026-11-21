// The settings panel (SPEC §7): a modal <dialog> whose controls write to the
// settings store as they change; main.ts persists and applies them.
import { tAttr, tText } from '../i18n/dom.ts';
import {
  LOCALE_NAMES,
  LOCALES,
  getLocale,
  isLocale,
  onLocaleChange,
  type MessageKey,
} from '../i18n/index.ts';
import { MIN_WPM } from '../morse/timing.ts';
import {
  DEFAULT_SETTINGS,
  RANGES,
  THEMES,
  VISIONS,
  effectiveWpm,
  wpmChange,
  type Settings,
  type Theme,
  type Vision,
} from '../state/settings.ts';
import type { Store } from '../state/store.ts';
import { VERSION } from '../version.ts';
import { tokenColor } from './appearance.ts';
import { el, icon } from './dom.ts';

const THEME_KEYS: Record<Theme, MessageKey> = {
  system: 'theme.system',
  light: 'theme.light',
  dark: 'theme.dark',
  'gruvbox-dark': 'theme.gruvboxDark',
  'gruvbox-light': 'theme.gruvboxLight',
  'high-contrast': 'theme.highContrast',
};

const VISION_KEYS: Record<Vision, MessageKey> = {
  default: 'vision.default',
  protanopia: 'vision.protanopia',
  deuteranopia: 'vision.deuteranopia',
  tritanopia: 'vision.tritanopia',
  achromatopsia: 'vision.achromatopsia',
};

type NumberKey = keyof typeof RANGES;

const REPO = 'https://github.com/1noro/beepcode';

export interface SettingsPanel {
  readonly dialog: HTMLDialogElement;
  open(): void;
}

let ids = 0;

function field(labelKey: MessageKey, control: HTMLElement, extra: Node[] = []): HTMLElement {
  control.id ||= `setting-${++ids}`;
  const label = el('label', { htmlFor: control.id });
  tText(label, labelKey);
  return el('div', { className: 'setting' }, [
    label,
    el('div', { className: 'setting-control' }, [control, ...extra]),
  ]);
}

function link(href: string, text: string): HTMLAnchorElement {
  return el('a', { href, target: '_blank', rel: 'noopener' }, [text]);
}

/** A line of the about box: a translated label, then its links. */
function credit(labelKey: MessageKey, ...links: HTMLAnchorElement[]): HTMLElement {
  const label = el('span');
  tText(label, labelKey);
  return el('p', {}, [label, ' ', ...links.flatMap((a, i) => (i ? [' · ', a] : [a]))]);
}

/**
 * The version of the build and the licences (ADR 0005, ADR 0008), at the
 * foot of the panel: the main screen has no room to spare.
 */
function about(): HTMLElement {
  const version = el('p', { className: 'about-version' });
  tText(version, 'about.version', { version: VERSION });
  const source = el('a', { href: REPO, target: '_blank', rel: 'noopener' });
  tText(source, 'about.source');
  return section('about.title', [
    el('div', { className: 'about' }, [
      version,
      credit('about.code', link(`${REPO}/blob/main/LICENSE.GPL-3.0.txt`, 'GPL-3.0-or-later')),
      credit('about.content', link(`${REPO}/blob/main/LICENSE.CC-BY-SA-4.0.txt`, 'CC BY-SA 4.0')),
      credit(
        'about.font',
        link('https://github.com/JetBrains/JetBrainsMono', 'JetBrains Mono'),
        link('https://openfontlicense.org', 'OFL 1.1'),
      ),
      el('p', {}, [source]),
    ]),
  ]);
}

function section(titleKey: MessageKey, children: HTMLElement[]): HTMLElement {
  const title = el('h3');
  tText(title, titleKey);
  return el('section', { className: 'settings-section' }, [title, ...children]);
}

export function createSettingsPanel(
  store: Store<Settings>,
  options: { vibrationSupported: boolean },
): SettingsPanel {
  const updaters: ((settings: Settings) => void)[] = [];
  const set = (change: Partial<Settings>) => store.set(change);

  function select<T extends string>(
    values: readonly T[],
    keyOf: (value: T) => MessageKey | null,
    textOf: (value: T) => string,
    current: () => T,
    onChange: (value: T) => void,
  ): HTMLSelectElement {
    const control = el(
      'select',
      {},
      values.map((value) => {
        const option = el('option', { value });
        const key = keyOf(value);
        if (key) tText(option, key);
        else option.textContent = textOf(value);
        return option;
      }),
    );
    control.addEventListener('change', () => {
      const value = values.find((v) => v === control.value);
      if (value !== undefined) onChange(value);
    });
    updaters.push(() => (control.value = current()));
    return control;
  }

  function range(
    key: NumberKey,
    labelKey: MessageKey,
    valueKey: MessageKey,
    change: (value: number) => Partial<Settings> = (value) => ({ [key]: value }),
  ): HTMLElement {
    const { min, max, step } = RANGES[key];
    const control = el('input', {
      type: 'range',
      min: String(min),
      max: String(max),
      step: String(step),
    });
    const output = el('output', { className: 'setting-value' });
    output.htmlFor.add(control.id || (control.id = `setting-${++ids}`));
    control.addEventListener('input', () => set(change(Number(control.value))));
    updaters.push((settings) => {
      const value = settings[key];
      control.value = String(value);
      const number = new Intl.NumberFormat(getLocale(), {
        maximumFractionDigits: step < 1 ? 1 : 0,
      });
      tText(output, valueKey, { value: number.format(value) });
    });
    return field(labelKey, control, [output]);
  }

  /**
   * Farnsworth: from the minimum to the speed, where it follows the speed
   * (SPEC §7).
   */
  function effectiveRange(): HTMLElement {
    const control = el('input', { type: 'range', min: String(MIN_WPM), step: '1' });
    control.id = `setting-${++ids}`;
    const output = el('output', { className: 'setting-value' });
    output.htmlFor.add(control.id);
    control.addEventListener('input', () => {
      const value = Number(control.value);
      set({ effectiveWpm: value < store.get().wpm ? value : null });
    });
    updaters.push((settings) => {
      // The maximum first, or the value would be clamped to the old one.
      control.max = String(settings.wpm);
      const value = effectiveWpm(settings);
      control.value = String(value);
      control.disabled = settings.wpm <= MIN_WPM;
      tText(output, 'settings.wpmValue', { value });
    });
    return field('settings.effectiveWpm', control, [output]);
  }

  function color(key: 'dotColor' | 'dashColor', labelKey: MessageKey): HTMLElement {
    const token = key === 'dotColor' ? '--color-dot' : '--color-dash';
    const control = el('input', { type: 'color', className: 'setting-color' });
    control.addEventListener('input', () => set({ [key]: control.value }));
    const reset = el('button', { type: 'button', className: 'text-button' });
    tText(reset, 'settings.themeColor');
    reset.addEventListener('click', () => set({ [key]: null }));
    updaters.push((settings) => {
      // The token as it is now: the theme's, or the one chosen.
      control.value = settings[key] ?? tokenColor(token);
      reset.disabled = settings[key] === null;
    });
    const row = field(labelKey, control, [reset]);
    const label = row.querySelector('label');
    if (label) {
      label.id = `${control.id}-label`;
      reset.setAttribute('aria-describedby', label.id);
    }
    return row;
  }

  const language = select(
    LOCALES,
    () => null,
    (code) => LOCALE_NAMES[code],
    () => store.get().locale ?? getLocale(),
    (code) => {
      if (isLocale(code)) set({ locale: code });
    },
  );
  const theme = select(
    THEMES,
    (value) => THEME_KEYS[value],
    String,
    () => store.get().theme,
    (value) => set({ theme: value }),
  );
  const vision = select(
    VISIONS,
    (value) => VISION_KEYS[value],
    String,
    () => store.get().vision,
    (value) => set({ vision: value }),
  );

  function check(key: 'autoSpace' | 'vibration', label: MessageKey): HTMLElement {
    const control = el('input', { type: 'checkbox' });
    control.addEventListener('change', () => set({ [key]: control.checked }));
    updaters.push((settings) => (control.checked = settings[key]));
    const checkField = field(label, control);
    checkField.classList.add('setting--check');
    return checkField;
  }

  const vibrationField = check('vibration', 'settings.vibration');
  // Hidden where the device cannot vibrate (iOS, SPEC §5).
  vibrationField.hidden = !options.vibrationSupported;

  const title = el('h2', { id: 'settings-title' });
  tText(title, 'settings.title');
  const close = el('button', { type: 'button', className: 'icon-button' }, [icon('clear')]);
  tAttr(close, 'aria-label', 'settings.close');
  tAttr(close, 'title', 'settings.close');
  const resetAll = el('button', { type: 'button', className: 'text-button' });
  tText(resetAll, 'settings.reset');
  resetAll.addEventListener('click', () =>
    set({ ...DEFAULT_SETTINGS, locale: store.get().locale }),
  );

  const dialog = el('dialog', { className: 'settings' }, [
    el('header', { className: 'settings-header' }, [title, close]),
    el('div', { className: 'settings-body' }, [
      field('language.label', language),
      section('settings.appearance', [
        field('settings.theme', theme),
        field('settings.vision', vision),
        color('dotColor', 'settings.dotColor'),
        color('dashColor', 'settings.dashColor'),
      ]),
      section('settings.keying', [
        range('wpm', 'settings.wpm', 'settings.wpmValue', (wpm) => wpmChange(store.get(), wpm)),
        effectiveRange(),
        range('gapTolerance', 'settings.gapTolerance', 'settings.gapToleranceValue'),
        check('autoSpace', 'settings.autoSpace'),
        range('dashThreshold', 'settings.dashThreshold', 'settings.dashThresholdValue'),
      ]),
      section('settings.sound', [
        range('toneHz', 'settings.toneHz', 'settings.hzValue'),
        range('volume', 'settings.volume', 'settings.percentValue'),
        vibrationField,
      ]),
      resetAll,
      about(),
    ]),
  ]);
  dialog.setAttribute('aria-labelledby', title.id);
  close.addEventListener('click', () => dialog.close());
  // A click on the backdrop closes it.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  const update = (settings: Settings) => {
    for (const updater of updaters) updater(settings);
  };
  store.subscribe(update);
  // The numbers are written in the language of the UI.
  onLocaleChange(() => update(store.get()));
  update(store.get());

  return {
    dialog,
    open() {
      update(store.get());
      dialog.showModal();
    },
  };
}
