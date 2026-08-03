import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import { analyseFit } from './functions/analyse-fit/resource.js';
import { siteContentStorage, storage } from './storage/resource.js';

const backend = defineBackend({
  auth,
  data,
  storage,
  siteContentStorage,
  analyseFit,
});

// Owner-only Cognito: disable self-sign-up (admin invite / AdminCreateUser only).
const { cfnUserPool } = backend.auth.resources.cfnResources;
cfnUserPool.adminCreateUserConfig = {
  allowAdminCreateUserOnly: true,
};

// Open-weight Bedrock models (e.g. Meta Llama) need invoke on foundation
// models and inference profiles; no Marketplace subscription required.
backend.analyseFit.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'bedrock:InvokeModel',
      'bedrock:InvokeModelWithResponseStream',
    ],
    resources: [
      'arn:aws:bedrock:*::foundation-model/*',
      'arn:aws:bedrock:*:*:inference-profile/*',
    ],
  }),
);
