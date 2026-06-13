import type { Agent, Catalog, CatalogEntry } from '@ai-skills/catalog';

export interface BrowseFilter {
  type?: string;
  agent?: string;
  query?: string;
}

/** Filter catalog entries by type, agent, and a free-text query (id/description/tags). */
export function filterEntries(catalog: Catalog, filter: BrowseFilter = {}): CatalogEntry[] {
  return catalog.entries.filter((e) => {
    if (filter.type && e.type !== filter.type) return false;
    if (filter.agent && !e.agents.includes(filter.agent as Agent)) return false;
    if (filter.query) {
      const haystack = [e.id, e.description, ...e.tags].join(' ').toLowerCase();
      if (!haystack.includes(filter.query.toLowerCase())) return false;
    }
    return true;
  });
}

/** Find a single entry by id. */
export function findEntry(catalog: Catalog, id: string): CatalogEntry | undefined {
  return catalog.entries.find((e) => e.id === id);
}
