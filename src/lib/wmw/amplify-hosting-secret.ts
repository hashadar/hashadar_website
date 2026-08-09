/**
 * Fetch Amplify Hosting secrets from SSM at SSR runtime (compute IAM role).
 * Prefer shared (all-branches) path, then branch path.
 */
import 'server-only';
import {
  GetParameterCommand,
  SSMClient,
  type SSMClientConfig,
} from '@aws-sdk/client-ssm';
import { wmwSsrConfig } from '@/lib/wmw/wmw-ssr-config';

export type FetchAmplifyHostingSecretOptions = {
  secretName?: string;
  appId?: string;
  branch?: string | null;
  region?: string;
  /** Injected for tests. */
  client?: Pick<SSMClient, 'send'>;
};

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

/**
 * Load a Hosting secret SecureString. Tries branch path then shared path.
 * Returns null when missing or when the compute role cannot read SSM.
 */
export async function fetchAmplifyHostingSecret(
  options: FetchAmplifyHostingSecretOptions = {},
): Promise<string | null> {
  const secretName =
    options.secretName?.trim() || wmwSsrConfig.googleSaSecretName;
  const appId = options.appId?.trim() || wmwSsrConfig.appId;
  const region = options.region?.trim() || wmwSsrConfig.region;
  const branch =
    options.branch === undefined
      ? process.env.AWS_BRANCH?.trim() || 'main'
      : options.branch?.trim() || null;

  const candidates: string[] = [];
  if (branch) {
    candidates.push(amplifyBranchSecretParamName(appId, branch, secretName));
  }
  candidates.push(amplifySharedSecretParamName(appId, secretName));

  const client =
    options.client ??
    new SSMClient({
      region,
    } satisfies SSMClientConfig);

  for (const name of candidates) {
    try {
      const response = await client.send(
        new GetParameterCommand({
          Name: name,
          WithDecryption: true,
        }),
      );
      const value = response.Parameter?.Value?.trim();
      if (value) return value;
    } catch {
      /* try next candidate */
    }
  }

  return null;
}
