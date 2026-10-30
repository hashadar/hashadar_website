import { DEFAULT_CLUB_RULES } from './rules';
import type {
  ClubRules,
  Penalty,
  Seat,
  Session,
  SessionContext,
} from './types';

/**
 * Default Session: Sat 7 Nov 2026, 9:00–11:00 London (GMT). Release is Thu
 * 5 Nov 12:00Z, Top-up Fri 6 Nov 12:00Z, Cutoff Fri 6 Nov 09:00Z.
 */
export function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'sess-1',
    localDate: '2026-11-07',
    startTime: '09:00',
    endTime: '11:00',
    capacity: 25,
    status: 'open',
    registerClosedAt: null,
    ...overrides,
  };
}

export function host(
  id: string,
  createdAt: string,
  overrides: Partial<Seat> = {},
): Seat {
  return {
    id,
    kind: 'host',
    hostSeatId: null,
    phoneKey: `pk-${id}`,
    name: id,
    tier: 'employee',
    createdAt: new Date(createdAt),
    cancelledAt: null,
    cancelledBy: null,
    attended: false,
    ...overrides,
  };
}

export function guest(
  id: string,
  hostSeatId: string,
  createdAt: string,
  overrides: Partial<Seat> = {},
): Seat {
  return {
    id,
    kind: 'guest',
    hostSeatId,
    phoneKey: null,
    name: id,
    tier: 'external',
    createdAt: new Date(createdAt),
    cancelledAt: null,
    cancelledBy: null,
    attended: false,
    ...overrides,
  };
}

export function cancelled(
  seat: Seat,
  at: string,
  by: Seat['cancelledBy'] = 'player',
): Seat {
  return { ...seat, cancelledAt: new Date(at), cancelledBy: by };
}

export function penalty(overrides: Partial<Penalty> = {}): Penalty {
  return {
    phoneKey: 'pk-P',
    sessionId: 'earlier',
    reason: 'late-cancel',
    weeks: 3,
    startsAt: new Date('2026-10-31T09:00:00Z'),
    endsAt: new Date('2026-11-28T00:00:00Z'),
    clearedAt: null,
    ...overrides,
  };
}

export function makeContext(
  seats: Seat[],
  overrides: {
    session?: Partial<Session>;
    penalties?: Penalty[];
    rules?: Partial<ClubRules>;
  } = {},
): SessionContext {
  return {
    session: makeSession(overrides.session),
    seats,
    penalties: overrides.penalties ?? [],
    rules: { ...DEFAULT_CLUB_RULES, ...overrides.rules },
  };
}

export const ids = (seats: readonly Seat[]) => seats.map((s) => s.id);
