import { defineBackend } from '@aws-amplify/backend';
import { EventType } from 'aws-cdk-lib/aws-s3';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import { storage } from './storage/resource.js';
import { jobMarketIngest } from './functions/job-market-ingest/resource.js';
import { jobMarketRecompute } from './functions/job-market-recompute/resource.js';
import { jobMarketAnalyse } from './functions/job-market-analyse/resource.js';
import { jobMarketPublication } from './functions/job-market-publication/resource.js';

const backend = defineBackend({
  auth,
  data,
  storage,
  jobMarketIngest,
  jobMarketRecompute,
  jobMarketAnalyse,
  jobMarketPublication,
});

// Owner-only Cognito: disable self-sign-up (admin invite / AdminCreateUser only).
const { cfnUserPool } = backend.auth.resources.cfnResources;
cfnUserPool.adminCreateUserConfig = {
  allowAdminCreateUserOnly: true,
};

backend.storage.resources.bucket.addEventNotification(
  EventType.OBJECT_CREATED,
  new LambdaDestination(backend.jobMarketIngest.resources.lambda),
  { prefix: 'raw/' },
);

const analyseFunctionName = backend.jobMarketAnalyse.resources.lambda.functionName;

backend.jobMarketRecompute.addEnvironment(
  'JOB_MARKET_ANALYSE_FUNCTION_NAME',
  analyseFunctionName,
);
backend.jobMarketRecompute.addEnvironment('MAX_ACTIVE_DOCS', '150');

backend.jobMarketAnalyse.resources.lambda.grantInvoke(
  backend.jobMarketRecompute.resources.lambda,
);

backend.jobMarketAnalyse.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['bedrock:InvokeModel'],
    resources: ['*'],
  }),
);
