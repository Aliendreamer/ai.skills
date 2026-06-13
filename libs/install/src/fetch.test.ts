import { describe, it, expect, beforeAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as tar from 'tar';
import { tarballUrl, extractSubpath } from './fetch.js';

describe('tarballUrl', () => {
  it('builds a codeload URL with a default ref of main', () => {
    expect(tarballUrl('Aliendreamer', 'ai.skills')).toBe(
      'https://codeload.github.com/Aliendreamer/ai.skills/tar.gz/main',
    );
  });

  it('honors an explicit ref', () => {
    expect(tarballUrl('Aliendreamer', 'ai.skills', 'v1.2.3')).toBe(
      'https://codeload.github.com/Aliendreamer/ai.skills/tar.gz/v1.2.3',
    );
  });
});

describe('extractSubpath', () => {
  const topDir = 'ai.skills-main';
  let tarball: string;

  beforeAll(async () => {
    // Build a tarball shaped like a GitHub source archive.
    const root = mkdtempSync(join(tmpdir(), 'src-'));
    const mk = (p: string, body: string) => {
      const full = join(root, p);
      mkdirSync(join(full, '..'), { recursive: true });
      writeFileSync(full, body);
    };
    mk(`${topDir}/skills/my-skill/SKILL.md`, 'wanted skill\n');
    mk(`${topDir}/skills/my-skill/extra.txt`, 'extra\n');
    mk(`${topDir}/skills/other-skill/SKILL.md`, 'other\n');
    mk(`${topDir}/prompts/p/PROMPT.md`, 'prompt\n');

    tarball = join(mkdtempSync(join(tmpdir(), 'tar-')), 'archive.tar.gz');
    await tar.c({ gzip: true, file: tarball, cwd: root }, [topDir]);
  });

  it('extracts only the requested subpath with the prefix stripped', async () => {
    const dest = mkdtempSync(join(tmpdir(), 'dest-'));
    await extractSubpath(tarball, topDir, 'skills/my-skill', dest);

    expect(readFileSync(join(dest, 'SKILL.md'), 'utf8')).toBe('wanted skill\n');
    expect(existsSync(join(dest, 'extra.txt'))).toBe(true);
    expect(existsSync(join(dest, 'other-skill'))).toBe(false);
    expect(existsSync(join(dest, 'skills'))).toBe(false);
  });
});
