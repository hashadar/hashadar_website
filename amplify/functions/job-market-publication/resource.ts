import { defineFunction } from '@aws-amplify/backend';

/**
 * Guest-readable publication query: LabPublication pointer → CorpusSnapshot payload.
 */
export const jobMarketPublication = defineFunction({
  name: 'job-market-publication',
  entry: './handler.ts',
});
