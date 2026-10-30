import { normalisePhone, phoneLast3 } from './phone';
import { phoneKey as derivePhoneKey } from './phone-key';
import { hashPin, checkPin, verifyPin, type PinHash } from './pin';
import { assessCancellation, penaltyForCancellation } from './penalties';
import { holdEndsAt } from './penalty-window';
import {
  DuplicateHostSeatError,
  GuestLimitError,
  HostSeatNotActiveError,
  SeatNotFoundError,
  type Player,
} from './store';
import { computeOrder } from './order';
import {
  fail,
  isOpenForChanges,
  isOpenForSignup,
  loadSession,
  loadWithSession,
  newSeatId,
  placeOf,
  seatRow,
  summarise,
  timesOf,
  type LoadedSession,
  type ServiceDeps,
} from './service-core';
import {
  deviceBlock,
  globalBlock,
  recordDeviceRight,
  recordDeviceWrong,
  recordGlobalAttempt,
  throttleExpiry,
} from './throttle';
import { guestLimitAt, sessionStartsAt } from './time';
import type { Seat, Tier } from './types';
import {
  cleanName,
  isSessionId,
  parseGuests,
  parseGuestTier,
  parseTier,
} from './validation';
import {
  toConsequenceView,
  type CancelResult,
  type Failure,
  type MyPlaceView,
  type MySeatView,
  type Outcome,
  type SessionView,
  type SignUpResult,
} from './views';

export const SIGNUP_WINDOW_MS = 10 * 60_000;
export const SIGNUP_MAX_PER_CLIENT = 20;
export const SIGNUP_MAX_PER_SESSION = 300;

const asRecord = (raw: unknown): Record<string, unknown> =>
  typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};

const finiteOrNull = (n: number) => (Number.isFinite(n) ? n : null);

// ---------------------------------------------------------------- public view

/** The public Session page: names only, no numbers, no PINs. Null if unknown. */
export async function getSessionView(
  deps: ServiceDeps,
  sessionId: string,
): Promise<SessionView | null> {
  if (!isSessionId(sessionId)) return null;
  const loaded = await loadSession(deps, sessionId);
  if (!loaded) return null;
  const { club, session, ctx } = loaded;
  const now = deps.now();
  const order = computeOrder(ctx, now);
  const row = (seat: Seat) => seatRow(ctx, seat);

  return {
    clubName: club.name,
    session: summarise(session),
    times: timesOf(ctx),
    now: now.toISOString(),
    released: order.released,
    taken: order.main.length,
    playing: order.main.map(row),
    waitlists: order.waitlists.map((w) => ({ band: w.band, rows: w.seats.map(row) })),
    guestLimit: finiteOrNull(guestLimitAt(session, ctx.rules, now)),
    openForSignup: isOpenForSignup(session, now),
  };
}

// ------------------------------------------------------------ authentication

type Authenticated = {
  ok: true;
  phoneKey: string;
  e164: string;
  player: Player | null;
  /** A PIN chosen in this request (first signup, or after an Organiser reset). */
  newPin: PinHash | null;
};

/**
 * Phone + PIN. A wrong PIN is answered the same way whether or not the number
 * is registered, and only wrong attempts feed the lockout (see `throttle.ts`).
 * `mode: 'signup'` lets an unregistered number choose a PIN; `'manage'` only
 * lets a registered number whose PIN an Organiser cleared choose a new one.
 */
