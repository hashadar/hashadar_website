/**
 * Made-up placeholder data for CFA Lab tests. Never put real practice
 * questions or screenshots in the repo (docs/adr/0014-cfa-question-content-private-storage.md).
 */
import type {
  CfaAttempt,
  CfaQuestion,
  CfaReviewState,
  CfaSyllabus,
} from '@/lib/cfa/types';

export const testSyllabus: CfaSyllabus = {
  modules: [
    {
      id: 'alpha',
      name: 'Alpha Module',
      weight: { min: 10, max: 15 },
      readings: [
        { id: 'alpha-one', name: 'Alpha Reading One' },
        { id: 'alpha-two', name: 'Alpha Reading Two' },
      ],
    },
    {
      id: 'beta',
      name: 'Beta Module',
      weight: { min: 6, max: 9 },
      readings: [{ id: 'beta-one', name: 'Beta Reading One' }],
    },
    {
      id: 'gamma',
      name: 'Gamma Module',
      weight: { min: 11, max: 14 },
      readings: [{ id: 'gamma-one', name: 'Gamma Reading One' }],
    },
  ],
};

let counter = 0;

export function makeQuestion(partial: Partial<CfaQuestion> = {}): CfaQuestion {
  counter += 1;
  return {
    id: `q-${counter}`,
    module: 'alpha',
    reading: 'alpha-one',
    los: 'placeholder outcome',
    stem: `Placeholder stem number ${counter} about widgets and gizmos?`,
    options: ['Option one', 'Option two', 'Option three'],
    answer: 'A',
    explanation: null,
    explanationIsAiDrafted: false,
    calculator: null,
    source: null,
    screenshotKeys: [],
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: null,
    ...partial,
  };
}

export function makeAttempt(partial: Partial<CfaAttempt> = {}): CfaAttempt {
  counter += 1;
  return {
    id: `a-${counter}`,
    questionId: 'q-1',
    chosen: 'A',
    correct: true,
    secondsTaken: 60,
    mode: 'practice',
    setId: null,
    answeredAt: '2026-11-02T10:00:00.000Z',
    ...partial,
  };
}

export function makeReviewState(
  partial: Partial<CfaReviewState> = {},
): CfaReviewState {
  return {
    questionId: 'q-1',
    box: 1,
    dueAt: '2026-11-02T00:00:00.000Z',
    lastResult: 'wrong',
    lastAnsweredAt: '2026-11-01T10:00:00.000Z',
    ...partial,
  };
}
