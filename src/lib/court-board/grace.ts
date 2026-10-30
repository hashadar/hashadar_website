import { computeOrder } from './order';
import { cutoffAt, releaseAt } from './time';
import type { SessionContext } from './types';

/**
 * The earliest instant in `[Cutoff, until]` at which the Order puts a Seat on
 * the Main list, or null if it never does. The Order only changes at events
 * (a Seat created or cancelled, a Penalty cleared, Release), so replaying it
 * at each event time after the Cutoff finds the exact moment. This is why
 * Seats are soft-cancelled.
 */
export function firstReachedMain(
  ctx: SessionContext,
  seatId: string,
  until: Date,
): Date | null {
  const cutoff = cutoffAt(ctx.session, ctx.rules).getTime();
  const end = until.getTime();

  const instants = new Set<number>([cutoff, releaseAt(ctx.session, ctx.rules).getTime()]);
  for (const seat of ctx.seats) {
    instants.add(seat.createdAt.getTime());
    if (seat.cancelledAt) instants.add(seat.cancelledAt.getTime());
  }
  for (const penalty of ctx.penalties) {
    if (penalty.clearedAt) instants.add(penalty.clearedAt.getTime());
  }

  const replay = [...instants]
    .filter((ms) => ms >= cutoff && ms <= end)
    .sort((a, b) => a - b);

  for (const ms of replay) {
    const t = new Date(ms);
    if (computeOrder(ctx, t).main.some((s) => s.id === seatId)) return t;
  }
  return null;
}

/**
 * When free cancellation ends for a Seat that first reached the Main list
 * after the Cutoff; null if it reached the list at or before the Cutoff (no
 * Grace period) or never did. Cancelling at exactly this instant is still free.
 */
export function graceEndsAt(
  ctx: SessionContext,
  seatId: string,
  until: Date,
): Date | null {
  const reached = firstReachedMain(ctx, seatId, until);
  if (!reached) return null;
  if (reached.getTime() <= cutoffAt(ctx.session, ctx.rules).getTime()) {
    return null;
  }
  return new Date(reached.getTime() + ctx.rules.graceMinutes * 60_000);
}
