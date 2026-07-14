import { defineAuth } from '@aws-amplify/backend';

/**
 * Job market lab auth skeleton.
 * Later slices tighten this (self-sign-up disabled, invited admin only — #39).
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
});
