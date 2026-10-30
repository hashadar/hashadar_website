import 'server-only';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import {
  courtBoardSsrConfig,
  type CourtBoardSsrConfig,
} from '@/lib/court-board/court-board-ssr-config';

/**
 * Server-side proof that the caller is the Site Admin. Server Actions are public
 * HTTP endpoints, so hiding the form behind `/admin` is not access control: the
 * browser sends its Cognito ID token and we verify signature, issuer, audience
 * and expiry here. The user pool is admin-create-only (ADR 0013), so any valid
 * token from it is the Site Admin's.
 */

export type TokenVerifier = { verify: (token: string) => Promise<unknown> };

export type MakeTokenVerifier = (pool: {
  userPoolId: string;
  clientId: string;
}) => TokenVerifier;

const cognitoVerifier: MakeTokenVerifier = ({ userPoolId, clientId }) =>
  CognitoJwtVerifier.create({ userPoolId, clientId, tokenUse: 'id' });

export type IsSiteAdmin = (token: unknown) => Promise<boolean>;

export function createIsSiteAdmin(
  config: Pick<CourtBoardSsrConfig, 'userPoolId' | 'userPoolClientId'>,
  makeVerifier: MakeTokenVerifier = cognitoVerifier,
): IsSiteAdmin {
  const { userPoolId, userPoolClientId } = config;
  // Without a configured pool nobody is the Site Admin (fail closed).
  if (!userPoolId || !userPoolClientId) return async () => false;

  const verifier = makeVerifier({ userPoolId, clientId: userPoolClientId });
  return async (token) => {
    if (typeof token !== 'string' || token.length === 0) return false;
    try {
      await verifier.verify(token);
      return true;
    } catch {
      return false;
    }
  };
}

let cached: IsSiteAdmin | null = null;

/** The verifier for this deployment's user pool, built once per server process. */
export function isSiteAdmin(token: unknown): Promise<boolean> {
  cached ??= createIsSiteAdmin(courtBoardSsrConfig);
  return cached(token);
}
