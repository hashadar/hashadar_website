import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { jobMarketIngest } from '../functions/job-market-ingest/resource';
import { jobMarketRecompute } from '../functions/job-market-recompute/resource';
import { jobMarketAnalyse } from '../functions/job-market-analyse/resource';
import { jobMarketPublication } from '../functions/job-market-publication/resource';

const schema = a
  .schema({
    JobDescriptionStatus: a.enum(['active', 'archived']),
    ScrapeCandidateStatus: a.enum(['pending', 'accepted', 'rejected']),
    AnalysisRunStatus: a.enum(['queued', 'running', 'succeeded', 'failed']),

    JobDescription: a
      .model({
        s3Key: a.string().required(),
        contentHash: a.string().required(),
        collectedAt: a.datetime().required(),
        status: a.ref('JobDescriptionStatus').required(),
        title: a.string(),
        seniority: a.string(),
        roleFamily: a.string(),
        source: a.string(),
      })
      .authorization((allow) => [
        allow.authenticated().to(['read', 'create', 'update', 'delete']),
      ]),

    ScrapeCandidate: a
      .model({
        fileName: a.string().required(),
        body: a.string().required(),
        status: a.ref('ScrapeCandidateStatus').required(),
        title: a.string(),
        source: a.string(),
        collectedAt: a.datetime(),
        candidateS3Key: a.string(),
      })
      .authorization((allow) => [
        allow.authenticated().to(['read', 'create', 'update']),
      ]),

    AnalysisRun: a
      .model({
        status: a.ref('AnalysisRunStatus').required(),
        docsConsidered: a.integer(),
        docsEmbedded: a.integer(),
        docsCacheHit: a.integer(),
        clusterCount: a.integer(),
        bedrockInputTokens: a.integer(),
        estimatedCostUsd: a.float(),
        errorMessage: a.string(),
      })
      .authorization((allow) => [
        allow.authenticated().to(['read', 'create', 'update']),
      ]),

    CorpusSnapshot: a
      .model({
        runId: a.id().required(),
        payload: a.json().required(),
      })
      .authorization((allow) => [
        allow.authenticated().to(['read', 'create']),
      ]),

    LabPublication: a
      .model({
        currentSnapshotId: a.id().required(),
      })
      .authorization((allow) => [
        allow.authenticated().to(['read', 'create', 'update']),
      ]),

    CanonicalCv: a
      .model({
        body: a.string().required(),
        updatedAt: a.datetime().required(),
      })
      .authorization((allow) => [
        allow.authenticated().to(['read', 'create', 'update']),
      ]),

    startJobMarketRecompute: a
      .mutation()
      .returns(
        a.customType({
          status: a.string().required(),
          runId: a.string(),
          reason: a.string(),
        }),
      )
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(jobMarketRecompute)),

    getPublishedJobMarketSnapshot: a
      .query()
      .returns(a.json())
      .authorization((allow) => [allow.guest(), allow.authenticated()])
      .handler(a.handler.function(jobMarketPublication)),
  })
  .authorization((allow) => [
    allow.resource(jobMarketIngest),
    allow.resource(jobMarketRecompute),
    allow.resource(jobMarketAnalyse),
    allow.resource(jobMarketPublication),
  ]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
