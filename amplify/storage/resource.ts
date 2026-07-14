import { defineStorage } from '@aws-amplify/backend';
import { jobMarketIngest } from '../functions/job-market-ingest/resource';
import { jobMarketAnalyse } from '../functions/job-market-analyse/resource';

/**
 * Job market lab corpus storage.
 * raw/* — markdown JDs (ingest trigger wired in backend.ts for this prefix only).
 * embeddings/* — contentHash embedding cache for the analyse worker.
 */
export const storage = defineStorage({
  name: 'jobMarketLab',
  access: (allow) => ({
    'raw/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.resource(jobMarketIngest).to(['read']),
      allow.resource(jobMarketAnalyse).to(['read']),
    ],
    'embeddings/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.resource(jobMarketAnalyse).to(['read', 'write']),
    ],
    'artefacts/*': [allow.authenticated.to(['read', 'write', 'delete'])],
  }),
});
