import { describe, expect, it } from 'vitest';
import {
  addMyGuests,
  cancelMySeat,
  getMyPlace,
  getSessionView,
  signUp,
  updateMySeat,
  SIGNUP_MAX_PER_CLIENT,
} from './player-service';
import {
  PHONE_B,
  SESSION_ID,
  T,
  credentials,
  setup,
  signUpInput,
} from './service-test-helpers';

describe('signUp', () => {
  it('takes a place, sets the PIN on first signup, and shows names only', async () => {
    const h = await setup();
    const result = await signUp(h.deps(), signUpInput());
    expect(result).toMatchObject({ ok: true, state: 'main', position: 1, pinWasSet: true });

    const view = await getSessionView(h.deps(), SESSION_ID);
    expect(view?.taken).toBe(1);
    expect(view?.playing.map((r) => r.name)).toEqual(['Alex']);
    const json = JSON.stringify(view);
    expect(json).not.toContain('07400');
    expect(json).not.toContain('447400');
    expect(json).not.toMatch(/phoneKey|pinHash/);
  });

  it('remembers the Player and does not set the PIN twice', async () => {
    const h = await setup();
    await signUp(h.deps(), signUpInput());
    await h.store.createSession({ ...h.session, id: 'zzzzzzzzzzzz', localDate: '2026-11-14' });
    const again = await signUp(h.deps(), signUpInput({ sessionId: 'zzzzzzzzzzzz' }));
    expect(again).toMatchObject({ ok: true, pinWasSet: false });
  });

  it('is one Seat per number per Session', async () => {
    const h = await setup();
    await signUp(h.deps(), signUpInput());
    expect(await signUp(h.deps(), signUpInput({ name: 'Again' }))).toMatchObject({
      ok: false,
      error: 'already-signed-up',
    });
    expect(await h.store.listSeats(SESSION_ID)).toHaveLength(1);
  });

  it('reads 07…, +44… and 0044… as the same Player', async () => {
    const h = await setup();
    await signUp(h.deps(), signUpInput({ phone: '07400 123456' }));
    expect(await signUp(h.deps(), signUpInput({ phone: '+44 7400 123456' }))).toMatchObject({
      error: 'already-signed-up',
    });
    expect(await signUp(h.deps(), signUpInput({ phone: '0044 7400123456' }))).toMatchObject({
      error: 'already-signed-up',
    });
  });

  it('validates input on the server', async () => {
    const h = await setup();
    const cases: Array<[Record<string, unknown>, string, string | undefined]> = [
      [{ name: '' }, 'invalid-input', 'name'],
      [{ name: 'x'.repeat(41) }, 'invalid-input', 'name'],
      [{ name: 42 }, 'invalid-input', 'name'],
      [{ tier: 'vip' }, 'invalid-input', 'tier'],
      [{ guests: [{ name: 'G', tier: 'employee' }] }, 'invalid-input', 'guests'],
      [{ guests: 'nope' }, 'invalid-input', 'guests'],
      [{ phone: '12345' }, 'invalid-phone', undefined],
      [{ phone: undefined }, 'invalid-phone', undefined],
      [{ pin: '12345' }, 'invalid-input', 'pin'],
      [{ pin: 'abcdef' }, 'invalid-input', 'pin'],
      [{ pin: '123456' }, 'trivial-pin', undefined],
      [{ pin: '000000' }, 'trivial-pin', undefined],
      [{ sessionId: 'short' }, 'not-found', undefined],
    ];
    for (const [over, error, field] of cases) {
      const result = await signUp(h.deps(`c-${error}-${field}-${JSON.stringify(over)}`), signUpInput(over));
      expect(result).toMatchObject({ ok: false, error, ...(field ? { field } : {}) });
    }
    expect(await h.store.listSeats(SESSION_ID)).toHaveLength(0);
  });

  it('keeps a name that looks like markup as plain text and drops control characters', async () => {
    const h = await setup();
    await signUp(h.deps(), signUpInput({ name: '  <b>Al\u0000ex</b>‮  ' }));
    const [seat] = await h.store.listSeats(SESSION_ID);
    expect(seat.name).toBe('<b>Al ex</b>');
  });

  it('quietly refuses when the honeypot is filled', async () => {
    const h = await setup();
    expect(await signUp(h.deps(), signUpInput({ website: 'http://spam' }))).toMatchObject({
      ok: false,
      error: 'rejected',
    });
    expect(await h.store.listSeats(SESSION_ID)).toHaveLength(0);
  });

  it('is closed for a cancelled Session and once the Session has started', async () => {
    const h = await setup();
    h.at(T.afterStart);
    expect(await signUp(h.deps(), signUpInput())).toMatchObject({ error: 'session-closed' });

    const h2 = await setup({ session: { status: 'cancelled' } });
    expect(await signUp(h2.deps(), signUpInput())).toMatchObject({ error: 'session-closed' });
  });

  it('rate-limits a client', async () => {
    const h = await setup();
    let last;
    for (let i = 0; i <= SIGNUP_MAX_PER_CLIENT; i++) {
      last = await signUp(h.deps(), signUpInput({ phone: '12', name: `n${i}` }));
    }
    expect(last).toMatchObject({ ok: false, error: 'rate-limited' });
    // A different client is unaffected.
    expect(await signUp(h.deps('other'), signUpInput({ phone: '12' }))).toMatchObject({
      error: 'invalid-phone',
    });
  });
});

