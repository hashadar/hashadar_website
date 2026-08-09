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
    'bodies/hunt-profiles/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
    ],
  }),
});

/**
 * Public Site Content: portfolio Photos, Home Photo, and blog Posts
 * (manifests, markdown, WebPs). Distinct from Job OS Body storage —
 * guest/public read, authenticated write.
 *
 * Amplify requires every defineStorage() call to live in this file
 * (amplify/storage/resource.ts); subdirectory resources fail assembly.
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
    'home/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read', 'write', 'delete']),
    ],
  }),
});

/**
 * Private WMW lab Snapshots (last-good Workbook copy + as-of metadata).
 * Authenticated Site Admin only — never guest/public Site Content.
 *
 * Amplify requires every defineStorage() call to live in this file
 * (amplify/storage/resource.ts); subdirectory resources fail assembly.
 */
export const wmwSnapshotsStorage = defineStorage({
  name: 'wmwSnapshots',
  access: (allow) => ({
    'snapshots/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
    ],
  }),
});
