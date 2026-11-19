import { differenceInCalendarDays, parseISO } from 'date-fns';
import { isDue } from '@/lib/cfa/leitner';
import type {
  CfaAttempt,
  CfaQuestion,
  CfaReviewState,
  CfaSyllabus,
} from '@/lib/cfa/types';

/** Minimum Attempts before an LOS can be called "weakest" (avoids noise). */
export const WEAKEST_LOS_MIN_ATTEMPTS = 5;

export type AccuracyTally = {
  attempts: number;
  correct: number;
  /** correct / attempts, or null with no Attempts. */
  accuracy: number | null;
};

export function tally(attempts: readonly Pick<CfaAttempt, 'correct'>[]): AccuracyTally {
  const correct = attempts.filter((attempt) => attempt.correct).length;
  return {
    attempts: attempts.length,
    correct,
    accuracy: attempts.length === 0 ? null : correct / attempts.length,
  };
}

/** Calendar days from today to the exam date (negative once it has passed). */
export function daysToExam(examDate: string, now: Date): number {
  return differenceInCalendarDays(parseISO(examDate), now);
}

export function bankCountsByModule(
  questions: readonly CfaQuestion[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const question of questions) {
    counts[question.module] = (counts[question.module] ?? 0) + 1;
  }
  return counts;
}

export function indexQuestions(
  questions: readonly CfaQuestion[],
): Map<string, CfaQuestion> {
  return new Map(questions.map((question) => [question.id, question]));
}

/** Attempts whose Question still exists (deleted Questions keep history but no Module). */
export function attributedAttempts(
  attempts: readonly CfaAttempt[],
  questionsById: Map<string, CfaQuestion>,
): Array<{ attempt: CfaAttempt; question: CfaQuestion }> {
  const rows: Array<{ attempt: CfaAttempt; question: CfaQuestion }> = [];
  for (const attempt of attempts) {
    const question = questionsById.get(attempt.questionId);
    if (question) rows.push({ attempt, question });
  }
  return rows;
}

export function accuracyByModule(
  attempts: readonly CfaAttempt[],
  questionsById: Map<string, CfaQuestion>,
): Record<string, AccuracyTally> {
  const grouped: Record<string, CfaAttempt[]> = {};
  for (const { attempt, question } of attributedAttempts(attempts, questionsById)) {
    (grouped[question.module] ??= []).push(attempt);
  }
  return Object.fromEntries(
    Object.entries(grouped).map(([moduleId, list]) => [moduleId, tally(list)]),
  );
}

export type AnsweredSummary = {
  /** Distinct Questions with at least one Attempt (including deleted ones). */
  questionsAnswered: number;
  attempts: number;
  overall: AccuracyTally;
};

export function answeredSummary(attempts: readonly CfaAttempt[]): AnsweredSummary {
  return {
    questionsAnswered: new Set(attempts.map((attempt) => attempt.questionId)).size,
    attempts: attempts.length,
    overall: tally(attempts),
  };
}

export function normaliseLosKey(los: string): string {
  return los
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.;:,]+$/, '');
}

export type LosRow = AccuracyTally & {
  key: string;
  los: string;
  module: string;
  reading: string;
};

/**
 * Weakest LOS by accuracy, only counting LOS with at least `minAttempts`
 * Attempts. Ties go to the LOS with more Attempts (stronger evidence).
 */
export function weakestLos(
  attempts: readonly CfaAttempt[],
  questionsById: Map<string, CfaQuestion>,
  options: { minAttempts?: number; limit?: number } = {},
): LosRow[] {
  const minAttempts = options.minAttempts ?? WEAKEST_LOS_MIN_ATTEMPTS;
  const limit = options.limit ?? 5;
  const groups = new Map<
    string,
    { attempts: CfaAttempt[]; label: CfaQuestion }
  >();

  for (const { attempt, question } of attributedAttempts(attempts, questionsById)) {
    if (!question.los?.trim()) continue;
    const key = `${question.module}|${normaliseLosKey(question.los)}`;
    const group = groups.get(key) ?? { attempts: [], label: question };
    group.attempts.push(attempt);
    if (question.createdAt > group.label.createdAt) group.label = question;
    groups.set(key, group);
  }

  return [...groups.entries()]
    .map(([key, group]) => ({
      key,
      los: group.label.los?.trim() ?? '',
      module: group.label.module,
      reading: group.label.reading,
      ...tally(group.attempts),
    }))
    .filter((row) => row.attempts >= minAttempts)
    .sort(
      (a, b) =>
        (a.accuracy ?? 0) - (b.accuracy ?? 0) ||
        b.attempts - a.attempts ||
        a.key.localeCompare(b.key),
    )
    .slice(0, limit);
}

/** Questions in the Mistakes deck whose due day has started. */
export function dueCount(
  reviewStates: readonly CfaReviewState[],
  questionsById: Map<string, CfaQuestion>,
  now: Date,
): number {
  return reviewStates.filter(
    (state) => questionsById.has(state.questionId) && isDue(state, now),
  ).length;
}

export type ModuleRow = {
  moduleId: string;
  name: string;
  weightMin: number;
  weightMax: number;
  bank: number;
} & AccuracyTally;

/** One row per syllabus Module: bank size, accuracy, and its exam weight. */
export function moduleRows(
  syllabus: CfaSyllabus,
  questions: readonly CfaQuestion[],
  attempts: readonly CfaAttempt[],
): ModuleRow[] {
  const bank = bankCountsByModule(questions);
  const accuracy = accuracyByModule(attempts, indexQuestions(questions));
  return syllabus.modules.map((module) => ({
    moduleId: module.id,
    name: module.name,
    weightMin: module.weight.min,
    weightMax: module.weight.max,
    bank: bank[module.id] ?? 0,
    ...(accuracy[module.id] ?? tally([])),
  }));
}

export function formatPercent(value: number | null): string {
  return value === null ? '—' : `${Math.round(value * 100)}%`;
}
