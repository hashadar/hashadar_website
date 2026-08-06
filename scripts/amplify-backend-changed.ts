/**
 * Exit 0 when the Amplify Gen 2 backend should redeploy; exit 1 when
 * frontend-only (generate outputs instead of pipeline-deploy).
 *
 * Triggers: amplify/**, or root package.json / package-lock.json changes
 * to Amplify/CDK/@aws-sdk packages used by the backend.
 */
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

/** Package names / prefixes that must force pipeline-deploy. */
export const BACKEND_DEP_MATCHERS = [
  /^@aws-amplify\//,
  /^aws-amplify$/,
  /^aws-cdk(-lib)?$/,
  /^constructs$/,
  /^@aws-sdk\//,
];

type PackageManifest = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
};

type Lockfile = {
  packages?: Record<string, { version?: string }>;
};

export type BackendNeedsDeployOptions = {
  parentRef: string | null;
  headRef?: string;
  changedPaths?: string[];
  headPkg?: PackageManifest | null;
  parentPkg?: PackageManifest | null;
  headLock?: Lockfile | null;
  parentLock?: Lockfile | null;
};

export function isBackendDep(name: string): boolean {
  return BACKEND_DEP_MATCHERS.some((re) => re.test(name));
}

export function relevantDepVersions(
  pkg: PackageManifest,
): Record<string, string> {
  const all = {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
    ...(pkg.optionalDependencies ?? {}),
  };
  const out: Record<string, string> = {};
  for (const [name, version] of Object.entries(all)) {
    if (isBackendDep(name)) out[name] = version;
  }
  return out;
}

export function relevantLockVersions(
  lock: Lockfile,
): Record<string, string | null> {
  const packages = lock.packages ?? {};
  const out: Record<string, string | null> = {};
  for (const [key, meta] of Object.entries(packages)) {
    if (!key.startsWith('node_modules/')) continue;
    const name = key.slice('node_modules/'.length);
    // Skip nested deps under another package's node_modules.
    if (name.includes('/node_modules/')) continue;
    if (!isBackendDep(name)) continue;
    out[name] = meta.version ?? null;
  }
  return out;
}

export function versionsDiffer(
  a: Record<string, string | null>,
  b: Record<string, string | null>,
): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (a[key] !== b[key]) return true;
  }
  return false;
}

function git(
  args: string[],
  { allowFailure = false }: { allowFailure?: boolean } = {},
): string | null {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    if (allowFailure) return null;
    throw error;
  }
}

export function ensureParentCommit(): string | null {
  const parent = git(['rev-parse', '--verify', 'HEAD^'], { allowFailure: true });
  if (parent) return parent;

  const shallow = git(['rev-parse', '--is-shallow-repository'], {
    allowFailure: true,
  });
  if (shallow === 'true') {
    git(['fetch', '--deepen', '2']);
  }

  return git(['rev-parse', '--verify', 'HEAD^'], { allowFailure: true });
}

function showJson(ref: string, file: string): unknown {
  const raw = git(['show', `${ref}:${file}`], { allowFailure: true });
  if (raw == null || raw === '') return null;
  return JSON.parse(raw) as unknown;
}

export function packageFilesForceRedeploy({
  headPkg,
  parentPkg,
  headLock,
  parentLock,
}: {
  headPkg?: PackageManifest | null;
  parentPkg?: PackageManifest | null;
  headLock?: Lockfile | null;
  parentLock?: Lockfile | null;
}): boolean {
  if (
    headPkg &&
    parentPkg &&
    versionsDiffer(relevantDepVersions(headPkg), relevantDepVersions(parentPkg))
  ) {
    return true;
  }
  if (
    headLock &&
    parentLock &&
    versionsDiffer(
      relevantLockVersions(headLock),
      relevantLockVersions(parentLock),
    )
  ) {
    return true;
  }
  return false;
}

export function backendNeedsDeploy({
  parentRef,
  headRef = 'HEAD',
  changedPaths,
  headPkg,
  parentPkg,
  headLock,
  parentLock,
}: BackendNeedsDeployOptions): boolean {
  if (!parentRef) return true;

  const paths =
    changedPaths ??
    (git(['diff', '--name-only', parentRef, headRef]) ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

  if (paths.some((p) => p === 'amplify' || p.startsWith('amplify/'))) {
    return true;
  }

  const packageTouched = paths.some(
    (p) => p === 'package.json' || p === 'package-lock.json',
  );
  if (!packageTouched) return false;

  return packageFilesForceRedeploy({
    headPkg:
      headPkg ?? (showJson(headRef, 'package.json') as PackageManifest | null),
    parentPkg:
      parentPkg ??
      (showJson(parentRef, 'package.json') as PackageManifest | null),
    headLock:
      headLock ?? (showJson(headRef, 'package-lock.json') as Lockfile | null),
    parentLock:
      parentLock ??
      (showJson(parentRef, 'package-lock.json') as Lockfile | null),
  });
}

function main(): void {
  const parentRef = ensureParentCommit();
  if (!parentRef) {
    console.log(
      'amplify-backend-changed: no parent commit; treating backend as changed',
    );
    process.exit(0);
  }

  const needsDeploy = backendNeedsDeploy({ parentRef });
  if (needsDeploy) {
    console.log('amplify-backend-changed: backend redeploy required');
    process.exit(0);
  }

  console.log(
    'amplify-backend-changed: backend unchanged; skip pipeline-deploy',
  );
  process.exit(1);
}

const entryPath = process.argv[1];
const isDirectRun =
  Boolean(entryPath) && import.meta.url === pathToFileURL(entryPath).href;

if (isDirectRun) {
  main();
}
