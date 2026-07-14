import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/**
 * Data schema placeholder for the job market lab.
 * Models (JobDescription, AnalysisRun, CorpusSnapshot, LabPublication) land in later slices.
 */
const schema = a.schema({
  LabScaffold: a
    .model({
      label: a.string(),
    })
    .authorization((allow) => [allow.authenticated()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
