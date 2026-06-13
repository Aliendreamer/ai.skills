import { describe, it, expect } from 'vitest';
import { parseCatalog } from './load.js';
import type { CatalogEntry } from './types.js';

const entry: CatalogEntry = {
  id: 'a-skill',
  type: 'skill',
  description: 'desc',
  tags: [],
  agents: ['claude'],
  version: '0.1.0',
  path: 'skills/a-skill',
};

describe('parseCatalog', () => {
  it('returns a typed catalog for valid in-memory data', () => {
    const data = { entries: [entry] };
    expect(parseCatalog(data)).toEqual(data);
  });

  it('throws when entries is missing', () => {
    expect(() => parseCatalog({})).toThrow();
  });

  it('throws when an entry is structurally invalid', () => {
    expect(() => parseCatalog({ entries: [{ id: 'x' }] })).toThrow();
  });
});
