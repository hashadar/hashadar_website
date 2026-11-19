'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { CfaBank } from '@/lib/cfa/service';
import type { CfaSyllabus } from '@/lib/cfa/types';
import { cfa } from '@/data';
import { getDefaultCfaLab, type CfaLab } from '@/lib/cfa-default';

type LoadState = 'loading' | 'ready' | 'error' | 'unavailable';

export type CfaContextValue = {
  lab: CfaLab | null;
  syllabus: CfaSyllabus;
  status: LoadState;
  bank: CfaBank;
  reload: () => void;
  /** Apply a local change after a successful write (avoids a full reload). */
  updateBank: (change: (bank: CfaBank) => CfaBank) => void;
};

const EMPTY_BANK: CfaBank = { questions: [], attempts: [], reviewStates: [], flags: [] };

const CfaContext = createContext<CfaContextValue | null>(null);

export type CfaProviderProps = {
  children: ReactNode;
  /** Injectable Lab for Vitest; defaults to Amplify (null without outputs). */
  lab?: CfaLab | null;
};

/** Loads the question bank once per visit to the Lab and shares it across pages. */
export function CfaProvider({ children, lab: labProp }: CfaProviderProps) {
  const lab = useMemo(
    () => (labProp !== undefined ? labProp : getDefaultCfaLab()),
    [labProp],
  );
  const [status, setStatus] = useState<LoadState>(lab ? 'loading' : 'unavailable');
  const [bank, setBank] = useState<CfaBank>(EMPTY_BANK);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!lab) return;
    let cancelled = false;
    lab.service
      .loadBank()
      .then((loaded) => {
        if (cancelled) return;
        setBank(loaded);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [lab, attempt]);

  const reload = useCallback(() => {
    setStatus('loading');
    setAttempt((value) => value + 1);
  }, []);

  const updateBank = useCallback((change: (current: CfaBank) => CfaBank) => {
    setBank((current) => change(current));
  }, []);

  const value = useMemo<CfaContextValue>(
    () => ({
      lab,
      syllabus: cfa.syllabus,
      status,
      bank,
      reload,
      updateBank,
    }),
    [lab, status, bank, reload, updateBank],
  );

  return <CfaContext.Provider value={value}>{children}</CfaContext.Provider>;
}

export function useCfa(): CfaContextValue {
  const value = useContext(CfaContext);
  if (!value) throw new Error('useCfa must be used inside CfaProvider');
  return value;
}
