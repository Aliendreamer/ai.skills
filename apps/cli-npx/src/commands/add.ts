import { homedir } from 'node:os';
import { checkbox, select } from '@inquirer/prompts';
import pc from 'picocolors';
import type { Scope } from '@ai-skills/install';
import { addSkills, requireYesFlags, resolveAddTargets, resolveScope } from '../core/add.js';
import { getCatalog, type StoreOptions } from './shared.js';

const SKILL_AGENTS = ['claude', 'codex', 'copilot', 'cursor'];

export interface AddOptions extends StoreOptions {
  all?: boolean;
  agent?: string;
  project?: boolean;
  global?: boolean;
  yes?: boolean;
}

export async function addCommand(ids: string[], opts: AddOptions): Promise<void> {
  requireYesFlags({ agent: opts.agent, yes: opts.yes });
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
    const chosen = await checkbox({
      message: 'Select items to add',
      choices: catalog.entries.map((e) => ({ name: `${e.id} (${e.type})`, value: e.id })),
    });
    targets = resolveAddTargets(catalog, chosen);
  }

  const agent =
    opts.agent ??
    (await select({
      message: 'Target agent',
      choices: SKILL_AGENTS.map((a) => ({ name: a, value: a })),
    }));

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
  const results = await addSkills(targets, { ...repoRef, agent, scope, bases });

  for (const r of results) {
    if (r.status === 'installed') {
      console.log(pc.green(`✓ ${r.id} → ${r.dest}`));
    } else {
      console.log(pc.yellow(`• ${r.id}: prompt installation isn't supported yet (coming later)`));
    }
  }
}