async function authenticate(
  deps: ServiceDeps,
  clubId: string,
  input: Record<string, unknown>,
  mode: 'signup' | 'manage',
): Promise<Authenticated | Failure> {
  if (typeof input.phone !== 'string') return fail('invalid-phone');
  const parsed = normalisePhone(input.phone);
  if (!parsed.ok) return fail('invalid-phone');
  if (typeof input.pin !== 'string' || !/^\d{6}$/.test(input.pin)) {
    return fail('invalid-input', { field: 'pin' });
  }
  const pin = input.pin;
  const key = derivePhoneKey(deps.pepper, parsed.e164);
  const now = deps.now();
  const nowMs = now.getTime();
  const deviceKey = `pin:dev:${key}:${deps.clientKey}`;
  const globalKey = `pin:global:${key}`;

  const [device, global] = await Promise.all([
    deps.store.getThrottle(deviceKey),
    deps.store.getThrottle(globalKey),
  ]);
  const locked = deviceBlock(device, nowMs);
  if (locked.blocked) {
    return fail('locked', { retryAfterSeconds: Math.ceil(locked.retryAfterMs / 1000) });
  }
  const slow = globalBlock(global, nowMs);
  if (slow.blocked) {
    return fail('slow', { retryAfterSeconds: Math.ceil(slow.retryAfterMs / 1000) });
  }

  const recordAttempt = async (wrong: boolean) => {
    const nextDevice = wrong ? recordDeviceWrong(device, nowMs) : recordDeviceRight(device, nowMs);
    const nextGlobal = recordGlobalAttempt(global, nowMs, wrong);
    await Promise.all([
      deps.store.putThrottle(deviceKey, nextDevice, throttleExpiry(nextDevice, nowMs)),
      deps.store.putThrottle(globalKey, nextGlobal, throttleExpiry(nextGlobal, nowMs)),
    ]);
  };

  const player = await deps.store.getPlayer(clubId, key);

  if (player?.pinHash && player.pinSalt) {
    const right = await verifyPin(deps.pepper, pin, player);
    await recordAttempt(!right);
    if (!right) return fail('bad-credentials');
    return { ok: true, phoneKey: key, e164: parsed.e164, player, newPin: null };
  }

  const mayChoosePin = mode === 'signup' || player !== null;
  if (!mayChoosePin) {
    await verifyPin(deps.pepper, pin, { pinHash: null, pinSalt: null });
    await recordAttempt(true);
    return fail('bad-credentials');
  }

  const check = checkPin(pin);
  if (!check.ok) {
    return check.reason === 'trivial'
      ? fail('trivial-pin')
      : fail('invalid-input', { field: 'pin' });
  }
  return {
    ok: true,
    phoneKey: key,
    e164: parsed.e164,
    player,
    newPin: await hashPin(deps.pepper, pin),
  };
}

async function underSignupLimits(deps: ServiceDeps, sessionId: string): Promise<boolean> {
  const nowMs = deps.now().getTime();
  const windowId = String(Math.floor(nowMs / SIGNUP_WINDOW_MS));
  const expiresAt = new Date(nowMs + 2 * SIGNUP_WINDOW_MS);
  const [perClient, perSession] = await Promise.all([
    deps.store.incrementCounter(`signup:client:${deps.clientKey}`, windowId, expiresAt),
    deps.store.incrementCounter(`signup:session:${sessionId}`, windowId, expiresAt),
  ]);
  return perClient <= SIGNUP_MAX_PER_CLIENT && perSession <= SIGNUP_MAX_PER_SESSION;
}

async function savePlayer(
  deps: ServiceDeps,
  clubId: string,
  auth: Authenticated,
  patch: { displayName?: string; tier?: Tier },
): Promise<Player> {
  const player: Player = {
    clubId,
    phoneKey: auth.phoneKey,
    displayName: patch.displayName ?? auth.player?.displayName ?? '',
    tier: patch.tier ?? auth.player?.tier ?? 'employee',
    phoneLast3: phoneLast3(auth.e164),
    pinHash: auth.newPin?.pinHash ?? auth.player?.pinHash ?? null,
    pinSalt: auth.newPin?.pinSalt ?? auth.player?.pinSalt ?? null,
    updatedAt: deps.now(),
  };
  await deps.store.putPlayer(player);
  return player;
}

// -------------------------------------------------------------------- signup

