import type { Penalty } from './types';

/**
 * A Penalty applies to a Session that starts after the Session it arose from
 * and before the Penalty ends, unless an Organiser had cleared it by `t`.
 */
export function isPenaltyActive(
  penalty: Penalty,
  sessionStartsAt: Date,
  t: Date,
): boolean {
  if (penalty.clearedAt && penalty.clearedAt.getTime() <= t.getTime()) {
    return false;
  }
  return (
    sessionStartsAt.getTime() > penalty.startsAt.getTime() &&
    sessionStartsAt.getTime() < penalty.endsAt.getTime()
  );
}

/**
 * When a Player's hold ends for a Session: the latest `endsAt` of their active
 * Penalties. Overlapping Penalties never add up; null means not on hold.
 */
export function holdEndsAt(
  penalties: readonly Penalty[],
  phoneKey: string,
  sessionStartsAt: Date,
  t: Date,
): Date | null {
  let latest: Date | null = null;
  for (const penalty of penalties) {
    if (penalty.phoneKey !== phoneKey) continue;
    if (!isPenaltyActive(penalty, sessionStartsAt, t)) continue;
    if (!latest || penalty.endsAt.getTime() > latest.getTime()) {
      latest = penalty.endsAt;
    }
  }
  return latest;
}
