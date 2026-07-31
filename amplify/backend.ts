import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import { siteContentStorage, storage } from './storage/resource.js';

const backend = defineBackend({
  auth,
  data,
  storage,
  siteContentStorage,
});

// Owner-only Cognito: disable self-sign-up (admin invite / AdminCreateUser only).
const { cfnUserPool } = backend.auth.resources.cfnResources;
cfnUserPool.adminCreateUserConfig = {
  allowAdminCreateUserOnly: true,
};
