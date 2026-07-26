import { Amplify } from 'aws-amplify';
import { describe, expect, it, vi } from 'vitest';
import { isAmplifyClientConfigured } from './is-amplify-client-configured';

describe('isAmplifyClientConfigured', () => {
  it('returns false when Amplify config is empty', () => {
    expect(isAmplifyClientConfigured(() => ({}))).toBe(false);
  });

  it('returns true when Amplify config has keys', () => {
    expect(isAmplifyClientConfigured(() => ({ Auth: {} }))).toBe(true);
  });

  it('defaults to Amplify.getConfig', () => {
    const spy = vi.spyOn(Amplify, 'getConfig').mockReturnValue({} as never);
    expect(isAmplifyClientConfigured()).toBe(false);
    spy.mockRestore();
  });
});
