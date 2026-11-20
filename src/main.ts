// F0: a "hello" page that is installable, works offline and speaks the five
// languages. TODO(2): the hash router (#/free, #/learn…), the keyer, the tree
// and the settings panel (SPEC §6, §7).
import './styles/tokens.css';
import './styles/base.css';
import {
  LOCALE_NAMES,
  LOCALES,
  detectLocale,
  isLocale,
  onLocaleChange,
  setLocale,
  t,
  type Locale,
} from './i18n';
import { registerPwa } from './pwa';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('#app not found');

const toast = el('div', { className: 'toast', hidden: true, role: 'status' });
let pendingReload: (() => void) | null = null;
let offlineReady = false;

function languageSelect(locale: Locale): HTMLLabelElement {
  const select = el(
    'select',
    { id: 'language' },
    LOCALES.map((code) =>
      el('option', { value: code, selected: code === locale }, [LOCALE_NAMES[code]]),
    ),
  );
  select.addEventListener('change', () => {
    if (isLocale(select.value)) setLocale(select.value);
  });
  return el('label', { className: 'field', htmlFor: 'language' }, [t('language.label'), select]);
}

function renderToast(): void {
  if (pendingReload) {
    const reload = pendingReload;
    const button = el('button', { type: 'button' }, [t('pwa.reload')]);
    button.addEventListener('click', reload);
    toast.replaceChildren(el('span', {}, [t('pwa.updateAvailable')]), button);
    toast.hidden = false;
  } else if (offlineReady) {
    toast.replaceChildren(el('span', {}, [t('pwa.offlineReady')]));
    toast.hidden = false;
  }
}

function render(locale: Locale): void {
  document.title = `${t('app.name')} · ${t('app.tagline')}`;
  const logo = el('img', { src: `${import.meta.env.BASE_URL}favicon.svg`, alt: '' });
  app?.replaceChildren(
    el('header', { className: 'topbar' }, [
      el('h1', { className: 'brand' }, [logo, t('app.name')]),
      languageSelect(locale),
    ]),
    el('main', {}, [
      el('div', { className: 'morse', ariaHidden: 'true' }, [
        el('span', { className: 'dot' }, ['·']),
        el('span', { className: 'dash' }, ['−']),
      ]),
      el('h2', {}, [t('home.title')]),
      el('p', {}, [t('app.tagline')]),
      el('p', {}, [t('home.body')]),
    ]),
    toast,
  );
  renderToast();
}

onLocaleChange(render);
setLocale(detectLocale(navigator.languages));

registerPwa({
  onNeedRefresh(reload) {
    pendingReload = reload;
    renderToast();
  },
  onOfflineReady() {
    offlineReady = true;
    renderToast();
    setTimeout(() => {
      offlineReady = false;
      if (!pendingReload) toast.hidden = true;
    }, 4000);
  },
});
