import { describe, expect, it, vi } from 'vitest';
import {
  amplifyBranchSecretParamName,
  amplifySharedSecretParamName,
  fetchAmplifyHostingSecret,
} from '@/lib/wmw/amplify-hosting-secret';

describe('amplify hosting secret paths', () => {
  it('uses documented shared and branch SSM layouts with placeholders', () => {
    expect(
      amplifySharedSecretParamName('{appId}', 'wmw.google-service-account'),
    ).toBe('/amplify/shared/{appId}/wmw.google-service-account');
    expect(
      amplifyBranchSecretParamName(
        '{appId}',
        '{branch}',
        'wmw.google-service-account',
      ),
    ).toBe('/amplify/{appId}/{branch}/wmw.google-service-account');
  });
});

describe('fetchAmplifyHostingSecret', () => {
  it('tries branch path then shared path and returns the first value', async () => {
    const send = vi
      .fn()
      .mockRejectedValueOnce(new Error('not found'))
      .mockResolvedValueOnce({ Parameter: { Value: '  secret-json  ' } });

    await expect(
      fetchAmplifyHostingSecret({
        appId: 'app-example',
        branch: 'main',
        secretName: 'wmw.google-service-account',
        client: { send },
      }),
    ).resolves.toBe('secret-json');

    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0]?.[0].input.Name).toBe(
      '/amplify/app-example/main/wmw.google-service-account',
    );
    expect(send.mock.calls[1]?.[0].input.Name).toBe(
      '/amplify/shared/app-example/wmw.google-service-account',
    );
  });

  it('returns null when no candidate resolves', async () => {
    const send = vi.fn().mockRejectedValue(new Error('denied'));
    await expect(
      fetchAmplifyHostingSecret({
        branch: null,
        client: { send },
      }),
    ).resolves.toBeNull();
  });
});
