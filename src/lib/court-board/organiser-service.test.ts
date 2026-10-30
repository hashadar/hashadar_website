import { describe, expect, it } from 'vitest';
import {
  authenticateOrganiser,
  cancelSession,
  clearPenalty,
  closeRegister,
  createSession,
  forgetPlayer,
  FORGOTTEN_GUEST_NAME,
  FORGOTTEN_NAME,
  getOrganiserOverview,
  previewCloseRegister,
  removeSeat,
  resetPin,
  rotateOrganiserLink,
  setAttended,
  setSeatTier,
  shortenPenalty,
} from './organiser-service';
import { cancelMySeat, getMyPlace, getSessionView, signUp } from './player-service';
import {
  ORGANISER_TOKEN,
  PHONE_B,
  SESSION_ID,
  T,
  credentials,
  setup,
  signUpInput,
} from './service-test-helpers';

const ORIGIN = 'https://example.test';

async function withClub(overrides?: Parameters<typeof setup>[0]) {
  const h = await setup(overrides);
  const club = (await authenticateOrganiser(h.deps(), ORGANISER_TOKEN))!;
  return { h, club };
}

describe('authenticateOrganiser', () => {
  it('accepts the issued token and nothing else', async () => {
    const { h, club } = await withClub();
    expect(club.id).toBe('club-1');
    for (const bad of ['', 'short', 'x'.repeat(300), 42, null, undefined, `${ORGANISER_TOKEN}x`]) {
      expect(await authenticateOrganiser(h.deps(), bad)).toBeNull();
    }
  });

  it('stops working for the old token after the link is rotated', async () => {
    const { h, club } = await withClub();
    const rotated = await rotateOrganiserLink(h.deps(), club, ORGANISER_TOKEN);
    expect(rotated.ok).toBe(true);
    if (!rotated.ok) return;
    expect(await authenticateOrganiser(h.deps(), ORGANISER_TOKEN)).toBeNull();
    expect((await authenticateOrganiser(h.deps(), rotated.token))?.id).toBe(club.id);
  });
});

describe('getOrganiserOverview', () => {
  it('lists the next Session with the list text for WhatsApp', async () => {
    const { h, club } = await withClub({ capacity: 2 });
    await signUp(h.deps(), signUpInput({ name: 'Alex', guests: [{ name: 'Guy', tier: 'alumni' }] }));
    h.at('2026-11-02T10:01:00Z');
    await signUp(h.deps('b'), signUpInput({ phone: PHONE_B, name: 'Bo' }));
    h.at(T.afterRelease);

    const overview = await getOrganiserOverview(h.deps(), club, { origin: ORIGIN });
    expect(overview.selected?.session.id).toBe(SESSION_ID);
    expect(overview.selected?.listText).toBe(
      [
        '*Sat 7 Nov · 9:00–11:00 · Sports Hall*',
        'Playing (2/2)',
        '1. Alex',
        '2. Bo',
        'Waitlist',
        '1. Guy (guest of Alex)',
        `Sign up / cancel: ${ORIGIN}/labs/court-board/s/${SESSION_ID}`,
      ].join('\n'),
    );
    expect(overview.selected?.nextDefaults).toEqual({
      localDate: '2026-11-14',
      startTime: '09:00',
      endTime: '11:00',
      venue: 'Sports Hall',
      capacity: 2,
    });
    const alex = overview.selected?.rows.find((r) => r.name === 'Alex');
    expect(alex).toMatchObject({ phoneLast3: '456', state: 'main', position: 1 });
  });

  it('suggests the next Saturday when there is no Session yet', async () => {
    const { h, club } = await withClub();
    const store = h.store;
    const empty = { ...club, id: 'club-2' };
    await store.createClub(empty, 'hash-2');
    const overview = await getOrganiserOverview(h.deps(), empty, { origin: ORIGIN });
    expect(overview.selected).toBeNull();
    expect(overview.firstSessionDefaults.localDate).toBe('2026-11-07');
  });
});

