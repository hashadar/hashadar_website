import { courtBoard } from '@/data';
import { formatInstant, formatInstantDate } from '@/lib/court-board/format';
import type { ConsequenceView } from '@/lib/court-board/views';
import { fillTemplate } from './fill-template';

export function weeksPhrase(weeks: number): { weeks: number; weekUnit: string } {
  const { weekUnit } = courtBoard.player.manage;
  return { weeks, weekUnit: weeks === 1 ? weekUnit.one : weekUnit.other };
}

/** What cancelling costs, in words, shown before the Player confirms. */
export function consequenceText(consequence: ConsequenceView): string {
  const copy = courtBoard.player.manage;
  switch (consequence.kind) {
    case 'free-before-cutoff':
      return fillTemplate(copy.freeBeforeCutoff, {
        time: formatInstant(consequence.cutoffAt),
      });
    case 'free-grace':
      return fillTemplate(copy.freeGrace, {
        time: formatInstant(consequence.graceEndsAt),
      });
    case 'free-waitlist':
      return copy.freeWaitlist;
    case 'free-guest-seat':
      return copy.freeGuest;
    case 'penalty':
      return fillTemplate(copy.penalty, {
        ...weeksPhrase(consequence.weeks),
        date: formatInstantDate(consequence.endsAt),
      });
  }
}
