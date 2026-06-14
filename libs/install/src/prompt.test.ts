import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolvePromptDestination } from './adapters.js';
import { stripFrontmatter, renderPrompt } from './render.js';
import { installPrompt } from './install.js';

const bases = { project: '/repo', home: '/home/u' };

describe('resolvePromptDestination', () => {
  it('claude project and global', () => {
    expect(resolvePromptDestination('claude', 'project', 'p', bases)).toBe('/repo/.claude/commands/p.md');
    expect(resolvePromptDestination('claude', 'global', 'p', bases)).toBe('/home/u/.claude/commands/p.md');
  });
  it('cursor uses commands', () => {
    expect(resolvePromptDestination('cursor', 'project', 'p', bases)).toBe('/repo/.cursor/commands/p.md');
  });
  it('copilot project and global', () => {
    expect(resolvePromptDestination('copilot', 'project', 'p', bases)).toBe('/repo/.github/prompts/p.prompt.md');
    expect(resolvePromptDestination('copilot', 'global', 'p', bases)).toBe('/home/u/.copilot/prompts/p.prompt.md');
  });
  it('gemini uses toml', () => {
    expect(resolvePromptDestination('gemini', 'project', 'p', bases)).toBe('/repo/.gemini/commands/p.toml');
  });
  it('codex is global only', () => {
    expect(resolvePromptDestination('codex', 'global', 'p', bases)).toBe('/home/u/.codex/prompts/p.md');
    expect(() => resolvePromptDestination('codex', 'project', 'p', bases)).toThrow(/global/i);
  });
  it('rejects an unknown agent', () => {
    expect(() => resolvePromptDestination('foo', 'project', 'p', bases)).toThrow();
  });
});

describe('stripFrontmatter', () => {
  it('strips a leading frontmatter block', () => {
    expect(stripFrontmatter('---\nname: p\ndescription: d\n---\n\nBody here\n')).toBe('Body here\n');
  });
  it('returns content unchanged when there is no frontmatter', () => {
    expect(stripFrontmatter('Just body\n')).toBe('Just body\n');
  });
});

describe('renderPrompt', () => {
  it('md is the body', () => {
    expect(renderPrompt('md', 'desc', 'Body\n')).toBe('Body\n');
  });
  it('copilot carries a description frontmatter', () => {
    const out = renderPrompt('copilot', 'My desc', 'Body\n');
    expect(out.startsWith('---\ndescription: My desc\n---\n')).toBe(true);
    expect(out).toContain('Body');
  });
  it('gemini is toml with escaped description and a prompt block', () => {
    const out = renderPrompt('toml', 'My "q" desc', 'Body\n');
    expect(out).toContain('description = "My \\"q\\" desc"');
    expect(out).toContain('prompt = """');
    expect(out).toContain('Body');
  });
});

describe('installPrompt', () => {
  function source(): string {
    const dir = mkdtempSync(join(tmpdir(), 'prompt-src-'));
    writeFileSync(join(dir, 'PROMPT.md'), '---\nname: p\ndescription: d\ntype: prompt\n---\n\nThe prompt body\n');
    return dir;
  }
  function makeBases() {
    return { project: mkdtempSync(join(tmpdir(), 'proj-')), home: mkdtempSync(join(tmpdir(), 'home-')) };
  }

  it('installs a gemini prompt as toml', async () => {
    const b = makeBases();
    const dest = await installPrompt(source(), 'gemini', 'project', 'p', 'd', b);
    expect(dest).toBe(join(b.project, '.gemini', 'commands', 'p.toml'));
    const out = readFileSync(dest, 'utf8');
    expect(out).toContain('prompt = """');
    expect(out).toContain('The prompt body');
  });

  it('installs a claude prompt as a markdown body', async () => {
    const b = makeBases();
    const dest = await installPrompt(source(), 'claude', 'project', 'p', 'd', b);
    expect(dest).toBe(join(b.project, '.claude', 'commands', 'p.md'));
    expect(readFileSync(dest, 'utf8')).toContain('The prompt body');
  });
});
