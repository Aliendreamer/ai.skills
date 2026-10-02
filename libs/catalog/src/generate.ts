import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import type { Agent, Catalog, CatalogEntry, ItemType, SkillCategory } from './types.js';

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((v) => String(v)) : [];
}

/** Build a CatalogEntry from an item's frontmatter and its POSIX relative path. */
function toEntry(data: Record<string, unknown>, path: string, category?: string): CatalogEntry {
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
  if (category !== undefined) {
    entry.category = category as SkillCategory;
  }
  return entry;
}

/** Sub-directories of `dir`, by name; empty when `dir` does not exist. */
function subdirs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => statSync(join(dir, name)).isDirectory());
}

/** Read the frontmatter of `<root>/<path>/<file>`, or undefined when the item file is absent. */
function readItem(root: string, path: string, file: string): Record<string, unknown> | undefined {
  const mdPath = join(root, path, file);
  if (!existsSync(mdPath)) return undefined;
  return matter(readFileSync(mdPath, 'utf8')).data as Record<string, unknown>;
}

/**
 * Scan `skills/<category>/<id>/` and `prompts/<id>/` under `root`, returning a catalog sorted by id.
 * Throws when a `SKILL.md` sits directly in `skills/<id>/`, outside a category folder.
 */
export function generateCatalog(root: string): Catalog {
  const entries: CatalogEntry[] = [];

  for (const category of subdirs(join(root, 'skills'))) {
    if (existsSync(join(root, 'skills', category, 'SKILL.md'))) {
      throw new Error(
        `skills/${category} has a SKILL.md but is not inside a category folder - move it to skills/<category>/${category}`,
      );
    }
    for (const id of subdirs(join(root, 'skills', category))) {
      const path = `skills/${category}/${id}`;
      const data = readItem(root, path, 'SKILL.md');
      if (data) entries.push(toEntry(data, path, category));
    }
  }

  for (const id of subdirs(join(root, 'prompts'))) {
    const path = `prompts/${id}`;
    const data = readItem(root, path, 'PROMPT.md');
    if (data) entries.push(toEntry(data, path));
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
  if (e.category !== undefined) ordered.category = e.category;
  ordered.path = e.path;
  return ordered;
}

/** Deterministic JSON serialization (stable key order, 2-space indent, trailing newline). */
export function serializeCatalog(catalog: Catalog): string {
  const ordered = { entries: catalog.entries.map(orderEntry) };
  return `${JSON.stringify(ordered, null, 2)}\n`;
}
