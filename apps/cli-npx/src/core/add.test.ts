import { describe, it, expect } from 'vitest';
import { resolveAddTargets, addItems, resolveScope, requireYesFlags } from './add.js';
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
  it('requires --agent with --yes', () => {
    expect(() => requireYesFlags({ yes: true })).toThrow(/agent/i);
  });
  it('accepts --yes when --agent is present', () => {
    expect(() => requireYesFlags({ yes: true, agent: 'claude' })).not.toThrow();
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
      _agent: string,
      _scope: string,
      id: string,
    ): Promise<string> => {
      calls.push(`skill:${id}`);
      return `/dest/${id}`;
    };
    const installPrompt = async (
      _src: string,
      _agent: string,
      _scope: string,
      id: string,
    ): Promise<string> => {
      calls.push(`prompt:${id}`);
      return `/dest/${id}`;
    };

    const results = await addItems(resolveAddTargets(catalog, [], { all: true }), {
      owner: 'o',
      repo: 'r',
      ref: 'main',
      agent: 'claude',
      scope: 'project',
      bases: { project: '/p', home: '/h' },
      fetchItem,
      installSkill,
      installPrompt,
      mkdtemp: async () => '/tmp/x',
    });

    expect(results).toEqual([
      { id: 'a-skill', status: 'installed', dest: '/dest/a-skill' },
      { id: 'b-prompt', status: 'installed', dest: '/dest/b-prompt' },
    ]);
    expect(calls).toContain('skill:a-skill');
    expect(calls).toContain('prompt:b-prompt');
  });

  it('reports a per-item failure without aborting the batch', async () => {
    const installSkill = async () => {
      throw new Error('boom');
    };
    const installPrompt = async () => '/dest/b-prompt';

    const results = await addItems(resolveAddTargets(catalog, [], { all: true }), {
      owner: 'o',
      repo: 'r',
      ref: 'main',
      agent: 'claude',
      scope: 'project',
      bases: { project: '/p', home: '/h' },
      fetchItem: async () => {},
      installSkill,
      installPrompt,
      mkdtemp: async () => '/tmp/x',
    });

    expect(results[0].status).toBe('failed');
    expect(results[0].message).toContain('boom');
    expect(results[1].status).toBe('installed');
  });
});