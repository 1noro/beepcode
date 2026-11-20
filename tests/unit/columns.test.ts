import { describe, expect, it } from 'vitest';
import { LAYOUT_V1, type TreeLayout } from '../../src/morse/tree.ts';
import { CELL_X, MIN_CELL_X, treeColumns, type Extents } from '../../src/ui/columns.ts';

// Shapes of 20 × 20 and labels 30 beyond them, enough to see the arithmetic.
const EXTENTS: Extents = { half: () => ({ x: 10, y: 10 }), label: 30 };

describe('the columns of the tree, centred on the antenna (SPEC §2.2)', () => {
  const columns = treeColumns(LAYOUT_V1, EXTENTS);

  it('puts the antenna at 0, and T and E at half a column from it', () => {
    expect(columns.x(LAYOUT_V1.root.x)).toBe(0);
    expect(columns.x(2)).toBe(-CELL_X / 2);
    expect(columns.x(3)).toBe(CELL_X / 2);
  });

  it('packs the dot side, which reaches H, and spreads the dash side', () => {
    expect(columns.cells.right).toBe(MIN_CELL_X);
    expect(columns.cells.left).toBeGreaterThan(CELL_X);
    expect(columns.x(6) - columns.x(5)).toBe(MIN_CELL_X);
    expect(columns.x(1) - columns.x(0)).toBeCloseTo(columns.cells.left);
  });

  it('both sides reach as far: O with the labels on its left, and H', () => {
    // O, Q, Y and X are in column 0, Q, Y and X with their label on the left.
    const left = -columns.x(0) + 10 + 30;
    const right = columns.x(6) + 10;
    expect(left).toBeCloseTo(right, 3);
    expect(columns.halfWidth).toBeCloseTo(right, 3);
  });

  it('leaves a tree that is already balanced as it is', () => {
    const symmetric: TreeLayout = {
      root: { x: 1.5, y: -0.6 },
      nodes: [
        { char: 'T', parent: null, x: 1, y: 0, shape: 'circle', label: 'top' },
        { char: 'M', parent: 'T', x: 0, y: 0, shape: 'circle', label: 'top' },
        { char: 'E', parent: null, x: 2, y: 0, shape: 'circle', label: 'top' },
        { char: 'I', parent: 'E', x: 3, y: 0, shape: 'circle', label: 'top' },
      ],
    };
    const even = treeColumns(symmetric, EXTENTS);
    expect(even.cells).toEqual({ left: CELL_X, right: CELL_X });
    expect(even.x(0)).toBe(-120);
    expect(even.x(3)).toBe(120);
  });
});
