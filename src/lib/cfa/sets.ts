import { isDue } from '@/lib/cfa/leitner';
import { shuffle, type Rng } from '@/lib/cfa/random';
import { normaliseLosKey } from '@/lib/cfa/stats';
import { pickWeightedSet } from '@/lib/cfa/weighting';
import type {
  CfaAttempt,
  CfaQuestion,
  CfaReviewState,
  CfaSyllabus,
} from '@/lib/cfa/types';

/** Gap that ends a capture session: Questions added further apart start a new one. */
export const CAPTURE_SESSION_GAP_MINUTES = 90;

export type SetScope = {
  moduleId?: string | null;
  readingId?: string | null;
  los?: string | null;
};

export function filterByScope(
  questions: readonly CfaQuestion[],
  scope: SetScope,
): CfaQuestion[] {
  const losKey = scope.los?.trim() ? normaliseLosKey(scope.los) : null;
  return questions.filter(
    (question) =>
      (!scope.moduleId || question.module === scope.moduleId) &&
      (!scope.readingId || question.reading === scope.readingId) &&
      (!losKey || (question.los ? normaliseLosKey(question.los) === losKey : false)),
  );
}

export function attemptCounts(
  attempts: readonly CfaAttempt[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const attempt of attempts) {
    counts[attempt.questionId] = (counts[attempt.questionId] ?? 0) + 1;
  }
  return counts;
}

export type BuildSetInput = {
  questions: readonly CfaQuestion[];
  attempts: readonly CfaAttempt[];
  syllabus: CfaSyllabus;
  scope: SetScope;
  /** Mixed Set across all Modules, weighted by exam weight (ignores scope). */
  weighted: boolean;
  count: number;
  rng?: Rng;
};

/**
 * Questions for a Practice or Timed Set. Least-attempted Questions come first
 * so a big bank is covered evenly; order within the Set is shuffled.
 */
export function buildPracticeSet(input: BuildSetInput): CfaQuestion[] {
  const rng = input.rng ?? Math.random;
  const counts = attemptCounts(input.attempts);
  const count = Math.max(0, Math.floor(input.count));

  if (input.weighted) {
    return pickWeightedSet(input.questions, input.syllabus, count, {
      attemptCounts: counts,
      rng,
    });
  }

  const pool = shuffle(filterByScope(input.questions, input.scope), rng).sort(
    (a, b) => (counts[a.id] ?? 0) - (counts[b.id] ?? 0),
  );
  return shuffle(pool.slice(0, count), rng);
}

/** Mistakes deck: due Questions, most overdue first. */
export function mistakesDeck(
  questions: readonly CfaQuestion[],
  reviewStates: readonly CfaReviewState[],
  now: Date,
): CfaQuestion[] {
  const byId = new Map(questions.map((question) => [question.id, question]));
  return reviewStates
    .filter((state) => isDue(state, now) && byId.has(state.questionId))
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
    .map((state) => byId.get(state.questionId) as CfaQuestion);
}

/**
 * The most recent capture session: the newest Question plus every earlier one
 * added within `gapMinutes` of the next. Oldest first, in capture order.
 */
export function lastCaptureSession(
  questions: readonly CfaQuestion[],
  gapMinutes: number = CAPTURE_SESSION_GAP_MINUTES,
): CfaQuestion[] {
  const sorted = [...questions].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  if (sorted.length === 0) return [];
  const gapMs = gapMinutes * 60_000;
  const session = [sorted[0]];
  for (let i = 1; i < sorted.length; i += 1) {
    const newer = Date.parse(sorted[i - 1].createdAt);
    const older = Date.parse(sorted[i].createdAt);
    if (newer - older > gapMs) break;
    session.push(sorted[i]);
  }
  return session.reverse();
}
