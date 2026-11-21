// Tiny helpers to build the DOM and SVG by hand (ADR 0001).

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

export function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Record<string, string | number> = {},
  children: Node[] = [],
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  node.append(...children);
  return node;
}

/** Small line icons, drawn with currentColor on a 24×24 grid. */
const ICONS = {
  // Eight teeth, as an outline: a dashed ring cannot be one, because the
  // round caps of the icons fill the gaps between its dashes.
  gear: [
    [
      'path',
      {
        d: 'M10.38 4.37L10.72 1.58L13.28 1.58L13.62 4.37A7.8 7.8 0 0 1 16.25 5.46L18.46 3.73L20.27 5.54L18.54 7.75A7.8 7.8 0 0 1 19.63 10.38L22.42 10.72L22.42 13.28L19.63 13.62A7.8 7.8 0 0 1 18.54 16.25L20.27 18.46L18.46 20.27L16.25 18.54A7.8 7.8 0 0 1 13.62 19.63L13.28 22.42L10.72 22.42L10.38 19.63A7.8 7.8 0 0 1 7.75 18.54L5.54 20.27L3.73 18.46L5.46 16.25A7.8 7.8 0 0 1 4.37 13.62L1.58 13.28L1.58 10.72L4.37 10.38A7.8 7.8 0 0 1 5.46 7.75L3.73 5.54L5.54 3.73L7.75 5.46A7.8 7.8 0 0 1 10.38 4.37Z',
      },
    ],
    ['circle', { cx: 12, cy: 12, r: 3 }],
  ],
  sound: [
    ['path', { d: 'M4 9h4l5-4v14l-5-4H4z' }],
    ['path', { d: 'M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11' }],
  ],
  muted: [
    ['path', { d: 'M4 9h4l5-4v14l-5-4H4z' }],
    ['path', { d: 'M16 9l5 6M21 9l-5 6' }],
  ],
  backspace: [
    ['path', { d: 'M9 5h11v14H9l-6-7z' }],
    ['path', { d: 'M12 9l5 6M17 9l-5 6' }],
  ],
  clear: [['path', { d: 'M6 6l12 12M18 6L6 18' }]],
  copy: [
    ['rect', { x: 8, y: 8, width: 12, height: 12, rx: 2 }],
    ['path', { d: 'M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3' }],
  ],
  play: [['path', { d: 'M7 4.5v15l12-7.5z' }]],
  pause: [['path', { d: 'M8 5v14M16 5v14' }]],
  stop: [['rect', { x: 6, y: 6, width: 12, height: 12, rx: 1.5 }]],
  loop: [
    ['path', { d: 'M4 11V9a3 3 0 0 1 3-3h12M16 3l3 3-3 3' }],
    ['path', { d: 'M20 13v2a3 3 0 0 1-3 3H5M8 21l-3-3 3-3' }],
  ],
} as const satisfies Record<
  string,
  readonly (readonly [string, Record<string, string | number>])[]
>;

export type IconName = keyof typeof ICONS;

export function icon(name: IconName): SVGSVGElement {
  return svg(
    'svg',
    {
      class: 'icon',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 2,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true',
    },
    ICONS[name].map(([tag, attributes]) =>
      svg(tag as 'path', attributes as Record<string, string | number>),
    ),
  );
}
