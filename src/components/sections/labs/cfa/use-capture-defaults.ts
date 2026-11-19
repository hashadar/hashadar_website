'use client';

import { useCallback, useState } from 'react';
import { useCfa } from '@/components/sections/labs/cfa/cfa-context';
import {
  CAPTURE_DEFAULTS_STORAGE_KEY,
  parseStoredDefaults,
  resolveCaptureDefaults,
  type CaptureDefaults,
} from '@/lib/cfa/capture';

function readStored() {
  try {
    return parseStoredDefaults(window.localStorage.getItem(CAPTURE_DEFAULTS_STORAGE_KEY));
  } catch {
    return null;
  }
}

/**
 * Module, Reading and source for the next Capture: this device's last choice,
 * else the newest Question in the bank. Saved on every change.
 */
export function useCaptureDefaults(): [CaptureDefaults, (next: CaptureDefaults) => void] {
  const { syllabus, bank } = useCfa();
  const [defaults, setDefaultsState] = useState<CaptureDefaults>(() => {
    const latest =
      [...bank.questions].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
    return resolveCaptureDefaults(syllabus, readStored(), latest);
  });

  const setDefaults = useCallback((next: CaptureDefaults) => {
    setDefaultsState(next);
    try {
      window.localStorage.setItem(CAPTURE_DEFAULTS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Private mode or blocked storage: defaults still apply for this visit.
    }
  }, []);

  return [defaults, setDefaults];
}
