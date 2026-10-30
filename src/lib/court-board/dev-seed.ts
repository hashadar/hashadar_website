import { londonDateOf } from './format';
import { hashOrganiserToken } from './organiser-token';
import { normalisePhone, phoneLast3 } from './phone';
import { phoneKey } from './phone-key';
import { hashPin } from './pin';
import { DEFAULT_CLUB_RULES } from './rules';
import type { Club, ClubSession, CourtBoardStore } from './store';
import { addLocalDays } from './time';
import type { Seat, Tier } from './types';

/** Fixed, well-known values: this seed only ever runs in `next dev`. */
export const DEV_ORGANISER_TOKEN = 'dev-organiser-link-local-only-0123456789';
export const DEV_SESSION_ID = 'demoSession1';
export const DEV_CLUB_ID = 'democlub';
export const DEV_PLAYER = { name: 'Sam', phone: '07400 123456', pin: '482916' };

const nextSaturday = (now: Date): string => {
  const today = londonDateOf(now);
  for (let i = 1; i <= 7; i++) {
    const candidate = addLocalDays(today, i);
    if (new Date(`${candidate}T12:00:00Z`).getUTCDay() === 6) return candidate;
  }
  return today;
};

/**
 * A demo Club with a small Session (8 places) already part-filled, so the
 * Order, Waitlists and Release can be seen straight away.
 */
export async function seedDemoClub(
  store: CourtBoardStore,
  pepper: string,
  now: Date,
): Promise<void> {
  const club: Club = {
    id: DEV_CLUB_ID,
    name: 'Demo Badminton Club',
    venue: 'Demo Sports Hall',
    startTime: '09:00',
    endTime: '11:00',
    rules: { ...DEFAULT_CLUB_RULES, capacity: 8 },
    createdAt: now,
  };
  await store.createClub(club, hashOrganiserToken(DEV_ORGANISER_TOKEN));

  const session: ClubSession = {
    id: DEV_SESSION_ID,
    clubId: club.id,
    localDate: nextSaturday(now),
    startTime: club.startTime,
    endTime: club.endTime,
    venue: club.venue,
    capacity: 8,
    status: 'open',
    registerClosedAt: null,
  };
  await store.createSession(session);

  let minutesAgo = 600;
  const seat = (
    id: string,
    name: string,
    tier: Tier,
    over: Partial<Seat> = {},
  ): Seat => ({
    id,
    kind: 'host',
    hostSeatId: null,
    phoneKey: `demo-${id}`,
    name,
    tier,
    createdAt: new Date(now.getTime() - (minutesAgo -= 10) * 60_000),
    cancelledAt: null,
    cancelledBy: null,
    attended: false,
    ...over,
  });

  for (const name of ['Priya', 'Tom', 'Wei', 'Ana', 'Jordan', 'Kofi']) {
    await store.addHostSeat(session, seat(`emp-${name}`, name, 'employee'));
  }

  // Sam has a real phone number and PIN so "Manage my place" can be tried.
  const parsed = normalisePhone(DEV_PLAYER.phone);
  if (!parsed.ok) throw new Error('Dev player phone is invalid');
  const samKey = phoneKey(pepper, parsed.e164);
  const samSeat = seat('emp-Sam', DEV_PLAYER.name, 'employee', { phoneKey: samKey });
  await store.addHostSeat(session, samSeat);
  await store.addGuestSeat(
    session,
    {
      ...seat('guest-Sam', "Sam's friend", 'alumni'),
      kind: 'guest',
      hostSeatId: samSeat.id,
      phoneKey: null,
    },
    2,
  );
  const pin = await hashPin(pepper, DEV_PLAYER.pin);
  await store.putPlayer({
    clubId: club.id,
    phoneKey: samKey,
    displayName: DEV_PLAYER.name,
    tier: 'employee',
    phoneLast3: phoneLast3(parsed.e164),
    pinHash: pin.pinHash,
    pinSalt: pin.pinSalt,
    updatedAt: now,
  });

  await store.addHostSeat(session, seat('alum-Alix', 'Alix', 'alumni'));
  await store.addHostSeat(session, seat('ext-Eddie', 'Eddie', 'external'));
}
