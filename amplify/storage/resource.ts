import { defineStorage } from '@aws-amplify/backend';

/**
 * Optional freeform Body prose for Job OS entities.
 * Structured fields stay authoritative in the database — never in Body frontmatter.
 */
export const storage = defineStorage({
  name: 'jobOsBodies',
  isDefault: true,
  access: (allow) => ({
    'bodies/employers/*': [allow.authenticated.to(['read', 'write', 'delete'])],
    'bodies/opportunities/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
    ],
    'bodies/applications/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
    ],
  }),
});
