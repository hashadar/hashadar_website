/**
 * Amplify console env vars / Hosting secrets are available in the build
 * environment, but Next.js SSR (Server Actions) does not see them unless
 * they are written to `.env.production` before `next build`.
 *
 * Amplify's build-time SSM loader only reads `/amplify/{appId}/{branch}/`.
 * Hosting secrets created for all branches live under
 * `/amplify/shared/{appId}/` and often arrive as an empty `process.env.secrets`
 * map (`{}`). This script seeds the WMW Google SA from shared/branch SSM when
 * missing, then also writes `WMW_GOOGLE_SERVICE_ACCOUNT_JSON` as a top-level
 * env so Next can statically inline `process.env.WMW_*` into Server Actions.
 *
 * @see https://docs.aws.amazon.com/amplify/latest/userguide/ssr-environment-variables.html
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/**
 * WMW SSR keys. Prefer top-level SA JSON — Next inlines static
 * `process.env.WMW_*` access; nested `secrets` alone is easy to miss at runtime.
 */
export const AMPLIFY_SSR_ENV_KEYS = [
  'WMW_SPREADSHEET_ID',
  'WMW_GOOGLE_SA_SECRET_NAME',
  'WMW_GOOGLE_SERVICE_ACCOUNT_JSON',
  'secrets',
] as const;

/** Default Amplify Hosting secret leaf name (must match `[a-zA-Z0-9_.-]+`). */
export const DEFAULT_WMW_GOOGLE_SA_SECRET_NAME = 'wmw.google-service-account';

export type WriteAmplifySsrEnvResult = {
  writtenKeys: string[];
  skipped: boolean;
  seededFrom: string | null;
};

export type FetchSsmSecureString = (name: string) => string | null;

export type WriteAmplifySsrEnvOptions = {
  /** Override SSM fetch (tests). Defaults to `aws ssm get-parameter`. */
  fetchParameter?: FetchSsmSecureString;
};

/**
 * Build dotenv lines. Values are JSON-stringified so nested JSON / newlines
 * in the Amplify `secrets` map stay intact for Next.js env loading.
 */
export function buildAmplifySsrEnvLines(
  env: Record<string, string | undefined>,
  keys: readonly string[] = AMPLIFY_SSR_ENV_KEYS,
): string[] {
  const lines: string[] = [];
  for (const key of keys) {
    const value = env[key];
    if (value === undefined || value === '') continue;
    lines.push(`${key}=${JSON.stringify(value)}`);
  }
  return lines;
}

