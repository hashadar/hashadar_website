import { createMemoryCourtBoardStore } from './memory-store';
import { hashOrganiserToken } from './organiser-token';
import { DEFAULT_CLUB_RULES } from './rules';
import type { ServiceDeps } from './service-core';
import type { Club, ClubSession, CourtBoardStore } from './store';

export const PEPPER = 'test-pepper-for-court-board-tests';
export const ORGANISER_TOKEN = 'organiser-token-for-tests-0123456789abcdef';
export const SESSION_ID = 'abcDEF123456';

// Valid UK mobiles (07700 900xxx is a reserved drama range and is rejected).
export const PHONE_A = '07400 123456';
export const PHONE_B = '07400 123457';
export const PHONE_C = '07400 123458';
export const PIN = '482916';

/** Sat 7 Nov 2026 9:00 (GMT). Release Thu 5 Nov 12:00Z, Cutoff Fri 6 Nov 09:00Z. */
export const T = {
  early: '2026-11-02T10:00:00Z',
  beforeRelease: '2026-11-04T10:00:00Z',
  afterRelease: '2026-11-05T13:00:00Z',
  beforeCutoff: '2026-11-06T08:00:00Z',
  afterCutoff: '2026-11-06T10:00:00Z',
  afterTopUp: '2026-11-06T13:00:00Z',
  afterStart: '2026-11-07T11:30:00Z',
};

export interface Harness {
  store: CourtBoardStore;
  club: Club;
  session: ClubSession;
  clock: { now: Date };
  at: (iso: string) => void;
  deps: (clientKey?: string) => ServiceDeps;
}

export async function setup(
  overrides: { capacity?: number; session?: Partial<ClubSession> } = {},
): Promise<Harness> {
  const store = createMemoryCourtBoardStore();
  const clock = { now: new Date(T.early) };
  const club: Club = {
    id: 'club-1',
    name: 'Test Badminton Club',
    venue: 'Sports Hall',
    startTime: '09:00',
    endTime: '11:00',
    rules: DEFAULT_CLUB_RULES,
    createdAt: new Date('2026-10-01T00:00:00Z'),
  };
  const session: ClubSession = {
    id: SESSION_ID,
    clubId: club.id,
    localDate: '2026-11-07',
    startTime: '09:00',
    endTime: '11:00',
    venue: 'Sports Hall',
    capacity: overrides.capacity ?? 25,
    status: 'open',
    registerClosedAt: null,
    ...overrides.session,
  };
  await store.createClub(club, hashOrganiserToken(ORGANISER_TOKEN));
  await store.createSession(session);
  return {
    store,
    club,
    session,
    clock,
    at: (iso) => {
      clock.now = new Date(iso);
    },
    deps: (clientKey = 'client-a') => ({
      store,
      pepper: PEPPER,
      now: () => clock.now,
      clientKey,
    }),
  };
}

export const signUpInput = (over: Record<string, unknown> = {}) => ({
  sessionId: SESSION_ID,
  name: 'Alex',
  phone: PHONE_A,
  pin: PIN,
  tier: 'employee',
  guests: [],
  website: '',
  ...over,
});

export const credentials = (over: Record<string, unknown> = {}) => ({
  sessionId: SESSION_ID,
  phone: PHONE_A,
  pin: PIN,
  ...over,
});
