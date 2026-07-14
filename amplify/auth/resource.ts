/**
 * Soft-disable Cognito self-registration in defineAuth comments;
 * enforce allowAdminCreateUserOnly via backend.ts CDK override (#39).
 */
import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true,
  },
});
