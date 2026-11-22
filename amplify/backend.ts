import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { auth } from './auth/resource.js';
import { createCourtBoardResources } from './court-board/resource.js';
import { data } from './data/resource.js';
import { analyseFit } from './functions/analyse-fit/resource.js';
import { cfaAssist } from './functions/cfa-assist/resource.js';
import {
  cfaScreenshotsStorage,
  siteContentStorage,
  storage,
  wmwSnapshotsStorage,
} from './storage/resource.js';

const backend = defineBackend({
  auth,
  data,
  storage,
  siteContentStorage,
  wmwSnapshotsStorage,
  cfaScreenshotsStorage,
  analyseFit,
  cfaAssist,
});

// Owner-only Cognito: disable self-sign-up (admin invite / AdminCreateUser only).
const { cfnUserPool } = backend.auth.resources.cfnResources;
cfnUserPool.adminCreateUserConfig = {
  allowAdminCreateUserOnly: true,
};

// Invoke on foundation models and inference profiles. Job OS Fit Insight
// (Meta Llama) and the CFA Lab assist (Claude Haiku 5.5, vision extraction)
// share the grant.
const bedrockInvoke = () =>
  new PolicyStatement({
    actions: [
      'bedrock:InvokeModel',
      'bedrock:InvokeModelWithResponseStream',
    ],
    resources: [
      'arn:aws:bedrock:*::foundation-model/*',
      'arn:aws:bedrock:*:*:inference-profile/*',
    ],
  });
backend.analyseFit.resources.lambda.addToRolePolicy(bedrockInvoke());
backend.cfaAssist.resources.lambda.addToRolePolicy(bedrockInvoke());

// Court Board: public-write Lab with its own DynamoDB table, outside the Job OS
// `a.schema`. SSR reaches it through a customer-managed policy attached once to
// the Amplify SSR Compute role by hand (docs/court-board/infra.md).
const courtBoardStack = backend.createStack('CourtBoard');
const courtBoard = createCourtBoardResources(courtBoardStack);
backend.addOutput({
  custom: {
    courtBoardTableName: courtBoard.table.tableName,
    courtBoardPolicyArn: courtBoard.policy.managedPolicyArn,
  },
});
