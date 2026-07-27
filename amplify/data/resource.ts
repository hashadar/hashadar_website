import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/**
 * Job OS hunting graph: Employer → Opportunity → Application, plus Decision Events.
 * Bodies are optional S3 prose keyed from the DB when present.
 */
const schema = a.schema({
  EmployerSizeTier: a.enum(['startup', 'scaleup', 'enterprise', 'big4', 'other']),
  EmployerPrestigeTier: a.enum(['low', 'mid', 'high', 'elite']),
  OpportunityStatus: a.enum(['open', 'closed']),
  OpportunitySeniority: a.enum([
    'junior',
    'mid',
    'senior',
    'lead',
    'principal',
  ]),
  OpportunityRoleFamily: a.enum([
    'data_science',
    'analytics',
    'engineering',
    'ml_ops',
    'product',
    'other',
  ]),
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

  Employer: a
    .model({
      name: a.string().required(),
      sizeTier: a.ref('EmployerSizeTier').required(),
      prestigeTier: a.ref('EmployerPrestigeTier').required(),
      summary: a.string(),
      websiteUrl: a.string(),
      linkedinUrl: a.string(),
      notes: a.string(),
      s3Key: a.string(),
      isAnon: a.boolean().required(),
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
      seniority: a.ref('OpportunitySeniority'),
      roleFamily: a.ref('OpportunityRoleFamily'),
      compensationCurrency: a.string(),
      compensationMin: a.float(),
      compensationMax: a.float(),
      compensationPeriod: a.ref('CompensationPeriod'),
      compensationDisclosure: a.ref('CompensationDisclosure'),
      technologies: a.string().array(),
      s3Key: a.string(),
      application: a.hasOne('Application', 'opportunityId'),
      decisionEvents: a.hasMany('DecisionEvent', 'opportunityId'),
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
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
