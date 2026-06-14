import { cp, mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  resolvePromptDestination,
  resolveSkillDestination,
  promptFormat,
  SINGLE_FILE_AGENTS,
  type Bases,
  type Scope,
} from './adapters.js';
import { renderPrompt, stripFrontmatter } from './render.js';

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


/**
 * Install a fetched prompt from `sourceDir` (its `PROMPT.md`) into the resolved destination,
 * rendered to the agent's format. `description` comes from the catalog entry.
 * Returns the destination path.
 */
export async function installPrompt(
  sourceDir: string,
  agent: string,
  scope: Scope,
  id: string,
  description: string,
  bases: Bases,
): Promise<string> {
  const dest = resolvePromptDestination(agent, scope, id, bases);
  const raw = await readFile(join(sourceDir, 'PROMPT.md'), 'utf8');
  const contents = renderPrompt(promptFormat(agent), description, stripFrontmatter(raw));
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, contents);
  return dest;
}