export function parseAmplifySecretsMap(
  raw: string | undefined,
): Record<string, string> {
  if (!raw?.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string' && value.trim()) {
        out[key] = value;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function amplifySharedSecretParamName(
  appId: string,
  secretName: string,
): string {
  return `/amplify/shared/${appId}/${secretName}`;
}

export function amplifyBranchSecretParamName(
  appId: string,
  branch: string,
  secretName: string,
): string {
  return `/amplify/${appId}/${branch}/${secretName}`;
}

export function fetchSsmSecureStringViaAwsCli(
  name: string,
  exec: typeof execFileSync = execFileSync,
  region =
    process.env.AWS_REGION ||
    process.env.AWS_DEFAULT_REGION ||
    'eu-west-2',
): string | null {
  try {
    const out = exec(
      'aws',
      [
        'ssm',
        'get-parameter',
        '--name',
        name,
        '--with-decryption',
        '--query',
        'Parameter.Value',
        '--output',
        'text',
        '--region',
        region,
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const value = String(out).trim();
    return value && value !== 'None' ? value : null;
  } catch {
    return null;
  }
}

/**
 * If `process.env.secrets` lacks the WMW SA leaf, pull it from Amplify SSM
 * (branch path first, then shared / all-branches).
 */
export function ensureWmwSecretInAmplifySecretsEnv(
  env: Record<string, string | undefined>,
  options?: WriteAmplifySsrEnvOptions,
): {
  env: Record<string, string | undefined>;
  seededFrom: string | null;
  secretName: string;
} {
  const secretName =
    env.WMW_GOOGLE_SA_SECRET_NAME?.trim() || DEFAULT_WMW_GOOGLE_SA_SECRET_NAME;
  const map = parseAmplifySecretsMap(env.secrets);
  if (map[secretName]?.trim()) {
    return { env, seededFrom: null, secretName };
  }

  const appId = env.AWS_APP_ID?.trim();
  const branch = env.AWS_BRANCH?.trim();
  const fetchParameter =
    options?.fetchParameter ?? fetchSsmSecureStringViaAwsCli;

  const candidates: string[] = [];
  if (appId && branch) {
    candidates.push(amplifyBranchSecretParamName(appId, branch, secretName));
  }
  if (appId) {
    candidates.push(amplifySharedSecretParamName(appId, secretName));
  }

  for (const paramName of candidates) {
    const value = fetchParameter(paramName)?.trim();
    if (!value) continue;
    map[secretName] = value;
    return {
      env: { ...env, secrets: JSON.stringify(map) },
      seededFrom: paramName,
      secretName,
    };
  }

  return { env, seededFrom: null, secretName };
}

/**
 * Promote the SA leaf into `WMW_GOOGLE_SERVICE_ACCOUNT_JSON` so Server Actions
 * can use static `process.env.WMW_GOOGLE_SERVICE_ACCOUNT_JSON` (Next inlines it).
 */
export function flattenWmwServiceAccountJsonEnv(
  env: Record<string, string | undefined>,
  secretName: string = DEFAULT_WMW_GOOGLE_SA_SECRET_NAME,
): Record<string, string | undefined> {
  if (env.WMW_GOOGLE_SERVICE_ACCOUNT_JSON?.trim()) return env;
  const fromMap = parseAmplifySecretsMap(env.secrets)[secretName]?.trim();
  if (!fromMap) return env;
  return { ...env, WMW_GOOGLE_SERVICE_ACCOUNT_JSON: fromMap };
}

export function writeAmplifySsrEnvFile(
  env: Record<string, string | undefined> = process.env,
  filePath = '.env.production',
  options?: WriteAmplifySsrEnvOptions,
): WriteAmplifySsrEnvResult {
  const {
    env: seededEnv,
    seededFrom,
    secretName,
  } = ensureWmwSecretInAmplifySecretsEnv(env, options);

  const resolvedEnv = flattenWmwServiceAccountJsonEnv(seededEnv, secretName);

  if (seededFrom) {
    console.log(
      `write-amplify-ssr-env: seeded ${secretName} from SSM ${seededFrom}`,
    );
  } else {
    const hasSa = Boolean(
      parseAmplifySecretsMap(resolvedEnv.secrets)[secretName]?.trim() ||
        resolvedEnv.WMW_GOOGLE_SERVICE_ACCOUNT_JSON?.trim(),
    );
    console.log(
      `write-amplify-ssr-env: secrets map ${hasSa ? 'already has' : 'missing'} ${secretName}`,
    );
  }

  if (resolvedEnv.WMW_GOOGLE_SERVICE_ACCOUNT_JSON?.trim()) {
    console.log(
      'write-amplify-ssr-env: including WMW_GOOGLE_SERVICE_ACCOUNT_JSON for Next static env inline',
    );
  }

  const lines = buildAmplifySsrEnvLines(resolvedEnv);
  if (lines.length === 0) {
    console.log('write-amplify-ssr-env: no SSR env vars present; skipping');
    return { writtenKeys: [], skipped: true, seededFrom };
  }

  appendFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
  const writtenKeys = lines.map((line) => line.slice(0, line.indexOf('=')));
  console.log(
    `write-amplify-ssr-env: wrote ${writtenKeys.join(', ')} to ${filePath}`,
  );
  return { writtenKeys, skipped: false, seededFrom };
}

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  writeAmplifySsrEnvFile();
}
