/**
 * Amplify console env vars / Hosting secrets are available in the build
 * environment, but Next.js SSR (Server Actions) does not see them unless
 * they are written to `.env.production` before `next build`.
 *
 * @see https://docs.aws.amazon.com/amplify/latest/userguide/ssr-environment-variables.html
 */
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** Non-secret WMW config + Amplify's injected `secrets` JSON map. */
export const AMPLIFY_SSR_ENV_KEYS = [
  'WMW_SPREADSHEET_ID',
  'WMW_GOOGLE_SA_SECRET_NAME',
  'secrets',
] as const;

export type WriteAmplifySsrEnvResult = {
  writtenKeys: string[];
  skipped: boolean;
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

export function writeAmplifySsrEnvFile(
  env: Record<string, string | undefined> = process.env,
  filePath = '.env.production',
): WriteAmplifySsrEnvResult {
  const lines = buildAmplifySsrEnvLines(env);
  if (lines.length === 0) {
    console.log('write-amplify-ssr-env: no SSR env vars present; skipping');
    return { writtenKeys: [], skipped: true };
  }

  appendFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
  const writtenKeys = lines.map((line) => line.slice(0, line.indexOf('=')));
  console.log(
    `write-amplify-ssr-env: wrote ${writtenKeys.join(', ')} to ${filePath}`,
  );
  return { writtenKeys, skipped: false };
}

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  writeAmplifySsrEnvFile();
}
