import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateCatalog } from './validate.js';
import type { CatalogEntry } from './types.js';

const here = dirname(fileURLToPath(import.meta.url));
const sampleRoot = join(here, '__fixtures__', 'sample');

const skill = (over: Partial<CatalogEntry> = {}): CatalogEntry => ({
  id: 'alpha-skill',
  type: 'skill',
  description: 'desc',
  tags: ['x'],
  agents: ['claude'],
  version: '0.1.0',
  path: 'skills/alpha-skill',
  ...over,
});

describe('validateCatalog', () => {
  it('returns no violations for a valid catalog', () => {
    expect(validateCatalog({ entries: [skill()] }, sampleRoot)).toEqual([]);
  });

  it('rejects duplicate ids', () => {
    const v = validateCatalog({ entries: [skill(), skill()] }, sampleRoot);
    expect(v.some((x) => /duplicate/i.test(x.message))).toBe(true);
  });

  it('rejects non-kebab-case ids', () => {
    const v = validateCatalog({ entries: [skill({ id: 'Alpha_Skill' })] }, sampleRoot);
    expect(v.length).toBeGreaterThan(0);
  });

  it('rejects unknown type', () => {
    const v = validateCatalog(
      { entries: [skill({ type: 'widget' as unknown as CatalogEntry['type'] })] },
      sampleRoot,
    );
    expect(v.length).toBeGreaterThan(0);
  });

  it('rejects unknown agent', () => {
    const v = validateCatalog(
      { entries: [skill({ agents: ['claude', 'bot' as unknown as CatalogEntry['agents'][number]] })] },
      sampleRoot,
    );
    expect(v.length).toBeGreaterThan(0);
  });

  it('rejects invalid semver', () => {
    const v = validateCatalog({ entries: [skill({ version: '1.0' })] }, sampleRoot);
    expect(v.length).toBeGreaterThan(0);
  });

  it('rejects a path that does not exist', () => {
    const v = validateCatalog({ entries: [skill({ path: 'skills/missing' })] }, sampleRoot);
    expect(v.some((x) => /path/i.test(x.message))).toBe(true);
  });

  it('rejects a prompt without appPattern', () => {
    const v = validateCatalog(
      { entries: [skill({ type: 'prompt', path: 'prompts/beta-prompt' })] },
      sampleRoot,
    );
    expect(v.some((x) => /appPattern/i.test(x.message))).toBe(true);
  });

  it('skips path existence when no root is given', () => {
    expect(validateCatalog({ entries: [skill({ path: 'skills/missing' })] })).toEqual([]);
  });
});
