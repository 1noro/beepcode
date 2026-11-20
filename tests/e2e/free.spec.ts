import { expect, test, type Page } from '@playwright/test';

// The Free mode (SPEC §6.1, §11): typing .-.. leaves an L on the tape and
// lights E, A, R and L, with the keyboard and with the key (emulated touch on
// mobile). At 12 WPM, the defaults: a dash from 200 ms, the letter closed
// 450 ms after the last symbol.

test.use({ locale: 'en-US' });

const DOT_MS = 60;
const DASH_MS = 350;
const SYMBOL_GAP_MS = 60;

const tape = (page: Page) => page.locator('.tape-text');
const node = (page: Page, char: string) => page.locator(`.node[data-char="${char}"]`);

/**
 * The path of a letter stays lit as long as the letter gap (SPEC §3.3), and
 * the gaps adapt to the quick presses of these tests: some 0.4 s. The
 * widest gap tolerance gives the checks time to see it.
 */
async function withWideGaps(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem(
      'beepcode.settings',
      JSON.stringify({ version: 1, settings: { gapTolerance: 3 } }),
    );
  });
}

async function expectEarlLit(page: Page): Promise<void> {
  for (const char of ['E', 'A', 'R', 'L']) await expect(node(page, char)).toHaveClass(/is-on/);
  await expect(node(page, 'L')).toHaveClass(/is-final/);
  await expect(node(page, 'T')).not.toHaveClass(/is-on/);
}

/** Holds the key on screen for `ms`: by touch where there is one, else the mouse. */
async function holdKey(page: Page, ms: number, touch: boolean): Promise<void> {
  const box = await page.getByRole('button', { name: /^Key/ }).boundingBox();
  if (!box) throw new Error('The key is not visible');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  if (touch) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await page.waitForTimeout(ms);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
  } else {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.waitForTimeout(ms);
    await page.mouse.up();
  }
  await page.waitForTimeout(SYMBOL_GAP_MS);
}

test('.-.. with the keyboard: Space as a straight key', async ({ page }) => {
  await withWideGaps(page);
  await page.goto('./');
  for (const ms of [DOT_MS, DASH_MS, DOT_MS, DOT_MS]) {
    await page.keyboard.down(' ');
    await page.waitForTimeout(ms);
    await page.keyboard.up(' ');
    await page.waitForTimeout(SYMBOL_GAP_MS);
  }
  await expect(tape(page)).toHaveText('L');
  await expectEarlLit(page);
});

test('.-.. with . and -, closed with Enter', async ({ page }) => {
  await page.goto('./');
  for (const key of ['.', '-', '.', '.']) await page.keyboard.press(key);
  await expect(page.locator('.tape-sequence')).toHaveText('·−··');
  await page.keyboard.press('Enter');
  await expect(tape(page)).toHaveText('L');
  await expect(page.locator('.tape-sequence')).toHaveText(/^\s*$/);
  await expectEarlLit(page);
});

test('.-.. with the key on screen', async ({ page, hasTouch }) => {
  await withWideGaps(page);
  await page.goto('./');
  for (const ms of [DOT_MS, DASH_MS, DOT_MS, DOT_MS]) await holdKey(page, ms, hasTouch);
  await expect(tape(page)).toHaveText('L');
  await expectEarlLit(page);
});

test('a pause makes a word space; Backspace and the actions edit the tape', async ({ page }) => {
  await page.goto('./');
  await page.keyboard.press('-');
  await page.keyboard.press('Enter');
  // The word space comes 1900 ms after the last symbol.
  await page.waitForTimeout(2200);
  await page.keyboard.press('.');
  await page.keyboard.press('Enter');
  await expect(tape(page)).toHaveText('T E');
  await page.keyboard.press('Backspace');
  await expect(tape(page)).toHaveText('T ');
  await page.keyboard.press('.');
  await page.keyboard.press('Backspace');
  await expect(tape(page)).toHaveText('T ');
  await page.getByRole('button', { name: 'Delete the last letter' }).click();
  await expect(tape(page)).toHaveText('T');
  await page.getByRole('button', { name: 'Clear all' }).click();
  await expect(tape(page)).toHaveText('');
  await expect(page.getByText('Your letters appear here')).toBeVisible();
});

test('an invalid sequence marks the last valid node and writes nothing', async ({ page }) => {
  await page.goto('./');
  for (const key of ['.', '.', '-', '-']) await page.keyboard.press(key);
  await expect(node(page, 'U')).toHaveClass(/is-error/);
  await page.keyboard.press('Enter');
  await expect(tape(page)).toHaveText('');
});

