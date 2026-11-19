/**
 * CFA Lab domain types (docs/cfa/CONTEXT.md). Question content is private to
 * the signed-in Site Admin and lives only in Amplify Data / Storage (ADR 0014).
 */

export const CFA_ANSWERS = ['A', 'B', 'C'] as const;
export type CfaAnswer = (typeof CFA_ANSWERS)[number];

export const CFA_ATTEMPT_MODES = [
  'practice',
  'timed',
  'mistakes',
  'recent',
] as const;
export type CfaAttemptMode = (typeof CFA_ATTEMPT_MODES)[number];

export type CfaReviewResult = 'correct' | 'wrong';

/** Three option texts in A, B, C order. */
export type CfaOptions = [string, string, string];

export type CfaQuestion = {
  id: string;
  /** Module id from `cfa.json` (one of the ten exam topic areas). */
  module: string;
  /** Reading id from `cfa.json` (a learning module within the Module). */
  reading: string;
  los: string | null;
  /** Markdown with KaTeX maths and Markdown tables. */
  stem: string;
  options: CfaOptions;
  answer: CfaAnswer;
  explanation: string | null;
  explanationIsAiDrafted: boolean;
  /** Optional financial-calculator keystrokes. */
  calculator: string | null;
  source: string | null;
  screenshotKeys: string[];
  createdAt: string;
  updatedAt: string | null;
};

export type CfaQuestionInput = Omit<CfaQuestion, 'id' | 'createdAt' | 'updatedAt'>;

export type CfaAttempt = {
  id: string;
  questionId: string;
  /** Null when a timed Set ended before the Question was answered. */
  chosen: CfaAnswer | null;
  correct: boolean;
  secondsTaken: number;
  mode: CfaAttemptMode;
  setId: string | null;
  answeredAt: string;
};

export type CfaAttemptInput = Omit<CfaAttempt, 'id'>;

/** Leitner state for one Question in the Mistakes deck. */
export type CfaReviewState = {
  questionId: string;
  /** 1–5; see `LEITNER_INTERVAL_DAYS`. */
  box: number;
  /** Start of the local calendar day the Question is next due. */
  dueAt: string;
  lastResult: CfaReviewResult;
  lastAnsweredAt: string;
};

export type CfaFlag = {
  id: string;
  questionId: string;
  note: string;
  resolvedAt: string | null;
  createdAt: string;
};

export type CfaReading = {
  id: string;
  name: string;
};

/** Exam weight range in percent, as published for the exam year. */
export type CfaWeightRange = {
  min: number;
  max: number;
};

export type CfaModule = {
  id: string;
  name: string;
  weight: CfaWeightRange;
  readings: CfaReading[];
};

export type CfaSyllabus = {
  modules: CfaModule[];
};
