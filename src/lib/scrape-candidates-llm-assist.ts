import type { ScrapeCandidateLlmEnrichment, ScrapeCandidateRecord } from './scrape-candidates';

export const LLM_ASSIST_ENABLED_ENV = 'NEXT_PUBLIC_JOB_MARKET_LLM_ASSIST_ENABLED';

export async function defaultAssistWithLlm(
  _candidate: ScrapeCandidateRecord,
): Promise<ScrapeCandidateLlmEnrichment> {
  // TODO(#76): invoke Bedrock to infer missing title, source, and collectedAt from body text
  // when LLM assist is enabled via environment configuration.
  if (process.env[LLM_ASSIST_ENABLED_ENV] !== 'true') {
    return {};
  }

  return {};
}
