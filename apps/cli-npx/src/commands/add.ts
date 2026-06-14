import { homedir } from 'node:os';
import { checkbox, select } from '@inquirer/prompts';
import pc from 'picocolors';
import type { Catalog, CatalogEntry } from '@ai-skills/catalog';
import type { Scope } from '@ai-skills/install';
import {
  addItems,
  AGENTS,
  requireYesFlags,
  resolveAddTargets,
  resolveAgents,
  resolveScope,
  wizardBack,
  WIZARD_STEPS,
  type WizardStep,
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

const BACK = Symbol('back');

interface Picked {
  targets: CatalogEntry[];
  agents: string[];
  scope: Scope;
}

export async function addCommand(ids: string[], opts: AddOptions): Promise<void> {
  const flagAgents = resolveAgents({ agent: opts.agent, allAgents: opts.allAgents });
  requireYesFlags({ agents: flagAgents, yes: opts.yes });
  if (opts.yes && !opts.all && ids.length === 0) {
    throw new Error('With --yes, specify item id(s) or --all');
  }

  const { catalog, repoRef } = await getCatalog(opts);
  const bases = { project: process.cwd(), home: homedir() };

  let picked: Picked | null;
  if (!opts.all && ids.length === 0) {
    picked = await runWizard(catalog, flagAgents, opts);
    if (!picked) {
      console.log(pc.dim('Cancelled — nothing installed.'));
      return;
    }
  } else {
    const targets = opts.all
      ? resolveAddTargets(catalog, [], { all: true })
      : resolveAddTargets(catalog, ids);
    let agents = flagAgents;
    if (agents.length === 0) {
      agents = await checkbox({
        message: 'Select agents',
        choices: AGENTS.map((a) => ({ name: a, value: a })),
      });
      if (agents.length === 0) throw new Error('No agents selected');
    }
    const scope =
      opts.project || opts.global ? resolveScope(opts) : opts.yes ? 'project' : await promptScope();
    picked = { targets, agents, scope };
  }

  const results = await addItems(picked.targets, { ...repoRef, agents: picked.agents, scope: picked.scope, bases });
  for (const r of results) {
    if (r.status === 'installed') {
      console.log(pc.green(`✓ ${r.id} → ${r.agent} (${r.dest})`));
    } else {
      console.log(pc.red(`✗ ${r.id} → ${r.agent}: ${r.message}`));
    }
  }
}

/** Interactive type → items → agents → scope wizard with one-step back navigation. */
async function runWizard(catalog: Catalog, flagAgents: string[], opts: AddOptions): Promise<Picked | null> {
  const scopeFromFlags: Scope | null =
    opts.project || opts.global ? resolveScope(opts) : opts.yes ? 'project' : null;

  const active = new Set<WizardStep>(['type', 'items']);
  if (flagAgents.length === 0) active.add('agents');
  if (scopeFromFlags === null) active.add('scope');

  const prevActive = (step: WizardStep): WizardStep | null => {
    let s = wizardBack(step);
    while (s && !active.has(s)) s = wizardBack(s);
    return s;
  };
  const nextActive = (step: WizardStep): WizardStep | null => {
    for (let i = WIZARD_STEPS.indexOf(step) + 1; i < WIZARD_STEPS.length; i++) {
      const s = WIZARD_STEPS[i];
      if (s && active.has(s)) return s;
    }
    return null;
  };

  let step: WizardStep = 'type';
  let type: 'skill' | 'prompt' | 'all' = 'all';
  let itemIds: string[] = [];
  let agents: string[] = flagAgents;
  let scope: Scope | null = scopeFromFlags;

  for (;;) {
    if (step === 'type') {
      const ans = await select<'skill' | 'prompt' | 'all' | typeof BACK>({
        message: 'What to install?',
        choices: [
          { name: 'Skills', value: 'skill' },
          { name: 'Prompts', value: 'prompt' },
          { name: 'Everything', value: 'all' },
          { name: '✕ Cancel', value: BACK },
        ],
      });
      if (ans === BACK) return null;
      type = ans;
      const n = nextActive('type');
      if (!n) break;
      step = n;
    } else if (step === 'items') {
      const pool = type === 'all' ? catalog.entries : catalog.entries.filter((e) => e.type === type);
      const chosen = await checkbox({
        message: 'Select items to add (submit nothing to go back)',
        choices: pool.map((e) => ({
          name: `${e.id} (${e.type})`,
          value: e.id,
          checked: itemIds.includes(e.id),
        })),
      });
      if (chosen.length === 0) {
        step = prevActive('items') as WizardStep;
        continue;
      }
      itemIds = chosen;
      const n = nextActive('items');
      if (!n) break;
      step = n;
    } else if (step === 'agents') {
      const chosen = await checkbox({
        message: 'Select agents (submit nothing to go back)',
        choices: AGENTS.map((a) => ({ name: a, value: a, checked: agents.includes(a) })),
      });
      if (chosen.length === 0) {
        step = prevActive('agents') as WizardStep;
        continue;
      }
      agents = chosen;
      const n = nextActive('agents');
      if (!n) break;
      step = n;
    } else {
      const ans = await select<Scope | typeof BACK>({
        message: 'Install scope',
        choices: [
          { name: 'Project (./)', value: 'project' as Scope },
          { name: 'Global (~/)', value: 'global' as Scope },
          { name: '← Back', value: BACK },
        ],
      });
      if (ans === BACK) {
        step = prevActive('scope') as WizardStep;
        continue;
      }
      scope = ans;
      break;
    }
  }

  return { targets: resolveAddTargets(catalog, itemIds), agents, scope: scope as Scope };
}

function promptScope(): Promise<Scope> {
  return select({
    message: 'Install scope',
    choices: [
      { name: 'Project (./)', value: 'project' as Scope },
      { name: 'Global (~/)', value: 'global' as Scope },
    ],
  });
}
