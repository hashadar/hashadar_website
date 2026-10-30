import { londonDateOf } from './format';
import { generateOrganiserToken, hashOrganiserToken } from './organiser-token';
import { registerClosePenalties } from './penalties';
import { computeOrder } from './order';
import {
  fail,
  loadSession,
  loadWithSession,
  newSessionId,
  placeOf,
  seatRow,
  summarise,
  timesOf,
  type LoadedSession,
  type ServiceDeps,
} from './service-core';
import type { Club, ClubSession } from './store';
import { addLocalDays, localToUtc, sessionStartsAt } from './time';
import type { PenaltyReason, Seat, Tier } from './types';
import {
  isLocalDate,
  isLocalTime,
  isSessionId,
  parseCapacity,
  parseGuestTier,
  parseTier,
  cleanName,
} from './validation';
import type {
  HoldRow,
  NewSessionDefaults,
  OrganiserOverview,
  OrganiserSeatRow,
  OrganiserSessionDetail,
  Outcome,
  PlayerRow,
  RegisterPreview,
} from './views';
import { buildWhatsappList } from './whatsapp';

const asRecord = (raw: unknown): Record<string, unknown> =>
  typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};

/**
 * The Club behind an Organiser token, or null. Only the SHA-256 of the token is
 * stored, so a leaked table does not leak Organiser rights.
 */
export async function authenticateOrganiser(
  deps: ServiceDeps,
  token: unknown,
): Promise<Club | null> {
  if (typeof token !== 'string' || token.length < 20 || token.length > 200) {
    return null;
  }
  const clubId = await deps.store.getClubIdByOrganiserTokenHash(hashOrganiserToken(token));
  return clubId ? deps.store.getClub(clubId) : null;
}

async function ownSession(
  deps: ServiceDeps,
  club: Club,
  sessionId: unknown,
): Promise<LoadedSession | null> {
  if (!isSessionId(sessionId)) return null;
  const loaded = await loadSession(deps, sessionId);
  return loaded && loaded.session.clubId === club.id ? loaded : null;
}

function defaultsAfter(session: ClubSession, capacity: number): NewSessionDefaults {
  return {
    localDate: addLocalDays(session.localDate, 7),
    startTime: session.startTime,
    endTime: session.endTime,
    venue: session.venue,
    capacity,
  };
}

function firstDefaults(club: Club, now: Date): NewSessionDefaults {
  // The next Saturday on the London calendar, as a starting suggestion.
  let date = londonDateOf(now);
  for (let i = 0; i < 7; i++) {
    const candidate = addLocalDays(date, i);
    if (new Date(`${candidate}T12:00:00Z`).getUTCDay() === 6) {
      date = candidate;
      break;
    }
  }
  return {
    localDate: date,
    startTime: club.startTime,
    endTime: club.endTime,
    venue: club.venue,
    capacity: club.rules.capacity,
  };
}

/** The Session an Organiser sees first: the next one that has not finished. */
function pickDefaultSession(sessions: ClubSession[], now: Date): ClubSession | null {
  const upcoming = sessions.find(
    (s) => s.status === 'open' && !s.registerClosedAt && sessionStartsAt(s).getTime() > now.getTime() - 12 * 3_600_000,
  );
  return upcoming ?? sessions[sessions.length - 1] ?? null;
}

async function sessionDetail(
  deps: ServiceDeps,
  loaded: LoadedSession,
  origin: string,
): Promise<OrganiserSessionDetail> {
  const { ctx, session } = loaded;
  const now = deps.now();
  const order = computeOrder(ctx, now);
  const players = new Map(
    (await deps.store.listPlayers(session.clubId)).map((p) => [p.phoneKey, p]),
  );

  const toRow = (seat: Seat): OrganiserSeatRow => {
    const place = placeOf(order, seat.id);
    const row = seatRow(ctx, seat, now);
    return {
      id: seat.id,
      kind: seat.kind,
      name: seat.name,
      tier: seat.tier,
      hostName: row.hostName,
      ...place,
      attended: seat.attended,
      phoneLast3:
        seat.kind === 'host' && seat.phoneKey
          ? (players.get(seat.phoneKey)?.phoneLast3 ?? null)
          : null,
      holdUntil: row.holdUntil,
    };
  };

  const waiting = order.waitlists.flatMap((w) => w.seats);
  const signupPath = `/labs/court-board/s/${session.id}`;
  return {
    session: summarise(session),
    times: timesOf(ctx),
    rows: [...order.main, ...waiting].map(toRow),
    taken: order.main.length,
    waiting: waiting.length,
    listText: buildWhatsappList({
      session: summarise(session),
      playing: order.main.map((s) => seatRow(ctx, s, now)),
      waiting: waiting.map((s) => seatRow(ctx, s, now)),
      signupUrl: `${origin}${signupPath}`,
    }),
    signupPath,
    nextDefaults: defaultsAfter(session, session.capacity),
  };
}

