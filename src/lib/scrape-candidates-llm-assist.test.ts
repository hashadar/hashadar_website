import { describe, expect, it, vi } from 'vitest';
import {
  defaultAssistWithLlm,
  LLM_ASSIST_ENABLED_ENV,
} from './scrape-candidates-llm-assist';
import type { ScrapeCandidateRecord } from './scrape-candidates';

const candidate: ScrapeCandidateRecord = {
  id: 'candidate-1',
  fileName: 'role.md',
  body: `---
collectedAt: 2026-06-15T10:00:00.000Z
---

# Role title
`,
  status: 'pending',
};

describe('defaultAssistWithLlm', () => {
  it('returns no enrichment when LLM assist is not enabled via environment', async () => {
    vi.stubEnv(LLM_ASSIST_ENABLED_ENV, '');

    const enrichment = await defaultAssistWithLlm(candidate);

    expect(enrichment).toEqual({});
  });

  it('returns no enrichment when enabled but Bedrock adapter is not implemented yet', async () => {
    vi.stubEnv(LLM_ASSIST_ENABLED_ENV, 'true');

    const enrichment = await defaultAssistWithLlm(candidate);

    expect(enrichment).toEqual({});
  });
});
