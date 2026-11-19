import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { analyseFit } from '../functions/analyse-fit/resource';
import { cfaAssist } from '../functions/cfa-assist/resource';

/**
 * Job OS hunting graph: Employer → Opportunity → Application, plus Decision Events.
 * Fit Insight v3.1: Hunt Profile singleton + Fit Insight (latest-wins per Opportunity).
 * Bodies are optional S3 prose keyed from the DB when present.
 * Size/prestige/sector/seniority/role family are strings validated against VocabularyTerm.
 */
const schema = a.schema({
  OpportunityStatus: a.enum(['open', 'closed']),
  CompensationPeriod: a.enum(['year', 'month', 'day', 'hour']),
  CompensationDisclosure: a.enum(['range', 'competitive', 'unknown']),
  ApplicationStatus: a.enum([
    'researching',
    'applied',
    'interviewing',
    'offer',
    'accepted',
    'rejected',
    'withdrawn',
  ]),
  DecisionEventKind: a.enum([
    'opportunity_passed',
    'application_started',
    'application_status_changed',
  ]),

  VocabularyTerm: a
    .model({
      kind: a.string().required(),
      value: a.string().required(),
      label: a.string().required(),
      sortOrder: a.integer(),
      active: a.boolean().default(true),
    })
    .authorization((allow) => [
      allow.authenticated().to(['read', 'create', 'update', 'delete']),
    ]),

  Employer: a
    .model({
      name: a.string().required(),
      sizeTier: a.string().required(),
      prestigeTier: a.string().required(),
      // Not required: legacy Employer rows predate sector and must still list.
      // Default applies on create; adapter backfills missing DynamoDB attrs.
      sector: a.string().default('other'),
      summary: a.string(),
      websiteUrl: a.string(),
      linkedinUrl: a.string(),
      notes: a.string(),
      s3Key: a.string(),
      // Default false so creates that omit the field still persist a value.
      // Not required: missing DynamoDB attrs must not null out entire list rows.
      isAnon: a.boolean().default(false),
      opportunities: a.hasMany('Opportunity', 'employerId'),
    })
    .authorization((allow) => [
      allow.authenticated().to(['read', 'create', 'update', 'delete']),
    ]),

  Opportunity: a
    .model({
      employerId: a.id().required(),
      employer: a.belongsTo('Employer', 'employerId'),
      status: a.ref('OpportunityStatus').required(),
      title: a.string(),
      source: a.string(),
      noticedAt: a.datetime().required(),
      // Owner-managed stamp for Fit Insight stale detection (legacy rows may omit).
      contentUpdatedAt: a.datetime(),
      seniority: a.string(),
      roleFamily: a.string(),
      compensationCurrency: a.string(),
      compensationMin: a.float(),
      compensationMax: a.float(),
      compensationPeriod: a.ref('CompensationPeriod'),
      compensationDisclosure: a.ref('CompensationDisclosure'),
      technologies: a.string().array(),
      s3Key: a.string(),
      application: a.hasOne('Application', 'opportunityId'),
      decisionEvents: a.hasMany('DecisionEvent', 'opportunityId'),
      fitInsight: a.hasOne('FitInsight', 'opportunityId'),
    })
    .authorization((allow) => [
      allow.authenticated().to(['read', 'create', 'update', 'delete']),
    ]),

  Application: a
    .model({
      opportunityId: a.id().required(),
      opportunity: a.belongsTo('Opportunity', 'opportunityId'),
      status: a.ref('ApplicationStatus').required(),
      trackingNote: a.string(),
      s3Key: a.string(),
      decisionEvents: a.hasMany('DecisionEvent', 'applicationId'),
    })
    .authorization((allow) => [
      allow.authenticated().to(['read', 'create', 'update', 'delete']),
    ]),

  DecisionEvent: a
    .model({
      kind: a.ref('DecisionEventKind').required(),
      opportunityId: a.id().required(),
      opportunity: a.belongsTo('Opportunity', 'opportunityId'),
      applicationId: a.id(),
      application: a.belongsTo('Application', 'applicationId'),
      fromStatus: a.string(),
      toStatus: a.string(),
      occurredAt: a.datetime().required(),
    })
    .authorization((allow) => [
      allow.authenticated().to(['read', 'create']),
    ]),

  HuntProfile: a
    .model({
      targetSeniority: a.string(),
      targetRoleFamily: a.string(),
      locationFlexibility: a.string(),
      compensationFloor: a.float(),
      compensationCurrency: a.string(),
      compensationPeriod: a.ref('CompensationPeriod'),
      mustHaveTags: a.string().array(),
      dealBreakerTags: a.string().array(),
      escapePains: a.string().array(),
      seekDesires: a.string().array(),
      s3Key: a.string(),
      contentUpdatedAt: a.datetime().required(),
    })
    .authorization((allow) => [
      allow.authenticated().to(['read', 'create', 'update', 'delete']),
    ]),

  FitInsight: a
    .model({
      opportunityId: a.id().required(),
      opportunity: a.belongsTo('Opportunity', 'opportunityId'),
      summary: a.string().required(),
      advantages: a.string().array().required(),
      disadvantages: a.string().array().required(),
      fitNotes: a.string().array().required(),
      gaps: a.string().array().required(),
      analysedAt: a.datetime().required(),
    })
    .authorization((allow) => [
      allow.authenticated().to(['read', 'create', 'update', 'delete']),
    ]),

  analyseFitWithBedrock: a
    .query()
    .arguments({
      contextJson: a.string().required(),
    })
    .returns(a.string())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(analyseFit)),

  // --- CFA Lab (docs/cfa/CONTEXT.md). Question content is private to the
  // signed-in Site Admin and never lives in the repo (ADR 0014). ---
  CfaAnswer: a.enum(['A', 'B', 'C']),
  CfaAttemptMode: a.enum(['practice', 'timed', 'mistakes', 'recent']),
  CfaReviewResult: a.enum(['correct', 'wrong']),

  CfaQuestion: a
    .model({
      module: a.string().required(),
      reading: a.string().required(),
      los: a.string(),
      stem: a.string().required(),
      // Exactly three options (A, B, C) — enforced in src/lib/cfa/question.ts.
      options: a.string().array().required(),
      answer: a.ref('CfaAnswer').required(),
      explanation: a.string(),
      explanationIsAiDrafted: a.boolean().default(false),
      calculator: a.string(),
      source: a.string(),
      screenshotKeys: a.string().array(),
    })
    .authorization((allow) => [
      allow.authenticated().to(['read', 'create', 'update', 'delete']),
    ]),

  CfaAttempt: a
    .model({
      questionId: a.id().required(),
      // Empty when a timed Set ended before the Question was answered.
      chosen: a.ref('CfaAnswer'),
      correct: a.boolean().required(),
      secondsTaken: a.float().required(),
      mode: a.ref('CfaAttemptMode').required(),
      setId: a.string(),
      answeredAt: a.datetime().required(),
    })
    .authorization((allow) => [
      allow.authenticated().to(['read', 'create', 'delete']),
    ]),

  // Leitner state for the Mistakes deck: one row per Question that was ever wrong.
  CfaReviewState: a
    .model({
      questionId: a.id().required(),
      box: a.integer().required(),
      dueAt: a.datetime().required(),
      lastResult: a.ref('CfaReviewResult').required(),
      lastAnsweredAt: a.datetime().required(),
    })
    .identifier(['questionId'])
    .authorization((allow) => [
      allow.authenticated().to(['read', 'create', 'update', 'delete']),
    ]),

  CfaFlag: a
    .model({
      questionId: a.id().required(),
      note: a.string().required(),
      resolvedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.authenticated().to(['read', 'create', 'update', 'delete']),
    ]),

  // Starts an Extraction or draft explanation. Runs async (Event invocation) so
  // long vision calls are not cut off by the resolver timeout; the Lab polls
  // `assist/{jobId}.json` in the cfaScreenshots bucket for the result.
  startCfaAssist: a
    .mutation()
    .arguments({
      jobId: a.string().required(),
      task: a.string().required(),
      screenshotKeys: a.string().array(),
      contextJson: a.string(),
    })
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(cfaAssist).async()),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
