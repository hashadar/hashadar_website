import { defineFunction } from '@aws-amplify/backend';

export const analyseFit = defineFunction({
  name: 'analyse-fit',
  entry: './handler.ts',
  timeoutSeconds: 60,
  environment: {
    // Open-weight Meta model; US geo profile (no Marketplace subscription).
    BEDROCK_MODEL_ID: 'us.meta.llama3-3-70b-instruct-v1:0',
    BEDROCK_REGION: 'us-east-1',
  },
});
