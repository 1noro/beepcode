// Colour maths for the theme tests: contrast (WCAG 2), CIELAB and the
// simulation of colour vision deficiencies (Machado, Oliveira and Fernandes,
// 2009, severity 1). Pure functions, no DOM.

export type Rgb = readonly [number, number, number];

export function parseHex(hex: string): Rgb {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) throw new Error(`Not a #rrggbb colour: ${hex}`);
  return [1, 2, 3].map((i) => parseInt(match[i] ?? '0', 16) / 255) as unknown as Rgb;
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

export function linear(rgb: Rgb): Rgb {
  return rgb.map(toLinear) as unknown as Rgb;
}

/** Relative luminance (WCAG 2) of a linear RGB colour. */
export function luminance([r, g, b]: Rgb): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [la, lb] = [luminance(linear(parseHex(a))), luminance(linear(parseHex(b)))];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export type Deficiency = 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';

type Matrix = readonly [Rgb, Rgb, Rgb];

const MACHADO: Record<Exclude<Deficiency, 'achromatopsia'>, Matrix> = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

const clamp = (c: number) => Math.min(1, Math.max(0, c));

/** How a colour looks with a deficiency, in linear RGB. */
export function simulate(hex: string, deficiency: Deficiency | null): Rgb {
  const rgb = linear(parseHex(hex));
  if (deficiency === null) return rgb;
  if (deficiency === 'achromatopsia') {
    const y = luminance(rgb);
    return [y, y, y];
  }
  return MACHADO[deficiency].map((row) =>
    clamp(row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2]),
  ) as unknown as Rgb;
}

/** CIELAB (D65) of a linear RGB colour. */
export function lab([r, g, b]: Rgb): Rgb {
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

/** CIE76 colour difference. */
export function deltaE(a: Rgb, b: Rgb): number {
  const [la, lb] = [lab(a), lab(b)];
  return Math.hypot(la[0] - lb[0], la[1] - lb[1], la[2] - lb[2]);
}
