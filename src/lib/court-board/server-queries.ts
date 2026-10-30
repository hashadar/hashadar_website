import 'server-only';
import { currentNow, devClockOffsetMs, isDevelopment } from './dev-clock';
import {
  DEV_ORGANISER_TOKEN,
  DEV_PLAYER,
  DEV_SESSION_ID,
} from './dev-seed';
import { authenticateOrganiser, getOrganiserOverview } from './organiser-service';
import { getSessionView } from './player-service';
import {
  getOrganiserToken,
  getRequestOrigin,
  getServiceDeps,
} from './request-context';
import { getCourtBoardRuntime } from './store-provider';
import type { OrganiserOverview, SessionView } from './views';

/** The public Session page's data; null renders a 404. */
export async function loadSessionView(sessionId: string): Promise<SessionView | null> {
  return getSessionView(await getServiceDeps(), sessionId);
}

/** The Organiser page's data; null when the cookie is missing or no longer valid. */
export async function loadOrganiserOverview(
  sessionId?: string,
): Promise<OrganiserOverview | null> {
  const deps = await getServiceDeps();
  const club = await authenticateOrganiser(deps, await getOrganiserToken());
  if (!club) return null;
  return getOrganiserOverview(deps, club, {
    sessionId,
    origin: await getRequestOrigin(),
  });
}

/** Verify a link's token (for the cookie exchange). */
export async function isValidOrganiserToken(token: string): Promise<boolean> {
  const club = await authenticateOrganiser(await getServiceDeps(), token);
  return club !== null;
}

export interface DevInfo {
  organiserTokenPath: string;
  sessionPath: string;
  player: { name: string; phone: string; pin: string };
  nowIso: string;
  offsetMs: number;
  /** Moments around the demo Session worth jumping the clock to. */
  presets: Array<{ label: string; iso: string }>;
}

const HOUR_MS = 3_600_000;

/** Local-demo helpers; null unless running `next dev` on the in-memory store. */
export async function getDevInfo(): Promise<DevInfo | null> {
  if (!isDevelopment()) return null;
  const { mode } = await getCourtBoardRuntime();
  if (mode !== 'memory') return null;

  const view = await getSessionView(await getServiceDeps(), DEV_SESSION_ID);
  const at = (iso: string, deltaMs: number) =>
    new Date(new Date(iso).getTime() + deltaMs).toISOString();
  const presets = view
    ? [
        { label: 'Before Release', iso: at(view.times.releaseAt, -HOUR_MS) },
        { label: 'Just after Release', iso: at(view.times.releaseAt, 60_000) },
        { label: 'An hour before the Cutoff', iso: at(view.times.cutoffAt, -HOUR_MS) },
        { label: 'An hour after the Cutoff', iso: at(view.times.cutoffAt, HOUR_MS) },
        { label: 'Just after Top-up', iso: at(view.times.topUpAt, 60_000) },
        { label: 'Half an hour into the Session', iso: at(view.times.startsAt, HOUR_MS / 2) },
      ]
    : [];

  return {
    organiserTokenPath: `/labs/court-board/o/${DEV_ORGANISER_TOKEN}`,
    sessionPath: `/labs/court-board/s/${DEV_SESSION_ID}`,
    player: DEV_PLAYER,
    nowIso: currentNow().toISOString(),
    offsetMs: devClockOffsetMs(),
    presets,
  };
}
