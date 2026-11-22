// Applies the appearance settings to <html>: data-theme (none for "system",
// which follows prefers-color-scheme in tokens.css), data-vision,
// data-buttons (the names on the keys, app.css), and the dot and dash
// colours chosen by the user, which win over both (SPEC §7).
import type { Settings } from '../state/settings.ts';

export function applyAppearance(settings: Settings): void {
  const root = document.documentElement;
  if (settings.theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = settings.theme;
  if (settings.vision === 'default') delete root.dataset.vision;
  else root.dataset.vision = settings.vision;
  if (settings.descriptiveButtons) root.dataset.buttons = 'descriptive';
  else delete root.dataset.buttons;
  for (const [name, value] of [
    ['--color-dot', settings.dotColor],
    ['--color-dash', settings.dashColor],
  ] as const) {
    if (value) root.style.setProperty(name, value);
    else root.style.removeProperty(name);
  }
  // The browser bar takes the background of the theme.
  const background = getComputedStyle(root).getPropertyValue('--color-bg').trim();
  if (background)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background);
}

/** The colour of a token as it is now, e.g. for the value of a colour picker. */
export function tokenColor(name: '--color-dot' | '--color-dash'): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
