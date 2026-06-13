import { cp, mkdir, copyFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { resolveSkillDestination, SINGLE_FILE_AGENTS, type Bases, type Scope } from './adapters.js';

/**
 * Install a fetched skill from `sourceDir` into the resolved destination for `agent`/`scope`.
 * Folder copy for folder-based agents; a single `<id>.mdc` (from `SKILL.md`) for cursor.
 * Returns the destination path.
 */
export async function installSkill(
  sourceDir: string,
  agent: string,
  scope: Scope,
  id: string,
  bases: Bases,
): Promise<string> {
  const dest = resolveSkillDestination(agent, scope, id, bases);

  if (SINGLE_FILE_AGENTS.has(agent)) {
    await mkdir(dirname(dest), { recursive: true });
    await copyFile(join(sourceDir, 'SKILL.md'), dest);
  } else {
    await mkdir(dirname(dest), { recursive: true });
    await cp(sourceDir, dest, { recursive: true });
  }

  return dest;
}
