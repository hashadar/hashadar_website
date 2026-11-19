import { addDays, startOfDay } from 'date-fns';
import type { CfaReviewResult, CfaReviewState } from '@/lib/cfa/types';

/**
 * Mistakes deck schedule. Box 1 is where every wrong answer lands (due in one
 * day); each correct answer on a due Question moves it up one box.
 * Box 5 repeats every 30 days.
 */
export const LEITNER_INTERVAL_DAYS = [1, 3, 7, 14, 30] as const;
export const LEITNER_MAX_BOX = LEITNER_INTERVAL_DAYS.length;

export type ReviewUpdate =
  | { action: 'none' }
  | { action: 'upsert'; state: CfaReviewState };

export function intervalDaysForBox(box: number): number {
  const index = Math.min(Math.max(Math.round(box), 1), LEITNER_MAX_BOX) - 1;
  return LEITNER_INTERVAL_DAYS[index];
}

/** Due-date instant: the start of the local day `days` after `answeredAt`'s day. */
export function dueDateAfter(answeredAt: Date, days: number): Date {
  return addDays(startOfDay(answeredAt), days);
}

/** A Question is due once the start of its due day has passed. */
export function isDue(state: CfaReviewState, now: Date): boolean {
  return new Date(state.dueAt).getTime() <= now.getTime();
}

/**
 * Next Leitner state after an Attempt.
 * - Wrong (any box, or not yet in the deck): box 1, due tomorrow.
 * - Correct on a due Question: up one box (capped at 5) on that box's interval.
 * - Correct on a Question that is not in the deck, or not yet due: no change.
 */
export function nextReviewState(
  questionId: string,
  previous: CfaReviewState | null,
  result: CfaReviewResult,
  answeredAt: Date,
): ReviewUpdate {
  const answeredIso = answeredAt.toISOString();

  if (result === 'wrong') {
    return {
      action: 'upsert',
      state: {
        questionId,
        box: 1,
        dueAt: dueDateAfter(answeredAt, intervalDaysForBox(1)).toISOString(),
        lastResult: 'wrong',
        lastAnsweredAt: answeredIso,
      },
    };
  }

  if (!previous || !isDue(previous, answeredAt)) {
    return { action: 'none' };
  }

  const box = Math.min(previous.box + 1, LEITNER_MAX_BOX);
  return {
    action: 'upsert',
    state: {
      questionId,
      box,
      dueAt: dueDateAfter(answeredAt, intervalDaysForBox(box)).toISOString(),
      lastResult: 'correct',
      lastAnsweredAt: answeredIso,
    },
  };
}
