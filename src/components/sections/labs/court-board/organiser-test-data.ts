import type {
  HoldRow,
  OrganiserOverview,
  OrganiserSeatRow,
  OrganiserSessionDetail,
  PlayerRow,
  SessionSummary,
} from '@/lib/court-board/views';

export const SESSION_ID = 'abcDEF123456';

export const sessionSummary = (over: Partial<SessionSummary> = {}): SessionSummary => ({
  id: SESSION_ID,
  localDate: '2026-11-07',
  startTime: '09:00',
  endTime: '11:00',
  venue: 'Sports Hall',
  capacity: 25,
  status: 'open',
  registerClosed: false,
  ...over,
});

export const seatRow = (over: Partial<OrganiserSeatRow>): OrganiserSeatRow => ({
  id: 'seat-1',
  kind: 'host',
  name: 'Alex',
  tier: 'employee',
  hostName: null,
  state: 'main',
  position: 1,
  attended: false,
  phoneLast3: null,
  holdUntil: null,
  ...over,
});

export const defaultRows: OrganiserSeatRow[] = [
  seatRow({ id: 'seat-alex', name: 'Alex', phoneLast3: '456' }),
  seatRow({
    id: 'seat-guy',
    kind: 'guest',
    name: 'Guy',
    tier: 'alumni',
    hostName: 'Alex',
    position: 2,
  }),
  seatRow({ id: 'seat-bo', name: 'Bo', state: 'waitlist', position: 1, phoneLast3: '457' }),
];

export const sessionDetail = (
  over: Partial<OrganiserSessionDetail> = {},
): OrganiserSessionDetail => ({
  session: sessionSummary(),
  times: {
    startsAt: '2026-11-07T09:00:00.000Z',
    releaseAt: '2026-11-05T12:00:00.000Z',
    topUpAt: '2026-11-06T12:00:00.000Z',
    cutoffAt: '2026-11-06T09:00:00.000Z',
  },
  rows: defaultRows,
  taken: 2,
  waiting: 1,
  listText: '*Sat 7 Nov · 9:00–11:00 · Sports Hall*\nPlaying (2/25)',
  signupPath: `/labs/court-board/s/${SESSION_ID}`,
  nextDefaults: {
    localDate: '2026-11-14',
    startTime: '09:00',
    endTime: '11:00',
    venue: 'Sports Hall',
    capacity: 25,
  },
  ...over,
});

export const hold: HoldRow = {
  phoneKey: 'pk-alex',
  sessionId: 'earlierSess1',
  reason: 'late-cancel',
  weeks: 3,
  endsAt: '2026-11-28T00:00:00.000Z',
  displayName: 'Alex',
  phoneLast3: '456',
};

export const players: PlayerRow[] = [
  { phoneKey: 'pk-alex', displayName: 'Alex', phoneLast3: '456', hasPin: true },
  { phoneKey: 'pk-bo', displayName: 'Bo', phoneLast3: '457', hasPin: false },
];

/** A Session that has already started (now is 9:30 on the day). */
export const overview = (over: Partial<OrganiserOverview> = {}): OrganiserOverview => ({
  club: { name: 'Test Badminton Club', venue: 'Sports Hall' },
  now: '2026-11-07T09:30:00.000Z',
  sessions: [sessionSummary()],
  selected: sessionDetail(),
  holds: [],
  players,
  firstSessionDefaults: {
    localDate: '2026-11-14',
    startTime: '09:00',
    endTime: '11:00',
    venue: 'Sports Hall',
    capacity: 25,
  },
  ...over,
});
