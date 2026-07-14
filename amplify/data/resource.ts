import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { jobMarketIngest } from '../functions/job-market-ingest/resource';

const schema = a
  .schema({
    JobDescription: a
      .model({
        s3Key: a.string().required(),
        contentHash: a.string().required(),
        collectedAt: a.datetime().required(),
        status: a.enum(['active', 'archived']).required(),
        title: a.string(),
        seniority: a.string(),
        roleFamily: a.string(),
        source: a.string(),
      })
      .authorization((allow) => [
        allow.authenticated.to(['read', 'create', 'update', 'delete']),
      ]),
  })
  .authorization((allow) => [allow.resource(jobMarketIngest)]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
