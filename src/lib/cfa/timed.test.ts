import { describe, expect, it } from 'vitest';
import {
  formatClock,
  remainingSeconds,
  scoreSet,
  SECONDS_PER_QUESTION,
  timedBudgetSeconds,
} from '@/lib/cfa/timed';
import { makeQuestion } from '@/test/fixtures/cfa';

describe('timed Sets', () => {
  it('budgets 90 seconds per Question', () => {
    expect(SECONDS_PER_QUESTION).toBe(90);
    expect(timedBudgetSeconds(20)).toBe(1800);
    expect(timedBudgetSeconds(-1)).toBe(0);
  });

  it('counts down and stops at zero', () => {
    expect(remainingSeconds(1_000, 90, 31_500)).toBe(60);
    expect(remainingSeconds(1_000, 90, 500_000)).toBe(0);
  });

  it('formats the clock', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(65)).toBe('1:05');
    expect(formatClock(3725)).toBe('1:02:05');
  });

  it('scores unanswered Questions as wrong', () => {
    const q1 = makeQuestion({ answer: 'B' });
    const q2 = makeQuestion({ answer: 'C' });
    const q3 = makeQuestion({ answer: 'A' });
    expect(
      scoreSet([q1, q2, q3], { [q1.id]: 'B', [q2.id]: 'A' }, { [q1.id]: 42.26 }),
    ).toEqual([
      { questionId: q1.id, chosen: 'B', correct: true, secondsTaken: 42.3 },
      { questionId: q2.id, chosen: 'A', correct: false, secondsTaken: 0 },
      { questionId: q3.id, chosen: null, correct: false, secondsTaken: 0 },
    ]);
  });
});
