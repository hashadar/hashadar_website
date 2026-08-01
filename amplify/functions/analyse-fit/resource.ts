import { defineFunction } from '@aws-amplify/backend';

export const analyseFit = defineFunction({
  name: 'analyse-fit',
  entry: './handler.ts',
  timeoutSeconds: 60,
  environment: {
    BEDROCK_MODEL_ID:
      'anthropic.claude-3-haiku-20240307-v1:0',
  },
});
