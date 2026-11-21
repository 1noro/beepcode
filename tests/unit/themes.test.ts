// The themes of tokens.css (SPEC §7, §11): AA contrast in all of them (AAA in
// high contrast), and dot and dash that can be told apart in every
// combination of theme and colour vision, simulating each deficiency.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { THEMES, VISIONS, type Theme, type Vision } from '../../src/state/settings.ts';
import { contrast, deltaE, simulate, type Deficiency } from './support/color.ts';

const css = readFileSync(new URL('../../src/styles/tokens.css', import.meta.url), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

/** selector → its custom properties, for every rule without nested braces. */
const rules = new Map<string, Record<string, string>>();
for (const [, selectors = '', body = ''] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const vars = Object.fromEntries(
    [...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, name = '', value = '']) => [
      name,
      value.trim(),
    ]),
  );
  for (const selector of selectors.split(',')) {
    const key = selector.trim();
    rules.set(key, { ...rules.get(key), ...vars });
  }
}

type Scheme = 'light' | 'dark';

/** The resolved colours of a theme ('system' in a light or dark OS) and vision. */
function palette(theme: Theme, vision: Vision, scheme: Scheme = 'light'): Record<string, string> {
  const vars: Record<string, string> = { ...rules.get(':root') };
  if (theme === 'system') {
    if (scheme === 'dark') Object.assign(vars, rules.get(':root:not([data-theme])'));
  } else {
    Object.assign(vars, rules.get(`:root[data-theme='${theme}']`));
  }
  if (vision !== 'default') Object.assign(vars, rules.get(`:root[data-vision='${vision}']`));
  const resolve = (value: string, depth = 0): string => {
    const ref = /^var\((--[\w-]+)\)$/.exec(value);
    if (!ref || depth > 5) return value;
    return resolve(vars[ref[1] ?? ''] ?? value, depth + 1);
  };
  return Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, resolve(v)]));
}

const COMBINATIONS: [string, Theme, Scheme][] = [
  ['system (light)', 'system', 'light'],
  ['system (dark)', 'system', 'dark'],
  ...THEMES.filter((t) => t !== 'system').map((t): [string, Theme, Scheme] => [t, t, 'light']),
];

const color = (p: Record<string, string>, name: string): string => {
  const value = p[`--color-${name}`];
  if (!value) throw new Error(`--color-${name} is missing`);
  return value;
};

describe.each(COMBINATIONS)('the theme %s', (_name, theme, scheme) => {
  const aaa = theme === 'high-contrast';
  const text = aaa ? 7 : 4.5;

  it(`has text at ${text}:1 on the background and on surfaces`, () => {
    const p = palette(theme, 'default', scheme);
    for (const fg of ['fg', 'muted']) {
      for (const bg of ['bg', 'surface']) {
        expect(contrast(color(p, fg), color(p, bg)), `${fg} on ${bg}`).toBeGreaterThanOrEqual(text);
      }
    }
    expect(contrast(color(p, 'on-accent'), color(p, 'accent'))).toBeGreaterThanOrEqual(text);
    expect(contrast(color(p, 'accent'), color(p, 'bg'))).toBeGreaterThanOrEqual(3);
  });

  it.each(VISIONS)(
    'with %s vision, dot, dash and error stand out from the background',
    (vision) => {
      const p = palette(theme, vision, scheme);
      for (const name of ['dot', 'dash', 'error']) {
        expect(contrast(color(p, name), color(p, 'bg')), name).toBeGreaterThanOrEqual(aaa ? 7 : 3);
      }
    },
  );

  it.each(VISIONS)('with %s vision, dot and dash look different to that eye', (vision) => {
    const p = palette(theme, vision, scheme);
    const deficiency = vision === 'default' ? null : (vision as Deficiency);
    const difference = deltaE(
      simulate(color(p, 'dot'), deficiency),
      simulate(color(p, 'dash'), deficiency),
    );
    expect(difference).toBeGreaterThanOrEqual(20);
  });
});

describe('reading tokens.css', () => {
  it('resolves themes, the dark system scheme and the vision overrides', () => {
    expect(palette('system', 'default')['--color-bg']).toBe('#f7f7f5');
    expect(palette('system', 'default', 'dark')['--color-bg']).toBe('#14161a');
    expect(palette('gruvbox-light', 'default')['--color-dot']).toBe('#79740e');
    expect(palette('dark', 'deuteranopia')['--color-dot']).toBe('#56b4e9');
    expect(palette('high-contrast', 'achromatopsia')['--color-dot']).toBe('#ffffff');
    expect(palette('light', 'tritanopia')['--color-error']).toBe('#16181d');
  });
});

describe('the colour maths', () => {
  it('gives the WCAG contrast', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21);
    expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
  });

  it('keeps grey as grey for every deficiency, and blue and orange apart', () => {
    for (const d of ['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'] as const) {
      expect(deltaE(simulate('#808080', d), simulate('#808080', null))).toBeLessThan(2);
    }
    // Red and green, the classic confusion of deuteranopia.
    const red = simulate('#d63c42', 'deuteranopia');
    const green = simulate('#1a8f53', 'deuteranopia');
    expect(deltaE(red, green)).toBeLessThan(
      deltaE(simulate('#d63c42', null), simulate('#1a8f53', null)) / 2,
    );
  });
});