/** Everything the Organiser page shows for a Club, with one Session expanded. */
export async function getOrganiserOverview(
  deps: ServiceDeps,
  club: Club,
  options: { sessionId?: string; origin: string },
): Promise<OrganiserOverview> {
  const now = deps.now();
  const sessions = await deps.store.listSessions(club.id);
  const chosen =
    sessions.find((s) => s.id === options.sessionId) ?? pickDefaultSession(sessions, now);
  const loaded = chosen ? await loadWithSession(deps, chosen) : null;

  const [players, penalties] = await Promise.all([
    deps.store.listPlayers(club.id),
    deps.store.listPenalties(club.id),
  ]);
  const byKey = new Map(players.map((p) => [p.phoneKey, p]));
  const holds: HoldRow[] = penalties
    .filter(
      (p) =>
        p.endsAt.getTime() > now.getTime() &&
        !(p.clearedAt && p.clearedAt.getTime() <= now.getTime()),
    )
    .sort((a, b) => a.endsAt.getTime() - b.endsAt.getTime())
    .map((p) => ({
      phoneKey: p.phoneKey,
      sessionId: p.sessionId,
      reason: p.reason,
      weeks: p.weeks,
      endsAt: p.endsAt.toISOString(),
      displayName: byKey.get(p.phoneKey)?.displayName ?? 'Unknown',
      phoneLast3: byKey.get(p.phoneKey)?.phoneLast3 ?? '???',
    }));

  const playerRows: PlayerRow[] = players
    .map((p) => ({
      phoneKey: p.phoneKey,
      displayName: p.displayName,
      phoneLast3: p.phoneLast3,
      hasPin: p.pinHash !== null,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  return {
    club: { name: club.name, venue: club.venue },
    now: now.toISOString(),
    sessions: sessions.map(summarise),
    selected: loaded ? await sessionDetail(deps, loaded, options.origin) : null,
    holds,
    players: playerRows,
    firstSessionDefaults: firstDefaults(club, now),
  };
}

// ----------------------------------------------------------------- Sessions

/** Create a Session, usually by copying the last one forward a week. */
export async function createSession(
  deps: ServiceDeps,
  club: Club,
  raw: unknown,
): Promise<Outcome<{ sessionId: string }>> {
  const input = asRecord(raw);
  if (!isLocalDate(input.localDate)) return fail('invalid-input', { field: 'localDate' });
  if (!isLocalTime(input.startTime)) return fail('invalid-input', { field: 'startTime' });
  if (!isLocalTime(input.endTime) || input.endTime <= input.startTime) {
    return fail('invalid-input', { field: 'endTime' });
  }
  const venue = cleanName(input.venue);
  if (!venue) return fail('invalid-input', { field: 'venue' });
  const capacity = parseCapacity(input.capacity);
  if (!capacity) return fail('invalid-input', { field: 'capacity' });

  const session: ClubSession = {
    id: newSessionId(),
    clubId: club.id,
    localDate: input.localDate,
    startTime: input.startTime,
    endTime: input.endTime,
    venue,
    capacity,
    status: 'open',
    registerClosedAt: null,
  };
  await deps.store.createSession(session);
  return { ok: true, sessionId: session.id };
}

/** Cancel a Session. No Penalties arise from it. */
export async function cancelSession(
  deps: ServiceDeps,
  club: Club,
  raw: unknown,
): Promise<Outcome> {
  const loaded = await ownSession(deps, club, asRecord(raw).sessionId);
  if (!loaded) return fail('not-found');
  if (loaded.session.registerClosedAt) return fail('session-closed');
  await deps.store.updateSession(loaded.session.id, { status: 'cancelled' });
  return { ok: true };
}

// ----------------------------------------------------------------- Seats

/** Remove a Seat (and a Host seat's Guest seats). Never a Penalty. */
export async function removeSeat(
  deps: ServiceDeps,
  club: Club,
  raw: unknown,
): Promise<Outcome> {
  const input = asRecord(raw);
  const loaded = await ownSession(deps, club, input.sessionId);
  if (!loaded) return fail('not-found');
  if (loaded.session.registerClosedAt) return fail('session-closed');
  if (typeof input.seatId !== 'string') return fail('not-found');
  try {
    await deps.store.cancelSeat(loaded.session, input.seatId, deps.now(), 'organiser');
  } catch {
    return fail('not-found');
  }
  return { ok: true };
}

/** Correct a Seat's Tier; the Order recomputes. A Host seat's correction is remembered. */
export async function setSeatTier(
  deps: ServiceDeps,
  club: Club,
  raw: unknown,
): Promise<Outcome> {
  const input = asRecord(raw);
  const loaded = await ownSession(deps, club, input.sessionId);
  if (!loaded) return fail('not-found');
  const seat = loaded.ctx.seats.find((s) => s.id === input.seatId && !s.cancelledAt);
  if (!seat) return fail('not-found');
  const tier: Tier | null =
    seat.kind === 'host' ? parseTier(input.tier) : parseGuestTier(input.tier);
  if (!tier) return fail('invalid-input', { field: 'tier' });

  await deps.store.updateSeat(loaded.session, seat.id, { tier });
  if (seat.kind === 'host' && seat.phoneKey) {
    const player = await deps.store.getPlayer(club.id, seat.phoneKey);
    if (player) await deps.store.putPlayer({ ...player, tier, updatedAt: deps.now() });
  }
  return { ok: true };
}

/** Tick a Seat as here (or not). Only until the register is closed. */
export async function setAttended(
  deps: ServiceDeps,
  club: Club,
  raw: unknown,
): Promise<Outcome> {
  const input = asRecord(raw);
  const loaded = await ownSession(deps, club, input.sessionId);
  if (!loaded) return fail('not-found');
  if (loaded.session.registerClosedAt) return fail('session-closed');
  const seat = loaded.ctx.seats.find((s) => s.id === input.seatId && !s.cancelledAt);
  if (!seat || typeof input.attended !== 'boolean') return fail('not-found');
  await deps.store.updateSeat(loaded.session, seat.id, { attended: input.attended });
  return { ok: true };
}

// ---------------------------------------------------------------- Register

function registerReady(loaded: LoadedSession, now: Date): boolean {
  return (
    loaded.session.status === 'open' &&
    !loaded.session.registerClosedAt &&
    now.getTime() >= sessionStartsAt(loaded.session).getTime()
  );
}

/** What closing the register would do, so the Organiser can confirm the counts. */
export async function previewCloseRegister(
  deps: ServiceDeps,
  club: Club,
  raw: unknown,
): Promise<Outcome<{ preview: RegisterPreview }>> {
  const loaded = await ownSession(deps, club, asRecord(raw).sessionId);
  if (!loaded) return fail('not-found');
  if (!registerReady(loaded, deps.now())) return fail('session-closed');

  const players = new Map(
    (await deps.store.listPlayers(club.id)).map((p) => [p.phoneKey, p]),
  );
  const penalties = registerClosePenalties(loaded.ctx);
  const { main } = computeOrder(loaded.ctx, sessionStartsAt(loaded.session));
  return {
    ok: true,
    preview: {
      penalties: penalties.map((p) => ({
        displayName: players.get(p.phoneKey)?.displayName ?? 'Unknown',
        reason: p.reason,
        weeks: p.weeks,
        endsAt: p.endsAt.toISOString(),
      })),
      attended: main.filter((s) => s.attended).length,
      noShows: main.filter((s) => !s.attended).length,
    },
  };
}

/** Close the register: derive No-shows and write their Penalties. Once only. */
export async function closeRegister(
  deps: ServiceDeps,
  club: Club,
  raw: unknown,
): Promise<Outcome<{ penalties: number }>> {
  const loaded = await ownSession(deps, club, asRecord(raw).sessionId);
  if (!loaded) return fail('not-found');
  if (!registerReady(loaded, deps.now())) return fail('session-closed');

  const penalties = registerClosePenalties(loaded.ctx);
  await deps.store.updateSession(loaded.session.id, { registerClosedAt: deps.now() });
  for (const penalty of penalties) {
    await deps.store.putPenalty(club.id, penalty);
  }
  return { ok: true, penalties: penalties.length };
}

// ------------------------------------------------------------------- Holds

/** Clear a PIN so the Player chooses a new one on their next action. */
export async function resetPin(
  deps: ServiceDeps,
  club: Club,
  raw: unknown,
): Promise<Outcome> {
  const key = asRecord(raw).phoneKey;
  if (typeof key !== 'string') return fail('not-found');
  const player = await deps.store.getPlayer(club.id, key);
  if (!player) return fail('not-found');
  await deps.store.putPlayer({ ...player, pinHash: null, pinSalt: null, updatedAt: deps.now() });
  // Lift any slow-down so the Player can set the new PIN straight away.
  const nowMs = deps.now().getTime();
  await deps.store.putThrottle(
    `pin:global:${key}`,
    { count: 0, windowStartMs: nowMs, lockedUntilMs: 0, lockLevel: 0, lastAttemptMs: 0 },
    new Date(nowMs + 3_600_000),
  );
  return { ok: true };
}

function penaltyKeyFrom(raw: Record<string, unknown>) {
  const reasons: PenaltyReason[] = [
    'late-cancel',
    'late-cancel-guest',
    'no-show-host',
    'no-show-host-and-guest',
    'no-show-guest',
  ];
  const reason = reasons.find((r) => r === raw.reason);
  if (typeof raw.phoneKey !== 'string' || typeof raw.sessionId !== 'string' || !reason) {
    return null;
  }
  return { phoneKey: raw.phoneKey, sessionId: raw.sessionId, reason };
}

export async function clearPenalty(
  deps: ServiceDeps,
  club: Club,
  raw: unknown,
): Promise<Outcome> {
  const key = penaltyKeyFrom(asRecord(raw));
  if (!key) return fail('not-found');
  const exists = (await deps.store.listPenalties(club.id)).some(
    (p) => p.phoneKey === key.phoneKey && p.sessionId === key.sessionId && p.reason === key.reason,
  );
  if (!exists) return fail('not-found');
  await deps.store.updatePenalty(club.id, key, { clearedAt: deps.now() });
  return { ok: true };
}

/** Shorten a Penalty to end at London midnight on a given date. */
export async function shortenPenalty(
  deps: ServiceDeps,
  club: Club,
  raw: unknown,
): Promise<Outcome> {
  const input = asRecord(raw);
  const key = penaltyKeyFrom(input);
  if (!key) return fail('not-found');
  if (!isLocalDate(input.endsOn)) return fail('invalid-input', { field: 'endsOn' });
  const penalty = (await deps.store.listPenalties(club.id)).find(
    (p) => p.phoneKey === key.phoneKey && p.sessionId === key.sessionId && p.reason === key.reason,
  );
  if (!penalty) return fail('not-found');
  const endsAt = localToUtc(input.endsOn, '00:00');
  if (endsAt.getTime() >= penalty.endsAt.getTime()) {
    return fail('invalid-input', { field: 'endsOn' });
  }
  await deps.store.updatePenalty(club.id, key, { endsAt });
  return { ok: true };
}

// ------------------------------------------------------------ Organiser link

/** Replace the Organiser link. The new token is returned once; the old stops working. */
export async function rotateOrganiserLink(
  deps: ServiceDeps,
  club: Club,
  currentToken: string,
): Promise<Outcome<{ token: string }>> {
  const token = generateOrganiserToken();
  await deps.store.rotateOrganiserToken(
    club.id,
    hashOrganiserToken(currentToken),
    hashOrganiserToken(token),
  );
  return { ok: true, token };
}

