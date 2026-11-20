import { describe, expect, it } from 'vitest';
import { ALPHABET_V1 } from '../../../src/morse/alphabet.ts';
import {
  LAYOUT_V1,
  TREE_V1,
  buildTree,
  lastSymbol,
  type LayoutEntry,
  type MorseNode,
} from '../../../src/morse/tree.ts';

const entries = new Map(LAYOUT_V1.nodes.map((entry) => [entry.char, entry]));
const position = (char: string | null) => (char === null ? LAYOUT_V1.root : entries.get(char));

/** The code read from the layout alone: following `parent` up to the root. */
function layoutCode(entry: LayoutEntry): string {
  const symbols: string[] = [];
  for (
    let e: LayoutEntry | undefined = entry;
    e;
    e = e.parent ? entries.get(e.parent) : undefined
  ) {
    const parentCode = e.parent === null ? '' : ALPHABET_V1[e.parent];
    const code = ALPHABET_V1[e.char] ?? '';
    // Each edge adds exactly one symbol to the code of the parent.
    expect(code.slice(0, -1), `${e.char} hangs from ${e.parent ?? 'ROOT'}`).toBe(parentCode);
    symbols.unshift(code.slice(-1));
  }
  return symbols.join('');
}

describe('the layout of the tree (SPEC §2.2)', () => {
  it('has one place for each letter of the alphabet, and nothing else', () => {
    expect(LAYOUT_V1.nodes.map((e) => e.char).sort()).toEqual(Object.keys(ALPHABET_V1).sort());
  });

  it.each(LAYOUT_V1.nodes)('the path ROOT→$char reproduces its code', (entry) => {
    expect(layoutCode(entry)).toBe(ALPHABET_V1[entry.char]);
  });

  it.each(LAYOUT_V1.nodes)('$char has the shape of its last symbol', (entry) => {
    const last = ALPHABET_V1[entry.char]?.slice(-1);
    // A circle is a dot; a (rounded) rectangle, a dash.
    expect(entry.shape === 'circle' ? '.' : '-').toBe(last);
  });

  it.each(LAYOUT_V1.nodes.filter((e) => e.parent !== null))(
    'the edge to $char is orthogonal and a rectangle follows its direction',
    (entry) => {
      const parent = position(entry.parent);
      const horizontal = parent?.y === entry.y;
      const vertical = parent?.x === entry.x;
      expect(horizontal !== vertical).toBe(true);
      if (entry.shape !== 'circle') expect(entry.shape).toBe(horizontal ? 'rect-h' : 'rect-v');
    },
  );

  it('puts T and E on both sides of the antenna, on the dash and dot side', () => {
    const t = entries.get('T');
    const e = entries.get('E');
    expect(t && t.x < LAYOUT_V1.root.x && e && e.x > LAYOUT_V1.root.x).toBe(true);
  });

  it('puts no two letters in the same place', () => {
    const places = LAYOUT_V1.nodes.map((e) => `${e.x},${e.y}`);
    expect(new Set(places).size).toBe(places.length);
  });
});

describe('the tree', () => {
  it('has a node for each letter, reachable by its code', () => {
    expect(TREE_V1.nodes).toHaveLength(26);
    for (const [char, code] of Object.entries(ALPHABET_V1)) {
      expect(TREE_V1.node(code)?.char).toBe(char);
      expect(TREE_V1.nodeOf(char.toLowerCase())?.code).toBe(code);
    }
  });

  it('links dot and dash children', () => {
    const e = TREE_V1.node('.');
    expect(TREE_V1.root.dot).toBe(e);
    expect(TREE_V1.root.dash?.char).toBe('T');
    expect(e?.dash?.char).toBe('A');
    expect(e?.dash?.parent).toBe(e);
    expect(TREE_V1.node('.-..')?.dot).toBeNull();
  });

  it('has no nodes beyond the letters (SPEC §2.1)', () => {
    expect(TREE_V1.node('..--')).toBeUndefined();
    expect(TREE_V1.node('.....')).toBeUndefined();
    expect(TREE_V1.path('---.')).toBeUndefined();
  });

  it('gives the path from the root, without it', () => {
    const chars = (nodes: MorseNode[] | undefined) => nodes?.map((n) => n.char).join('');
    expect(chars(TREE_V1.path('.-..'))).toBe('EARL');
    expect(chars(TREE_V1.path('--.-'))).toBe('TMGQ');
    expect(TREE_V1.path('')).toEqual([]);
  });

  it('knows the symbol that reaches each node', () => {
    expect(lastSymbol(TREE_V1.root)).toBeNull();
    const l = TREE_V1.nodeOf('L');
    const j = TREE_V1.nodeOf('J');
    expect(l && lastSymbol(l)).toBe('dot');
    expect(j && lastSymbol(j)).toBe('dash');
  });

  it('refuses an alphabet that does not fit the layout', () => {
    expect(() => buildTree({ E: '.', X: '..--' }, LAYOUT_V1)).toThrow(/parent of X/);
    expect(() => buildTree({ E: '.', Ñ: '.-' }, LAYOUT_V1)).toThrow(/no place/);
    const onlyE = { root: { x: 0, y: 0 }, nodes: LAYOUT_V1.nodes.filter((e) => e.char === 'E') };
    expect(() => buildTree({ E: 'x' }, onlyE)).toThrow(/invalid code/);
  });
});
