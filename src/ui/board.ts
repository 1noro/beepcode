// The Morse tree in SVG (SPEC §2.2, §3.3): drawn from the layout data, with
// the states of each node as classes that the CSS paints from the tokens.
import { tAttr } from '../i18n/dom.ts';
import { displayCode, type Code } from '../morse/alphabet.ts';
import { lastSymbol, type MorseNode, type MorseTree, type NodeShape } from '../morse/tree.ts';
import { treeColumns } from './columns.ts';
import { svg } from './dom.ts';

/** The height of a grid row, in SVG units; the columns, in columns.ts. */
const CELL_Y = 60;
const RADIUS = 13;
const RECT_LONG = 34;
const RECT_SHORT = 18;
const LABEL_GAP = 9;
const LABEL_SIZE = 20;
const ERROR_MS = 700;
const FADE_MS = 300;
/** How far the focus ring grows around a shape. */
const RING = 5;
/** The space left between the drawing and the sides of the board. */
const EDGE = 8;
/** The antenna: how far its tip is above the root, and its size. */
const ANTENNA_TIP = 6;
const TIP_RADIUS = 3.5;
/** As .antenna in app.css. */
const ANTENNA_STROKE = 2.5;

export interface Board {
  readonly element: SVGSVGElement;
  /** Lights the path to `code`; with final, the letter is closed. */
  light(code: Code, options?: { final?: boolean }): void;
  /** Turns everything off at once. */
  clear(): void;
  /**
   * Keeps what is lit and fades it out quickly at the end, so that it is
   * off in `ms` (SPEC §3.3).
   */
  turnOffIn(ms: number): void;
  /** Blinks the error on the node of `code` (the root, if '') and clears. */
  error(code: Code): void;
  /** The antenna lights up while the key is down. */
  setTransmitting(on: boolean): void;
  /** Called when a letter of the tree is clicked or activated (Explore). */
  onSelect(listener: (node: MorseNode) => void): void;
  dispose(): void;
}

function halfExtent(shape: NodeShape): { x: number; y: number } {
  if (shape === 'circle') return { x: RADIUS, y: RADIUS };
  return shape === 'rect-h'
    ? { x: RECT_LONG / 2, y: RECT_SHORT / 2 }
    : { x: RECT_SHORT / 2, y: RECT_LONG / 2 };
}

function shapeElement(
  className: string,
  shape: NodeShape,
  cx: number,
  cy: number,
  grow = 0,
): SVGElement {
  if (shape === 'circle') return svg('circle', { class: className, cx, cy, r: RADIUS + grow });
  const { x, y } = halfExtent(shape);
  return svg('rect', {
    class: className,
    x: cx - x - grow,
    y: cy - y - grow,
    width: 2 * (x + grow),
    height: 2 * (y + grow),
    rx: 6 + grow / 2,
  });
}

/** The top of the tip of the antenna at `rootY`, its stroke included. */
function antennaTop(rootY: number): number {
  return rootY - ANTENNA_TIP - TIP_RADIUS - ANTENNA_STROKE / 2;
}

