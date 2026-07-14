import { defineBackend } from '@aws-amplify/backend';
import { EventType } from 'aws-cdk-lib/aws-s3';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import { storage } from './storage/resource.js';
import { jobMarketIngest } from './functions/job-market-ingest/resource.js';

const backend = defineBackend({
  auth,
  data,
  storage,
  jobMarketIngest,
});

backend.storage.resources.bucket.addEventNotification(
  EventType.OBJECT_CREATED,
  new LambdaDestination(backend.jobMarketIngest.resources.lambda),
  { prefix: 'raw/' },
);
