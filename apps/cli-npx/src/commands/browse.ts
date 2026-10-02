import pc from 'picocolors';
import type { CatalogEntry } from '@ai-skills/catalog';
import { filterEntries, findEntry, parseCategory } from '../core/browse.js';
import { getCatalog, type StoreOptions } from './shared.js';

function line(e: CatalogEntry): string {
  const tag = e.type === 'prompt' ? pc.magenta('prompt') : pc.cyan(`skill/${e.category ?? '-'}`);
  return `${pc.bold(e.id)}  ${tag}  ${pc.dim(e.description)}`;
}

export async function listCommand(
  opts: StoreOptions & { type?: string; agent?: string; category?: string },
): Promise<void> {
  const category = opts.category === undefined ? undefined : parseCategory(opts.category);
  const { catalog } = await getCatalog(opts);
  const rows = filterEntries(catalog, { type: opts.type, agent: opts.agent, category });
  if (rows.length === 0) {
    console.log('No matching items.');
    return;
  }
  for (const e of rows) console.log(line(e));
}

export async function searchCommand(query: string, opts: StoreOptions): Promise<void> {
  const { catalog } = await getCatalog(opts);
  const rows = filterEntries(catalog, { query });
  if (rows.length === 0) {
    console.log(`No items match "${query}".`);
    return;
  }
  for (const e of rows) console.log(line(e));
}

export async function infoCommand(id: string, opts: StoreOptions): Promise<void> {
  const { catalog } = await getCatalog(opts);
  const e = findEntry(catalog, id);
  if (!e) {
    console.error(pc.red(`Unknown item: ${id}`));
    process.exitCode = 1;
    return;
  }
  console.log(pc.bold(e.id));
  console.log(`  type:        ${e.type}`);
  if (e.category) console.log(`  category:    ${e.category}`);
  console.log(`  description: ${e.description}`);
  console.log(`  tags:        ${e.tags.join(', ') || '-'}`);
  console.log(`  agents:      ${e.agents.join(', ')}`);
  console.log(`  version:     ${e.version}`);
  if (e.appPattern) console.log(`  appPattern:  ${e.appPattern}`);
  console.log(`  path:        ${e.path}`);
}
