import { expect, test, type Page } from '@playwright/test';

// The Text → Morse mode (SPEC §6.5, F2): the text normalized, what is not in
// the alphabet faded and skipped, the transcription, and playing with the
// current character highlighted and its path lit. At 5 WPM, a unit of 240 ms:
// E lasts 240 ms, the gap 720 ms, T 720 ms; slow enough to watch.

test.use({ locale: 'en-US' });

// Only seen: what it says is in the field over it.
const preview = (page: Page) => page.locator('.text-preview');
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

test('the field lies over the text as it will be played, on one line of text', async ({ page }) => {
  await page.goto('./#/text');
  expect(await input(page).boundingBox()).toEqual(await preview(page).boundingBox());
  await expect(input(page)).toHaveCSS('color', 'rgba(0, 0, 0, 0)');
  await input(page).fill('sos\nsos\tsos');
  await expect(input(page)).toHaveValue('sos sos sos');
  await expect(preview(page)).toHaveText('SOS SOS SOS');
});

test('without text, a caret and what to do; typing with nothing focused writes', async ({
  page,
}) => {
  await page.goto('./#/text');
  const prompt = page.getByText('Type a text to hear it in Morse');
  await expect(prompt).toBeVisible();
  await expect(page.locator('.text-caret')).toBeVisible();
  await input(page).focus();
  await expect(page.locator('.text-caret')).toBeHidden();
  await input(page).blur();
  await page.keyboard.type('Sos');
  await expect(input(page)).toBeFocused();
  await expect(input(page)).toHaveValue('Sos');
  await expect(prompt).toBeHidden();
});

test('the caret is a block, as on the tape: at the end, on a character, gone when not focused', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'The arrows of a keyboard move it');
  await page.goto('./#/text');
  const end = preview(page).locator('.text-caret-end');
  const onChar = preview(page).locator('.is-caret');
  await input(page).focus();
  await expect(end).toBeAttached();
  await page.keyboard.type('Sos');
  await expect(end).toBeAttached();
  await expect(onChar).toHaveCount(0);
  await page.keyboard.press('ArrowLeft');
  await expect(end).toHaveCount(0);
  await expect(onChar).toHaveText('S');
  await expect(onChar).toHaveAttribute('data-index', '2');
  await input(page).blur();
  await expect(onChar).toHaveCount(0);
  await expect(end).toHaveCount(0);
});

test('without text, the name of the app in Morse waits in place of the code', async ({ page }) => {
  await page.goto('./#/text');
  const ornament = page.locator('.text-empty');
  await expect(ornament).toBeVisible();
  await input(page).fill('E');
  await expect(ornament).toBeHidden();
  await input(page).fill('');
  await expect(ornament).toBeVisible();
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

test('the text and its code start centred, and wrap from the left when full', async ({ page }) => {
  await page.goto('./#/text');
  const output = await page.locator('.text-output').boundingBox();
  const centre = (box: { x: number; width: number } | null) => (box ? box.x + box.width / 2 : 0);
  await input(page).fill('SOS');
  for (const box of [input(page), preview(page)])
    await expect(box).toHaveCSS('text-align', 'center');
  const short = await transcription(page).boundingBox();
  expect(short?.width).toBeLessThan((output?.width ?? 0) / 2);
  expect(Math.abs(centre(short) - centre(output))).toBeLessThan(2);
  await input(page).fill('Hola mundo '.repeat(8));
  for (const box of [input(page), preview(page)]) await expect(box).toHaveCSS('text-align', 'left');
  // Full, both wrap in the same column: the code takes the room of the
  // clear button too, and starts where the text starts.
  const side = await page
    .locator('.text-output')
    .evaluate((element) => parseFloat(getComputedStyle(element).paddingLeft));
  expect(side).toBeGreaterThan(0);
  expect((await transcription(page).boundingBox())?.width).toBeCloseTo(
    (output?.width ?? 0) - 2 * side,
    0,
  );
  const text = await preview(page).locator('span').first().boundingBox();
  const code = await transcription(page).locator('span').first().boundingBox();
  expect(Math.abs((text?.x ?? 0) - (code?.x ?? 0))).toBeLessThan(2);
});

test('the tree does not move when the text is written', async ({ page }) => {
  await page.goto('./#/text');
  const board = page.getByRole('group', { name: 'Morse tree' });
  const before = await board.boundingBox();
  await input(page).fill('Hola, ñu! '.repeat(20));
  await expect(preview(page).locator('.is-skipped').first()).toBeVisible();
  expect(await board.boundingBox()).toEqual(before);
  await input(page).fill('');
  expect(await board.boundingBox()).toEqual(before);
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
