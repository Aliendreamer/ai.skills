import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as tar from 'tar';

/** Build the GitHub source-tarball URL for a repo at a ref (default `main`). */
export function tarballUrl(owner: string, repo: string, ref = 'main'): string {
  return `https://codeload.github.com/${owner}/${repo}/tar.gz/${ref}`;
}

/**
 * Extract only `subpath` from a GitHub source tarball into `destDir`, stripping the
 * `<topDir>/<subpath>/` prefix so the item's files land directly in `destDir`.
 * `topDir` is the archive's single top-level folder, e.g. `ai.skills-main`.
 */
export async function extractSubpath(
  tarballPath: string,
  topDir: string,
  subpath: string,
  destDir: string,
): Promise<void> {
  const prefix = `${topDir}/${subpath}/`;
  const strip = prefix.split('/').filter(Boolean).length;
  await mkdir(destDir, { recursive: true });
  await tar.x({
    file: tarballPath,
    cwd: destDir,
    strip,
    filter: (path) => path.startsWith(prefix),
  });
}

/**
 * Download the store repo tarball and extract a single item subpath into `destDir`.
 * No `git` required. Network call — not exercised by unit tests.
 */
export async function fetchItem(
  owner: string,
  repo: string,
  ref: string,
  subpath: string,
  destDir: string,
): Promise<void> {
  const url = tarballUrl(owner, repo, ref);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }

  const work = await mkdtemp(join(tmpdir(), 'ai-skills-'));
  const tarballPath = join(work, 'archive.tar.gz');
  try {
    await writeFile(tarballPath, Buffer.from(await res.arrayBuffer()));
    await extractSubpath(tarballPath, `${repo}-${ref}`, subpath, destDir);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}
