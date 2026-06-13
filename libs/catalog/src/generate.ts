import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import type { Agent, Catalog, CatalogEntry, ItemType } from './types.js';

interface Section {
  dir: string;
  file: string;
}

const SECTIONS: Section[] = [
  { dir: 'skills', file: 'SKILL.md' },
  { dir: 'prompts', file: 'PROMPT.md' },
];

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((v) => String(v)) : [];
}

/** Build a CatalogEntry from an item's frontmatter and its POSIX relative path. */
function toEntry(data: Record<string, unknown>, path: string): CatalogEntry {
  const entry: CatalogEntry = {
    id: String(data.name ?? ''),
    type: data.type as ItemType,
    description: String(data.description ?? ''),
    tags: asStringArray(data.tags),
    agents: asStringArray(data.agents) as Agent[],
    version: String(data.version ?? ''),
    path,
  };
  if (data.appPattern !== undefined) {
    entry.appPattern = String(data.appPattern);
  }
  return entry;
}

/** Scan `skills/` and `prompts/` under `root`, returning a catalog sorted by id. */
export function generateCatalog(root: string): Catalog {
  const entries: CatalogEntry[] = [];

  for (const { dir, file } of SECTIONS) {
    const base = join(root, dir);
    if (!existsSync(base)) continue;

    for (const id of readdirSync(base)) {
      const itemDir = join(base, id);
      if (!statSync(itemDir).isDirectory()) continue;

      const mdPath = join(itemDir, file);
      if (!existsSync(mdPath)) continue;

      const data = matter(readFileSync(mdPath, 'utf8')).data as Record<string, unknown>;
      entries.push(toEntry(data, `${dir}/${id}`));
    }
  }

  entries.sort((a, b) => a.id.localeCompare(b.id));
  return { entries };
}

/** Serialize an entry with a fixed key order so diffs stay deterministic. */
function orderEntry(e: CatalogEntry): Record<string, unknown> {
  const ordered: Record<string, unknown> = {
    id: e.id,
    type: e.type,
    description: e.description,
    tags: e.tags,
    agents: e.agents,
    version: e.version,
  };
  if (e.appPattern !== undefined) ordered.appPattern = e.appPattern;
  ordered.path = e.path;
  return ordered;
}

/** Deterministic JSON serialization (stable key order, 2-space indent, trailing newline). */
export function serializeCatalog(catalog: Catalog): string {
  const ordered = { entries: catalog.entries.map(orderEntry) };
  return `${JSON.stringify(ordered, null, 2)}\n`;
}
