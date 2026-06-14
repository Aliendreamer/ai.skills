import { describe, it, expect } from 'vitest';
import {
  resolveAddTargets,
  resolveAgents,
  addItems,
  resolveScope,
  requireYesFlags,
  wizardBack,
  WIZARD_STEPS,
  AGENTS,
} from './add.js';
import type { Catalog } from '@ai-skills/catalog';

const catalog: Catalog = {
  entries: [
    {
      id: 'a-skill',
      type: 'skill',
      description: 'd',
      tags: [],
      agents: ['claude'],
      version: '0.1.0',
      path: 'skills/a-skill',
    },
    {
      id: 'b-prompt',
      type: 'prompt',
      description: 'd',
      tags: [],
      agents: ['claude'],
      version: '0.1.0',
      appPattern: 'x',
      path: 'prompts/b-prompt',
    },
  ],
};

describe('resolveAddTargets', () => {
  it('returns entries for known ids', () => {
    expect(resolveAddTargets(catalog, ['a-skill']).map((e) => e.id)).toEqual(['a-skill']);
  });

  it('throws on an unknown id', () => {
    expect(() => resolveAddTargets(catalog, ['nope'])).toThrow(/nope/);
  });

  it('returns all entries with { all: true }', () => {
    expect(resolveAddTargets(catalog, [], { all: true }).map((e) => e.id)).toEqual([
      'a-skill',
      'b-prompt',
    ]);
  });

  it('throws when nothing is selected', () => {
    expect(() => resolveAddTargets(catalog, [])).toThrow();
  });
});

describe('resolveAgents', () => {
  it('returns [] when neither --agent nor --all-agents is given', () => {
    expect(resolveAgents({})).toEqual([]);
  });

  it('parses a comma-separated --agent list', () => {
    expect(resolveAgents({ agent: 'claude,cursor' })).toEqual(['claude', 'cursor']);
  });

  it('trims whitespace and dedupes', () => {
    expect(resolveAgents({ agent: ' claude , cursor , claude ' })).toEqual(['claude', 'cursor']);
  });

  it('expands --all-agents to every supported agent', () => {
    expect(resolveAgents({ allAgents: true })).toEqual([...AGENTS]);
  });

  it('throws on an unknown agent', () => {
    expect(() => resolveAgents({ agent: 'claude,bogus' })).toThrow(/bogus/);
  });
});

describe('wizardBack', () => {
  it('orders the steps type → items → agents → scope', () => {
    expect(WIZARD_STEPS).toEqual(['type', 'items', 'agents', 'scope']);
  });
  it('returns the previous step', () => {
    expect(wizardBack('scope')).toBe('agents');
    expect(wizardBack('agents')).toBe('items');
    expect(wizardBack('items')).toBe('type');
  });
  it('returns null (cancel) from the first step', () => {
    expect(wizardBack('type')).toBeNull();
  });
});

describe('resolveScope / requireYesFlags', () => {
  it('defaults scope to project', () => {
    expect(resolveScope({})).toBe('project');
  });
  it('honors --global', () => {
    expect(resolveScope({ global: true })).toBe('global');
  });
  it('rejects both --project and --global', () => {
    expect(() => resolveScope({ project: true, global: true })).toThrow();
  });
  it('requires at least one agent with --yes', () => {
    expect(() => requireYesFlags({ yes: true, agents: [] })).toThrow(/agent/i);
  });
  it('accepts --yes when agents are present', () => {
    expect(() => requireYesFlags({ yes: true, agents: ['claude'] })).not.toThrow();
  });
});

describe('addItems', () => {
  it('installs skills and prompts via injected seams', async () => {
    const calls: string[] = [];
    const fetchItem = async () => {
      calls.push('fetch');
    };
    const installSkill = async (
      _src: string,
      agent: string,
      _scope: string,
      id: string,
    ): Promise<string> => {
      calls.push(`skill:${id}:${agent}`);
      return `/dest/${agent}/${id}`;
    };
    const installPrompt = async (
      _src: string,
      agent: string,
      _scope: string,
      id: string,
    ): Promise<string> => {
      calls.push(`prompt:${id}:${agent}`);
      return `/dest/${agent}/${id}`;
    };

    const results = await addItems(resolveAddTargets(catalog, [], { all: true }), {
      owner: 'o',
      repo: 'r',
      ref: 'main',
      agents: ['claude'],
      scope: 'project',
      bases: { project: '/p', home: '/h' },
      fetchItem,
      installSkill,
      installPrompt,
      mkdtemp: async () => '/tmp/x',
    });

    expect(results).toEqual([
      { id: 'a-skill', agent: 'claude', status: 'installed', dest: '/dest/claude/a-skill' },
      { id: 'b-prompt', agent: 'claude', status: 'installed', dest: '/dest/claude/b-prompt' },
    ]);
    expect(calls).toContain('skill:a-skill:claude');
    expect(calls).toContain('prompt:b-prompt:claude');
  });

  it('installs each item to every selected agent, fetching once per item', async () => {
    let fetches = 0;
    const fetchItem = async () => {
      fetches += 1;
    };
    const installSkill = async (
      _src: string,
      agent: string,
      _scope: string,
      id: string,
    ): Promise<string> => `/dest/${agent}/${id}`;
    const installPrompt = async (
      _src: string,
      agent: string,
      _scope: string,
      id: string,
    ): Promise<string> => `/dest/${agent}/${id}`;

    const results = await addItems(resolveAddTargets(catalog, ['a-skill']), {
      owner: 'o',
      repo: 'r',
      ref: 'main',
      agents: ['claude', 'cursor'],
      scope: 'project',
      bases: { project: '/p', home: '/h' },
      fetchItem,
      installSkill,
      installPrompt,
      mkdtemp: async () => '/tmp/x',
    });

    expect(fetches).toBe(1);
    expect(results).toEqual([
      { id: 'a-skill', agent: 'claude', status: 'installed', dest: '/dest/claude/a-skill' },
      { id: 'a-skill', agent: 'cursor', status: 'installed', dest: '/dest/cursor/a-skill' },
    ]);
  });

  it('reports a per-item-per-agent failure without aborting the batch', async () => {
    const installSkill = async (_src: string, agent: string): Promise<string> => {
      if (agent === 'cursor') throw new Error('boom');
      return '/dest/claude/a-skill';
    };
    const installPrompt = async () => '/dest/b-prompt';

    const results = await addItems(resolveAddTargets(catalog, ['a-skill']), {
      owner: 'o',
      repo: 'r',
      ref: 'main',
      agents: ['claude', 'cursor'],
      scope: 'project',
      bases: { project: '/p', home: '/h' },
      fetchItem: async () => {},
      installSkill,
      installPrompt,
      mkdtemp: async () => '/tmp/x',
    });

    expect(results[0]).toMatchObject({ id: 'a-skill', agent: 'claude', status: 'installed' });
    expect(results[1]).toMatchObject({ id: 'a-skill', agent: 'cursor', status: 'failed' });
    expect(results[1].message).toContain('boom');
  });
});
