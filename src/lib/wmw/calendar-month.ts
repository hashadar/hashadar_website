import type { CalendarMonth } from '@/lib/wmw/types';

const MONTH_KEY = /^(\d{4})-(\d{2})$/;
const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Extract `YYYY-MM` from a calendar date `YYYY-MM-DD`. */
export function calendarMonthFromDate(date: string): CalendarMonth {
  const match = DATE_KEY.exec(date);
  if (!match) {
    throw new Error(`Expected calendar date YYYY-MM-DD, got: ${date}`);
  }
  return `${match[1]}-${match[2]}`;
}

/** Lexicographic compare for `YYYY-MM` / `YYYY-MM-DD` ISO keys. */
export function compareIsoKeys(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export function isCalendarMonth(value: string): value is CalendarMonth {
  if (!MONTH_KEY.test(value)) return false;
  const month = Number(value.slice(5, 7));
  return month >= 1 && month <= 12;
}
