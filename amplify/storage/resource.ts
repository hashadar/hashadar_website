import { defineStorage } from '@aws-amplify/backend';

/**
 * Job market lab storage skeleton.
 * Prefix layout (raw / embeddings / artefacts) is refined in ingest and recompute slices.
 */
export const storage = defineStorage({
  name: 'jobMarketLab',
  access: (allow) => ({
    'raw/*': [allow.authenticated.to(['read', 'write', 'delete'])],
    'embeddings/*': [allow.authenticated.to(['read', 'write', 'delete'])],
    'artefacts/*': [allow.authenticated.to(['read', 'write', 'delete'])],
  }),
});
