import { defineFunction } from '@aws-amplify/backend';

/**
 * Guest-readable publication query: LabPublication pointer → CorpusSnapshot payload.
 */
export const jobMarketPublication = defineFunction({
  name: 'job-market-publication',
  entry: './handler.ts',
  // Custom query resolver — must live in the data stack.
  resourceGroupName: 'data',
});
