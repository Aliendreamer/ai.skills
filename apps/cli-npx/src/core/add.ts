import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Catalog, CatalogEntry } from '@ai-skills/catalog';
import {
  fetchItem as realFetchItem,
  installSkill as realInstallSkill,
  type Bases,
  type Scope,
} from '@ai-skills/install';

/** Resolve which catalog entries `add` should target. */
export function resolveAddTargets(
  catalog: Catalog,
  ids: string[],
  opts: { all?: boolean } = {},
): CatalogEntry[] {
  if (opts.all) return [...catalog.entries];
  if (ids.length === 0) throw new Error('No items selected to add');

  const targets: CatalogEntry[] = [];
  const unknown: string[] = [];
  for (const id of ids) {
    const entry = catalog.entries.find((e) => e.id === id);
    if (entry) targets.push(entry);
    else unknown.push(id);
  }
  if (unknown.length > 0) {
    throw new Error(`Unknown item id(s): ${unknown.join(', ')}`);
  }
  return targets;
}

/** Resolve install scope from flags, rejecting contradictory flags. */
export function resolveScope(flags: { project?: boolean; global?: boolean }): Scope {
  if (flags.project && flags.global) {
    throw new Error('Use only one of --project or --global');
  }
  return flags.global ? 'global' : 'project';
}

/** Enforce that --yes is given enough to run non-interactively. */
export function requireYesFlags(flags: { agent?: string; yes?: boolean }): void {
  if (flags.yes && !flags.agent) {
    throw new Error('--agent is required with --yes');
  }
}

export interface AddResult {
  id: string;
  status: 'installed' | 'deferred';
  dest?: string;
}

export interface AddDeps {
  owner: string;
  repo: string;
  ref: string;
  agent: string;
  scope: Scope;
  bases: Bases;
  fetchItem?: typeof realFetchItem;
  installSkill?: typeof realInstallSkill;
  mkdtemp?: () => Promise<string>;
}

/** Install skill targets; prompt-type entries are deferred (not yet supported). */
export async function addSkills(targets: CatalogEntry[], deps: AddDeps): Promise<AddResult[]> {
  const fetchItem = deps.fetchItem ?? realFetchItem;
  const installSkill = deps.installSkill ?? realInstallSkill;
  const makeTmp = deps.mkdtemp ?? (() => mkdtemp(join(tmpdir(), 'ai-skills-add-')));

  const results: AddResult[] = [];
  for (const entry of targets) {
    if (entry.type !== 'skill') {
      results.push({ id: entry.id, status: 'deferred' });
      continue;
    }
    const tmp = await makeTmp();
    await fetchItem(deps.owner, deps.repo, deps.ref, entry.path, tmp);
    const dest = await installSkill(tmp, deps.agent, deps.scope, entry.id, deps.bases);
    results.push({ id: entry.id, status: 'installed', dest });
  }
  return results;
}
