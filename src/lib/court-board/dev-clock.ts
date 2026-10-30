/**
 * Local-only time travel for testing the rules (Release, Cutoff, Grace period)
 * without waiting for Thursday. Never active in production: `currentNow()`
 * ignores the offset there, and the action that sets it refuses.
 */
type ClockGlobal = typeof globalThis & { __courtBoardClockOffsetMs?: number };

export function isDevelopment(): boolean {
  return process.env.NODE_ENV !== 'production';
}

export function currentNow(): Date {
  const offset = isDevelopment()
    ? ((globalThis as ClockGlobal).__courtBoardClockOffsetMs ?? 0)
    : 0;
  return new Date(Date.now() + offset);
}

/** Make "now" read as `target` from this moment on (the clock keeps ticking). */
export function setDevClock(target: Date | null): void {
  if (!isDevelopment()) throw new Error('The dev clock is not available in production');
  (globalThis as ClockGlobal).__courtBoardClockOffsetMs = target
    ? target.getTime() - Date.now()
    : 0;
}

export function devClockOffsetMs(): number {
  return isDevelopment() ? ((globalThis as ClockGlobal).__courtBoardClockOffsetMs ?? 0) : 0;
}
