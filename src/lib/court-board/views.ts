/**
 * Serialisable shapes passed from the service to Server Components, Server
 * Actions and the browser. Dates are ISO strings. Nothing here may carry a
 * phone number, phone hash or PIN material to a public page.
 */
import type { CancellationConsequence } from './penalties';
import type { PenaltyReason, Tier } from './types';

export type ErrorCode =
  | 'invalid-input'
  | 'invalid-phone'
  | 'trivial-pin'
  | 'bad-credentials'
  | 'locked'
  | 'slow'
  | 'rate-limited'
  | 'rejected'
  | 'not-found'
  | 'session-closed'
  | 'already-signed-up'
  | 'guest-limit'
  | 'unauthorised';

export type Failure = {
  ok: false;
  error: ErrorCode;
  /** Form field at fault, for `invalid-input`. */
  field?: string;
  retryAfterSeconds?: number;
};

export type Outcome<T = object> = ({ ok: true } & T) | Failure;

// Public Session page

export interface SeatRow {
  id: string;
  kind: 'host' | 'guest';
  name: string;
  /** Guest seats: the Host's name, for "<Host>'s guest: <name>". */
  hostName: string | null;
  // Deliberately no hold/Penalty field: who is on hold is seen only by the
  // Organiser and by that Player themselves, never on the public page.
}

export interface WaitlistView {
  /** Pre-Release Waitlists serve one band; the combined one after Release is null. */
  band: Tier | null;
  rows: SeatRow[];
}

export interface SessionTimes {
  startsAt: string;
  releaseAt: string;
  topUpAt: string;
  cutoffAt: string;
}

export interface SessionSummary {
  id: string;
  localDate: string;
  startTime: string;
  endTime: string;
  venue: string;
  capacity: number;
  status: 'open' | 'cancelled';
  registerClosed: boolean;
}

export interface SessionView {
  clubName: string;
  session: SessionSummary;
  times: SessionTimes;
  now: string;
  released: boolean;
  taken: number;
  playing: SeatRow[];
  waitlists: WaitlistView[];
  /** Guest seats per Player right now; null means unlimited (from Top-up). */
  guestLimit: number | null;
  openForSignup: boolean;
}

// Manage my place

export type ConsequenceView =
  | { kind: 'free-waitlist' }
  | { kind: 'free-before-cutoff'; cutoffAt: string }
  | { kind: 'free-grace'; graceEndsAt: string }
  | { kind: 'free-guest-seat' }
  | { kind: 'penalty'; weeks: number; endsAt: string };

export function toConsequenceView(c: CancellationConsequence): ConsequenceView {
  switch (c.kind) {
    case 'free-before-cutoff':
      return { kind: c.kind, cutoffAt: c.cutoffAt.toISOString() };
    case 'free-grace':
      return { kind: c.kind, graceEndsAt: c.graceEndsAt.toISOString() };
    case 'penalty':
      return { kind: c.kind, weeks: c.weeks, endsAt: c.endsAt.toISOString() };
    default:
      return { kind: c.kind };
  }
}

export interface MySeatView {
  id: string;
  kind: 'host' | 'guest';
  name: string;
  tier: Tier;
  state: 'main' | 'waitlist';
  position: number;
  /** What cancelling this Seat would cost right now. */
  consequence: ConsequenceView;
}

export interface MyPlaceView {
  session: SessionSummary;
  displayName: string;
  tier: Tier;
  seats: MySeatView[];
  /** Guest seats still available to add; null means unlimited. */
  guestsRemaining: number | null;
  holdUntil: string | null;
  /** The PIN was empty after an Organiser reset and has just been set. */
  pinWasSet: boolean;
}

export interface SignUpResult {
  seatId: string;
  state: 'main' | 'waitlist';
  position: number;
  pinWasSet: boolean;
}

export interface CancelResult {
  /** The Penalty this cancellation caused, if any. */
  penalty: { weeks: number; endsAt: string } | null;
}

// Organiser

export interface OrganiserSeatRow {
  id: string;
  kind: 'host' | 'guest';
  name: string;
  tier: Tier;
  hostName: string | null;
  state: 'main' | 'waitlist';
  position: number;
  attended: boolean;
  /** Last three digits of the Host's number, Organiser eyes only. */
  phoneLast3: string | null;
  holdUntil: string | null;
}

export interface HoldRow {
  phoneKey: string;
  sessionId: string;
  reason: PenaltyReason;
  weeks: number;
  endsAt: string;
  displayName: string;
  phoneLast3: string;
}

export interface PlayerRow {
  phoneKey: string;
  displayName: string;
  phoneLast3: string;
  hasPin: boolean;
}

export interface NewSessionDefaults {
  localDate: string;
  startTime: string;
  endTime: string;
  venue: string;
  capacity: number;
}

export interface OrganiserSessionDetail {
  session: SessionSummary;
  times: SessionTimes;
  rows: OrganiserSeatRow[];
  taken: number;
  waiting: number;
  /** Plain text for the WhatsApp group. */
  listText: string;
  signupPath: string;
  /** "Copy this one to +7 days". */
  nextDefaults: NewSessionDefaults;
}

export interface OrganiserOverview {
  club: { name: string; venue: string };
  now: string;
  sessions: SessionSummary[];
  selected: OrganiserSessionDetail | null;
  holds: HoldRow[];
  players: PlayerRow[];
  /** Used when the Club has no Session yet. */
  firstSessionDefaults: NewSessionDefaults;
}

export interface RegisterPreview {
  penalties: Array<{
    displayName: string;
    reason: PenaltyReason;
    weeks: number;
    endsAt: string;
  }>;
  attended: number;
  noShows: number;
}
