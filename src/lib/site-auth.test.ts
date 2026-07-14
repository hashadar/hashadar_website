import { describe, expect, it, vi } from 'vitest';
import {
  AUTH_NOT_CONFIGURED_REASON,
  createAmplifySiteAuth,
  createMemorySiteAuth,
  createSiteAuthFromOutputs,
  type AmplifyAuthClient,
} from '@/lib/site-auth';

function createFakeAmplifyClient(
  overrides: Partial<AmplifyAuthClient> = {},
): AmplifyAuthClient {
  return {
    getCurrentUser: vi.fn(async () => {
      throw new Error('UserUnAuthenticatedException');
    }),
    fetchUserAttributes: vi.fn(async () => ({})),
    signIn: vi.fn(async () => ({ isSignedIn: true })),
    signOut: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe('createMemorySiteAuth', () => {
  it('getSession returns unauthenticated when starting signed out', async () => {
    const auth = createMemorySiteAuth();

    await expect(auth.getSession()).resolves.toEqual({ status: 'unauthenticated' });
  });

  it('after successful signIn, getSession is authenticated', async () => {
    const auth = createMemorySiteAuth();

    await expect(auth.signIn('owner@example.com', 'secret')).resolves.toEqual({
      status: 'signed_in',
    });
    await expect(auth.getSession()).resolves.toEqual({
      status: 'authenticated',
      email: 'owner@example.com',
    });
  });

  it('signOut clears the session to unauthenticated', async () => {
    const auth = createMemorySiteAuth();
    await auth.signIn('owner@example.com', 'secret');

    await auth.signOut();

    await expect(auth.getSession()).resolves.toEqual({ status: 'unauthenticated' });
  });
});

describe('createAmplifySiteAuth', () => {
  it('getSession returns unauthenticated when Amplify is not configured', async () => {
    const auth = createAmplifySiteAuth({ isConfigured: false });

    await expect(auth.getSession()).resolves.toEqual({ status: 'unauthenticated' });
  });

  it('signIn fails with a clear British English reason when Amplify is not configured', async () => {
    const auth = createAmplifySiteAuth({ isConfigured: false });

    await expect(auth.signIn('owner@example.com', 'secret')).resolves.toEqual({
      status: 'failed',
      reason: AUTH_NOT_CONFIGURED_REASON,
    });
  });

  it('getSession returns authenticated email when Amplify reports a signed-in user', async () => {
    const client = createFakeAmplifyClient({
      getCurrentUser: vi.fn(async () => ({ username: 'owner', userId: '1' })),
      fetchUserAttributes: vi.fn(async () => ({ email: 'owner@example.com' })),
    });
    const auth = createAmplifySiteAuth({ isConfigured: true, client });

    await expect(auth.getSession()).resolves.toEqual({
      status: 'authenticated',
      email: 'owner@example.com',
    });
  });

  it('getSession returns unauthenticated when Amplify reports no signed-in user', async () => {
    const auth = createAmplifySiteAuth({
      isConfigured: true,
      client: createFakeAmplifyClient(),
    });

    await expect(auth.getSession()).resolves.toEqual({ status: 'unauthenticated' });
  });

  it('signIn succeeds when Amplify accepts credentials', async () => {
    const client = createFakeAmplifyClient({
      signIn: vi.fn(async () => ({ isSignedIn: true })),
    });
    const auth = createAmplifySiteAuth({ isConfigured: true, client });

    await expect(auth.signIn('owner@example.com', 'secret')).resolves.toEqual({
      status: 'signed_in',
    });
    expect(client.signIn).toHaveBeenCalledWith({
      username: 'owner@example.com',
      password: 'secret',
    });
  });

  it('signOut clears the Amplify session', async () => {
    const client = createFakeAmplifyClient();
    const auth = createAmplifySiteAuth({ isConfigured: true, client });

    await auth.signOut();

    expect(client.signOut).toHaveBeenCalled();
  });
});

describe('createSiteAuthFromOutputs', () => {
  it('behaves as unconfigured when outputs are missing', async () => {
    const auth = createSiteAuthFromOutputs(null);

    await expect(auth.getSession()).resolves.toEqual({ status: 'unauthenticated' });
    await expect(auth.signIn('owner@example.com', 'secret')).resolves.toEqual({
      status: 'failed',
      reason: AUTH_NOT_CONFIGURED_REASON,
    });
  });
});
