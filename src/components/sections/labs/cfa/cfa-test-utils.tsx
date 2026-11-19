/**
 * Vitest helpers for CFA Lab components: an in-memory Lab with a fake assist.
 * Placeholder data only (docs/adr/0014-cfa-question-content-private-storage.md).
 */
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { CfaProvider } from '@/components/sections/labs/cfa/cfa-context';
import type { CfaAssist } from '@/lib/cfa/assist';
import { createMemoryCfaScreenshotStorage } from '@/lib/cfa/screenshots';
import { createCfaService } from '@/lib/cfa/service';
import { createMemoryCfaStore } from '@/lib/cfa/store';
import type { CfaLab } from '@/lib/cfa-default';
import type {
  CfaAttempt,
  CfaFlag,
  CfaQuestion,
  CfaReviewState,
} from '@/lib/cfa/types';

export function createTestLab(
  seed: {
    questions?: CfaQuestion[];
    attempts?: CfaAttempt[];
    reviewStates?: CfaReviewState[];
    flags?: CfaFlag[];
  } = {},
  assist: Partial<CfaAssist> = {},
) {
  const store = createMemoryCfaStore(seed);
  const screenshots = createMemoryCfaScreenshotStorage();
  const fakeAssist: CfaAssist = {
    extract: vi.fn(async () => ({ ok: false as const, error: 'not used' })),
    draftExplanation: vi.fn(async () => ({ explanation: 'Drafted placeholder.', calculator: null })),
    ...assist,
  };
  const lab: CfaLab = {
    service: createCfaService({ store, screenshots }),
    screenshots,
    assist: fakeAssist,
  };
  return { lab, store, screenshots, assist: fakeAssist };
}

export function renderWithLab(ui: React.ReactElement, lab: CfaLab) {
  return render(<CfaProvider lab={lab}>{ui}</CfaProvider>);
}
