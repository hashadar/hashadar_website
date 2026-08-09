import { describe, expect, it, vi } from 'vitest';
import {
  amplifyBranchSecretParamName,
  amplifySharedSecretParamName,
  fetchAmplifyHostingSecret,
} from '@/lib/wmw/amplify-hosting-secret';

describe('amplify hosting secret paths', () => {
  it('uses documented shared and branch SSM layouts', () => {
    expect(
      amplifySharedSecretParamName('d3j7dgxx3prj17', 'wmw.google-service-account'),
    ).toBe('/amplify/shared/d3j7dgxx3prj17/wmw.google-service-account');
    expect(
      amplifyBranchSecretParamName(
        'd3j7dgxx3prj17',
        'main',
        'wmw.google-service-account',
      ),
    ).toBe('/amplify/d3j7dgxx3prj17/main/wmw.google-service-account');
  });
});

describe('fetchAmplifyHostingSecret', () => {
  it('returns the first parameter value that resolves', async () => {
    const send = vi
      .fn()
      .mockRejectedValueOnce(new Error('not found'))
      .mockResolvedValueOnce({ Parameter: { Value: '  secret-json  ' } });

    await expect(
      fetchAmplifyHostingSecret({
        appId: 'd3j7dgxx3prj17',
        branch: 'main',
        secretName: 'wmw.google-service-account',
        client: { send },
      }),
    ).resolves.toBe('secret-json');

    expect(send).toHaveBeenCalledTimes(2);
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