function antenna(cx: number, rootY: number): SVGGElement {
  const tip = rootY - ANTENNA_TIP;
  const wave = (r: number, side: 1 | -1) => {
    const dx = Math.sin(Math.PI / 4) * r * side;
    const dy = Math.cos(Math.PI / 4) * r;
    return `M${cx + dx} ${tip - dy} A${r} ${r} 0 0 ${side === 1 ? 1 : 0} ${cx + dx} ${tip + dy}`;
  };
  return svg('g', { class: 'antenna' }, [
    svg('path', {
      class: 'mast',
      d: `M${cx} ${tip} V0 M${cx - 7} 0 L${cx} ${tip + 14} L${cx + 7} 0`,
    }),
    svg('circle', { class: 'tip', cx, cy: tip, r: TIP_RADIUS }),
    svg('path', { class: 'waves', d: [8, 14].flatMap((r) => [wave(r, 1), wave(r, -1)]).join(' ') }),
  ]);
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export interface BoardOptions {
  /**
   * The letters can be clicked or activated (Explore, SPEC §6.1). Without
   * it, the tree only shows: its nodes are not buttons.
   */
  interactive?: boolean;
}

export function createBoard(tree: MorseTree, options: BoardOptions = {}): Board {
  const interactive = options.interactive ?? true;
  const { layout } = tree;
  const columns = treeColumns(layout, {
    half: (shape) => {
      const half = halfExtent(shape);
      return { x: half.x + RING, y: half.y + RING };
    },
    label: LABEL_GAP + LABEL_SIZE * 0.7,
  });
  const rootX = columns.x(layout.root.x);
  const rootY = layout.root.y * CELL_Y;
  const ys = layout.nodes.map((n) => n.y * CELL_Y);
  const margin = 46;
  // Centred on the antenna, where the light starts (columns.ts), and from
  // the tip of the antenna down: it is where the content begins. The waves,
  // above it, are drawn outside.
  const halfWidth = columns.halfWidth + EDGE;
  const minX = rootX - halfWidth;
  const minY = antennaTop(rootY);
  const width = 2 * halfWidth;
  const height = Math.max(...ys) + margin - minY;

  const element = svg('svg', {
    class: interactive ? 'board' : 'board board--static',
    viewBox: `${minX} ${minY} ${width} ${height}`,
    // On top of its room; what is left goes below, towards the text.
    preserveAspectRatio: 'xMidYMin meet',
    role: 'group',
  });
  tAttr(element, 'aria-label', 'board.label');

  const edges = svg('g', { class: 'edges' });
  const nodes = svg('g', { class: 'nodes' });
  const antennaGroup = antenna(rootX, rootY);
  element.append(edges, antennaGroup, nodes);

  const edgeOf = new Map<Code, SVGElement>();
  const groupOf = new Map<Code, SVGGElement>();
  const listeners: ((node: MorseNode) => void)[] = [];

  for (const node of tree.nodes) {
    const entry = node.layout;
    if (!entry) continue;
    const cx = columns.x(entry.x);
    const cy = entry.y * CELL_Y;
    const symbol = lastSymbol(node) ?? 'dot';
    const parent = node.parent?.layout;
    // The edges from the antenna leave from its foot, on the row of T and E.
    const px = parent ? columns.x(parent.x) : rootX;
    const py = parent ? parent.y * CELL_Y : cy;
    const edge = svg('line', { class: `edge edge--${symbol}`, x1: px, y1: py, x2: cx, y2: cy });
    edges.append(edge);
    edgeOf.set(node.code, edge);

    const half = halfExtent(entry.shape);
    const offset = {
      top: [0, -(half.y + LABEL_GAP)],
      bottom: [0, half.y + LABEL_GAP + LABEL_SIZE * 0.7],
      left: [-(half.x + LABEL_GAP), LABEL_SIZE * 0.35],
      right: [half.x + LABEL_GAP, LABEL_SIZE * 0.35],
    }[entry.label];
    const anchor = { top: 'middle', bottom: 'middle', left: 'end', right: 'start' }[entry.label];
    const label = svg('text', {
      class: 'label',
      x: cx + (offset[0] ?? 0),
      y: cy + (offset[1] ?? 0),
      'text-anchor': anchor,
      'aria-hidden': 'true',
    });
    label.textContent = node.char;

    const group = svg(
      'g',
      {
        class: `node node--${symbol}`,
        'data-code': node.code,
        'data-char': node.char ?? '',
        ...(interactive ? { role: 'button', tabindex: 0 } : {}),
      },
      [
        svg('circle', { class: 'hit', cx, cy, r: CELL_Y * 0.45 }),
        shapeElement('ring', entry.shape, cx, cy, RING),
        shapeElement('shape', entry.shape, cx, cy),
        label,
      ],
    );
    nodes.append(group);
    groupOf.set(node.code, group);
    if (!interactive) continue;
    tAttr(group, 'aria-label', 'board.node', {
      letter: node.char ?? '',
      code: displayCode(node.code),
    });
    const select = () => {
      for (const listener of listeners) listener(node);
    };
    group.addEventListener('click', select);
    group.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      event.stopPropagation();
      select();
    });
  }

  let timers: ReturnType<typeof setTimeout>[] = [];
  const clearTimers = () => {
    for (const timer of timers) clearTimeout(timer);
    timers = [];
  };

  function off(): void {
    element.classList.remove('is-fading');
    antennaGroup.classList.remove('is-error');
    for (const group of groupOf.values()) group.classList.remove('is-on', 'is-final', 'is-error');
    for (const edge of edgeOf.values()) edge.classList.remove('is-on');
  }

  return {
    element,
    light(code, options = {}) {
      clearTimers();
      off();
      for (let i = 1; i <= code.length; i++) {
        const prefix = code.slice(0, i);
        groupOf.get(prefix)?.classList.add('is-on');
        edgeOf.get(prefix)?.classList.add('is-on');
      }
      if (options.final) groupOf.get(code)?.classList.add('is-final');
    },
    clear() {
      clearTimers();
      off();
    },
    turnOffIn(ms) {
      clearTimers();
      const fade = prefersReducedMotion() ? 0 : Math.min(FADE_MS, ms);
      timers.push(
        setTimeout(() => {
          element.classList.add('is-fading');
          timers.push(setTimeout(off, fade));
        }, ms - fade),
      );
    },
    error(code) {
      clearTimers();
      off();
      const target = code ? groupOf.get(code) : antennaGroup;
      target?.classList.add('is-error');
      timers.push(setTimeout(off, ERROR_MS));
    },
    setTransmitting(on) {
      antennaGroup.classList.toggle('is-tx', on);
    },
    onSelect(listener) {
      listeners.push(listener);
    },
    dispose() {
      clearTimers();
      listeners.length = 0;
    },
  };
}
