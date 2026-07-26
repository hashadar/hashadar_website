import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/**
 * Placeholder schema after Job Signal Lab v2 teardown.
 * Job OS hunting-graph models land in a follow-up slice; Amplify Gen 2 requires at least one model.
 */
const schema = a.schema({
  BackendPlaceholder: a
    .model({
      label: a.string().required(),
    })
    .authorization((allow) => [
      allow.authenticated().to(['read', 'create', 'update', 'delete']),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
