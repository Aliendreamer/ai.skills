import { parseCatalog, type Catalog } from '@ai-skills/catalog';

const DEFAULT_OWNER = 'Aliendreamer';
const DEFAULT_REPO = 'ai.skills';
const DEFAULT_REF = 'main';

export interface RepoRef {
  owner: string;
  repo: string;
  ref: string;
}

/** Resolve the store repo/ref from flags, then environment, then defaults. */
export function resolveRepo(
  opts: { repo?: string; ref?: string } = {},
  env: Record<string, string | undefined> = process.env,
): RepoRef {
  let owner = DEFAULT_OWNER;
  let repo = DEFAULT_REPO;

  const spec = opts.repo ?? env.AI_SKILLS_REPO;
  if (spec) {
    const [o, r, ...rest] = spec.split('/');
    if (!o || !r || rest.length > 0) {
      throw new Error(`Invalid repo "${spec}"; expected owner/repo`);
    }
    owner = o;
    repo = r;
  }

  const ref = opts.ref ?? env.AI_SKILLS_REF ?? DEFAULT_REF;
  return { owner, repo, ref };
}

/** Build the raw URL of the committed catalog.json. */
export function catalogRawUrl(owner: string, repo: string, ref: string): string {
  return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/catalog.json`;
}

export interface FetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  json: () => Promise<unknown>;
}
export type FetchLike = (url: string) => Promise<FetchResponse>;

/** Fetch and validate the catalog from a raw URL. */
export async function fetchCatalog(
  url: string,
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
): Promise<Catalog> {
  const res = await fetchImpl(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch catalog ${url}: ${res.status} ${res.statusText}`);
  }
  return parseCatalog(await res.json());
}
