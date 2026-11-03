import { createClubWithToken, organiserTokenPath, parseClubInput } from './club-admin';
import { generateOrganiserToken, hashOrganiserToken } from './organiser-token';
import type { CourtBoardStore } from './store';
import { isSessionId } from './validation';

export type AdminFailure = {
  ok: false;
  error: 'unauthorised' | 'invalid' | 'not-found' | 'unavailable';
};

export type CreateClubResult =
  | { ok: true; clubId: string; organiserPath: string }
  | AdminFailure;

export interface AdminServiceDeps {
  isSiteAdmin: (token: unknown) => Promise<boolean>;
  getStore: () => Promise<
    Pick<CourtBoardStore, 'createClub' | 'getSession' | 'getClub' | 'replaceOrganiserToken'>
  >;
  now?: () => Date;
  newToken?: () => string;
}

export type ReplaceOrganiserLinkResult =
  | { ok: true; clubName: string; organiserPath: string }
  | AdminFailure;

/**
 * Site Admin creates a Club. Auth first, then input, then the write. The
 * Organiser path contains the only clear copy of the token: it is returned to
 * the caller once and never logged or stored.
 */
export async function createClubAsAdmin(
  deps: AdminServiceDeps,
  idToken: unknown,
  rawInput: unknown,
): Promise<CreateClubResult> {
  if (!(await deps.isSiteAdmin(idToken))) {
    return { ok: false, error: 'unauthorised' };
  }
  const parsed = parseClubInput(rawInput);
  if (!parsed.ok) return parsed;

  try {
    const store = await deps.getStore();
    const { clubId, token } = await createClubWithToken(parsed.input, {
      store,
      now: deps.now,
    });
    return { ok: true, clubId, organiserPath: organiserTokenPath(token) };
  } catch {
    return { ok: false, error: 'unavailable' };
  }
}

const SIGNUP_PATH = /\/labs\/court-board\/s\/([A-Za-z0-9_-]{12})(?:[/?#]|$)/;

/** A Session id from a pasted Signup link (or a bare id), or null. */
export function sessionIdFromSignupLink(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const text = raw.trim();
  if (isSessionId(text)) return text;
  const match = SIGNUP_PATH.exec(text);
  return match ? match[1] : null;
}

/**
 * Site Admin recovery when every Organiser has lost the link. The Club is found
 * through any of its Sessions' Signup links (Clubs are not listable). A new
 * Organiser link is issued and every earlier one, including Organisers'
 * remembered cookies, stops working.
 */
export async function replaceOrganiserLinkAsAdmin(
  deps: AdminServiceDeps,
  idToken: unknown,
  rawInput: unknown,
): Promise<ReplaceOrganiserLinkResult> {
  if (!(await deps.isSiteAdmin(idToken))) {
    return { ok: false, error: 'unauthorised' };
  }
  const sessionId = sessionIdFromSignupLink(
    rawInput && typeof rawInput === 'object'
      ? (rawInput as Record<string, unknown>).signupLink
      : null,
  );
  if (!sessionId) return { ok: false, error: 'invalid' };

  try {
    const store = await deps.getStore();
    const session = await store.getSession(sessionId);
    const club = session ? await store.getClub(session.clubId) : null;
    if (!club) return { ok: false, error: 'not-found' };
    const token = (deps.newToken ?? generateOrganiserToken)();
    await store.replaceOrganiserToken(club.id, hashOrganiserToken(token));
    return { ok: true, clubName: club.name, organiserPath: organiserTokenPath(token) };
  } catch {
    return { ok: false, error: 'unavailable' };
  }
}
