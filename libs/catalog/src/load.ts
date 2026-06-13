import { readFileSync } from 'node:fs';
import type { Catalog } from './types.js';
import { validateCatalog } from './validate.js';

/**
 * Read and parse `catalog.json`, returning a typed Catalog.
 * Throws if the file is not structurally valid (path existence is NOT checked here).
 */
/**
 * Validate an already-parsed catalog value (e.g. fetched over HTTP) and return a typed Catalog.
 * Throws on structural problems. Path existence is NOT checked here.
 */
export function parseCatalog(data: unknown): Catalog {
  if (!data || typeof data !== 'object' || !Array.isArray((data as Catalog).entries)) {
    throw new Error('expected an object with an "entries" array');
  }

  const catalog = data as Catalog;
  const violations = validateCatalog(catalog);
  if (violations.length > 0) {
    const summary = violations.map((v) => `  - ${v.path}: ${v.message}`).join('\n');
    throw new Error(`invalid entries:\n${summary}`);
  }

  return catalog;
}

export function loadCatalog(file: string): Catalog {
  try {
    return parseCatalog(JSON.parse(readFileSync(file, 'utf8')));
  } catch (err) {
    throw new Error(`Invalid catalog at ${file}: ${(err as Error).message}`);
  }
}