/** Take a place: a Host seat for the caller, plus their Guest seats. */
export async function signUp(
  deps: ServiceDeps,
  raw: unknown,
): Promise<Outcome<SignUpResult>> {
  const input = asRecord(raw);
  if (typeof input.website === 'string' && input.website.trim() !== '') {
    return fail('rejected'); // honeypot
  }
  if (!isSessionId(input.sessionId)) return fail('not-found');
  const sessionId = input.sessionId;

  if (!(await underSignupLimits(deps, sessionId))) return fail('rate-limited');

  const loaded = await loadSession(deps, sessionId);
  if (!loaded) return fail('not-found');
  const { club, session, ctx } = loaded;
  const now = deps.now();
  if (!isOpenForSignup(session, now)) return fail('session-closed');

  const name = cleanName(input.name);
  if (!name) return fail('invalid-input', { field: 'name' });
  const tier = parseTier(input.tier);
  if (!tier) return fail('invalid-input', { field: 'tier' });
  const guests = parseGuests(input.guests);
  if (!guests) return fail('invalid-input', { field: 'guests' });
  const limit = guestLimitAt(session, ctx.rules, now);
  if (guests.length > limit) return fail('guest-limit');

  const auth = await authenticate(deps, club.id, input, 'signup');
  if (!auth.ok) return auth;

  const seatId = newSeatId();
  const hostSeat: Seat = {
    id: seatId,
    kind: 'host',
    hostSeatId: null,
    phoneKey: auth.phoneKey,
    name,
    tier,
    createdAt: now,
    cancelledAt: null,
    cancelledBy: null,
    attended: false,
  };
  try {
    await deps.store.addHostSeat(session, hostSeat);
  } catch (error) {
    if (error instanceof DuplicateHostSeatError) return fail('already-signed-up');
    throw error;
  }

  for (const [i, guest] of guests.entries()) {
    try {
      await deps.store.addGuestSeat(
        session,
        {
          id: newSeatId(),
          kind: 'guest',
          hostSeatId: seatId,
          phoneKey: null,
          name: guest.name,
          tier: guest.tier,
          createdAt: new Date(now.getTime() + i + 1),
          cancelledAt: null,
          cancelledBy: null,
          attended: false,
        },
        limit,
      );
    } catch (error) {
      if (error instanceof GuestLimitError) return fail('guest-limit');
      throw error;
    }
  }

  await savePlayer(deps, club.id, auth, { displayName: name, tier });

  const after = await loadWithSession(deps, session);
  const place = placeOf(computeOrder(after!.ctx, deps.now()), seatId);
  return { ok: true, seatId, ...place, pinWasSet: auth.newPin !== null };
}

// ------------------------------------------------------------- manage my place

type Mine = { host: Seat; guests: Seat[] };

function mySeats(loaded: LoadedSession, key: string): Mine | null {
  const host = loaded.ctx.seats.find(
    (s) => s.kind === 'host' && s.phoneKey === key && !s.cancelledAt,
  );
  if (!host) return null;
  const guests = loaded.ctx.seats.filter(
    (s) => s.kind === 'guest' && s.hostSeatId === host.id && !s.cancelledAt,
  );
  return { host, guests };
}

async function authenticateForSession(
  deps: ServiceDeps,
  raw: unknown,
): Promise<{ loaded: LoadedSession; auth: Authenticated } | Failure> {
  const input = asRecord(raw);
  if (!isSessionId(input.sessionId)) return fail('not-found');
  const loaded = await loadSession(deps, input.sessionId);
  if (!loaded) return fail('not-found');
  const auth = await authenticate(deps, loaded.club.id, input, 'manage');
  if (!auth.ok) return auth;
  return { loaded, auth };
}

/** Phone + PIN opens "Manage my place": the caller's Seats and what cancelling costs. */
export async function getMyPlace(
  deps: ServiceDeps,
  raw: unknown,
): Promise<Outcome<{ place: MyPlaceView }>> {
  const result = await authenticateForSession(deps, raw);
  if ('error' in result) return result;
  const { loaded, auth } = result;
  const { ctx, club, session } = loaded;
  const now = deps.now();

  if (auth.newPin) await savePlayer(deps, club.id, auth, {});

  const mine = mySeats(loaded, auth.phoneKey);
  const order = computeOrder(ctx, now);
  const seats: MySeatView[] = [];
  if (mine) {
    for (const seat of [mine.host, ...mine.guests]) {
      seats.push({
        id: seat.id,
        kind: seat.kind,
        name: seat.name,
        tier: seat.tier,
        ...placeOf(order, seat.id),
        consequence: toConsequenceView(assessCancellation(ctx, seat.id, now)),
      });
    }
  }
  const limit = guestLimitAt(session, ctx.rules, now);
  const held = holdEndsAt(ctx.penalties, auth.phoneKey, sessionStartsAt(session), now);

  return {
    ok: true,
    place: {
      session: summarise(session),
      displayName: mine?.host.name ?? auth.player?.displayName ?? '',
      tier: mine?.host.tier ?? auth.player?.tier ?? 'employee',
      seats,
      guestsRemaining: mine
        ? finiteOrNull(Math.max(limit - mine.guests.length, 0))
        : null,
      holdUntil: held ? held.toISOString() : null,
      pinWasSet: auth.newPin !== null,
    },
  };
}

