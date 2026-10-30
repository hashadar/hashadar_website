'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { courtBoard } from '@/data';
import type { Failure, Outcome } from '@/lib/court-board/views';
import { describeFailure } from '@/components/sections/labs/court-board/error-message';

export type ActionSuccess<T extends object> = { ok: true } & T;

/**
 * Run an Organiser Server Action: track busy state, keep the failure as text
 * (and the raw failure, for field errors), and refresh the page's data on
 * success. Resolves to the success value, or null when it failed.
 */
export function useOrganiserAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setFailure(null);
  }, []);

  const run = useCallback(
    async <T extends object>(
      work: () => Promise<Outcome<T>>,
      options: { refresh?: boolean } = {},
    ): Promise<ActionSuccess<T> | null> => {
      setBusy(true);
      setError(null);
      setFailure(null);
      try {
        const result = await work();
        if (!result.ok) {
          setFailure(result);
          setError(describeFailure(result));
          return null;
        }
        if (options.refresh !== false) router.refresh();
        return result as ActionSuccess<T>;
      } catch {
        setError(courtBoard.errors.generic);
        return null;
      } finally {
        setBusy(false);
      }
    },
    [router],
  );

  return { busy, error, failure, run, reset };
}
