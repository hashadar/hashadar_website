import type { ThrottleRecord } from './store';

/**
 * PIN lockout (ADR 0013). Only wrong attempts count.
 *
 * Per (phone, client): 5 wrong PINs lock that client out of that number for
 * 15 minutes, doubling on each repeat. Per phone, all clients: after 20 wrong
 * in 24 hours, attempts are slowed to one a minute rather than refused, so
 * nobody can lock the real Player out just before Release.
 */
export const DEVICE_MAX_WRONG = 5;
export const DEVICE_LOCK_BASE_MS = 15 * 60_000;
export const DEVICE_MAX_LOCK_LEVEL = 6;
export const GLOBAL_MAX_WRONG = 20;
export const GLOBAL_WINDOW_MS = 24 * 60 * 60_000;
export const GLOBAL_SLOW_INTERVAL_MS = 60_000;
export const RECORD_RETENTION_MS = 24 * 60 * 60_000;

export const emptyThrottle = (): ThrottleRecord => ({
  count: 0,
  windowStartMs: 0,
  lockedUntilMs: 0,
  lockLevel: 0,
  lastAttemptMs: 0,
});

export type Blocked = { blocked: false } | { blocked: true; retryAfterMs: number };

export function deviceBlock(record: ThrottleRecord | null, nowMs: number): Blocked {
  if (record && record.lockedUntilMs > nowMs) {
    return { blocked: true, retryAfterMs: record.lockedUntilMs - nowMs };
  }
  return { blocked: false };
}

export function recordDeviceWrong(
  record: ThrottleRecord | null,
  nowMs: number,
): ThrottleRecord {
  const next = { ...(record ?? emptyThrottle()), lastAttemptMs: nowMs };
  next.count += 1;
  if (next.count >= DEVICE_MAX_WRONG) {
    next.lockLevel = Math.min(next.lockLevel + 1, DEVICE_MAX_LOCK_LEVEL);
    next.lockedUntilMs = nowMs + DEVICE_LOCK_BASE_MS * 2 ** (next.lockLevel - 1);
    next.count = 0;
  }
  return next;
}

/** A right PIN clears the run of wrong ones but not the escalation level. */
export function recordDeviceRight(
  record: ThrottleRecord | null,
  nowMs: number,
): ThrottleRecord {
  return { ...(record ?? emptyThrottle()), count: 0, lastAttemptMs: nowMs };
}

export function globalBlock(record: ThrottleRecord | null, nowMs: number): Blocked {
  if (!record || nowMs - record.windowStartMs >= GLOBAL_WINDOW_MS) {
    return { blocked: false };
  }
  if (record.count <= GLOBAL_MAX_WRONG) return { blocked: false };
  const wait = record.lastAttemptMs + GLOBAL_SLOW_INTERVAL_MS - nowMs;
  return wait > 0 ? { blocked: true, retryAfterMs: wait } : { blocked: false };
}

/** Record an attempt at the phone number level; `wrong` adds to the 24 h tally. */
export function recordGlobalAttempt(
  record: ThrottleRecord | null,
  nowMs: number,
  wrong: boolean,
): ThrottleRecord {
  const fresh = !record || nowMs - record.windowStartMs >= GLOBAL_WINDOW_MS;
  const base = fresh ? { ...emptyThrottle(), windowStartMs: nowMs } : { ...record };
  return {
    ...base,
    count: base.count + (wrong ? 1 : 0),
    lastAttemptMs: nowMs,
  };
}

export function throttleExpiry(record: ThrottleRecord, nowMs: number): Date {
  return new Date(Math.max(record.lockedUntilMs, nowMs) + RECORD_RETENTION_MS);
}
