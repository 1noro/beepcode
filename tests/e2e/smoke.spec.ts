import { expect, test } from '@playwright/test';

// The app loads, speaks the browser's language, is installable and works
// offline (F0, TODO 1); the language and the theme change from the settings
// (F1, TODO 2, SPEC §11).

test.describe('in English', () => {
  test.use({ locale: 'en-US' });

  test('loads the Free mode', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('beepcode');
    await expect(page).toHaveTitle('beepcode · Learn Morse code with a single key.');
    await expect(page).toHaveURL(/#\/free$/);
    await expect(page.getByRole('group', { name: 'Morse tree' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Key/ })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('an unknown mode goes to the Free mode', async ({ page }) => {
    await page.goto('./#/nowhere');
    await expect(page).toHaveURL(/#\/free$/);
    await expect(page.getByRole('combobox', { name: 'Mode' })).toHaveValue('free');
  });

  test('changes language from the settings, and remembers it', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByLabel('Language').selectOption('gl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'gl');
    await expect(page.getByRole('heading', { name: 'Axustes' })).toBeVisible();
    await page.getByRole('button', { name: 'Pechar' }).click();
    await expect(page.getByRole('group', { name: 'Árbore Morse' })).toBeVisible();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'gl');
  });

  test('changes the theme and the colour vision from the settings', async ({ page }) => {
    await page.goto('./');
    const html = page.locator('html');
    const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByLabel('Theme').selectOption('gruvbox-dark');
    await expect(html).toHaveAttribute('data-theme', 'gruvbox-dark');
    expect(await background()).toBe('rgb(40, 40, 40)');
    await page.getByLabel('Theme').selectOption('light');
    expect(await background()).toBe('rgb(247, 247, 245)');
    await page.getByLabel('Colour vision').selectOption('deuteranopia');
    await expect(html).toHaveAttribute('data-vision', 'deuteranopia');
    await page.getByRole('button', { name: 'Restore defaults' }).click();
    await expect(html).not.toHaveAttribute('data-theme');
    await expect(html).not.toHaveAttribute('data-vision');
  });

  test('the settings show the version and the licences', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('button', { name: 'Settings' }).click();
    // From `git describe` in the Makefile: never empty, never the placeholder.
    await expect(page.getByText(/^Version \S+$/)).toBeVisible();
    await expect(page.getByText(/^Version __APP_VERSION__/)).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'GPL-3.0-or-later' })).toHaveAttribute(
      'href',
      /LICENSE\.GPL-3\.0\.txt$/,
    );
    await expect(page.getByRole('link', { name: 'CC BY-SA 4.0' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'OFL 1.1' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Source code' })).toBeVisible();
  });

  test('is installable: manifest with name and icons', async ({ page, request }) => {
    await page.goto('./');
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(href).toBeTruthy();
    const response = await request.get(new URL(href ?? '', page.url()).toString());
    expect(response.ok()).toBe(true);
    const manifest = (await response.json()) as {
      name: string;
      display: string;
      icons: { sizes: string; purpose?: string }[];
    };
    expect(manifest.name).toBe('beepcode');
    expect(manifest.display).toBe('standalone');
    const sizes = manifest.icons.map((icon) => icon.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
  });

  test('works offline once the service worker is ready', async ({ page, context }) => {
    await page.goto('./');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('beepcode');
    await expect(page.getByRole('group', { name: 'Morse tree' })).toBeVisible();
    await page.keyboard.press('-');
    await page.keyboard.press('Enter');
    await expect(page.locator('.tape-text')).toHaveText('T');
    await context.setOffline(false);
  });
});

test.describe('in Spanish', () => {
  test.use({ locale: 'es-ES' });

  test('follows the browser language', async ({ page }) => {
    await page.goto('./');
    await expect(page).toHaveTitle('beepcode · Aprende código Morse con un solo pulsador.');
    await expect(page.getByRole('group', { name: 'Árbol Morse' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  });
});

test('a notice goes away whole, without leaving an empty bubble', async ({ page }) => {
  await page.goto('./');
  const toast = page.locator('.toast');
  // The "ready to work offline" notice, or none: either way, after it, nothing.
  await expect(toast).toBeHidden({ timeout: 5000 });
});
