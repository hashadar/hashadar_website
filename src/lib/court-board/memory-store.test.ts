import { describe, expect, it } from 'vitest';
import { createMemoryCourtBoardStore } from './memory-store';
import {
  DuplicateHostSeatError,
  GuestLimitError,
  HostSeatNotActiveError,
  SeatNotFoundError,
  SessionExistsError,
  type ClubSession,
} from './store';
import { guest, host, makeSession } from './test-fixtures';

const session: ClubSession = { ...makeSession(), clubId: 'club-1', venue: 'Hall' };

describe('Host seat uniqueness', () => {
  it('refuses a second active Host seat for the same phone', async () => {
    const store = createMemoryCourtBoardStore();
    await store.addHostSeat(session, host('a', '2026-11-01T10:00:00Z', { phoneKey: 'pk' }));
    await expect(
      store.addHostSeat(session, host('b', '2026-11-01T10:00:01Z', { phoneKey: 'pk' })),
    ).rejects.toBeInstanceOf(DuplicateHostSeatError);
  });

  it('allows a new Host seat once the old one is cancelled', async () => {
    const store = createMemoryCourtBoardStore();
    await store.addHostSeat(session, host('a', '2026-11-01T10:00:00Z', { phoneKey: 'pk' }));
    await store.cancelSeat(session, 'a', new Date('2026-11-02T10:00:00Z'), 'player');
    await store.addHostSeat(session, host('b', '2026-11-03T10:00:00Z', { phoneKey: 'pk' }));
    expect(await store.listSeats(session.id)).toHaveLength(2);
  });

  it('treats a double tap as one Seat', async () => {
    const store = createMemoryCourtBoardStore();
    const results = await Promise.allSettled([
      store.addHostSeat(session, host('a', '2026-11-01T10:00:00Z', { phoneKey: 'pk' })),
      store.addHostSeat(session, host('b', '2026-11-01T10:00:00Z', { phoneKey: 'pk' })),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await store.listSeats(session.id)).toHaveLength(1);
  });

  it('keeps different Sessions separate', async () => {
    const store = createMemoryCourtBoardStore();
    await store.addHostSeat(session, host('a', '2026-11-01T10:00:00Z', { phoneKey: 'pk' }));
    await store.addHostSeat(
      { ...session, id: 'other' },
      host('b', '2026-11-01T10:00:00Z', { phoneKey: 'pk' }),
    );
  });
});

describe('Guest seat limits', () => {
  async function withHost() {
    const store = createMemoryCourtBoardStore();
    await store.addHostSeat(session, host('h', '2026-11-01T10:00:00Z'));
    return store;
  }

  it('stops at the cap', async () => {
    const store = await withHost();
    await store.addGuestSeat(session, guest('g1', 'h', '2026-11-01T10:01:00Z'), 2);
    await store.addGuestSeat(session, guest('g2', 'h', '2026-11-01T10:02:00Z'), 2);
    await expect(
      store.addGuestSeat(session, guest('g3', 'h', '2026-11-01T10:03:00Z'), 2),
    ).rejects.toBeInstanceOf(GuestLimitError);
  });

  it('has no cap when given Infinity', async () => {
    const store = await withHost();
    for (let i = 0; i < 5; i++) {
      await store.addGuestSeat(
        session,
        guest(`g${i}`, 'h', '2026-11-06T12:01:00Z'),
        Number.POSITIVE_INFINITY,
      );
    }
    expect(await store.listSeats(session.id)).toHaveLength(6);
  });

  it('frees a slot when a Guest seat is cancelled', async () => {
    const store = await withHost();
    await store.addGuestSeat(session, guest('g1', 'h', '2026-11-01T10:01:00Z'), 1);
    await store.cancelSeat(session, 'g1', new Date('2026-11-02T10:00:00Z'), 'player');
    await store.addGuestSeat(session, guest('g2', 'h', '2026-11-03T10:00:00Z'), 1);
  });

  it('refuses a Guest seat for a missing or cancelled Host seat', async () => {
    const store = await withHost();
    await expect(
      store.addGuestSeat(session, guest('g', 'nope', '2026-11-01T10:01:00Z'), 2),
    ).rejects.toBeInstanceOf(HostSeatNotActiveError);
    await store.cancelSeat(session, 'h', new Date('2026-11-02T10:00:00Z'), 'player');
    await expect(
      store.addGuestSeat(session, guest('g', 'h', '2026-11-03T10:00:00Z'), 2),
    ).rejects.toBeInstanceOf(HostSeatNotActiveError);
  });
});

describe('cancelSeat', () => {
  const at = new Date('2026-11-02T10:00:00Z');

  it('cascades from a Host seat to its Guest seats at the same instant', async () => {
    const store = createMemoryCourtBoardStore();
    await store.addHostSeat(session, host('h', '2026-11-01T10:00:00Z'));
    await store.addGuestSeat(session, guest('g', 'h', '2026-11-01T10:01:00Z'), 2);
    const cancelled = await store.cancelSeat(session, 'h', at, 'player');
    expect(cancelled.map((s) => [s.id, s.cancelledBy])).toEqual([
      ['h', 'player'],
      ['g', 'cascade'],
    ]);
    const seats = await store.listSeats(session.id);
    expect(seats.every((s) => s.cancelledAt?.getTime() === at.getTime())).toBe(true);
  });

  it('is idempotent: the first cancel wins', async () => {
    const store = createMemoryCourtBoardStore();
    await store.addHostSeat(session, host('h', '2026-11-01T10:00:00Z'));
    await store.cancelSeat(session, 'h', at, 'player');
    const again = await store.cancelSeat(session, 'h', new Date('2026-11-05T10:00:00Z'), 'organiser');
    expect(again).toEqual([]);
    const [seat] = await store.listSeats(session.id);
    expect(seat.cancelledAt).toEqual(at);
    expect(seat.cancelledBy).toBe('player');
  });

  it('throws for an unknown Seat', async () => {
    const store = createMemoryCourtBoardStore();
    await expect(store.cancelSeat(session, 'x', at, 'player')).rejects.toBeInstanceOf(
      SeatNotFoundError,
    );
  });
});

describe('Sessions, clubs and counters', () => {
  it('lists a Club\'s Sessions oldest first and refuses duplicates', async () => {
    const store = createMemoryCourtBoardStore();
    await store.createSession({ ...session, id: 'b', localDate: '2026-11-14' });
    await store.createSession({ ...session, id: 'a', localDate: '2026-11-07' });
    await store.createSession({ ...session, id: 'c', clubId: 'other' });
    expect((await store.listSessions('club-1')).map((s) => s.id)).toEqual(['a', 'b']);
    await expect(store.createSession({ ...session, id: 'a' })).rejects.toBeInstanceOf(
      SessionExistsError,
    );
  });

  it('rotates an Organiser token', async () => {
    const store = createMemoryCourtBoardStore();
    const club = {
      id: 'club-1',
      name: 'C',
      venue: 'V',
      startTime: '09:00',
      endTime: '11:00',
      rules: {} as never,
      createdAt: new Date(),
    };
    await store.createClub(club, 'old');
    await store.rotateOrganiserToken('club-1', 'old', 'new');
    expect(await store.getClubIdByOrganiserTokenHash('old')).toBeNull();
    expect(await store.getClubIdByOrganiserTokenHash('new')).toBe('club-1');
  });

  it('counts within a window and starts again in the next', async () => {
    const store = createMemoryCourtBoardStore();
    const expiresAt = new Date(Date.now() + 60_000);
    expect(await store.incrementCounter('k', 'w1', expiresAt)).toBe(1);
    expect(await store.incrementCounter('k', 'w1', expiresAt)).toBe(2);
    expect(await store.incrementCounter('k', 'w2', expiresAt)).toBe(1);
  });
});
