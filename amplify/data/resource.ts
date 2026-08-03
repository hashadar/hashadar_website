import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { analyseFit } from '../functions/analyse-fit/resource';

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
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
