import { defineStorage } from '@aws-amplify/backend';
import { jobMarketIngest } from '../functions/job-market-ingest/resource';

/**
 * Job market lab corpus storage.
 * raw/* — markdown JDs (ingest trigger wired in backend.ts for this prefix only).
 */
export const storage = defineStorage({
  name: 'jobMarketLab',
  access: (allow) => ({
    'raw/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.resource(jobMarketIngest).to(['read']),
    ],
    'embeddings/*': [allow.authenticated.to(['read', 'write', 'delete'])],
    'artefacts/*': [allow.authenticated.to(['read', 'write', 'delete'])],
  }),
});