describe('createSession and cancelSession', () => {
  it('creates a Session from a copy and validates every field', async () => {
    const { h, club } = await withClub();
    const ok = await createSession(h.deps(), club, {
      localDate: '2026-11-14',
      startTime: '09:00',
      endTime: '11:00',
      venue: 'Sports Hall',
      capacity: '25',
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(await h.store.getSession(ok.sessionId)).toMatchObject({
        localDate: '2026-11-14',
        capacity: 25,
        status: 'open',
        clubId: club.id,
      });
      expect(ok.sessionId).toHaveLength(12);
    }

    const valid = { localDate: '2026-11-14', startTime: '09:00', endTime: '11:00', venue: 'V', capacity: 25 };
    const cases: Array<[Record<string, unknown>, string]> = [
      [{ localDate: '2026-02-30' }, 'localDate'],
      [{ startTime: '9am' }, 'startTime'],
      [{ endTime: '08:00' }, 'endTime'],
      [{ venue: '' }, 'venue'],
      [{ capacity: 0 }, 'capacity'],
      [{ capacity: 500 }, 'capacity'],
    ];
    for (const [over, field] of cases) {
      expect(await createSession(h.deps(), club, { ...valid, ...over })).toMatchObject({
        ok: false,
        field,
      });
    }
  });

  it('cancels a Session without any Penalty, and closes it to signups', async () => {
    const { h, club } = await withClub();
    await signUp(h.deps(), signUpInput());
    h.at(T.afterCutoff);
    expect(await cancelSession(h.deps(), club, { sessionId: SESSION_ID })).toEqual({ ok: true });
    expect(await h.store.listPenalties(club.id)).toEqual([]);
    expect(await signUp(h.deps('b'), signUpInput({ phone: PHONE_B }))).toMatchObject({
      error: 'session-closed',
    });
    expect((await getSessionView(h.deps(), SESSION_ID))?.session.status).toBe('cancelled');
  });

  it('does not touch another Club\'s Session', async () => {
    const { h, club } = await withClub();
    const other = { ...club, id: 'club-2' };
    await h.store.createClub(other, 'hash-2');
    expect(await cancelSession(h.deps(), other, { sessionId: SESSION_ID })).toMatchObject({
      error: 'not-found',
    });
  });
});

describe('Seat corrections', () => {
  it('removes a Seat with no Penalty, even late, and cascades to guests', async () => {
    const { h, club } = await withClub();
    await signUp(h.deps(), signUpInput({ guests: [{ name: 'G', tier: 'external' }] }));
    const [host] = await h.store.listSeats(SESSION_ID);
    h.at(T.afterCutoff);
    expect(await removeSeat(h.deps(), club, { sessionId: SESSION_ID, seatId: host.id })).toEqual({ ok: true });
    expect(await h.store.listPenalties(club.id)).toEqual([]);
    const seats = await h.store.listSeats(SESSION_ID);
    expect(seats.map((s) => s.cancelledBy)).toEqual(['organiser', 'cascade']);
  });

  it('corrects a Tier, which the Player keeps next time', async () => {
    const { h, club } = await withClub();
    await signUp(h.deps(), signUpInput({ tier: 'employee' }));
    const [host] = await h.store.listSeats(SESSION_ID);
    expect(
      await setSeatTier(h.deps(), club, { sessionId: SESSION_ID, seatId: host.id, tier: 'external' }),
    ).toEqual({ ok: true });
    expect((await h.store.listSeats(SESSION_ID))[0].tier).toBe('external');
    expect((await h.store.listPlayers(club.id))[0].tier).toBe('external');
    expect(
      await setSeatTier(h.deps(), club, { sessionId: SESSION_ID, seatId: host.id, tier: 'vip' }),
    ).toMatchObject({ error: 'invalid-input' });
  });
});

describe('the register', () => {
  async function playedSession() {
    const { h, club } = await withClub();
    await signUp(h.deps('a'), signUpInput({ name: 'Alex', guests: [{ name: 'Guy', tier: 'external' }] }));
    h.at('2026-11-02T10:01:00Z');
    await signUp(h.deps('b'), signUpInput({ phone: PHONE_B, name: 'Bo' }));
    return { h, club, seats: await h.store.listSeats(SESSION_ID) };
  }

  it('cannot be closed before the Session starts', async () => {
    const { h, club } = await playedSession();
    h.at(T.afterCutoff);
    expect(await closeRegister(h.deps(), club, { sessionId: SESSION_ID })).toMatchObject({
      error: 'session-closed',
    });
  });

  it('turns unmarked Main-list Seats into Penalties, after a preview of the counts', async () => {
    const { h, club, seats } = await playedSession();
    const alex = seats.find((s) => s.name === 'Alex')!;
    const bo = seats.find((s) => s.name === 'Bo')!;
    h.at(T.afterStart);
    await setAttended(h.deps(), club, { sessionId: SESSION_ID, seatId: alex.id, attended: true });
    await setAttended(h.deps(), club, { sessionId: SESSION_ID, seatId: bo.id, attended: false });

    const preview = await previewCloseRegister(h.deps(), club, { sessionId: SESSION_ID });
    expect(preview).toMatchObject({
      ok: true,
      preview: {
        attended: 1,
        noShows: 2,
        penalties: [
          { displayName: 'Alex', reason: 'no-show-guest', weeks: 2 },
          { displayName: 'Bo', reason: 'no-show-host', weeks: 4 },
        ],
      },
    });
    expect(await h.store.listPenalties(club.id)).toEqual([]);

    expect(await closeRegister(h.deps(), club, { sessionId: SESSION_ID })).toEqual({
      ok: true,
      penalties: 2,
    });
    expect(await h.store.listPenalties(club.id)).toHaveLength(2);

    // Once only, and frozen afterwards.
    expect(await closeRegister(h.deps(), club, { sessionId: SESSION_ID })).toMatchObject({
      error: 'session-closed',
    });
    expect(
      await setAttended(h.deps(), club, { sessionId: SESSION_ID, seatId: bo.id, attended: true }),
    ).toMatchObject({ error: 'session-closed' });
    expect(
      await cancelMySeat(h.deps('b'), { ...credentials({ phone: PHONE_B }), seatId: bo.id }),
    ).toMatchObject({ error: 'session-closed' });
  });
});

describe('holds', () => {
  async function held() {
    const { h, club } = await withClub();
    await signUp(h.deps(), signUpInput());
    const [seat] = await h.store.listSeats(SESSION_ID);
    h.at(T.afterCutoff);
    await cancelMySeat(h.deps(), { ...credentials(), seatId: seat.id });
    return { h, club };
  }

  it('lists active holds with the Player\'s name and last three digits', async () => {
    const { h, club } = await held();
    const overview = await getOrganiserOverview(h.deps(), club, { origin: ORIGIN });
    expect(overview.holds).toEqual([
      {
        phoneKey: expect.any(String),
        sessionId: SESSION_ID,
        reason: 'late-cancel',
        weeks: 3,
        endsAt: '2026-11-28T00:00:00.000Z',
        displayName: 'Alex',
        phoneLast3: '456',
      },
    ]);
  });

  it('clears a hold', async () => {
    const { h, club } = await held();
    const [hold] = (await getOrganiserOverview(h.deps(), club, { origin: ORIGIN })).holds;
    expect(await clearPenalty(h.deps(), club, hold)).toEqual({ ok: true });
    expect((await getOrganiserOverview(h.deps(), club, { origin: ORIGIN })).holds).toEqual([]);
  });

  it('shortens a hold but never lengthens one', async () => {
    const { h, club } = await held();
    const [hold] = (await getOrganiserOverview(h.deps(), club, { origin: ORIGIN })).holds;
    expect(await shortenPenalty(h.deps(), club, { ...hold, endsOn: '2026-12-25' })).toMatchObject({
      error: 'invalid-input',
    });
    expect(await shortenPenalty(h.deps(), club, { ...hold, endsOn: '2026-11-14' })).toEqual({ ok: true });
    const [after] = (await getOrganiserOverview(h.deps(), club, { origin: ORIGIN })).holds;
    expect(after.endsAt).toBe('2026-11-14T00:00:00.000Z');
  });

  it('resets a PIN so the Player can choose a new one', async () => {
    const { h, club } = await withClub();
    await signUp(h.deps(), signUpInput());
    const [player] = await h.store.listPlayers(club.id);
    expect(await resetPin(h.deps(), club, { phoneKey: player.phoneKey })).toEqual({ ok: true });
    expect((await h.store.listPlayers(club.id))[0].pinHash).toBeNull();
    expect(await getMyPlace(h.deps(), credentials({ pin: '135790' }))).toMatchObject({
      ok: true,
      place: { pinWasSet: true },
    });
    expect(await resetPin(h.deps(), club, { phoneKey: 'nobody' })).toMatchObject({ error: 'not-found' });
  });
});

describe('forgetPlayer', () => {
  async function playerWithHistory() {
    const { h, club } = await withClub();
    await signUp(h.deps(), signUpInput({ name: 'Alex', guests: [{ name: 'Guy', tier: 'external' }] }));
    await signUp(h.deps('b'), signUpInput({ phone: PHONE_B, name: 'Bo' }));
    const players = await h.store.listPlayers(club.id);
    const alexKey = players.find((p) => p.displayName === 'Alex')!.phoneKey;
    return { h, club, alexKey };
  }

  it('removes the record, cancels open places without a hold, and blanks names', async () => {
    const { h, club, alexKey } = await playerWithHistory();
    h.at(T.afterCutoff); // a Player cancelling now would be held; being forgotten never is
    expect(await forgetPlayer(h.deps(), club, { phoneKey: alexKey })).toEqual({
      ok: true,
      seatsAnonymised: 2,
    });

    expect(await h.store.getPlayer(club.id, alexKey)).toBeNull();
    expect(await h.store.listPenalties(club.id)).toEqual([]);
    const seats = await h.store.listSeats(SESSION_ID);
    const forgotten = seats.filter(
      (s) => s.name === FORGOTTEN_NAME || s.name === FORGOTTEN_GUEST_NAME,
    );
    expect(forgotten.map((s) => s.name).sort()).toEqual(
      [FORGOTTEN_GUEST_NAME, FORGOTTEN_NAME].sort(),
    );
    expect(forgotten.every((s) => s.cancelledAt)).toBe(true);
    expect(JSON.stringify(seats)).not.toMatch(/Alex|Guy/);
    // Other Players are untouched.
    expect(seats.find((s) => s.name === 'Bo')?.cancelledAt).toBeNull();
    expect((await getSessionView(h.deps(), SESSION_ID))?.playing.map((r) => r.name)).toEqual(['Bo']);
  });

  it('also deletes their holds', async () => {
    const { h, club, alexKey } = await playerWithHistory();
    const [alexSeat] = await h.store.listSeats(SESSION_ID);
    h.at(T.afterCutoff);
    await cancelMySeat(h.deps(), { ...credentials(), seatId: alexSeat.id });
    expect(await h.store.listPenalties(club.id)).toHaveLength(1);
    await forgetPlayer(h.deps(), club, { phoneKey: alexKey });
    expect(await h.store.listPenalties(club.id)).toEqual([]);
  });

  it('lets the number sign up again afterwards as a brand-new Player', async () => {
    const { h, club, alexKey } = await playerWithHistory();
    await forgetPlayer(h.deps(), club, { phoneKey: alexKey });
    expect(await signUp(h.deps(), signUpInput({ name: 'Alexandra' }))).toMatchObject({
      ok: true,
      pinWasSet: true,
    });
  });

  it('is not found for an unknown Player or another Club\'s Player', async () => {
    const { h, club, alexKey } = await playerWithHistory();
    expect(await forgetPlayer(h.deps(), club, { phoneKey: 'nobody' })).toMatchObject({
      error: 'not-found',
    });
    const other = { ...club, id: 'club-2' };
    await h.store.createClub(other, 'hash-2');
    expect(await forgetPlayer(h.deps(), other, { phoneKey: alexKey })).toMatchObject({
      error: 'not-found',
    });
  });
});
