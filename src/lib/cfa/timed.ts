import type { CfaAnswer, CfaQuestion } from '@/lib/cfa/types';

/** Exam pace: 90 seconds per Question on average. */
export const SECONDS_PER_QUESTION = 90;

export function timedBudgetSeconds(questionCount: number): number {
  return Math.max(0, Math.floor(questionCount)) * SECONDS_PER_QUESTION;
}

export function remainingSeconds(
  startedAtMs: number,
  budgetSeconds: number,
  nowMs: number,
): number {
  const elapsed = Math.floor(Math.max(0, nowMs - startedAtMs) / 1000);
  return Math.max(0, budgetSeconds - elapsed);
}

/** `m:ss`, or `h:mm:ss` from an hour up. */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

export type SetResult = {
  questionId: string;
  chosen: CfaAnswer | null;
  correct: boolean;
  secondsTaken: number;
};

/**
 * Score a finished Set. Unanswered Questions count as wrong (as in the exam).
 * `secondsByQuestion` is the time spent on each Question, rounded to 0.1 s.
 */
export function scoreSet(
  questions: readonly CfaQuestion[],
  answers: Record<string, CfaAnswer | null | undefined>,
  secondsByQuestion: Record<string, number> = {},
): SetResult[] {
  return questions.map((question) => {
    const chosen = answers[question.id] ?? null;
    return {
      questionId: question.id,
      chosen,
      correct: chosen === question.answer,
      secondsTaken: Math.round((secondsByQuestion[question.id] ?? 0) * 10) / 10,
    };
  });
}
