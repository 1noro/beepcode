// Where each column of the tree goes (SPEC §2.2), centred on the antenna, as
// on the card: the side with more columns (the dot side in v1, which reaches
// H) packs them closer, and the other one spreads them out, so that both
// reach as far and the antenna, where the light starts, is the centre.
// The columns next to the antenna keep their distance, so that the labels
// between them (N and A) fit. Plain arithmetic on the layout data, no DOM.
import type { LabelSide, NodeShape, TreeLayout } from '../morse/tree.ts';

/** The width of a column where both sides are alike, in SVG units. */
export const CELL_X = 80;
/** The closest columns can be and still fit their labels. */
export const MIN_CELL_X = 70;

export interface Extents {
  /** Half the width and height of a shape. */
  half(shape: NodeShape): { x: number; y: number };
  /** How far a label sticks out beyond the shape, on its side. */
  readonly label: number;
}

export interface Columns {
  /** The x of a layout column, in SVG units; the antenna is at 0. */
  x(column: number): number;
  /** The width of a column on each side. */
  readonly cells: { readonly left: number; readonly right: number };
  /** From the antenna to the farthest shape or label, on either side. */
  readonly halfWidth: number;
}

interface Reach {
  /** Columns from the antenna. */
  distance: number;
  /** Beyond the centre of the node, outwards. */
  overhang: number;
}

/** From the antenna to the column `distance` away, with `cell` past the first. */
function offset(distance: number, cell: number): number {
  return Math.min(distance, 0.5) * CELL_X + Math.max(0, distance - 0.5) * cell;
}

function reachOf(side: Reach[], cell: number): number {
  return Math.max(0, ...side.map((r) => offset(r.distance, cell) + r.overhang));
}

/** The cell that makes `side` reach `target`, or null if it cannot. */
function cellReaching(side: Reach[], target: number): number | null {
  let low = 0;
  let high = 4 * CELL_X;
  if (reachOf(side, high) < target) return null;
  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    if (reachOf(side, mid) < target) low = mid;
    else high = mid;
  }
  return high;
}

export function treeColumns(layout: TreeLayout, extents: Extents): Columns {
  const left: Reach[] = [];
  const right: Reach[] = [];
  for (const node of layout.nodes) {
    const d = node.x - layout.root.x;
    const outwards = (side: LabelSide) =>
      extents.half(node.shape).x + (node.label === side ? extents.label : 0);
    if (d <= 0) left.push({ distance: -d, overhang: outwards('left') });
    if (d >= 0) right.push({ distance: d, overhang: outwards('right') });
  }

  let cells = { left: CELL_X, right: CELL_X };
  const leftReach = reachOf(left, CELL_X);
  const rightReach = reachOf(right, CELL_X);
  if (Math.abs(leftReach - rightReach) >= 1) {
    const [long, short] = leftReach > rightReach ? [left, right] : [right, left];
    const target = reachOf(long, MIN_CELL_X);
    const shortCell = Math.max(MIN_CELL_X, cellReaching(short, target) ?? CELL_X);
    cells =
      long === left
        ? { left: MIN_CELL_X, right: shortCell }
        : { left: shortCell, right: MIN_CELL_X };
  }

  return {
    x(column) {
      const d = column - layout.root.x;
      return d < 0 ? -offset(-d, cells.left) : offset(d, cells.right);
    },
    cells,
    halfWidth: Math.max(reachOf(left, cells.left), reachOf(right, cells.right)),
  };
}
