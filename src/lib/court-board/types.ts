/** Priority band of a Seat, best first: Employee, then Alumni, then External. */
export type Tier = 'employee' | 'alumni' | 'external';

export const TIER_ORDER: readonly Tier[] = ['employee', 'alumni', 'external'];

export type SeatKind = 'host' | 'guest';

export type CancelledBy = 'player' | 'organiser' | 'cascade';

/**
 * One place in a Session. Soft-cancelled (`cancelledAt`) rather than deleted so
 * the Order at any past instant can be replayed.
 */
export interface Seat {
  id: string;
  kind: SeatKind;
  /** Guest seats only: the Host seat they are attached to. */
  hostSeatId: string | null;
  /** Host seats only: keyed hash of the Player's E.164 number. */
  phoneKey: string | null;
  name: string;
  tier: Tier;
  createdAt: Date;
  cancelledAt: Date | null;
  cancelledBy: CancelledBy | null;
  attended: boolean;
}

export type SessionStatus = 'open' | 'cancelled';

export interface Session {
  id: string;
  /** Europe/London calendar date, `YYYY-MM-DD`. */
  localDate: string;
  /** Europe/London wall-clock start, `HH:mm`. */
  startTime: string;
  endTime: string;
  capacity: number;
  status: SessionStatus;
  registerClosedAt: Date | null;
}

export type PenaltyReason =
  | 'late-cancel'
  | 'late-cancel-guest'
  | 'no-show-host'
  | 'no-show-host-and-guest'
  | 'no-show-guest';

/** A period during which a Player's Host seats sit in the External band. */
export interface Penalty {
  phoneKey: string;
  /** The Session the Penalty arose from. */
  sessionId: string;
  reason: PenaltyReason;
  weeks: number;
  /**
   * Start of the originating Session. A Penalty applies to Sessions that start
   * after this, never to the one it arose from: so replaying that Session's
   * Order before a late cancellation is not rewritten by the Penalty it caused.
   */
  startsAt: Date;
  endsAt: Date;
  clearedAt: Date | null;
}

export interface PenaltyWeeks {
  /** Main-list Seat cancelled after the Cutoff and outside any Grace period. */
  lateCancel: number;
  noShowHost: number;
  noShowHostAndGuest: number;
  noShowGuest: number;
}

/** Club settings. Nothing here is a constant: each Club may differ. */
export interface ClubRules {
  /** Default Capacity for a new Session. */
  capacity: number;
  /** Weekday (0 = Sunday) and `HH:mm` of Release, the latest one at or before start. */
  release: { weekday: number; time: string };
  /** Weekday and `HH:mm` of Top-up, the latest one at or before start. */
  topUp: { weekday: number; time: string };
  /** Cutoff is the Session's start time this many calendar days earlier. */
  cutoffDaysBefore: number;
  graceMinutes: number;
  /** Guest seats per Player before Top-up. */
  guestLimitBeforeTopUp: number;
  penaltyWeeks: PenaltyWeeks;
  /**
   * Weeks of Penalty for late-cancelling only a Guest seat.
   * TODO(court-board): open question in #293. Default is no Penalty (0).
   */
  guestLateCancelWeeks: number;
}

/** Everything the rules need to know about one Session. */
export interface SessionContext {
  session: Session;
  seats: readonly Seat[];
  /** Penalties for the whole Club; each function filters by Player. */
  penalties: readonly Penalty[];
  rules: ClubRules;
}
