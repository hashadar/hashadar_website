import { formatLocalDate, formatLocalTime } from './format';
import type { SeatRow, SessionSummary } from './views';

const label = (row: SeatRow) =>
  row.kind === 'guest' && row.hostName
    ? `${row.name} (guest of ${row.hostName})`
    : row.name;

/**
 * The list an Organiser pastes into the WhatsApp group. Before Release the
 * per-band Waitlists are joined in band order (Employee, Alumni, External).
 */
export function buildWhatsappList(input: {
  session: SessionSummary;
  playing: SeatRow[];
  waiting: SeatRow[];
  signupUrl: string;
}): string {
  const { session, playing, waiting, signupUrl } = input;
  const lines = [
    `*${formatLocalDate(session.localDate)} · ${formatLocalTime(session.startTime)}–${formatLocalTime(session.endTime)} · ${session.venue}*`,
    `Playing (${playing.length}/${session.capacity})`,
    ...playing.map((row, i) => `${i + 1}. ${label(row)}`),
  ];
  if (waiting.length > 0) {
    lines.push('Waitlist', ...waiting.map((row, i) => `${i + 1}. ${label(row)}`));
  }
  lines.push(`Sign up / cancel: ${signupUrl}`);
  return lines.join('\n');
}
