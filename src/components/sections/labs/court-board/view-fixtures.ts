import type {
  MyPlaceView,
  MySeatView,
  SeatRow,
  SessionView,
} from '@/lib/court-board/views';

/**
 * Sat 7 Nov 2026, 9:00–11:00 (GMT). Release Thu 5 Nov 12:00, Top-up Fri 6 Nov
 * 12:00, Cutoff Fri 6 Nov 9:00. `now` defaults to before Release.
 */
export function makeView(overrides: Partial<SessionView> = {}): SessionView {
  return {
    clubName: 'Test Badminton Club',
    session: {
      id: 'abcDEF123456',
      localDate: '2026-11-07',
      startTime: '09:00',
      endTime: '11:00',
      venue: 'Sports Hall',
      capacity: 25,
      status: 'open',
      registerClosed: false,
    },
    times: {
      startsAt: '2026-11-07T09:00:00.000Z',
      releaseAt: '2026-11-05T12:00:00.000Z',
      topUpAt: '2026-11-06T12:00:00.000Z',
      cutoffAt: '2026-11-06T09:00:00.000Z',
    },
    now: '2026-11-04T10:00:00.000Z',
    released: false,
    taken: 0,
    playing: [],
    waitlists: [],
    guestLimit: 2,
    openForSignup: true,
    ...overrides,
  };
}

export function row(
  id: string,
  name: string,
  extra: Partial<SeatRow> = {},
): SeatRow {
  return { id, kind: 'host', name, hostName: null, ...extra };
}

export function mySeat(
  id: string,
  extra: Partial<MySeatView> = {},
): MySeatView {
  return {
    id,
    kind: 'host',
    name: 'Alex',
    tier: 'employee',
    state: 'main',
    position: 16,
    consequence: {
      kind: 'free-before-cutoff',
      cutoffAt: '2026-11-06T09:00:00.000Z',
    },
    ...extra,
  };
}

export function makePlace(overrides: Partial<MyPlaceView> = {}): MyPlaceView {
  return {
    session: makeView().session,
    displayName: 'Alex',
    tier: 'employee',
    seats: [mySeat('host-1')],
    guestsRemaining: 2,
    holdUntil: null,
    pinWasSet: false,
    ...overrides,
  };
}
