'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useCfa } from '@/components/sections/labs/cfa/cfa-context';
import type { SetResult } from '@/lib/cfa/timed';
import type { CfaAttemptMode, CfaReviewState } from '@/lib/cfa/types';

/**
 * Save an Attempt and apply the Leitner update, keeping the shared bank in
 * step. Reads review state from a ref so several Attempts in a row (a timed
 * Set) each see the previous write.
 */
export function useRecordAttempt() {
  const { lab, bank, updateBank } = useCfa();
  const states = useRef<Map<string, CfaReviewState>>(new Map());
  useEffect(() => {
    states.current = new Map(bank.reviewStates.map((state) => [state.questionId, state]));
  }, [bank.reviewStates]);

  return useCallback(
    async (result: SetResult, mode: CfaAttemptMode, setId: string) => {
      if (!lab) throw new Error('CFA Lab is not configured');
      const previous = states.current.get(result.questionId) ?? null;
      const recorded = await lab.service.recordAttempt({ result, mode, setId, previous });
      if (recorded.reviewState) {
        states.current.set(result.questionId, recorded.reviewState);
      }
      updateBank((current) => ({
        ...current,
        attempts: [...current.attempts, recorded.attempt],
        reviewStates: recorded.reviewState
          ? [
              ...current.reviewStates.filter((state) => state.questionId !== result.questionId),
              recorded.reviewState,
            ]
          : current.reviewStates,
      }));
      return recorded;
    },
    [lab, updateBank],
  );
}