test('Explore: clicking a letter lights its path and writes nothing', async ({ page }) => {
  await page.goto('./');
  await node(page, 'L').click();
  await expect(node(page, 'L')).toHaveClass(/is-final/);
  for (const char of ['E', 'A', 'R']) await expect(node(page, char)).toHaveClass(/is-on/);
  await expect(tape(page)).toHaveText('');
});

test('the letters of the tree are buttons with their code', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('button', { name: 'L: ·−··' })).toBeVisible();
  await expect(page.getByRole('button', { name: /: / })).toHaveCount(26);
});

test('the tree does not move when the first letters appear', async ({ page }) => {
  await page.goto('./');
  const board = page.getByRole('group', { name: 'Morse tree' });
  const before = await board.boundingBox();
  await page.keyboard.press('.');
  expect(await board.boundingBox()).toEqual(before);
  await page.keyboard.press('Enter');
  await expect(tape(page)).toHaveText('E');
  expect(await board.boundingBox()).toEqual(before);
  for (const key of ['-', '-', '-', 'Enter', '.', '-', '.', '.', 'Enter'])
    await page.keyboard.press(key);
  await expect(tape(page)).toHaveText('EOL');
  expect(await board.boundingBox()).toEqual(before);
});

test('the page never scrolls, not even on a short window', async ({ page }) => {
  for (const size of [
    { width: 1280, height: 720 },
    { width: 800, height: 360 },
  ]) {
    await page.setViewportSize(size);
    await page.goto('./');
    await expect(page.getByRole('group', { name: 'Morse tree' })).toBeVisible();
    const state = await page.evaluate(() => ({
      overflow: getComputedStyle(document.documentElement).overflow,
      scrollbar: window.innerWidth - document.documentElement.clientWidth,
    }));
    expect(state).toEqual({ overflow: 'hidden', scrollbar: 0 });
  }
});

test('the path goes off, and the word space comes a second later', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => {
    const marks: Record<string, number> = {};
    (window as unknown as { marks: typeof marks }).marks = marks;
    const tapeText = document.querySelector('.tape-text');
    const board = document.querySelector('.board');
    if (!tapeText || !board) throw new Error('No tape or board');
    new MutationObserver(() => {
      if (tapeText.textContent.endsWith(' ')) marks.space ??= performance.now();
    }).observe(tapeText, { childList: true, characterData: true, subtree: true });
    new MutationObserver(() => {
      if (board.querySelector('.is-final')) marks.lit ??= performance.now();
      if (board.classList.contains('is-fading')) marks.fading ??= performance.now();
      if (marks.lit && !board.querySelector('.is-on')) marks.off ??= performance.now();
    }).observe(board, { attributes: true, subtree: true });
  });
  await page.keyboard.press('-');
  await page.keyboard.press('Enter');
  type Marks = Record<'lit' | 'fading' | 'off' | 'space', number>;
  const marks = () => page.evaluate(() => (window as unknown as { marks: Marks }).marks);
  await expect
    .poll(async () => Object.keys(await marks()).sort())
    .toEqual(['fading', 'lit', 'off', 'space']);
  const { lit, fading, off, space } = await marks();
  // With Enter, the path holds until 900 ms after the last symbol, the
  // quick fade (300 ms) included; the space comes 1 s after it is off.
  expect(fading - lit).toBeGreaterThan(500);
  expect(off - lit).toBeGreaterThan(800);
  expect(off - lit).toBeLessThan(1000);
  expect(space - off).toBeGreaterThan(900);
  expect(space - off).toBeLessThan(1100);
});

test('the tree is centred on the antenna, where the light starts', async ({ page }) => {
  await page.goto('./');
  const board = await page.getByRole('group', { name: 'Morse tree' }).boundingBox();
  const antenna = await page.locator('.antenna .tip').boundingBox();
  if (!board || !antenna) throw new Error('No board or antenna');
  const centre = board.x + board.width / 2;
  expect(Math.abs(antenna.x + antenna.width / 2 - centre)).toBeLessThan(1);
  const viewport = page.viewportSize();
  if (viewport) expect(Math.abs(centre - viewport.width / 2)).toBeLessThan(1);
});

test('the key takes the colour of the dot, then of the dash, while held', async ({ page }) => {
  await page.goto('./');
  const key = page.getByRole('button', { name: /^Key/ });
  await page.keyboard.down(' ');
  await expect(key).toHaveClass(/is-down/);
  await expect(key).toHaveClass(/is-dot/);
  // At 12 WPM a press becomes a dash at 200 ms.
  await expect(key).toHaveClass(/is-dash/);
  await expect(key).not.toHaveClass(/is-dot/);
  await page.keyboard.up(' ');
  await expect(key).not.toHaveClass(/is-down|is-dot|is-dash/);
  await expect(page.locator('.tape-sequence')).toHaveText('−');
});
