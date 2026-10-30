import { TZDate } from '@date-fns/tz';
import type { ClubRules, Session } from './types';

export const CLUB_TIMEZONE = 'Europe/London';

const LOCAL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

function parseLocalDate(localDate: string): [number, number, number] {
  const match = LOCAL_DATE.exec(localDate);
  if (!match) throw new Error(`Invalid local date: ${localDate}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function parseLocalTime(time: string): [number, number] {
  const match = LOCAL_TIME.exec(time);
  if (!match) throw new Error(`Invalid local time: ${time}`);
  return [Number(match[1]), Number(match[2])];
}

/** Calendar arithmetic on a `YYYY-MM-DD` date; independent of any time zone. */
export function addLocalDays(localDate: string, days: number): string {
  const [year, month, day] = parseLocalDate(localDate);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

/** Weekday of a calendar date, 0 = Sunday. */
export function localWeekday(localDate: string): number {
  const [year, month, day] = parseLocalDate(localDate);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** The UTC instant at which a London wall clock shows this date and time. */
export function localToUtc(
  localDate: string,
  time: string,
  timeZone: string = CLUB_TIMEZONE,
): Date {
  const [year, month, day] = parseLocalDate(localDate);
  const [hours, minutes] = parseLocalTime(time);
  return new Date(
    new TZDate(year, month - 1, day, hours, minutes, 0, 0, timeZone).getTime(),
  );
}

type SessionTiming = Pick<Session, 'localDate' | 'startTime'>;

export function sessionStartsAt(session: SessionTiming): Date {
  return localToUtc(session.localDate, session.startTime);
}

/** The latest `weekday` + `time` (London) that is not after the Session starts. */
function latestOccurrence(
  session: SessionTiming,
  weekday: number,
  time: string,
): Date {
  const startsAt = sessionStartsAt(session);
  const daysBack = (localWeekday(session.localDate) - weekday + 7) % 7;
  const sameWeek = localToUtc(addLocalDays(session.localDate, -daysBack), time);
  if (sameWeek.getTime() <= startsAt.getTime()) return sameWeek;
  return localToUtc(addLocalDays(session.localDate, -daysBack - 7), time);
}

export function releaseAt(session: SessionTiming, rules: ClubRules): Date {
  return latestOccurrence(session, rules.release.weekday, rules.release.time);
}

export function topUpAt(session: SessionTiming, rules: ClubRules): Date {
  return latestOccurrence(session, rules.topUp.weekday, rules.topUp.time);
}

/**
 * Same wall-clock time `cutoffDaysBefore` calendar days earlier, so a clock
 * change never moves it (Fri 9:00 for a Sat 9:00 Session, 23 or 25 real hours
 * either side of a change).
 */
export function cutoffAt(session: SessionTiming, rules: ClubRules): Date {
  return localToUtc(
    addLocalDays(session.localDate, -rules.cutoffDaysBefore),
    session.startTime,
  );
}

/** Guest seats a Player may hold at `t`: capped before Top-up, unlimited after. */
export function guestLimitAt(
  session: SessionTiming,
  rules: ClubRules,
  t: Date,
): number {
  return t.getTime() >= topUpAt(session, rules).getTime()
    ? Number.POSITIVE_INFINITY
    : rules.guestLimitBeforeTopUp;
}

/** When a Penalty of `weeks` calendar weeks from the Session date stops applying. */
export function penaltyEndsAt(localDate: string, weeks: number): Date {
  return localToUtc(addLocalDays(localDate, weeks * 7), '00:00');
}
