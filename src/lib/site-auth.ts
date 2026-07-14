import type { AmplifyOutputs } from './configure-site-amplify';

export type AuthSession =
  | { status: 'authenticated'; email: string }
  | { status: 'unauthenticated' };

export type SignInResult =
  | { status: 'signed_in' }
  | { status: 'failed'; reason: string };

export type SiteAuthPort = {
  getSession: () => Promise<AuthSession>;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
};

export const AUTH_NOT_CONFIGURED_REASON =
  'Sign-in is unavailable because authentication is not configured.';

export function createMemorySiteAuth(
  initial: AuthSession = { status: 'unauthenticated' },
): SiteAuthPort {
  let session = initial;

  return {
    async getSession() {
      return session;
    },
    async signIn(email: string) {
      session = { status: 'authenticated', email };
      return { status: 'signed_in' };
    },
    async signOut() {
      session = { status: 'unauthenticated' };
    },
  };
}

export type AmplifyAuthClient = {
  getCurrentUser: () => Promise<{ username: string; userId: string }>;
  fetchUserAttributes: () => Promise<Record<string, string | undefined>>;
  signIn: (input: {
    username: string;
    password: string;
  }) => Promise<{ isSignedIn: boolean }>;
  signOut: () => Promise<void>;
};

export function createAmplifySiteAuth(options: {
  isConfigured: boolean;
  client?: AmplifyAuthClient;
}): SiteAuthPort {
  const { isConfigured, client } = options;

  return {
    async getSession() {
      if (!isConfigured || !client) {
        return { status: 'unauthenticated' };
      }

      try {
        await client.getCurrentUser();
        const attributes = await client.fetchUserAttributes();
        const email = attributes.email;
        if (!email) {
          return { status: 'unauthenticated' };
        }
        return { status: 'authenticated', email };
      } catch {
        return { status: 'unauthenticated' };
      }
    },
    async signIn(email: string, password: string) {
      if (!isConfigured || !client) {
        return { status: 'failed', reason: AUTH_NOT_CONFIGURED_REASON };
      }

      try {
        const result = await client.signIn({ username: email, password });
        if (!result.isSignedIn) {
          return {
            status: 'failed',
            reason: 'Sign-in could not be completed. Please try again.',
          };
        }
        return { status: 'signed_in' };
      } catch {
        return {
          status: 'failed',
          reason: 'Sign-in failed. Check your email and password, then try again.',
        };
      }
    },
    async signOut() {
      if (!isConfigured || !client) {
        return;
      }
      await client.signOut();
    },
  };
}

export function createDefaultAmplifyAuthClient(): AmplifyAuthClient {
  return {
    async getCurrentUser() {
      const { getCurrentUser } = await import('aws-amplify/auth');
      return getCurrentUser();
    },
    async fetchUserAttributes() {
      const { fetchUserAttributes } = await import('aws-amplify/auth');
      return fetchUserAttributes();
    },
    async signIn(input) {
      const { signIn } = await import('aws-amplify/auth');
      const result = await signIn(input);
      return { isSignedIn: result.isSignedIn };
    },
    async signOut() {
      const { signOut } = await import('aws-amplify/auth');
      await signOut();
    },
  };
}

export function createSiteAuthFromOutputs(
  outputs?: AmplifyOutputs | null,
): SiteAuthPort {
  const isConfigured = outputs != null && Object.keys(outputs).length > 0;
  return createAmplifySiteAuth({
    isConfigured,
    client: isConfigured ? createDefaultAmplifyAuthClient() : undefined,
  });
}

