import { holdEndsAt } from './penalty-window';
import { releaseAt, sessionStartsAt } from './time';
import {
  TIER_ORDER,
  type SessionContext,
  type Seat,
  type Tier,
} from './types';

export interface Waitlist {
  /** The band a pre-Release Waitlist serves; null for the combined one after Release. */
  band: Tier | null;
  seats: Seat[];
}

export interface Order {
  t: Date;
  released: boolean;
  main: Seat[];
  waitlists: Waitlist[];
  /** Priority band of every active Seat, keyed by seat id. */
  bands: ReadonlyMap<string, Tier>;
}

export type SeatLocation =
  | { state: 'main'; position: number }
  | { state: 'waitlist'; band: Tier | null; position: number };

function compareCreated(a: Seat, b: Seat): number {
  const byTime = a.createdAt.getTime() - b.createdAt.getTime();
  if (byTime !== 0) return byTime;
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

function isActiveAt(seat: Seat, t: Date): boolean {
  const at = t.getTime();
  if (seat.createdAt.getTime() > at) return false;
  return !seat.cancelledAt || seat.cancelledAt.getTime() > at;
}

/**
 * Fill the Main list from `sequence`, a Guest seat only once its Host seat is
 * already on it. A Guest seat met before its Host is skipped and revisited on
 * the next pass, until a pass changes nothing.
 */
function fillMain(sequence: readonly Seat[], capacity: number): Seat[] {
  const main: Seat[] = [];
  const onMain = new Set<string>();
  let changed = true;
  while (changed && main.length < capacity) {
    changed = false;
    for (const seat of sequence) {
      if (main.length >= capacity) break;
      if (onMain.has(seat.id)) continue;
      if (seat.kind === 'guest') {
        if (!seat.hostSeatId || !onMain.has(seat.hostSeatId)) continue;
      }
      main.push(seat);
      onMain.add(seat.id);
      changed = true;
    }
  }
  return main;
}

/**
 * The Order of a Session's Seats at `t`: a pure function of Seats, Penalties
 * and Club rules. Never stored. Release needs no scheduler; it is `t` passing
 * a time.
 */
export function computeOrder(
  { session, seats, penalties, rules }: SessionContext,
  t: Date,
): Order {
  const startsAt = sessionStartsAt(session);
  const releaseTime = releaseAt(session, rules);

  const activeHostIds = new Set(
    seats.filter((s) => s.kind === 'host' && isActiveAt(s, t)).map((s) => s.id),
  );
  // A Guest seat with no active Host seat can never be placed.
  const active = seats.filter(
    (s) =>
      isActiveAt(s, t) &&
      (s.kind === 'host' || (s.hostSeatId && activeHostIds.has(s.hostSeatId))),
  );

  const bands = new Map<string, Tier>();
  for (const seat of active) {
    const penalised =
      seat.kind === 'host' &&
      seat.phoneKey !== null &&
      holdEndsAt(penalties, seat.phoneKey, startsAt, t) !== null;
    bands.set(seat.id, penalised ? 'external' : seat.tier);
  }
  const bandIndex = (seat: Seat) => TIER_ORDER.indexOf(bands.get(seat.id)!);

  const released = t.getTime() >= releaseTime.getTime();

  if (!released) {
    const main = fillMain(
      active.filter((s) => bands.get(s.id) === 'employee').sort(compareCreated),
      session.capacity,
    );
    const onMain = new Set(main.map((s) => s.id));
    const waitlists = TIER_ORDER.map((band) => ({
      band,
      seats: active
        .filter((s) => !onMain.has(s.id) && bands.get(s.id) === band)
        .sort(compareCreated),
    }));
    return { t, released, main, waitlists, bands };
  }

  const beforeRelease = active
    .filter((s) => s.createdAt.getTime() < releaseTime.getTime())
    .sort((a, b) => bandIndex(a) - bandIndex(b) || compareCreated(a, b));
  const afterRelease = active
    .filter((s) => s.createdAt.getTime() >= releaseTime.getTime())
    .sort(compareCreated);
  const sequence = [...beforeRelease, ...afterRelease];

  const main = fillMain(sequence, session.capacity);
  const onMain = new Set(main.map((s) => s.id));
  return {
    t,
    released,
    main,
    waitlists: [{ band: null, seats: sequence.filter((s) => !onMain.has(s.id)) }],
    bands,
  };
}

/** Where a Seat sits in an Order, with 1-based positions; null if not active. */
export function locateSeat(order: Order, seatId: string): SeatLocation | null {
  const mainIndex = order.main.findIndex((s) => s.id === seatId);
  if (mainIndex >= 0) return { state: 'main', position: mainIndex + 1 };
  for (const waitlist of order.waitlists) {
    const index = waitlist.seats.findIndex((s) => s.id === seatId);
    if (index >= 0) {
      return { state: 'waitlist', band: waitlist.band, position: index + 1 };
    }
  }
  return null;
}
