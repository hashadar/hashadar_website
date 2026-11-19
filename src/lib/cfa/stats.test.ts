import { describe, expect, it } from 'vitest';
import {
  accuracyByModule,
  answeredSummary,
  bankCountsByModule,
  daysToExam,
  dueCount,
  formatPercent,
  indexQuestions,
  moduleRows,
  tally,
  weakestLos,
  WEAKEST_LOS_MIN_ATTEMPTS,
} from '@/lib/cfa/stats';
import {
  makeAttempt,
  makeQuestion,
  makeReviewState,
  testSyllabus,
} from '@/test/fixtures/cfa';

function attemptsFor(questionId: string, results: boolean[]) {
  return results.map((correct) => makeAttempt({ questionId, correct }));
}

describe('tally', () => {
  it('computes accuracy, or null with no Attempts', () => {
    expect(tally([])).toEqual({ attempts: 0, correct: 0, accuracy: null });
    expect(
      tally([{ correct: true }, { correct: false }, { correct: true }, { correct: true }]),
    ).toEqual({ attempts: 4, correct: 3, accuracy: 0.75 });
  });
});

describe('daysToExam', () => {
  it('counts calendar days and goes negative after the exam', () => {
    expect(daysToExam('2027-02-03', new Date(2027, 0, 31, 23, 0))).toBe(3);
    expect(daysToExam('2027-02-03', new Date(2027, 1, 3, 8, 0))).toBe(0);
    expect(daysToExam('2027-02-03', new Date(2027, 1, 5, 8, 0))).toBe(-2);
  });
});

describe('bank and accuracy by Module', () => {
  const alphaQ = makeQuestion({ module: 'alpha' });
  const betaQ = makeQuestion({ module: 'beta', reading: 'beta-one' });
  const questions = [alphaQ, betaQ, makeQuestion({ module: 'alpha' })];
  const attempts = [
    ...attemptsFor(alphaQ.id, [true, false, true, true]),
    ...attemptsFor(betaQ.id, [false]),
    // Attempt on a deleted Question: counted as answered, not by Module.
    makeAttempt({ questionId: 'deleted-question', correct: true }),
  ];

  it('counts the bank per Module', () => {
    expect(bankCountsByModule(questions)).toEqual({ alpha: 2, beta: 1 });
  });

  it('groups accuracy by the Question’s current Module', () => {
    expect(accuracyByModule(attempts, indexQuestions(questions))).toEqual({
      alpha: { attempts: 4, correct: 3, accuracy: 0.75 },
      beta: { attempts: 1, correct: 0, accuracy: 0 },
    });
  });

  it('summarises answered Questions including deleted ones', () => {
    expect(answeredSummary(attempts)).toEqual({
      questionsAnswered: 3,
      attempts: 6,
      overall: { attempts: 6, correct: 4, accuracy: 4 / 6 },
    });
  });

  it('builds one row per syllabus Module with its weight', () => {
    const rows = moduleRows(testSyllabus, questions, attempts);
    expect(rows.map((row) => row.moduleId)).toEqual(['alpha', 'beta', 'gamma']);
    expect(rows[0]).toMatchObject({
      bank: 2,
      weightMin: 10,
      weightMax: 15,
      accuracy: 0.75,
    });
    expect(rows[2]).toMatchObject({ bank: 0, attempts: 0, accuracy: null });
  });
});

describe('weakestLos', () => {
  const weak = makeQuestion({ los: 'Calculate the placeholder ratio' });
  const weakTwin = makeQuestion({ los: '  calculate the placeholder ratio. ' });
  const strong = makeQuestion({ los: 'Describe the placeholder process' });
  const tiny = makeQuestion({ los: 'Rarely practised outcome' });
  const noLos = makeQuestion({ los: null });
  const questions = indexQuestions([weak, weakTwin, strong, tiny, noLos]);

  const attempts = [
    ...attemptsFor(weak.id, [false, false, true]),
    ...attemptsFor(weakTwin.id, [false, true]),
    ...attemptsFor(strong.id, [true, true, true, true, false, true]),
    ...attemptsFor(tiny.id, [false, false]),
    ...attemptsFor(noLos.id, [false, false, false, false, false]),
  ];

  it('merges LOS spelled differently and needs a minimum sample', () => {
    expect(WEAKEST_LOS_MIN_ATTEMPTS).toBe(5);
    const rows = weakestLos(attempts, questions);
    expect(rows.map((row) => [row.los.toLowerCase(), row.attempts, row.correct])).toEqual([
      ['calculate the placeholder ratio', 5, 2],
      ['describe the placeholder process', 6, 5],
    ]);
  });

  it('respects a custom minimum and limit', () => {
    const rows = weakestLos(attempts, questions, { minAttempts: 2, limit: 1 });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ los: 'Rarely practised outcome', accuracy: 0 });
  });
});

describe('dueCount', () => {
  it('counts due Questions that still exist', () => {
    const q1 = makeQuestion();
    const q2 = makeQuestion();
    const states = [
      makeReviewState({ questionId: q1.id, dueAt: '2026-11-02T00:00:00.000Z' }),
      makeReviewState({ questionId: q2.id, dueAt: '2026-11-09T00:00:00.000Z' }),
      makeReviewState({ questionId: 'gone', dueAt: '2026-11-01T00:00:00.000Z' }),
    ];
    expect(
      dueCount(states, indexQuestions([q1, q2]), new Date('2026-11-03T12:00:00Z')),
    ).toBe(1);
  });
});

describe('formatPercent', () => {
  it('rounds and shows a dash for no data', () => {
    expect(formatPercent(0.666)).toBe('67%');
    expect(formatPercent(null)).toBe('—');
  });
});
