// The start: the settings (persisted and applied), the shell (top bar,
// settings panel, notices), the hash router of the modes (#/free…, ADR 0004)
// and the service worker.
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/app.css';
import { createTone, createVibration } from './audio/tone.ts';
import { relocalize, tAttr, tText } from './i18n/dom.ts';
import { detectLocale, onLocaleChange, setLocale, t } from './i18n/index.ts';
import { DEFAULT_MODE, MODES, modeOf } from './modes/index.ts';
import type { Mode } from './modes/mode.ts';
import { TREE_V1 } from './morse/tree.ts';
import { registerPwa } from './pwa.ts';
import { loadSettings, saveSettings, type Settings } from './state/settings.ts';
import { createStore } from './state/store.ts';
import { applyAppearance } from './ui/appearance.ts';
import { el, icon } from './ui/dom.ts';
import { createSettingsPanel } from './ui/settingsPanel.ts';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('#app not found');

/** localStorage, or null where it is blocked. */
function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// The settings: loaded, then saved and applied on every change.
const settings = createStore<Settings>(loadSettings(storage()));
settings.subscribe((value) => saveSettings(storage(), value));
applyAppearance(settings.get());
settings.subscribe(applyAppearance);
window
  .matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', () => applyAppearance(settings.get()));

const toneSettings = (s: Settings) => ({
  frequency: s.toneHz,
  volume: s.volume / 100,
  muted: s.muted,
});
const tone = createTone(toneSettings(settings.get()));
const vibration = createVibration(settings.get().vibration);
// The audio starts with any gesture (opening the settings, choosing a
// mode…), so that it is already running when the key is pressed; and again
// with each one until it runs. On a touch screen pointerdown is not yet a
// gesture that may start it (it could be a scroll): pointerup and touchend
// are.
for (const type of ['pointerdown', 'pointerup', 'touchend', 'keydown']) {
  window.addEventListener(type, () => tone.unlock(), true);
}
// Hidden, it stops: the signal that keeps it awake (tone.ts) would spend
// battery for nothing.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') tone.suspend();
  else tone.unlock();
});
settings.subscribe((value) => {
  tone.configure(toneSettings(value));
  vibration.setEnabled(value.vibration);
});

// The language: the one chosen, or the browser's.
const localeOf = (s: Settings) => s.locale ?? detectLocale(navigator.languages);
onLocaleChange(() => {
  relocalize();
  document.title = `${t('app.name')} · ${t('app.tagline')}`;
});
settings.subscribe((value, previous) => {
  if (value.locale !== previous.locale) setLocale(localeOf(value));
});

// The shell.
const toast = el('div', { className: 'toast', hidden: true, role: 'status' });
let toastTimer: ReturnType<typeof setTimeout> | undefined;
let pendingReload: (() => void) | null = null;

/** The notice of a new version, which stays until it is used. */
function showUpdate(): void {
  const message = el('span');
  tText(message, 'pwa.updateAvailable');
  const button = el('button', { type: 'button' });
  tText(button, 'pwa.reload');
  button.addEventListener('click', () => pendingReload?.());
  toast.replaceChildren(message, button);
  toast.hidden = false;
}

function notify(message: string): void {
  clearTimeout(toastTimer);
  toast.replaceChildren(el('span', {}, [message]));
  toast.hidden = false;
  toastTimer = setTimeout(() => {
    if (pendingReload) showUpdate();
    else toast.hidden = true;
  }, 2500);
}

const panel = createSettingsPanel(settings, { vibrationSupported: vibration.supported });

const modeSelect = el(
  'select',
  { className: 'mode-select' },
  MODES.map((mode) => {
    const option = el('option', { value: mode.id });
    tText(option, mode.title);
    return option;
  }),
);
tAttr(modeSelect, 'aria-label', 'mode.label');
modeSelect.addEventListener('change', () => (location.hash = `#/${modeSelect.value}`));

const settingsButton = el('button', { type: 'button', className: 'icon-button' }, [icon('gear')]);
tAttr(settingsButton, 'aria-label', 'settings.open');
tAttr(settingsButton, 'title', 'settings.open');
settingsButton.addEventListener('click', () => panel.open());

const muteButton = el('button', { type: 'button', className: 'icon-button' });
tAttr(muteButton, 'aria-label', 'sound.mute');
function renderMute(muted: boolean): void {
  muteButton.setAttribute('aria-pressed', String(muted));
  muteButton.replaceChildren(icon(muted ? 'muted' : 'sound'));
  tAttr(muteButton, 'title', muted ? 'sound.unmute' : 'sound.mute');
}
muteButton.addEventListener('click', () => settings.set({ muted: !settings.get().muted }));
settings.subscribe((value) => renderMute(value.muted));

const brandName = el('span', { className: 'visually-hidden' });
tText(brandName, 'app.name');
const view = el('main', { className: 'view' });

app.replaceChildren(
  el('header', { className: 'topbar' }, [
    el('h1', { className: 'brand' }, [
      el('img', { src: `${import.meta.env.BASE_URL}favicon.svg`, alt: '' }),
      brandName,
    ]),
    modeSelect,
    el('div', { className: 'topbar-actions' }, [settingsButton, muteButton]),
  ]),
  view,
  panel.dialog,
  toast,
);
renderMute(settings.get().muted);
setLocale(localeOf(settings.get()));

// The router: #/<mode>; anything else goes to the default mode.
let current: { id: string; mode: Mode } | null = null;
function route(): void {
  const definition = modeOf(location.hash);
  if (!definition) {
    history.replaceState(null, '', `#/${DEFAULT_MODE}`);
    route();
    return;
  }
  modeSelect.value = definition.id;
  if (current?.id === definition.id) return;
  current?.mode.dispose();
  const mode = definition.create({ tree: TREE_V1, settings, tone, vibration, notify });
  current = { id: definition.id, mode };
  view.replaceChildren(mode.element);
}
window.addEventListener('hashchange', route);
route();

// The service worker: offline, and a notice when there is a new version.
registerPwa({
  onNeedRefresh(reload) {
    pendingReload = reload;
    clearTimeout(toastTimer);
    showUpdate();
  },
  onOfflineReady() {
    if (!pendingReload) notify(t('pwa.offlineReady'));
  },
});
