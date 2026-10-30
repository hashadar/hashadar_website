import 'server-only';
import { getServiceDeps } from './request-context';
import { buildRulesView, type RulesView } from './rules-view';
import { isSessionId } from './validation';

/** The Club rules behind a Session link; null (a 404) if the Session or Club is missing. */
export async function loadRulesView(sessionId: string): Promise<RulesView | null> {
  if (!isSessionId(sessionId)) return null;
  const { store } = await getServiceDeps();
  const session = await store.getSession(sessionId);
  if (!session) return null;
  const club = await store.getClub(session.clubId);
  return club ? buildRulesView(club) : null;
}