describe('guests', () => {
  it('allows two before Top-up and refuses a third', async () => {
    const h = await setup();
    const guests = [
      { name: 'G1', tier: 'alumni' },
      { name: 'G2', tier: 'external' },
    ];
    expect(await signUp(h.deps(), signUpInput({ guests }))).toMatchObject({ ok: true });
    expect(
      await signUp(h.deps(), signUpInput({ phone: PHONE_B, guests: [...guests, { name: 'G3', tier: 'external' }] })),
    ).toMatchObject({ ok: false, error: 'guest-limit' });
    expect(
      await addMyGuests(h.deps(), { ...credentials(), guests: [{ name: 'G3', tier: 'external' }] }),
    ).toMatchObject({ error: 'guest-limit' });
  });

  it('lifts the cap from Top-up', async () => {
    const h = await setup();
    await signUp(h.deps(), signUpInput());
    h.at(T.afterTopUp);
    const guests = Array.from({ length: 5 }, (_, i) => ({ name: `G${i}`, tier: 'external' }));
    expect(await addMyGuests(h.deps(), { ...credentials(), guests })).toMatchObject({ ok: true });
    const view = await getMyPlace(h.deps(), credentials());
    expect(view).toMatchObject({ ok: true, place: { guestsRemaining: null } });
  });

  it('shows a guest under its Host and never ahead of it on the Main list', async () => {
    const h = await setup({ capacity: 2 });
    await signUp(h.deps('a'), signUpInput({ name: 'Ext Host', tier: 'external', guests: [{ name: 'Al Guest', tier: 'alumni' }] }));
    h.at('2026-11-02T10:01:00Z');
    await signUp(h.deps('b'), signUpInput({ phone: PHONE_B, name: 'Emp' }));
    h.at(T.afterRelease);
    const view = await getSessionView(h.deps(), SESSION_ID);
    expect(view?.playing.map((r) => r.name)).toEqual(['Emp', 'Ext Host']);
    const waiting = view?.waitlists[0].rows[0];
    expect(waiting).toMatchObject({ name: 'Al Guest', hostName: 'Ext Host', kind: 'guest' });
  });
});

