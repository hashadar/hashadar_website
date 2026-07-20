import { defineFunction } from '@aws-amplify/backend';

/**
 * Analysis worker: Bedrock embeddings (contentHash cache), descriptive stats,
 * k-means clusters, and PCA 2D projection for the published theme map.
 * Invoked asynchronously by the recompute orchestrator — not guest-callable.
 */
export const jobMarketAnalyse = defineFunction({
  name: 'job-market-analyse',
  entry: './handler.ts',
  timeoutSeconds: 300,
  memoryMB: 1024,
  environment: {
    BEDROCK_MODEL_ID: 'amazon.titan-embed-text-v2:0',
  },
  // Uses the data API; storage bucket name is injected via defineStorage access (SSM).
  resourceGroupName: 'data',
});
