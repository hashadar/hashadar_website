import { TZDate } from '@date-fns/tz';
import { CLUB_TIMEZONE } from './time';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const pad = (n: number) => String(n).padStart(2, '0');

/** `Sat 7 Nov` from a `YYYY-MM-DD` calendar date. */
export function formatLocalDate(localDate: string): string {
  const [year, month, day] = localDate.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return `${DAYS[weekday]} ${day} ${MONTHS[month - 1]}`;
}

/** `9:00` from `09:00`. */
export function formatLocalTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  return `${hours}:${pad(minutes)}`;
}

/** `Thu 12:00`: a moment on the London wall clock. */
export function formatInstant(instant: Date | string): string {
  const d = new TZDate(new Date(instant), CLUB_TIMEZONE);
  return `${DAYS[d.getDay()]} ${d.getHours()}:${pad(d.getMinutes())}`;
}

/** `Sat 28 Nov` for the London calendar date of a moment. */
export function formatInstantDate(instant: Date | string): string {
  const d = new TZDate(new Date(instant), CLUB_TIMEZONE);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** `YYYY-MM-DD` of the London calendar date of a moment. */
export function londonDateOf(instant: Date | string): string {
  const d = new TZDate(new Date(instant), CLUB_TIMEZONE);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
