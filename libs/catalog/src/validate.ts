import { existsSync } from 'node:fs';
import { join } from 'node:path';
import semver from 'semver';
import { AGENTS, ITEM_TYPES, type Agent, type Catalog, type ItemType, type Violation } from './types.js';

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Validate a catalog, returning a list of violations (empty = valid).
 * When `root` is provided, entry `path`s are checked to exist on disk.
 */
export function validateCatalog(catalog: Catalog, root?: string): Violation[] {
  const violations: Violation[] = [];
  const seen = new Set<string>();

  for (const entry of catalog.entries) {
    const where = entry.path || entry.id || '<entry>';
    const add = (message: string) => violations.push({ path: where, message });

    if (!entry.id) add('missing id');
    else if (!KEBAB.test(entry.id)) add(`id "${entry.id}" is not kebab-case`);

    if (entry.id) {
      if (seen.has(entry.id)) add(`duplicate id "${entry.id}"`);
      seen.add(entry.id);
    }

    if (!ITEM_TYPES.includes(entry.type as ItemType)) add(`invalid type "${entry.type}"`);
    if (!entry.description) add('missing description');
    if (!Array.isArray(entry.tags)) add('tags must be an array');

    if (!Array.isArray(entry.agents) || entry.agents.length === 0) {
      add('agents must be a non-empty array');
    } else {
      for (const agent of entry.agents) {
        if (!AGENTS.includes(agent as Agent)) add(`unknown agent "${agent}"`);
      }
    }

    if (!semver.valid(entry.version)) add(`invalid version "${entry.version}"`);

    if (entry.type === 'prompt' && !entry.appPattern) add('prompt is missing appPattern');

    if (root && entry.path && !existsSync(join(root, entry.path))) {
      add(`path "${entry.path}" does not exist`);
    }
  }

  return violations;
}
