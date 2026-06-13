import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { generateCatalog, serializeCatalog } from './generate.js';
import { loadCatalog } from './load.js';

const here = dirname(fileURLToPath(import.meta.url));
const sampleRoot = join(here, '__fixtures__', 'sample');

function tmpFile(contents: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'catalog-'));
  const file = join(dir, 'catalog.json');
  writeFileSync(file, contents);
  return file;
}

describe('loadCatalog', () => {
  it('round-trips a generated catalog', () => {
    const cat = generateCatalog(sampleRoot);
    const file = tmpFile(serializeCatalog(cat));
    expect(loadCatalog(file)).toEqual(cat);
  });

  it('throws on a structurally invalid catalog', () => {
    const file = tmpFile(JSON.stringify({ entries: [{ id: 'x' }] }));
    expect(() => loadCatalog(file)).toThrow();
  });
});