describe('PIN lockout', () => {
  async function registered() {
    const h = await setup();
    await signUp(h.deps(), signUpInput());
    return h;
  }

  it('answers a wrong PIN generically and the same for an unregistered number', async () => {
    const h = await registered();
    const wrong = await getMyPlace(h.deps(), credentials({ pin: '999111' }));
    const stranger = await getMyPlace(h.deps('c2'), credentials({ phone: PHONE_B, pin: '999111' }));
    expect(wrong).toEqual({ ok: false, error: 'bad-credentials' });
    expect(stranger).toEqual(wrong);
  });

  it('locks a client out of a number after 5 wrong PINs, even for the right one', async () => {
    const h = await registered();
    for (let i = 0; i < 5; i++) {
      await getMyPlace(h.deps(), credentials({ pin: '999111' }));
    }
    expect(await getMyPlace(h.deps(), credentials())).toMatchObject({
      ok: false,
      error: 'locked',
      retryAfterSeconds: 900,
    });
  });

  it('does not lock out the real Player on their own device', async () => {
    const h = await registered();
    for (let i = 0; i < 5; i++) {
      await getMyPlace(h.deps('attacker'), credentials({ pin: '999111' }));
    }
    expect(await getMyPlace(h.deps('player'), credentials())).toMatchObject({ ok: true });
  });

  it('lets the real Player back in after the lock, which doubles when repeated', async () => {
    const h = await registered();
    for (let i = 0; i < 5; i++) await getMyPlace(h.deps(), credentials({ pin: '999111' }));
    h.at('2026-11-02T10:15:01Z');
    expect(await getMyPlace(h.deps(), credentials())).toMatchObject({ ok: true });
    for (let i = 0; i < 5; i++) await getMyPlace(h.deps(), credentials({ pin: '999111' }));
    expect(await getMyPlace(h.deps(), credentials())).toMatchObject({
      error: 'locked',
      retryAfterSeconds: 1800,
    });
  });

  it('slows, never refuses, after 20 wrong guesses across clients in a day', async () => {
    const h = await registered();
    for (let i = 0; i < 21; i++) {
      await getMyPlace(h.deps(`spray-${i}`), credentials({ pin: '999111' }));
    }
    const blocked = await getMyPlace(h.deps('player'), credentials());
    expect(blocked).toMatchObject({ ok: false, error: 'slow' });
    h.at('2026-11-02T10:01:01Z');
    expect(await getMyPlace(h.deps('player'), credentials())).toMatchObject({ ok: true });
  });

  it('counts only wrong attempts', async () => {
    const h = await registered();
    for (let i = 0; i < 10; i++) {
      expect(await getMyPlace(h.deps(), credentials())).toMatchObject({ ok: true });
    }
  });
});

describe('manage my place', () => {
  it('lists the Seats and what cancelling would cost', async () => {
    const h = await setup();
    await signUp(h.deps(), signUpInput({ guests: [{ name: 'G1', tier: 'alumni' }] }));
    h.at(T.beforeCutoff);
    const result = await getMyPlace(h.deps(), credentials());
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.place.seats.map((s) => [s.kind, s.name, s.state])).toEqual([
      ['host', 'Alex', 'main'],
      ['guest', 'G1', 'main'],
    ]);
    expect(result.place.seats[0].consequence.kind).toBe('free-before-cutoff');
    h.at(T.afterCutoff);
    const late = await getMyPlace(h.deps(), credentials());
    expect(late.ok && late.place.seats[0].consequence).toEqual({
      kind: 'penalty',
      weeks: 3,
      endsAt: '2026-11-28T00:00:00.000Z',
    });
  });

  it('edits name and Tier, and restricts a guest to Alumni or External', async () => {
    const h = await setup();
    await signUp(h.deps(), signUpInput({ guests: [{ name: 'G1', tier: 'alumni' }] }));
    const [host, guest] = await h.store.listSeats(SESSION_ID);
    expect(
      await updateMySeat(h.deps(), { ...credentials(), seatId: host.id, name: 'Alexa', tier: 'alumni' }),
    ).toEqual({ ok: true });
    expect(
      await updateMySeat(h.deps(), { ...credentials(), seatId: guest.id, tier: 'employee' }),
    ).toMatchObject({ error: 'invalid-input', field: 'tier' });
    const seats = await h.store.listSeats(SESSION_ID);
    expect(seats[0]).toMatchObject({ name: 'Alexa', tier: 'alumni' });
  });

  it('cannot touch someone else\'s Seat', async () => {
    const h = await setup();
    await signUp(h.deps(), signUpInput());
    await signUp(h.deps('b'), signUpInput({ phone: PHONE_B, name: 'Bo' }));
    const [alex] = await h.store.listSeats(SESSION_ID);
    const result = await cancelMySeat(h.deps('b'), { ...credentials({ phone: PHONE_B }), seatId: alex.id });
    expect(result).toMatchObject({ ok: false, error: 'not-found' });
  });

  it('lets a Player whose PIN was reset choose a new one', async () => {
    const h = await setup();
    await signUp(h.deps(), signUpInput());
    const [player] = await h.store.listPlayers(h.club.id);
    await h.store.putPlayer({ ...player, pinHash: null, pinSalt: null });
    expect(await getMyPlace(h.deps(), credentials({ pin: '135790' }))).toMatchObject({
      ok: true,
      place: { pinWasSet: true },
    });
    expect(await getMyPlace(h.deps(), credentials({ pin: '135790' }))).toMatchObject({
      ok: true,
      place: { pinWasSet: false },
    });
    expect(await getMyPlace(h.deps('x'), credentials())).toMatchObject({ error: 'bad-credentials' });
  });
});

