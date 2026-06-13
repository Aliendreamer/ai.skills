import { readFileSync } from 'node:fs';
import type { Catalog } from './types.js';
import { validateCatalog } from './validate.js';

/**
 * Read and parse `catalog.json`, returning a typed Catalog.
 * Throws if the file is not structurally valid (path existence is NOT checked here).
 */
export function loadCatalog(file: string): Catalog {
  const raw = JSON.parse(readFileSync(file, 'utf8')) as unknown;

  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as Catalog).entries)) {
    throw new Error(`Invalid catalog at ${file}: expected an object with an "entries" array`);
  }

  const catalog = raw as Catalog;
  const violations = validateCatalog(catalog);
  if (violations.length > 0) {
    const summary = violations.map((v) => `  - ${v.path}: ${v.message}`).join('\n');
    throw new Error(`Invalid catalog at ${file}:\n${summary}`);
  }

  return catalog;
}
