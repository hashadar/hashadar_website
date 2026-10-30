import { formatLocalTime } from './format';
import type { Club } from './store';

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * The Club's rules as plain values for the public "Club rules" page. Built from
 * the same settings the Order and Penalty code read, so the page cannot drift
 * from how the list actually behaves.
 */
export interface RulesView {
  clubName: string;
  venue: string;
  release: { weekday: string; time: string };
  topUp: { weekday: string; time: string };
  cutoffDaysBefore: number;
  grace: { amount: number; unit: 'hour' | 'minute' };
  guestLimitBeforeTopUp: number;
  penaltyWeeks: {
    lateCancel: number;
    noShowHost: number;
    noShowHostAndGuest: number;
    noShowGuest: number;
  };
  /** Weeks on hold for late-cancelling only a guest's place; 0 means no hold. */
  guestLateCancelWeeks: number;
}

export function buildRulesView(
  club: Pick<Club, 'name' | 'venue' | 'rules'>,
): RulesView {
  const { rules } = club;
  const wholeHours = rules.graceMinutes > 0 && rules.graceMinutes % 60 === 0;
  return {
    clubName: club.name,
    venue: club.venue,
    release: {
      weekday: WEEKDAYS[rules.release.weekday] ?? WEEKDAYS[0],
      time: formatLocalTime(rules.release.time),
    },
    topUp: {
      weekday: WEEKDAYS[rules.topUp.weekday] ?? WEEKDAYS[0],
      time: formatLocalTime(rules.topUp.time),
    },
    cutoffDaysBefore: rules.cutoffDaysBefore,
    grace: wholeHours
      ? { amount: rules.graceMinutes / 60, unit: 'hour' }
      : { amount: rules.graceMinutes, unit: 'minute' },
    guestLimitBeforeTopUp: rules.guestLimitBeforeTopUp,
    penaltyWeeks: { ...rules.penaltyWeeks },
    guestLateCancelWeeks: rules.guestLateCancelWeeks,
  };
}
