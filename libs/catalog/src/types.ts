export const ITEM_TYPES = ['skill', 'prompt'] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const AGENTS = ['claude', 'codex', 'cursor', 'gemini', 'copilot'] as const;
export type Agent = (typeof AGENTS)[number];

/** A single store item (skill or prompt) as exposed in the catalog. */
export interface CatalogEntry {
  /** Unique, kebab-case identifier (mirrors the item's `name` frontmatter). */
  id: string;
  type: ItemType;
  description: string;
  tags: string[];
  agents: Agent[];
  /** Semver version string. */
  version: string;
  /** App pattern slug — required for prompts, absent for skills. */
  appPattern?: string;
  /** POSIX-style path to the item folder, relative to the repo root. */
  path: string;
}

/** The generated catalog: the contract both CLIs consume. */
export interface Catalog {
  entries: CatalogEntry[];
}

/** A single validation problem. */
export interface Violation {
  /** The offending entry path (or '<catalog>' for catalog-level issues). */
  path: string;
  message: string;
}
