import { defineStorage } from '@aws-amplify/backend';
import { cfaAssist } from '../functions/cfa-assist/resource';

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

/**
 * Private CFA Lab screenshots and assist results. Authenticated Site Admin
 * only — question content and screenshots never live in the repo or in public
 * Site Content (docs/adr/0014-cfa-question-content-private-storage.md).
 *
 * - `screenshots/{captureId}/*`: Capture images, kept for reference on each Question.
 * - `assist/{jobId}.json`: Extraction / draft-explanation results written by the
 *   `cfa-assist` function and read (then deleted) by the Lab.
 *
 * Amplify requires every defineStorage() call to live in this file
 * (amplify/storage/resource.ts); subdirectory resources fail assembly.
 */
export const cfaScreenshotsStorage = defineStorage({
  name: 'cfaScreenshots',
  access: (allow) => ({
    'screenshots/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.resource(cfaAssist).to(['read']),
    ],
    'assist/*': [
      allow.authenticated.to(['read', 'delete']),
      allow.resource(cfaAssist).to(['write']),
    ],
  }),
});
