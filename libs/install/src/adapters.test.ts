import { describe, it, expect } from 'vitest';
import { resolveSkillDestination } from './adapters.js';

const bases = { project: '/repo', home: '/home/u' };

describe('resolveSkillDestination', () => {
  it('resolves claude project and global', () => {
    expect(resolveSkillDestination('claude', 'project', 'my-skill', bases)).toBe(
      '/repo/.claude/skills/my-skill',
    );
    expect(resolveSkillDestination('claude', 'global', 'my-skill', bases)).toBe(
      '/home/u/.claude/skills/my-skill',
    );
  });

  it('resolves codex into .agents/skills', () => {
    expect(resolveSkillDestination('codex', 'project', 'my-skill', bases)).toBe(
      '/repo/.agents/skills/my-skill',
    );
    expect(resolveSkillDestination('codex', 'global', 'my-skill', bases)).toBe(
      '/home/u/.agents/skills/my-skill',
    );
  });

  it('resolves copilot (project .github, global ~/.copilot)', () => {
    expect(resolveSkillDestination('copilot', 'project', 'my-skill', bases)).toBe(
      '/repo/.github/skills/my-skill',
    );
    expect(resolveSkillDestination('copilot', 'global', 'my-skill', bases)).toBe(
      '/home/u/.copilot/skills/my-skill',
    );
  });

  it('resolves cursor project to a single .mdc', () => {
    expect(resolveSkillDestination('cursor', 'project', 'my-skill', bases)).toBe(
      '/repo/.cursor/rules/my-skill.mdc',
    );
  });

  it('rejects cursor global scope', () => {
    expect(() => resolveSkillDestination('cursor', 'global', 'my-skill', bases)).toThrow(/project/i);
  });

  it('rejects an agent without a skill adapter', () => {
    expect(() => resolveSkillDestination('gemini', 'project', 'my-skill', bases)).toThrow(
      /skill/i,
    );
  });
});
