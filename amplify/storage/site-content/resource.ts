import { defineStorage } from '@aws-amplify/backend';

/**
 * Public Site Content: portfolio Photos and blog Posts (manifests, markdown, WebPs).
 * Distinct from Job OS Body storage — guest/public read, authenticated write.
 */
export const siteContentStorage = defineStorage({
  name: 'siteContent',
  access: (allow) => ({
    'portfolio/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read', 'write', 'delete']),
    ],
    'blog/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read', 'write', 'delete']),
    ],
  }),
});
