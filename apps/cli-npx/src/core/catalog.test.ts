import { describe, it, expect } from 'vitest';
import { catalogRawUrl, resolveRepo, fetchCatalog } from './catalog.js';
import type { Catalog } from '@ai-skills/catalog';

describe('catalogRawUrl', () => {
  it('builds the raw githubusercontent URL', () => {
    expect(catalogRawUrl('Aliendreamer', 'ai.skills', 'main')).toBe(
      'https://raw.githubusercontent.com/Aliendreamer/ai.skills/main/catalog.json',
    );
  });
});

describe('resolveRepo', () => {
  it('defaults to Aliendreamer/ai.skills@main', () => {
    expect(resolveRepo({}, {})).toEqual({ owner: 'Aliendreamer', repo: 'ai.skills', ref: 'main' });
  });

  it('honors --repo and --ref', () => {
    expect(resolveRepo({ repo: 'me/fork', ref: 'dev' }, {})).toEqual({
      owner: 'me',
      repo: 'fork',
      ref: 'dev',
    });
  });

  it('reads AI_SKILLS_REPO / AI_SKILLS_REF from the environment', () => {
    expect(resolveRepo({}, { AI_SKILLS_REPO: 'a/b', AI_SKILLS_REF: 'v1' })).toEqual({
      owner: 'a',
      repo: 'b',
      ref: 'v1',
    });
  });

  it('rejects a malformed --repo', () => {
    expect(() => resolveRepo({ repo: 'bad' }, {})).toThrow(/owner\/repo/);
  });
});

describe('fetchCatalog', () => {
  const cat: Catalog = {
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
    ],
  };

  it('fetches and parses a catalog', async () => {
    const fake = async () => ({ ok: true, status: 200, statusText: 'OK', json: async () => cat });
    expect(await fetchCatalog('http://x/catalog.json', fake)).toEqual(cat);
  });

  it('throws on a non-ok response', async () => {
    const fake = async () => ({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({}),
    });
    await expect(fetchCatalog('http://x/catalog.json', fake)).rejects.toThrow();
  });
});
