import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installSkill } from './install.js';

function sourceSkill(): string {
  const dir = mkdtempSync(join(tmpdir(), 'skill-src-'));
  writeFileSync(join(dir, 'SKILL.md'), 'the skill body\n');
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  writeFileSync(join(dir, 'scripts', 'run.sh'), 'echo hi\n');
  return dir;
}

function bases() {
  const project = mkdtempSync(join(tmpdir(), 'proj-'));
  const home = mkdtempSync(join(tmpdir(), 'home-'));
  return { project, home };
}

describe('installSkill', () => {
  it('copies the whole folder for claude and creates parent dirs', async () => {
    const src = sourceSkill();
    const b = bases();
    const dest = await installSkill(src, 'claude', 'project', 'my-skill', b);

    expect(dest).toBe(join(b.project, '.claude', 'skills', 'my-skill'));
    expect(readFileSync(join(dest, 'SKILL.md'), 'utf8')).toBe('the skill body\n');
    expect(existsSync(join(dest, 'scripts', 'run.sh'))).toBe(true);
  });

  it('writes a single .mdc from SKILL.md for cursor', async () => {
    const src = sourceSkill();
    const b = bases();
    const dest = await installSkill(src, 'cursor', 'project', 'my-skill', b);

    expect(dest).toBe(join(b.project, '.cursor', 'rules', 'my-skill.mdc'));
    expect(readFileSync(dest, 'utf8')).toBe('the skill body\n');
    expect(existsSync(join(b.project, '.cursor', 'rules', 'my-skill'))).toBe(false);
  });
});
