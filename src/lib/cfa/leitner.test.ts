import { describe, expect, it } from 'vitest';
import {
  dueDateAfter,
  intervalDaysForBox,
  isDue,
  LEITNER_INTERVAL_DAYS,
  nextReviewState,
} from '@/lib/cfa/leitner';
import type { CfaReviewState } from '@/lib/cfa/types';

// Local-time constructors keep these tests independent of the machine's time zone.
const at = (day: number, hour = 9) => new Date(2026, 10, day, hour, 0, 0);
const startOf = (day: number) => new Date(2026, 10, day, 0, 0, 0).toISOString();

function stateAfter(
  previous: CfaReviewState | null,
  result: 'correct' | 'wrong',
  when: Date,
): CfaReviewState | null {
  const update = nextReviewState('q-1', previous, result, when);
  return update.action === 'upsert' ? update.state : previous;
}

describe('Leitner schedule', () => {
  it('uses 1, 3, 7, 14, 30 day boxes', () => {
    expect(LEITNER_INTERVAL_DAYS).toEqual([1, 3, 7, 14, 30]);
    expect(intervalDaysForBox(1)).toBe(1);
    expect(intervalDaysForBox(5)).toBe(30);
    expect(intervalDaysForBox(9)).toBe(30);
    expect(intervalDaysForBox(0)).toBe(1);
  });

  it('puts a wrong answer in box 1, due at the start of tomorrow', () => {
    const state = stateAfter(null, 'wrong', at(10, 23));
    expect(state).toMatchObject({ box: 1, dueAt: startOf(11), lastResult: 'wrong' });
  });

  it('walks a Question up the boxes on each due correct answer', () => {
    let state = stateAfter(null, 'wrong', at(1));
    expect(state).toMatchObject({ box: 1, dueAt: startOf(2) });

    state = stateAfter(state, 'correct', at(2));
    expect(state).toMatchObject({ box: 2, dueAt: startOf(5), lastResult: 'correct' });

    state = stateAfter(state, 'correct', at(5));
    expect(state).toMatchObject({ box: 3, dueAt: startOf(12) });

    state = stateAfter(state, 'correct', at(12));
    expect(state).toMatchObject({ box: 4, dueAt: startOf(26) });

    state = stateAfter(state, 'correct', at(26));
    expect(state?.box).toBe(5);
    expect(state?.dueAt).toBe(dueDateAfter(at(26), 30).toISOString());

    const repeat = stateAfter(state, 'correct', new Date(state!.dueAt));
    expect(repeat?.box).toBe(5);
  });

  it('sends any wrong answer back to box 1', () => {
    const boxFour: CfaReviewState = {
      questionId: 'q-1',
      box: 4,
      dueAt: startOf(20),
      lastResult: 'correct',
      lastAnsweredAt: at(6).toISOString(),
    };
    expect(stateAfter(boxFour, 'wrong', at(8))).toMatchObject({
      box: 1,
      dueAt: startOf(9),
    });
  });

  it('ignores correct answers before the Question is due', () => {
    const boxTwo: CfaReviewState = {
      questionId: 'q-1',
      box: 2,
      dueAt: startOf(5),
      lastResult: 'correct',
      lastAnsweredAt: at(2).toISOString(),
    };
    expect(nextReviewState('q-1', boxTwo, 'correct', at(4, 23))).toEqual({
      action: 'none',
    });
  });

  it('does not add a correct answer to the deck', () => {
    expect(nextReviewState('q-1', null, 'correct', at(4))).toEqual({
      action: 'none',
    });
  });

  it('treats a Question as due from the start of its due day', () => {
    const state: CfaReviewState = {
      questionId: 'q-1',
      box: 1,
      dueAt: startOf(5),
      lastResult: 'wrong',
      lastAnsweredAt: at(4).toISOString(),
    };
    expect(isDue(state, new Date(2026, 10, 4, 23, 59))).toBe(false);
    expect(isDue(state, new Date(2026, 10, 5, 0, 0))).toBe(true);
  });
});
