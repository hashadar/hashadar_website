import { randomBytes } from 'node:crypto';
import type { Order } from './order';
import { holdEndsAt } from './penalty-window';
import type { Club, ClubSession, CourtBoardStore } from './store';
import { cutoffAt, releaseAt, sessionStartsAt, topUpAt } from './time';
import type { Seat, SessionContext } from './types';
import type {
  Failure,
  SeatRow,
  SessionSummary,
  SessionTimes,
} from './views';

/** Everything the service needs from its environment; injected so tests are pure. */
export interface ServiceDeps {
  store: CourtBoardStore;
  /** Server secret for phone keys and PIN hashes. */
  pepper: string;
  now: () => Date;
  /** Opaque, hashed identifier of the caller's network address. */
  clientKey: string;
}

export const fail = (
  error: Failure['error'],
  extra: Partial<Omit<Failure, 'ok' | 'error'>> = {},
): Failure => ({ ok: false, error, ...extra });

/** 12 random base64url characters: unguessable, though not secret. */
export function newSessionId(): string {
  return randomBytes(9).toString('base64url');
}

export function newSeatId(): string {
  return randomBytes(9).toString('base64url');
}

export interface LoadedSession {
  club: Club;
  session: ClubSession;
  ctx: SessionContext;
}

export async function loadSession(
  deps: ServiceDeps,
  sessionId: string,
): Promise<LoadedSession | null> {
  const session = await deps.store.getSession(sessionId);
  if (!session) return null;
  return loadWithSession(deps, session);
}

export async function loadWithSession(
  deps: ServiceDeps,
  session: ClubSession,
): Promise<LoadedSession | null> {
  const club = await deps.store.getClub(session.clubId);
  if (!club) return null;
  const [seats, penalties] = await Promise.all([
    deps.store.listSeats(session.id),
    deps.store.listPenalties(club.id),
  ]);
  return { club, session, ctx: { session, seats, penalties, rules: club.rules } };
}

export function summarise(session: ClubSession): SessionSummary {
  return {
    id: session.id,
    localDate: session.localDate,
    startTime: session.startTime,
    endTime: session.endTime,
    venue: session.venue,
    capacity: session.capacity,
    status: session.status,
    registerClosed: session.registerClosedAt !== null,
  };
}

export function timesOf(ctx: SessionContext): SessionTimes {
  return {
    startsAt: sessionStartsAt(ctx.session).toISOString(),
    releaseAt: releaseAt(ctx.session, ctx.rules).toISOString(),
    topUpAt: topUpAt(ctx.session, ctx.rules).toISOString(),
    cutoffAt: cutoffAt(ctx.session, ctx.rules).toISOString(),
  };
}

/** Players can take places until the Session starts, unless it is cancelled. */
export function isOpenForSignup(session: ClubSession, now: Date): boolean {
  return (
    session.status === 'open' &&
    session.registerClosedAt === null &&
    now.getTime() < sessionStartsAt(session).getTime()
  );
}

/** Players can change their places until the Organiser closes the register. */
export function isOpenForChanges(session: ClubSession): boolean {
  return session.status === 'open' && session.registerClosedAt === null;
}

export function seatRow(ctx: SessionContext, seat: Seat, now: Date): SeatRow {
  const host =
    seat.kind === 'guest'
      ? ctx.seats.find((s) => s.id === seat.hostSeatId)
      : undefined;
  const holdEnd =
    seat.kind === 'host' && seat.phoneKey
      ? holdEndsAt(ctx.penalties, seat.phoneKey, sessionStartsAt(ctx.session), now)
      : null;
  return {
    id: seat.id,
    kind: seat.kind,
    name: seat.name,
    hostName: host?.name ?? null,
    holdUntil: holdEnd ? holdEnd.toISOString() : null,
  };
}

export function placeOf(
  order: Order,
  seatId: string,
): { state: 'main' | 'waitlist'; position: number } {
  const mainIndex = order.main.findIndex((s) => s.id === seatId);
  if (mainIndex >= 0) return { state: 'main', position: mainIndex + 1 };
  for (const waitlist of order.waitlists) {
    const index = waitlist.seats.findIndex((s) => s.id === seatId);
    if (index >= 0) return { state: 'waitlist', position: index + 1 };
  }
  return { state: 'waitlist', position: 0 };
}

