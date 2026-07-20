import { defineFunction } from '@aws-amplify/backend';

/**
 * Owner-only career-page URL → structured JD markdown candidate.
 * Fetch gate runs before Bedrock; writes candidates/* only (never raw/).
 */
export const jobMarketParseListing = defineFunction({
  name: 'job-market-parse-listing',
  entry: './handler.ts',
  timeoutSeconds: 60,
  memoryMB: 512,
  environment: {
    // In-region in eu-west-2 (no Anthropic use-case form). Override after enabling model access.
    BEDROCK_PARSE_MODEL_ID: 'qwen.qwen3-32b-v1:0',
  },
  // Data mutation handler + Amplify Data client — must live in the data stack.
  resourceGroupName: 'data',
});
