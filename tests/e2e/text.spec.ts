import { expect, test, type Page } from '@playwright/test';

// The Text → Morse mode (SPEC §6.5, F2): the text normalized, what is not in
// the alphabet faded and skipped, the transcription, and playing with the
// current character highlighted and its path lit. At 5 WPM, a unit of 240 ms:
// E lasts 240 ms, the gap 720 ms, T 720 ms; slow enough to watch.

test.use({ locale: 'en-US' });

const preview = (page: Page) => page.getByLabel('Text as it is played');
const transcription = (page: Page) => page.getByLabel('Transcription');
const input = (page: Page) => page.getByRole('textbox', { name: 'Text to play' });
const node = (page: Page, char: string) => page.locator(`.node[data-char="${char}"]`);
const current = (page: Page) => preview(page).locator('.is-current');

async function atSlowSpeed(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem('beepcode.settings', JSON.stringify({ version: 1, settings: { wpm: 5 } }));
  });
}

test('the mode selector opens the Text mode', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('combobox', { name: 'Mode' }).selectOption('text');
  await expect(page).toHaveURL(/#\/text$/);
  await expect(input(page)).toBeVisible();
  await expect(page.getByRole('group', { name: 'Morse tree' })).toBeVisible();
  // The tree only shows here: its letters are not buttons.
  await expect(page.locator('.node[role="button"]')).toHaveCount(0);
});

test('normalizes the text, fades what is skipped and transcribes the rest', async ({ page }) => {
  await page.goto('./#/text');
  const play = page.getByRole('button', { name: 'Play' });
  await expect(play).toBeDisabled();
  await input(page).fill('Sí, ñu');
  await expect(preview(page)).toHaveText('SI, ÑU');
  await expect(preview(page).locator('.is-skipped')).toHaveText([',', 'Ñ']);
  await expect(transcription(page)).toHaveText('··· ·· / ··−');
  await expect(page.getByText('Faded characters are not in the alphabet')).toBeVisible();
  await expect(play).toBeEnabled();
});

test('plays letter by letter, lighting the path, and stops at the end', async ({ page }) => {
  await atSlowSpeed(page);
  await page.goto('./#/text');
  await input(page).fill('et');
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await expect(current(page)).toHaveText('E');
  await expect(node(page, 'E')).toHaveClass(/is-on/);
  await expect(current(page)).toHaveText('T');
  await expect(node(page, 'T')).toHaveClass(/is-on/);
  await expect(transcription(page).locator('.is-current')).toHaveText('−');
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  await expect(current(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Stop' })).toBeDisabled();
});

test('pauses where it is, and stops back at the start', async ({ page }) => {
  await atSlowSpeed(page);
  await page.goto('./#/text');
  await input(page).fill('t t t');
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(current(page)).toHaveText('T');
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  await expect(current(page)).toHaveCount(1);
  await expect(node(page, 'T')).not.toHaveClass(/is-on/);
  await page.getByRole('button', { name: 'Stop' }).click();
  await expect(current(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Stop' })).toBeDisabled();
});

test('takes at most 200 characters, and counts them', async ({ page }) => {
  await page.goto('./#/text');
  await expect(page.getByText('0 / 200')).toBeVisible();
  await input(page).fill('SOS');
  await expect(page.getByText('3 / 200')).toBeVisible();
  await input(page).fill('');
  await input(page).pressSequentially('E'.repeat(205));
  await expect(input(page)).toHaveValue('E'.repeat(200));
  await expect(page.getByText('200 / 200')).toBeVisible();
});

test('the clear button empties the text and stops', async ({ page }) => {
  await atSlowSpeed(page);
  await page.goto('./#/text');
  // Empty, it is hidden: out of the accessibility tree too.
  const hiddenClear = page.locator('.text-clear');
  await expect(hiddenClear).toBeDisabled();
  await expect(hiddenClear).toBeHidden();
  const clear = page.getByRole('button', { name: 'Clear the text' });
  await input(page).fill('t t t');
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(current(page)).toHaveText('T');
  await clear.click();
  await expect(input(page)).toHaveValue('');
  await expect(input(page)).toBeFocused();
  await expect(preview(page)).toHaveText('');
  await expect(transcription(page)).toHaveText('');
  await expect(page.getByRole('button', { name: 'Play' })).toBeDisabled();
  await expect(hiddenClear).toBeDisabled();
});

test('the loop is a toggle, and the text stays when coming back', async ({ page }) => {
  await page.goto('./#/text');
  const loop = page.getByRole('button', { name: 'Loop' });
  await expect(loop).toHaveAttribute('aria-pressed', 'false');
  await loop.click();
  await expect(loop).toHaveAttribute('aria-pressed', 'true');
  await input(page).fill('SOS');
  await page.getByRole('combobox', { name: 'Mode' }).selectOption('free');
  await page.getByRole('combobox', { name: 'Mode' }).selectOption('text');
  await expect(input(page)).toHaveValue('SOS');
});

test('the effective speed (Farnsworth) goes up to the speed', async ({ page }) => {
  await page.goto('./#/text');
  await page.getByRole('button', { name: 'Settings' }).click();
  const effective = page.getByLabel('Effective speed (Farnsworth)');
  await expect(effective).toHaveAttribute('max', '12');
  await expect(effective).toHaveValue('12');
  await effective.fill('8');
  await expect(page.locator('output', { hasText: '8 WPM' })).toBeVisible();
  // Down to it, the speed takes the effective one back to following it.
  await page.getByRole('slider', { name: 'Speed', exact: true }).fill('8');
  await page.getByRole('slider', { name: 'Speed', exact: true }).fill('20');
  await expect(effective).toHaveValue('20');
});

test('the page never scrolls in the Text mode', async ({ page }) => {
  for (const size of [
    { width: 1280, height: 720 },
    { width: 800, height: 360 },
    { width: 390, height: 664 },
  ]) {
    await page.setViewportSize(size);
    await page.goto('./#/text');
    await expect(page.getByRole('group', { name: 'Morse tree' })).toBeVisible();
    const box = await page.getByRole('button', { name: 'Play' }).boundingBox();
    expect(box && box.y + box.height).toBeLessThanOrEqual(size.height);
    const scrollbar = await page.evaluate(
      () => window.innerWidth - document.documentElement.clientWidth,
    );
    expect(scrollbar).toBe(0);
  }
});