/** Cancel the caller's Seat (a Host seat takes its Guest seats with it). */
export async function cancelMySeat(
  deps: ServiceDeps,
  raw: unknown,
): Promise<Outcome<CancelResult>> {
  const result = await authenticateForSession(deps, raw);
  if ('error' in result) return result;
  const { loaded, auth } = result;
  const { ctx, session, club } = loaded;
  if (!isOpenForChanges(session)) return fail('session-closed');
  if (auth.newPin) await savePlayer(deps, club.id, auth, {});

  const seatId = asRecord(raw).seatId;
  const mine = mySeats(loaded, auth.phoneKey);
  const owned = mine ? [mine.host, ...mine.guests] : [];
  if (typeof seatId !== 'string' || !owned.some((s) => s.id === seatId)) {
    return fail('not-found');
  }

  const now = deps.now();
  const penalty = penaltyForCancellation(ctx, seatId, now, 'player');
  let cancelled: Seat[];
  try {
    cancelled = await deps.store.cancelSeat(session, seatId, now, 'player');
  } catch (error) {
    if (error instanceof SeatNotFoundError) return fail('not-found');
    throw error;
  }
  if (cancelled.length === 0) return { ok: true, penalty: null }; // already cancelled

  if (penalty) await deps.store.putPenalty(club.id, penalty);
  return {
    ok: true,
    penalty: penalty
      ? { weeks: penalty.weeks, endsAt: penalty.endsAt.toISOString() }
      : null,
  };
}

/** Change the name or Tier of one of the caller's Seats. */
export async function updateMySeat(
  deps: ServiceDeps,
  raw: unknown,
): Promise<Outcome> {
  const result = await authenticateForSession(deps, raw);
  if ('error' in result) return result;
  const { loaded, auth } = result;
  const { session, club } = loaded;
  if (!isOpenForChanges(session)) return fail('session-closed');

  const input = asRecord(raw);
  const mine = mySeats(loaded, auth.phoneKey);
  const seat = [mine?.host, ...(mine?.guests ?? [])].find((s) => s?.id === input.seatId);
  if (!seat) return fail('not-found');

  const patch: Partial<Pick<Seat, 'name' | 'tier'>> = {};
  if (input.name !== undefined) {
    const name = cleanName(input.name);
    if (!name) return fail('invalid-input', { field: 'name' });
    patch.name = name;
  }
  if (input.tier !== undefined) {
    const tier = seat.kind === 'host' ? parseTier(input.tier) : parseGuestTier(input.tier);
    if (!tier) return fail('invalid-input', { field: 'tier' });
    patch.tier = tier;
  }
  if (Object.keys(patch).length === 0) return fail('invalid-input');

  await deps.store.updateSeat(session, seat.id, patch);
  await savePlayer(
    deps,
    club.id,
    auth,
    seat.kind === 'host' ? { displayName: patch.name, tier: patch.tier } : {},
  );
  return { ok: true };
}

/** Add Guest seats to the caller's Host seat, within the limit for this moment. */
export async function addMyGuests(
  deps: ServiceDeps,
  raw: unknown,
): Promise<Outcome> {
  const result = await authenticateForSession(deps, raw);
  if ('error' in result) return result;
  const { loaded, auth } = result;
  const { session, club, ctx } = loaded;
  if (!isOpenForChanges(session)) return fail('session-closed');
  if (auth.newPin) await savePlayer(deps, club.id, auth, {});

  const mine = mySeats(loaded, auth.phoneKey);
  if (!mine) return fail('not-found');
  const guests = parseGuests(asRecord(raw).guests);
  if (!guests || guests.length === 0) return fail('invalid-input', { field: 'guests' });

  const now = deps.now();
  const limit = guestLimitAt(session, ctx.rules, now);
  if (mine.guests.length + guests.length > limit) return fail('guest-limit');

  for (const [i, guest] of guests.entries()) {
    try {
      await deps.store.addGuestSeat(
        session,
        {
          id: newSeatId(),
          kind: 'guest',
          hostSeatId: mine.host.id,
          phoneKey: null,
          name: guest.name,
          tier: guest.tier,
          createdAt: new Date(now.getTime() + i),
          cancelledAt: null,
          cancelledBy: null,
          attended: false,
        },
        limit,
      );
    } catch (error) {
      if (error instanceof GuestLimitError) return fail('guest-limit');
      if (error instanceof HostSeatNotActiveError) return fail('not-found');
      throw error;
    }
  }
  return { ok: true };
}

