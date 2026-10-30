import 'server-only';
import { courtBoardSsrConfig } from '@/lib/court-board/court-board-ssr-config';
import { fetchAmplifyHostingSecret } from '@/lib/wmw/amplify-hosting-secret';

export const COURT_BOARD_PEPPER_SECRET_NAME = 'courtboard.pepper';
const MIN_PEPPER_LENGTH = 16;

type PepperFetcher = (options: {
  secretName: string;
  appId: string;
  region: string;
}) => Promise<string | null>;

let cached: string | null = null;

/** Test hook: forget the cached pepper. */
export function resetCourtBoardPepperCache(): void {
  cached = null;
}

/**
 * The server-side pepper for `phoneKey` and PIN hashing. Local dev reads
 * `COURT_BOARD_PEPPER`; production reads the shared Hosting secret
 * `courtboard.pepper` from SSM through the SSR Compute role. Losing or changing
 * it invalidates every phoneKey and PIN.
 */
export async function getCourtBoardPepper(
  fetcher: PepperFetcher = fetchAmplifyHostingSecret,
): Promise<string> {
  if (cached) return cached;

  const fromEnv = process.env.COURT_BOARD_PEPPER?.trim();
  if (fromEnv) {
    if (fromEnv.length < MIN_PEPPER_LENGTH) {
      throw new Error(
        `COURT_BOARD_PEPPER must be at least ${MIN_PEPPER_LENGTH} characters`,
      );
    }
    cached = fromEnv;
    return cached;
  }

  const fromSsm = (
    await fetcher({
      secretName: COURT_BOARD_PEPPER_SECRET_NAME,
      appId: courtBoardSsrConfig.appId,
      region: courtBoardSsrConfig.region,
    })
  )?.trim();
  if (!fromSsm || fromSsm.length < MIN_PEPPER_LENGTH) {
    throw new Error(
      'Court Board pepper is not configured: set COURT_BOARD_PEPPER locally, or create the Hosting secret courtboard.pepper (see docs/court-board/infra.md)',
    );
  }
  cached = fromSsm;
  return cached;
}
