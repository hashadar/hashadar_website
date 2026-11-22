import { defineFunction } from '@aws-amplify/backend';

/**
 * CFA Lab assist: reads Capture screenshots from the private `cfaScreenshots`
 * bucket, asks Claude on Amazon Bedrock (InvokeModel with the Messages body)
 * for structured JSON, and writes the result back to `assist/{jobId}.json` in
 * the same bucket.
 *
 * Invoked asynchronously from the `startCfaAssist` mutation so long vision
 * calls are not cut off by the AppSync resolver timeout.
 *
 * Model and region can be overridden at deploy time with the Amplify env vars
 * `CFA_BEDROCK_MODEL_ID` / `CFA_BEDROCK_REGION` (read when the backend
 * synthesises). The model must be a Claude model on Bedrock.
 */
export const cfaAssist = defineFunction({
  name: 'cfa-assist',
  entry: './handler.ts',
  timeoutSeconds: 300,
  memoryMB: 1024,
  environment: {
    // Claude Haiku 5.5 (vision). Keep in step with DEFAULT_CFA_MODEL_ID in assist-core.ts.
    BEDROCK_MODEL_ID:
      process.env.CFA_BEDROCK_MODEL_ID?.trim() || 'anthropic.claude-haiku-5-5',
    BEDROCK_REGION: process.env.CFA_BEDROCK_REGION?.trim() || 'us-east-1',
  },
});
