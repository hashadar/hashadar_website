import { randomBytes } from 'node:crypto';
import { generateOrganiserToken, hashOrganiserToken } from './organiser-token';
import { DEFAULT_CLUB_RULES } from './rules';
import type { Club, CourtBoardStore } from './store';

/**
 * Creating a Club, shared by the Site Admin console and the bootstrap script.
 * No `server-only` import: `scripts/court-board-create-club.ts` runs under tsx.
 */

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
export const CLUB_NAME_MAX = 60;
export const CLUB_VENUE_MAX = 80;

export type ClubInput = {
  name: string;
  venue: string;
  /** Session start, 24-hour HH:mm, Europe/London wall-clock. */
  start: string;
  end: string;
};

export type ClubInputResult =
  | { ok: true; input: ClubInput }
  | { ok: false; error: 'invalid' };

/** Validate untrusted input (a Server Action argument) into a ClubInput. */
export function parseClubInput(raw: unknown): ClubInputResult {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'invalid' };
  const { name, venue, start, end } = raw as Record<string, unknown>;
  if (
    typeof name !== 'string' ||
    typeof venue !== 'string' ||
    typeof start !== 'string' ||
    typeof end !== 'string'
  ) {
    return { ok: false, error: 'invalid' };
  }
  const input = {
    name: name.trim(),
    venue: venue.trim(),
    start: start.trim(),
    end: end.trim(),
  };
  if (
    !input.name ||
    input.name.length > CLUB_NAME_MAX ||
    !input.venue ||
    input.venue.length > CLUB_VENUE_MAX ||
    !TIME.test(input.start) ||
    !TIME.test(input.end) ||
    input.end <= input.start
  ) {
    return { ok: false, error: 'invalid' };
  }
  return { ok: true, input };
}

/** 12-character URL-safe id. */
export function generateClubId(): string {
  return randomBytes(9).toString('base64url');
}

export function buildClub(input: ClubInput, id: string, now: Date): Club {
  return {
    id,
    name: input.name,
    venue: input.venue,
    startTime: input.start,
    endTime: input.end,
    rules: DEFAULT_CLUB_RULES,
    createdAt: now,
  };
}

export function organiserTokenPath(token: string): string {
  return `/labs/court-board/o/${token}`;
}

export type CreateClubDeps = {
  store: Pick<CourtBoardStore, 'createClub'>;
  now?: () => Date;
  newClubId?: () => string;
  newToken?: () => string;
};

/** Create the Club; the returned token is the only time it exists in the clear. */
export async function createClubWithToken(
  input: ClubInput,
  deps: CreateClubDeps,
): Promise<{ clubId: string; token: string }> {
  const clubId = (deps.newClubId ?? generateClubId)();
  const token = (deps.newToken ?? generateOrganiserToken)();
  const club = buildClub(input, clubId, (deps.now ?? (() => new Date()))());
  await deps.store.createClub(club, hashOrganiserToken(token));
  return { clubId, token };
}
