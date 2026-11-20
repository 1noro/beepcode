// The Morse tree and its layout (SPEC §2.2). The layout is data, like the
// alphabet: coordinates on a logical grid (x column, y row, origin top left),
// the shape of each node and where its label goes (ADR 0003).
import type { Alphabet, Code, MorseSymbol } from './alphabet.ts';
import { ALPHABET_V1, DASH, DOT } from './alphabet.ts';

export type NodeShape = 'circle' | 'rect-h' | 'rect-v';
export type LabelSide = 'top' | 'right' | 'bottom' | 'left';

export interface LayoutEntry {
  /** The letter of the node. */
  readonly char: string;
  /** The letter of its parent; null is the root (the antenna). */
  readonly parent: string | null;
  readonly x: number;
  readonly y: number;
  readonly shape: NodeShape;
  readonly label: LabelSide;
}

export interface TreeLayout {
  readonly root: { readonly x: number; readonly y: number };
  readonly nodes: readonly LayoutEntry[];
}

/** The topology of the physical card (SPEC §2.2). */
export const LAYOUT_V1: TreeLayout = {
  root: { x: 2.5, y: -0.6 },
  nodes: [
    { char: 'T', parent: null, x: 2, y: 0, shape: 'rect-h', label: 'top' },
    { char: 'M', parent: 'T', x: 1, y: 0, shape: 'rect-h', label: 'top' },
    { char: 'O', parent: 'M', x: 0, y: 0, shape: 'rect-h', label: 'top' },
    { char: 'G', parent: 'M', x: 1, y: 1, shape: 'circle', label: 'right' },
    { char: 'Q', parent: 'G', x: 0, y: 1, shape: 'rect-h', label: 'left' },
    { char: 'Z', parent: 'G', x: 1, y: 2, shape: 'circle', label: 'right' },
    { char: 'N', parent: 'T', x: 2, y: 3, shape: 'circle', label: 'right' },
    { char: 'K', parent: 'N', x: 1, y: 3, shape: 'rect-h', label: 'top' },
    { char: 'Y', parent: 'K', x: 0, y: 3, shape: 'rect-h', label: 'top' },
    { char: 'C', parent: 'K', x: 1, y: 4, shape: 'circle', label: 'right' },
    { char: 'D', parent: 'N', x: 2, y: 5, shape: 'circle', label: 'right' },
    { char: 'X', parent: 'D', x: 1, y: 5, shape: 'rect-h', label: 'left' },
    { char: 'B', parent: 'D', x: 2, y: 6, shape: 'circle', label: 'left' },
    { char: 'E', parent: null, x: 3, y: 0, shape: 'circle', label: 'top' },
    { char: 'I', parent: 'E', x: 4, y: 0, shape: 'circle', label: 'top' },
    { char: 'S', parent: 'I', x: 5, y: 0, shape: 'circle', label: 'top' },
    { char: 'H', parent: 'S', x: 6, y: 0, shape: 'circle', label: 'top' },
    { char: 'U', parent: 'I', x: 4, y: 1, shape: 'rect-v', label: 'left' },
    { char: 'F', parent: 'U', x: 4, y: 2, shape: 'circle', label: 'right' },
    { char: 'V', parent: 'S', x: 5, y: 1, shape: 'rect-v', label: 'right' },
    { char: 'A', parent: 'E', x: 3, y: 3, shape: 'rect-v', label: 'left' },
    { char: 'R', parent: 'A', x: 4, y: 3, shape: 'circle', label: 'bottom' },
    { char: 'L', parent: 'R', x: 5, y: 3, shape: 'circle', label: 'right' },
    { char: 'W', parent: 'A', x: 3, y: 5, shape: 'rect-v', label: 'left' },
    { char: 'P', parent: 'W', x: 4, y: 5, shape: 'circle', label: 'right' },
    { char: 'J', parent: 'W', x: 3, y: 6, shape: 'rect-v', label: 'right' },
  ],
};

export interface MorseNode {
  /** '' is the root. */
  readonly code: Code;
  /** The letter, or null for the root. */
  readonly char: string | null;
  readonly depth: number;
  readonly parent: MorseNode | null;
  readonly dot: MorseNode | null;
  readonly dash: MorseNode | null;
  /** Where to draw it; the root has its own position in TreeLayout.root. */
  readonly layout: LayoutEntry | null;
}

export interface MorseTree {
  readonly root: MorseNode;
  readonly layout: TreeLayout;
  /** All the nodes but the root, in layout order. */
  readonly nodes: readonly MorseNode[];
  /** The node of a code, or undefined if it does not exist. */
  node(code: Code): MorseNode | undefined;
  /** The node of a letter. */
  nodeOf(char: string): MorseNode | undefined;
  /** The nodes from the root (excluded) to the code, or undefined. */
  path(code: Code): MorseNode[] | undefined;
}

interface MutableNode {
  code: Code;
  char: string | null;
  depth: number;
  parent: MutableNode | null;
  dot: MutableNode | null;
  dash: MutableNode | null;
  layout: LayoutEntry | null;
}

/**
 * Builds the tree from the alphabet; the structure comes from the codes, and
 * the layout only says where each letter goes. Every prefix of a code must be
 * a letter too (in v1 there are no nodes without a letter, SPEC §2.1).
 */
export function buildTree(alphabet: Alphabet, layout: TreeLayout): MorseTree {
  const root: MutableNode = {
    code: '',
    char: null,
    depth: 0,
    parent: null,
    dot: null,
    dash: null,
    layout: null,
  };
  const byCode = new Map<Code, MutableNode>([['', root]]);
  const byChar = new Map<string, MutableNode>();
  const layoutOf = new Map(layout.nodes.map((entry) => [entry.char, entry]));

  const entries = Object.entries(alphabet).sort(([, a], [, b]) => a.length - b.length);
  for (const [char, code] of entries) {
    const parent = byCode.get(code.slice(0, -1));
    if (!parent) throw new Error(`The parent of ${char} (${code}) is not in the alphabet`);
    const entry = layoutOf.get(char);
    if (!entry) throw new Error(`${char} has no place in the layout`);
    const node: MutableNode = {
      code,
      char,
      depth: code.length,
      parent,
      dot: null,
      dash: null,
      layout: entry,
    };
    if (code.endsWith(DOT)) parent.dot = node;
    else if (code.endsWith(DASH)) parent.dash = node;
    else throw new Error(`${char} has an invalid code: ${code}`);
    byCode.set(code, node);
    byChar.set(char, node);
  }

  const nodes = layout.nodes.flatMap((entry) => byChar.get(entry.char) ?? []);
  return {
    root,
    layout,
    nodes,
    node: (code) => byCode.get(code),
    nodeOf: (char) => byChar.get(char.toUpperCase()),
    path(code) {
      const end = byCode.get(code);
      if (!end) return undefined;
      const path: MorseNode[] = [];
      for (let n: MutableNode | null = end; n && n !== root; n = n.parent) path.unshift(n);
      return path;
    },
  };
}

/** The symbol of the edge that reaches the node: the last of its code. */
export function lastSymbol(node: MorseNode): MorseSymbol | null {
  if (node.code === '') return null;
  return node.code.endsWith(DOT) ? 'dot' : 'dash';
}

/** The v1 tree: A–Z on the layout of the card. */
export const TREE_V1: MorseTree = buildTree(ALPHABET_V1, LAYOUT_V1);
