import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { labPlaceholder } from './functions/lab-placeholder/resource';

defineBackend({
  auth,
  data,
  storage,
  labPlaceholder,
});
