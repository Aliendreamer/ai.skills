import type { Catalog } from '@ai-skills/catalog';
import { resolveRepo, catalogRawUrl, fetchCatalog, type RepoRef } from '../core/catalog.js';

export interface StoreOptions {
  repo?: string;
  ref?: string;
}

/** Resolve the store repo and fetch + validate its catalog. */
export async function getCatalog(
  opts: StoreOptions,
): Promise<{ catalog: Catalog; repoRef: RepoRef }> {
  const repoRef = resolveRepo({ repo: opts.repo, ref: opts.ref });
  const catalog = await fetchCatalog(catalogRawUrl(repoRef.owner, repoRef.repo, repoRef.ref));
  return { catalog, repoRef };
}
