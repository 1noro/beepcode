import { describe, expect, it } from 'vitest';
import {
  daysBetween,
  extractLinks,
  labelledDate,
  localTarget,
  section,
  todoMarkers,
  todoState,
} from '../../scripts/docs/lib.ts';

describe('extractLinks', () => {
  it('finds links and images, but not inside code', () => {
    const md = [
      'See [the SPEC](SPEC.md#2-alfabeto) and [web](https://example.org).',
      '<img src="assets/icon/x.png" width="10">',
      '`[not](a-link.md)`',
      '```',
      '[nor](this.md)',
      '```',
    ].join('\n');
    expect(extractLinks(md)).toEqual([
      'SPEC.md#2-alfabeto',
      'https://example.org',
      'assets/icon/x.png',
    ]);
  });
});

describe('localTarget', () => {
  it('keeps local paths without anchor or query', () => {
    expect(localTarget('docs/estado.md#lo-abierto')).toBe('docs/estado.md');
    expect(localTarget('a%20b.md')).toBe('a b.md');
  });

  it('ignores external links and bare anchors', () => {
    expect(localTarget('https://example.org/x.md')).toBeNull();
    expect(localTarget('mailto:someone')).toBeNull();
    expect(localTarget('#top')).toBeNull();
  });
});

describe('estado and cards', () => {
  const estado =
    '**Al día:** 2026-11-20. **Revisada:** 2026-11-01.\n\n## Lo abierto\n\n| x |\n\n## Lo próximo\n\ny';

  it('reads the labelled dates', () => {
    expect(labelledDate(estado, 'Al día')).toBe('2026-11-20');
    expect(labelledDate(estado, 'Revisada')).toBe('2026-11-01');
    expect(labelledDate(estado, 'Nope')).toBeNull();
  });

  it('cuts a section up to the next heading', () => {
    expect(section(estado, 'Lo abierto')?.trim()).toBe('| x |');
    expect(section(estado, 'Lo próximo')?.trim()).toBe('y');
    expect(section(estado, 'Nada')).toBeNull();
  });

  it('reads the state of a card', () => {
    expect(todoState('**Estado:** en curso · **Fase:** F1')).toBe('en curso');
    expect(todoState('**Estado:** cerrado\n')).toBe('cerrado');
    expect(todoState('no state')).toBeNull();
  });

  it('counts days and finds TODO(N) markers', () => {
    expect(daysBetween('2026-11-01', '2026-11-20')).toBe(19);
    expect(todoMarkers('// TODO(2): x\n/* TODO(17) */ TODO without number')).toEqual([2, 17]);
  });
});
