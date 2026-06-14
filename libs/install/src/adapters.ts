import { join } from 'node:path';

export type Scope = 'project' | 'global';

/** Base directories each scope resolves against. */
export interface Bases {
  /** The current project root (scope `project`). */
  project: string;
  /** The user's home directory (scope `global`). */
  home: string;
}

interface SkillAdapter {
  scopes: Scope[];
  dest: (scope: Scope, id: string, bases: Bases) => string;
}

/** Agents that can receive a skill, and where the skill lands. */
const SKILL_ADAPTERS: Record<string, SkillAdapter> = {
  claude: {
    scopes: ['project', 'global'],
    dest: (scope, id, b) => join(scope === 'project' ? b.project : b.home, '.claude', 'skills', id),
  },
  codex: {
    scopes: ['project', 'global'],
    dest: (scope, id, b) => join(scope === 'project' ? b.project : b.home, '.agents', 'skills', id),
  },
  copilot: {
    scopes: ['project', 'global'],
    dest: (scope, id, b) =>
      scope === 'project'
        ? join(b.project, '.github', 'skills', id)
        : join(b.home, '.copilot', 'skills', id),
  },
  cursor: {
    scopes: ['project'],
    dest: (_scope, id, b) => join(b.project, '.cursor', 'rules', `${id}.mdc`),
  },
};

/** Agents whose skill install is a single `.mdc` file rather than a folder copy. */
export const SINGLE_FILE_AGENTS = new Set(['cursor']);

/** Resolve the on-disk destination for a skill, or throw if unsupported. */
export function resolveSkillDestination(
  agent: string,
  scope: Scope,
  id: string,
  bases: Bases,
): string {
  const adapter = SKILL_ADAPTERS[agent];
  if (!adapter) {
    throw new Error(`Agent "${agent}" does not support skills`);
  }
  if (!adapter.scopes.includes(scope)) {
    throw new Error(`Agent "${agent}" supports ${adapter.scopes.join(', ')} scope only`);
  }
  return adapter.dest(scope, id, bases);
}


export type PromptFormat = 'md' | 'copilot' | 'toml';

interface PromptAdapter {
  scopes: Scope[];
  format: PromptFormat;
  dest: (scope: Scope, id: string, bases: Bases) => string;
}

/** Agents that can receive a prompt, where it lands, and the format to render. */
const PROMPT_ADAPTERS: Record<string, PromptAdapter> = {
  claude: {
    scopes: ['project', 'global'],
    format: 'md',
    dest: (scope, id, b) =>
      join(scope === 'project' ? b.project : b.home, '.claude', 'commands', `${id}.md`),
  },
  codex: {
    scopes: ['global'],
    format: 'md',
    dest: (_scope, id, b) => join(b.home, '.codex', 'prompts', `${id}.md`),
  },
  cursor: {
    scopes: ['project', 'global'],
    format: 'md',
    dest: (scope, id, b) =>
      join(scope === 'project' ? b.project : b.home, '.cursor', 'commands', `${id}.md`),
  },
  copilot: {
    scopes: ['project', 'global'],
    format: 'copilot',
    dest: (scope, id, b) =>
      scope === 'project'
        ? join(b.project, '.github', 'prompts', `${id}.prompt.md`)
        : join(b.home, '.copilot', 'prompts', `${id}.prompt.md`),
  },
  gemini: {
    scopes: ['project', 'global'],
    format: 'toml',
    dest: (scope, id, b) =>
      join(scope === 'project' ? b.project : b.home, '.gemini', 'commands', `${id}.toml`),
  },
};

function promptAdapterFor(agent: string): PromptAdapter {
  const adapter = PROMPT_ADAPTERS[agent];
  if (!adapter) {
    throw new Error(`Agent "${agent}" does not support prompts`);
  }
  return adapter;
}

/** Resolve the on-disk destination for a prompt, or throw if unsupported. */
export function resolvePromptDestination(
  agent: string,
  scope: Scope,
  id: string,
  bases: Bases,
): string {
  const adapter = promptAdapterFor(agent);
  if (!adapter.scopes.includes(scope)) {
    throw new Error(`Agent "${agent}" supports ${adapter.scopes.join(', ')} scope only for prompts`);
  }
  return adapter.dest(scope, id, bases);
}

/** The render format for an agent's prompts. */
export function promptFormat(agent: string): PromptFormat {
  return promptAdapterFor(agent).format;
}
