import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { generateCatalog, serializeCatalog } from './generate.js';

const here = dirname(fileURLToPath(import.meta.url));
const sampleRoot = join(here, '__fixtures__', 'sample');

describe('generateCatalog', () => {
  it('builds one entry per item, sorted by id, with POSIX relative paths', () => {
    const cat = generateCatalog(sampleRoot);
    expect(cat.entries.map((e) => e.id)).toEqual(['alpha-skill', 'beta-prompt']);

    const skill = cat.entries.find((e) => e.id === 'alpha-skill');
    expect(skill).toMatchObject({
      type: 'skill',
      description: 'An example skill used by catalog tests',
      tags: ['example', 'testing'],
      agents: ['claude', 'codex'],
      version: '0.1.0',
      path: 'skills/alpha-skill',
    });
    expect(skill?.appPattern).toBeUndefined();

    const prompt = cat.entries.find((e) => e.id === 'beta-prompt');
    expect(prompt).toMatchObject({
      type: 'prompt',
      appPattern: 'react-spa',
      path: 'prompts/beta-prompt',
    });
  });

  it('ignores directories without the section file and non-directory entries', () => {
    const cat = generateCatalog(sampleRoot);
    expect(cat.entries.find((e) => e.id === 'no-skill-md')).toBeUndefined();
    expect(cat.entries.find((e) => e.id === 'README')).toBeUndefined();
  });
});

describe('serializeCatalog', () => {
  it('is deterministic and ends with a trailing newline', () => {
    const cat = generateCatalog(sampleRoot);
    const a = serializeCatalog(cat);
    const b = serializeCatalog(cat);
    expect(a).toBe(b);
    expect(a.endsWith('\n')).toBe(true);
  });
});
