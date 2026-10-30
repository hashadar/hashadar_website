import { createClubWithToken, organiserTokenPath, parseClubInput } from './club-admin';
import type { CourtBoardStore } from './store';

export type AdminFailure = {
  ok: false;
  error: 'unauthorised' | 'invalid' | 'unavailable';
};

export type CreateClubResult =
  | { ok: true; clubId: string; organiserPath: string }
  | AdminFailure;

export interface AdminServiceDeps {
  isSiteAdmin: (token: unknown) => Promise<boolean>;
  getStore: () => Promise<Pick<CourtBoardStore, 'createClub'>>;
  now?: () => Date;
}

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
