import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Catalog, CatalogEntry } from '@ai-skills/catalog';
import {
  fetchItem as realFetchItem,
  installSkill as realInstallSkill,
  installPrompt as realInstallPrompt,
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

/** The agents the CLI can install into. */
export const AGENTS = ['claude', 'codex', 'copilot', 'cursor', 'gemini'] as const;

/** Ordered steps of the interactive `add` wizard. */
export const WIZARD_STEPS = ['type', 'items', 'agents', 'scope'] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

/** The step to return to when going back, or `null` to cancel (back before the first step). */
export function wizardBack(step: WizardStep): WizardStep | null {
  const i = WIZARD_STEPS.indexOf(step);
  return i <= 0 ? null : (WIZARD_STEPS[i - 1] ?? null);
}

/** Resolve target agents from flags: --all-agents, or a comma-separated --agent list. */
export function resolveAgents(flags: { agent?: string; allAgents?: boolean }): string[] {
  if (flags.allAgents) return [...AGENTS];
  if (!flags.agent) return [];

  const names = flags.agent
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const unknown = names.filter((n) => !(AGENTS as readonly string[]).includes(n));
  if (unknown.length > 0) {
    throw new Error(`Unknown agent(s): ${unknown.join(', ')}`);
  }
  return [...new Set(names)];
}

/** Resolve install scope from flags, rejecting contradictory flags. */
export function resolveScope(flags: { project?: boolean; global?: boolean }): Scope {
  if (flags.project && flags.global) {
    throw new Error('Use only one of --project or --global');
  }
  return flags.global ? 'global' : 'project';
}

/** Enforce that --yes is given enough to run non-interactively. */
/** Enforce that --yes is given enough to run non-interactively. */
export function requireYesFlags(flags: { agents: string[]; yes?: boolean }): void {
  if (flags.yes && flags.agents.length === 0) {
    throw new Error('an agent is required with --yes (use --agent or --all-agents)');
  }
}

export interface AddResult {
  id: string;
  agent: string;
  status: 'installed' | 'failed';
  dest?: string;
  message?: string;
}

export interface AddDeps {
  owner: string;
  repo: string;
  ref: string;
  agents: string[];
  scope: Scope;
  bases: Bases;
  fetchItem?: typeof realFetchItem;
  installSkill?: typeof realInstallSkill;
  installPrompt?: typeof realInstallPrompt;
  mkdtemp?: () => Promise<string>;
}

/** Install skill and prompt targets; one item's failure does not abort the batch. */
/** Install each target to every selected agent; one (item, agent) failure does not abort the batch. */
export async function addItems(targets: CatalogEntry[], deps: AddDeps): Promise<AddResult[]> {
  const fetchItem = deps.fetchItem ?? realFetchItem;
  const installSkill = deps.installSkill ?? realInstallSkill;
  const installPrompt = deps.installPrompt ?? realInstallPrompt;
  const makeTmp = deps.mkdtemp ?? (() => mkdtemp(join(tmpdir(), 'ai-skills-add-')));

  const results: AddResult[] = [];
  for (const entry of targets) {
    let tmp: string;
    try {
      tmp = await makeTmp();
      await fetchItem(deps.owner, deps.repo, deps.ref, entry.path, tmp);
    } catch (err) {
      for (const agent of deps.agents) {
        results.push({ id: entry.id, agent, status: 'failed', message: (err as Error).message });
      }
      continue;
    }

    for (const agent of deps.agents) {
      try {
        const dest =
          entry.type === 'prompt'
            ? await installPrompt(tmp, agent, deps.scope, entry.id, entry.description, deps.bases)
            : await installSkill(tmp, agent, deps.scope, entry.id, deps.bases);
        results.push({ id: entry.id, agent, status: 'installed', dest });
      } catch (err) {
        results.push({ id: entry.id, agent, status: 'failed', message: (err as Error).message });
      }
    }
  }
  return results;
}