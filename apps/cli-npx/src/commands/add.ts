import { homedir } from 'node:os';
import { checkbox, select } from '@inquirer/prompts';
import pc from 'picocolors';
import type { Scope } from '@ai-skills/install';
import {
  addItems,
  AGENTS,
  requireYesFlags,
  resolveAddTargets,
  resolveAgents,
  resolveScope,
} from '../core/add.js';
import { getCatalog, type StoreOptions } from './shared.js';

export interface AddOptions extends StoreOptions {
  all?: boolean;
  agent?: string;
  allAgents?: boolean;
  project?: boolean;
  global?: boolean;
  yes?: boolean;
}

export async function addCommand(ids: string[], opts: AddOptions): Promise<void> {
  const flagAgents = resolveAgents({ agent: opts.agent, allAgents: opts.allAgents });
  requireYesFlags({ agents: flagAgents, yes: opts.yes });
  if (opts.yes && !opts.all && ids.length === 0) {
    throw new Error('With --yes, specify item id(s) or --all');
  }

  const { catalog, repoRef } = await getCatalog(opts);

  let targets;
  if (opts.all) {
    targets = resolveAddTargets(catalog, [], { all: true });
  } else if (ids.length > 0) {
    targets = resolveAddTargets(catalog, ids);
  } else {
    const type = await select({
      message: 'What to install?',
      choices: [
        { name: 'Skills', value: 'skill' as const },
        { name: 'Prompts', value: 'prompt' as const },
        { name: 'Everything', value: 'all' as const },
      ],
    });
    const pool =
      type === 'all' ? catalog.entries : catalog.entries.filter((e) => e.type === type);
    const chosen = await checkbox({
      message: 'Select items to add',
      choices: pool.map((e) => ({ name: `${e.id} (${e.type})`, value: e.id })),
    });
    targets = resolveAddTargets(catalog, chosen);
  }

  let agents = flagAgents;
  if (agents.length === 0) {
    agents = await checkbox({
      message: 'Select agents',
      choices: AGENTS.map((a) => ({ name: a, value: a })),
    });
    if (agents.length === 0) throw new Error('No agents selected');
  }

  let scope: Scope;
  if (opts.project || opts.global) scope = resolveScope(opts);
  else if (opts.yes) scope = 'project';
  else
    scope = await select({
      message: 'Install scope',
      choices: [
        { name: 'Project (./)', value: 'project' as Scope },
        { name: 'Global (~/)', value: 'global' as Scope },
      ],
    });

  const bases = { project: process.cwd(), home: homedir() };
  const results = await addItems(targets, { ...repoRef, agents, scope, bases });

  for (const r of results) {
    if (r.status === 'installed') {
      console.log(pc.green(`✓ ${r.id} → ${r.agent} (${r.dest})`));
    } else {
      console.log(pc.red(`✗ ${r.id} → ${r.agent}: ${r.message}`));
    }
  }
}
