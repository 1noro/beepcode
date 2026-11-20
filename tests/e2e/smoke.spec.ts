import { expect, test } from '@playwright/test';

// F0 (TODO 1): the "hello" page loads, speaks the browser's language, changes
// language, is installable and works offline. F1 adds .-.. → L (SPEC §11).

test.describe('in English', () => {
  test.use({ locale: 'en-US' });

  test('loads the hello page', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('beepcode');
    await expect(page.getByText('Learn Morse code with a single key.')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('changes language from the selector', async ({ page }) => {
    await page.goto('./');
    await page.getByLabel('Language').selectOption('gl');
    await expect(page.getByText('Aprende código Morse cun só pulsador.')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'gl');
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
    await context.setOffline(false);
  });
});

test.describe('in Spanish', () => {
  test.use({ locale: 'es-ES' });

  test('follows the browser language', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByText('Aprende código Morse con un solo pulsador.')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  });
});
