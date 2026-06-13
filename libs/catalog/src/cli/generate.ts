import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateCatalog, serializeCatalog } from '../generate.js';

const root = process.cwd();
const out = join(root, 'catalog.json');

const catalog = generateCatalog(root);
writeFileSync(out, serializeCatalog(catalog));

console.log(`Wrote ${out} (${catalog.entries.length} entries).`);
