import { describe, it, expect } from 'vitest';
import { filterEntries, findEntry } from './browse.js';
import type { Catalog } from '@ai-skills/catalog';

const catalog: Catalog = {
  entries: [
    {
      id: 'a-skill',
      type: 'skill',
      description: 'commit helper',
      tags: ['git'],
      agents: ['claude'],
      version: '0.1.0',
      path: 'skills/a-skill',
    },
    {
      id: 'b-prompt',
      type: 'prompt',
      description: 'web api starter',
      tags: ['dotnet'],
      agents: ['codex'],
      version: '0.1.0',
      appPattern: 'dotnet-webapi',
      path: 'prompts/b-prompt',
    },
  ],
};

describe('filterEntries', () => {
  it('filters by type', () => {
    expect(filterEntries(catalog, { type: 'skill' }).map((e) => e.id)).toEqual(['a-skill']);
  });

  it('filters by agent', () => {
    expect(filterEntries(catalog, { agent: 'codex' }).map((e) => e.id)).toEqual(['b-prompt']);
  });

  it('matches the query against id, description, and tags', () => {
    expect(filterEntries(catalog, { query: 'git' }).map((e) => e.id)).toEqual(['a-skill']);
    expect(filterEntries(catalog, { query: 'web' }).map((e) => e.id)).toEqual(['b-prompt']);
    expect(filterEntries(catalog, { query: 'b-prompt' }).map((e) => e.id)).toEqual(['b-prompt']);
    expect(filterEntries(catalog, { query: 'zzz' })).toEqual([]);
  });
});

describe('findEntry', () => {
  it('finds a known entry and returns undefined otherwise', () => {
    expect(findEntry(catalog, 'a-skill')?.id).toBe('a-skill');
    expect(findEntry(catalog, 'nope')).toBeUndefined();
  });
});
