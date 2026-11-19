import { defineFunction } from '@aws-amplify/backend';

/**
 * CFA Lab assist: reads Capture screenshots from the private `cfaScreenshots`
 * bucket, asks a vision-capable Bedrock model for structured JSON, and writes
 * the result back to `assist/{jobId}.json` in the same bucket.
 *
 * Invoked asynchronously from the `startCfaAssist` mutation so long vision
 * calls are not cut off by the AppSync resolver timeout.
 *
 * Model and region can be overridden at deploy time with the Amplify env vars
 * `CFA_BEDROCK_MODEL_ID` / `CFA_BEDROCK_REGION` (read when the backend synthesises).
 */
export const cfaAssist = defineFunction({
  name: 'cfa-assist',
  entry: './handler.ts',
  timeoutSeconds: 300,
  memoryMB: 1024,
  environment: {
    // Open-weight, vision-capable Meta model; US geo profile (no Marketplace subscription).
    BEDROCK_MODEL_ID:
      process.env.CFA_BEDROCK_MODEL_ID?.trim() ||
      'us.meta.llama4-maverick-17b-instruct-v1:0',
    BEDROCK_REGION: process.env.CFA_BEDROCK_REGION?.trim() || 'us-east-1',
  },
});
