import { defineFunction } from '@aws-amplify/backend';

/**
 * S3 ObjectCreated ingest for job-description markdown under raw/*.
 * Does not start corpus recompute — that stays an admin on-demand action.
 */
export const jobMarketIngest = defineFunction({
  name: 'job-market-ingest',
  entry: './handler.ts',
  // Shares the data stack: ingest writes JobDescription rows via the data API.
  resourceGroupName: 'data',
});