describe('cancelling', () => {
  it('is free before the Cutoff and leaves no Penalty', async () => {
    const h = await setup();
    await signUp(h.deps(), signUpInput());
    h.at(T.beforeCutoff);
    const [seat] = await h.store.listSeats(SESSION_ID);
    expect(await cancelMySeat(h.deps(), { ...credentials(), seatId: seat.id })).toEqual({
      ok: true,
      penalty: null,
    });
    expect(await h.store.listPenalties(h.club.id)).toEqual([]);
  });

  it('puts a Player on hold for 3 weeks after the Cutoff, and only they and the Organiser can see it', async () => {
    const h = await setup();
    await signUp(h.deps(), signUpInput());
    h.at(T.afterCutoff);
    const [seat] = await h.store.listSeats(SESSION_ID);
    expect(await cancelMySeat(h.deps(), { ...credentials(), seatId: seat.id })).toEqual({
      ok: true,
      penalty: { weeks: 3, endsAt: '2026-11-28T00:00:00.000Z' },
    });
    const [penalty] = await h.store.listPenalties(h.club.id);
    expect(penalty).toMatchObject({ reason: 'late-cancel', weeks: 3 });

    // Next week's Session: the same Player now signs up into the External band.
    await h.store.createSession({ ...h.session, id: 'nextWEEK1234', localDate: '2026-11-14' });
    await signUp(h.deps('b'), signUpInput({ sessionId: 'nextWEEK1234', phone: PHONE_B, name: 'Bo', tier: 'alumni' }));
    await signUp(h.deps(), signUpInput({ sessionId: 'nextWEEK1234', name: 'Alex', tier: 'employee' }));
    h.at('2026-11-12T13:00:00Z');
    const view = await getSessionView(h.deps(), 'nextWEEK1234');
    expect(view?.playing.map((r) => r.name)).toEqual(['Bo', 'Alex']);
    // The public page shows the effect (External band) but never who is on hold.
    expect(JSON.stringify(view)).not.toMatch(/hold|2026-11-28/i);
    // The Player sees it in Manage my place.
    const mine = await getMyPlace(h.deps(), credentials({ sessionId: 'nextWEEK1234' }));
    expect(mine.ok && mine.place.holdUntil).toBe('2026-11-28T00:00:00.000Z');
    // Another Player does not learn it from the Player-facing view of their own place.
    const other = await getMyPlace(h.deps('b'), credentials({ sessionId: 'nextWEEK1234', phone: PHONE_B }));
    expect(other.ok && other.place.holdUntil).toBeNull();
  });

  it('is always free on a Waitlist', async () => {
    const h = await setup({ capacity: 1 });
    await signUp(h.deps('a'), signUpInput({ phone: PHONE_B, name: 'First' }));
    h.at('2026-11-02T10:01:00Z');
    await signUp(h.deps('b'), signUpInput({ name: 'Second' }));
    h.at(T.afterCutoff);
    const seats = await h.store.listSeats(SESSION_ID);
    const second = seats.find((s) => s.name === 'Second')!;
    expect(await cancelMySeat(h.deps(), { ...credentials(), seatId: second.id })).toEqual({
      ok: true,
      penalty: null,
    });
  });

  it('cancels a Host seat together with its Guest seats', async () => {
    const h = await setup();
    await signUp(h.deps(), signUpInput({ guests: [{ name: 'G1', tier: 'external' }] }));
    const [host] = await h.store.listSeats(SESSION_ID);
    await cancelMySeat(h.deps(), { ...credentials(), seatId: host.id });
    const seats = await h.store.listSeats(SESSION_ID);
    expect(seats.map((s) => [s.cancelledBy])).toEqual([['player'], ['cascade']]);
    expect((await getSessionView(h.deps(), SESSION_ID))?.taken).toBe(0);
  });

  it('treats a double tap as one cancellation', async () => {
    const h = await setup();
    await signUp(h.deps(), signUpInput());
    h.at(T.afterCutoff);
    const [seat] = await h.store.listSeats(SESSION_ID);
    await cancelMySeat(h.deps(), { ...credentials(), seatId: seat.id });
    const second = await cancelMySeat(h.deps(), { ...credentials(), seatId: seat.id });
    expect(second).toMatchObject({ ok: false, error: 'not-found' });
    expect(await h.store.listPenalties(h.club.id)).toHaveLength(1);
  });

  it('gives a Grace period to someone promoted after the Cutoff', async () => {
    const h = await setup({ capacity: 1 });
    await signUp(h.deps('a'), signUpInput({ phone: PHONE_B, name: 'First' }));
    h.at('2026-11-02T10:01:00Z');
    await signUp(h.deps('b'), signUpInput({ name: 'Second' }));
    const seats = await h.store.listSeats(SESSION_ID);
    const first = seats.find((s) => s.name === 'First')!;
    const second = seats.find((s) => s.name === 'Second')!;

    // First drops out just after the Cutoff (and is penalised); Second is promoted.
    h.at(T.afterCutoff);
    await cancelMySeat(h.deps('a'), { ...credentials({ phone: PHONE_B }), seatId: first.id });
    h.at('2026-11-06T11:30:00Z');
    const place = await getMyPlace(h.deps('b'), credentials());
    expect(place.ok && place.place.seats[0]).toMatchObject({
      state: 'main',
      consequence: { kind: 'free-grace', graceEndsAt: '2026-11-06T12:00:00.000Z' },
    });
    expect(
      await cancelMySeat(h.deps('b'), { ...credentials(), seatId: second.id }),
    ).toEqual({ ok: true, penalty: null });
  });

  it('refuses changes once the register is closed', async () => {
    const h = await setup();
    await signUp(h.deps(), signUpInput());
    const [seat] = await h.store.listSeats(SESSION_ID);
    await h.store.updateSession(SESSION_ID, { registerClosedAt: new Date(T.afterStart) });
    h.at(T.afterStart);
    expect(await cancelMySeat(h.deps(), { ...credentials(), seatId: seat.id })).toMatchObject({
      error: 'session-closed',
    });
  });
});

describe('getSessionView', () => {
  it('returns null for unknown or malformed ids', async () => {
    const h = await setup();
    expect(await getSessionView(h.deps(), 'does-not-ex')).toBeNull();
    expect(await getSessionView(h.deps(), 'x')).toBeNull();
  });

  it('reports phase, guest limit and sign-up state', async () => {
    const h = await setup();
    expect(await getSessionView(h.deps(), SESSION_ID)).toMatchObject({
      released: false,
      guestLimit: 2,
      openForSignup: true,
      clubName: 'Test Badminton Club',
    });
    h.at(T.afterTopUp);
    expect(await getSessionView(h.deps(), SESSION_ID)).toMatchObject({
      released: true,
      guestLimit: null,
    });
  });
});
