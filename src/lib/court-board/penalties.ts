import { graceEndsAt } from './grace';
import { computeOrder } from './order';
import { cutoffAt, penaltyEndsAt, sessionStartsAt } from './time';
import type {
  CancelledBy,
  Penalty,
  PenaltyReason,
  Seat,
  SessionContext,
} from './types';

export type CancellationConsequence =
  | { kind: 'free-waitlist' }
  | { kind: 'free-before-cutoff'; cutoffAt: Date }
  | { kind: 'free-grace'; graceEndsAt: Date }
  | { kind: 'free-guest-seat' }
  | { kind: 'penalty'; reason: PenaltyReason; weeks: number; endsAt: Date };

function findSeat(ctx: SessionContext, seatId: string): Seat {
  const seat = ctx.seats.find((s) => s.id === seatId);
  if (!seat) throw new Error(`Unknown seat: ${seatId}`);
  return seat;
}

/** The Player a Seat's Penalty lands on: always the Host seat's phone. */
function hostPhoneKey(ctx: SessionContext, seat: Seat): string {
  const host = seat.kind === 'host' ? seat : findSeat(ctx, seat.hostSeatId ?? '');
  if (!host.phoneKey) throw new Error(`Host seat ${host.id} has no phone key`);
  return host.phoneKey;
}

/**
 * What cancelling a Seat at `at` costs. The Order is read just before `at`, so
 * the same answer comes back whether the Seat is about to be cancelled (the
 * "Cancel anyway" warning) or was already cancelled at `at`.
 */
export function assessCancellation(
  ctx: SessionContext,
  seatId: string,
  at: Date,
): CancellationConsequence {
  const seat = findSeat(ctx, seatId);
  const justBefore = new Date(at.getTime() - 1);
  const order = computeOrder(ctx, justBefore);
  if (!order.main.some((s) => s.id === seat.id)) {
    return { kind: 'free-waitlist' };
  }

  const cutoff = cutoffAt(ctx.session, ctx.rules);
  if (at.getTime() <= cutoff.getTime()) {
    return { kind: 'free-before-cutoff', cutoffAt: cutoff };
  }

  const graceEnd = graceEndsAt(ctx, seat.id, justBefore);
  if (graceEnd && at.getTime() <= graceEnd.getTime()) {
    return { kind: 'free-grace', graceEndsAt: graceEnd };
  }

  const isGuest = seat.kind === 'guest';
  const weeks = isGuest
    ? ctx.rules.guestLateCancelWeeks
    : ctx.rules.penaltyWeeks.lateCancel;
  if (weeks <= 0) return { kind: 'free-guest-seat' };

  return {
    kind: 'penalty',
    reason: isGuest ? 'late-cancel-guest' : 'late-cancel',
    weeks,
    endsAt: penaltyEndsAt(ctx.session.localDate, weeks),
  };
}

/**
 * The Penalty, if any, for a Seat cancelled at `at`. Only a Player's own
 * cancellation can cost anything; an Organiser removing a Seat, or a Host
 * seat's cancellation cascading to its Guest seats, never does.
 */
export function penaltyForCancellation(
  ctx: SessionContext,
  seatId: string,
  at: Date,
  cancelledBy: CancelledBy,
): Penalty | null {
  if (cancelledBy !== 'player') return null;
  const consequence = assessCancellation(ctx, seatId, at);
  if (consequence.kind !== 'penalty') return null;
  return {
    phoneKey: hostPhoneKey(ctx, findSeat(ctx, seatId)),
    sessionId: ctx.session.id,
    reason: consequence.reason,
    weeks: consequence.weeks,
    startsAt: sessionStartsAt(ctx.session),
    endsAt: consequence.endsAt,
    clearedAt: null,
  };
}

/**
 * Penalties when the Organiser closes the register: one per Host whose Main
 * list Seats (at session start) were not all attended. Waitlisted Seats can
 * never be No-shows.
 */
export function registerClosePenalties(ctx: SessionContext): Penalty[] {
  const { rules, session } = ctx;
  const { main } = computeOrder(ctx, sessionStartsAt(session));
  const guestsByHost = new Map<string, Seat[]>();
  for (const seat of main) {
    if (seat.kind === 'guest' && seat.hostSeatId) {
      const guests = guestsByHost.get(seat.hostSeatId) ?? [];
      guests.push(seat);
      guestsByHost.set(seat.hostSeatId, guests);
    }
  }

  const penalties: Penalty[] = [];
  for (const host of main) {
    if (host.kind !== 'host' || !host.phoneKey) continue;
    const hostMissed = !host.attended;
    const guestMissed = (guestsByHost.get(host.id) ?? []).some(
      (g) => !g.attended,
    );

    let reason: PenaltyReason;
    let weeks: number;
    if (hostMissed && guestMissed) {
      reason = 'no-show-host-and-guest';
      weeks = rules.penaltyWeeks.noShowHostAndGuest;
    } else if (hostMissed) {
      reason = 'no-show-host';
      weeks = rules.penaltyWeeks.noShowHost;
    } else if (guestMissed) {
      reason = 'no-show-guest';
      weeks = rules.penaltyWeeks.noShowGuest;
    } else {
      continue;
    }
    if (weeks <= 0) continue;

    penalties.push({
      phoneKey: host.phoneKey,
      sessionId: session.id,
      reason,
      weeks,
      startsAt: sessionStartsAt(session),
      endsAt: penaltyEndsAt(session.localDate, weeks),
      clearedAt: null,
    });
  }
  return penalties;
}
