import { courtBoard } from '@/data';
import { formatInstant } from '@/lib/court-board/format';
import type { SessionView } from '@/lib/court-board/views';
import { fillTemplate } from './fill-template';

/**
 * The status card's "what happens next" sentences, from the Session's own
 * times and the moment the page was rendered (`view.now`), so the words stay
 * true to the Order the server just computed.
 */
export function statusSentences(view: SessionView): string[] {
  const copy = courtBoard.player.session;
  const { session, times, released } = view;
  const now = new Date(view.now).getTime();

  if (session.status === 'cancelled') return [copy.cancelledNotice];
  if (session.registerClosed) return [copy.closedNotice];
  if (now >= new Date(times.startsAt).getTime()) return [copy.startedNotice];

  const cutoff = formatInstant(times.cutoffAt);
  const sentences: string[] = [];
  if (!released) {
    sentences.push(
      fillTemplate(copy.beforeRelease, {
        release: formatInstant(times.releaseAt),
        cutoff,
      }),
    );
  } else if (now < new Date(times.cutoffAt).getTime()) {
    sentences.push(fillTemplate(copy.afterRelease, { cutoff }));
  } else {
    sentences.push(copy.afterCutoff);
  }

  if (view.guestLimit !== null) {
    sentences.push(
      fillTemplate(copy.topUpNote, {
        topUp: formatInstant(times.topUpAt),
        limit: view.guestLimit,
      }),
    );
  }
  return sentences;
}
