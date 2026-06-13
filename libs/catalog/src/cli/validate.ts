import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateCatalog, serializeCatalog } from '../generate.js';
import { validateCatalog } from '../validate.js';
import { loadCatalog } from '../load.js';

const root = process.cwd();
const file = join(root, 'catalog.json');

if (!existsSync(file)) {
  console.error(`catalog.json not found at ${file}. Run: nx run catalog:generate-catalog`);
  process.exit(1);
}

let failed = false;

// 1. Structural + referential validation of the committed catalog.
try {
  const catalog = loadCatalog(file);
  const violations = validateCatalog(catalog, root);
  for (const v of violations) {
    console.error(`  - ${v.path}: ${v.message}`);
    failed = true;
  }
} catch (err) {
  console.error((err as Error).message);
  failed = true;
}

// 2. Up-to-date check: the committed file must match a fresh generation.
const fresh = serializeCatalog(generateCatalog(root));
if (fresh !== readFileSync(file, 'utf8')) {
  console.error('catalog.json is out of date. Run: nx run catalog:generate-catalog');
  failed = true;
}

if (failed) process.exit(1);
console.log('catalog.json is valid and up to date.');
