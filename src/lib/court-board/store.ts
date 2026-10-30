/**
 * Persistence seam for Court Board. The rules in this folder are pure; every
 * read and write goes through this interface so tests (and `next dev` with no
 * AWS) run against `createMemoryCourtBoardStore`, and production against the
 * single-table DynamoDB implementation in `dynamo-store.ts`.
 *
 * Invariants the store itself must enforce atomically (conditional writes in
 * DynamoDB), because a double tap or two phones must never break them:
 *
 * - At most one active Host seat per (Session, phoneKey): `addHostSeat`.
 * - At most `maxGuests` active Guest seats per Host seat, and a Guest seat only
 *   while its Host seat is active: `addGuestSeat`.
 * - Cancelling is idempotent: the first cancel wins and later ones change
 *   nothing: `cancelSeat`.
 */
import type {
  CancelledBy,
  ClubRules,
  Penalty,
  PenaltyReason,
  Seat,
  Session,
  Tier,
} from './types';

export interface Club {
  id: string;
  name: string;
  venue: string;
  /** Defaults prefilled for the first Session; later ones copy the last. */
  startTime: string;
  endTime: string;
  rules: ClubRules;
  createdAt: Date;
}

export interface ClubSession extends Session {
  clubId: string;
  venue: string;
}

export interface Player {
  clubId: string;
  phoneKey: string;
  displayName: string;
  /** Last self-declared Tier, prefilled next time. */
  tier: Tier;
  phoneLast3: string;
  /** Null until the Player chooses a PIN, and again after an Organiser reset. */
  pinHash: string | null;
  pinSalt: string | null;
  updatedAt: Date;
}

/** Attempt/lock state for the PIN lockout; see `throttle.ts`. */
export interface ThrottleRecord {
  count: number;
  windowStartMs: number;
  lockedUntilMs: number;
  lockLevel: number;
  lastAttemptMs: number;
}

export interface PenaltyKey {
  phoneKey: string;
  sessionId: string;
  reason: PenaltyReason;
}

export function penaltyKeyOf(p: PenaltyKey): string {
  return `${p.phoneKey}#${p.sessionId}#${p.reason}`;
}

export class DuplicateHostSeatError extends Error {
  constructor() {
    super('This phone number already has a place in this Session');
    this.name = 'DuplicateHostSeatError';
  }
}

export class GuestLimitError extends Error {
  constructor() {
    super('Guest seat limit reached');
    this.name = 'GuestLimitError';
  }
}

export class HostSeatNotActiveError extends Error {
  constructor() {
    super('Host seat is missing or cancelled');
    this.name = 'HostSeatNotActiveError';
  }
}

export class SeatNotFoundError extends Error {
  constructor() {
    super('Seat not found');
    this.name = 'SeatNotFoundError';
  }
}

export class SessionExistsError extends Error {
  constructor() {
    super('Session already exists');
    this.name = 'SessionExistsError';
  }
}

export interface CourtBoardStore {
  // Clubs and Organiser links
  getClub(clubId: string): Promise<Club | null>;
  /** Create a Club together with its first Organiser token hash. */
  createClub(club: Club, organiserTokenHash: string): Promise<void>;
  /** Null when the hash is unknown (rotated away or never issued). */
  getClubIdByOrganiserTokenHash(tokenHash: string): Promise<string | null>;
  /** Delete `oldHash` and add `newHash` for the Club, atomically. */
  rotateOrganiserToken(
    clubId: string,
    oldHash: string,
    newHash: string,
  ): Promise<void>;

  // Players
  getPlayer(clubId: string, phoneKey: string): Promise<Player | null>;
  putPlayer(player: Player): Promise<void>;
  listPlayers(clubId: string): Promise<Player[]>;
  /** Erase a Player's record (a request to be forgotten). No-op if absent. */
  deletePlayer(clubId: string, phoneKey: string): Promise<void>;

  // Sessions
  getSession(sessionId: string): Promise<ClubSession | null>;
  /** Throws `SessionExistsError` if the id is taken. */
  createSession(session: ClubSession): Promise<void>;
  updateSession(
    sessionId: string,
    patch: Partial<Pick<ClubSession, 'status' | 'registerClosedAt'>>,
  ): Promise<void>;
  /** All of a Club's Sessions, oldest first by `localDate`. */
  listSessions(clubId: string): Promise<ClubSession[]>;

  // Seats (soft-cancelled, never deleted)
  /** Every Seat of a Session, cancelled ones included. */
  listSeats(sessionId: string): Promise<Seat[]>;
  /** Throws `DuplicateHostSeatError` if the phoneKey has an active Host seat. */
  addHostSeat(session: ClubSession, seat: Seat): Promise<void>;
  /**
   * Throws `HostSeatNotActiveError` if the Host seat is cancelled or missing and
   * `GuestLimitError` if the Host already holds `maxGuests` active Guest seats.
   * Pass `Infinity` from Top-up.
   */
  addGuestSeat(
    session: ClubSession,
    seat: Seat,
    maxGuests: number,
  ): Promise<void>;
  /**
   * Soft-cancel a Seat; cancelling a Host seat also cancels its Guest seats
   * (`cancelledBy: 'cascade'`, same instant). Returns the Seats this call
   * cancelled; empty when the Seat was already cancelled.
   */
  cancelSeat(
    session: ClubSession,
    seatId: string,
    at: Date,
    by: CancelledBy,
  ): Promise<Seat[]>;
  updateSeat(
    session: ClubSession,
    seatId: string,
    patch: Partial<Pick<Seat, 'name' | 'tier' | 'attended'>>,
  ): Promise<void>;

  // Penalties (Club-wide, keyed by `penaltyKeyOf`)
  listPenalties(clubId: string): Promise<Penalty[]>;
  /** Insert or replace. */
  putPenalty(clubId: string, penalty: Penalty): Promise<void>;
  updatePenalty(
    clubId: string,
    key: PenaltyKey,
    patch: Partial<Pick<Penalty, 'endsAt' | 'clearedAt'>>,
  ): Promise<void>;
  /** Erase a Penalty record. No-op if absent. */
  deletePenalty(clubId: string, key: PenaltyKey): Promise<void>;

  // Abuse limits (short TTL)
  getThrottle(key: string): Promise<ThrottleRecord | null>;
  putThrottle(
    key: string,
    record: ThrottleRecord,
    expiresAt: Date,
  ): Promise<void>;
  /** Atomically add one to a fixed-window counter and return the new count. */
  incrementCounter(
    key: string,
    windowId: string,
    expiresAt: Date,
  ): Promise<number>;
}
