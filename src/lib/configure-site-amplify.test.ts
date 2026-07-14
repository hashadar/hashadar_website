import { describe, expect, it, vi } from 'vitest';
import { configureSiteAmplify } from './configure-site-amplify';

describe('configureSiteAmplify', () => {
  it('does not throw or configure when outputs are missing', () => {
    const configure = vi.fn();

    expect(() => configureSiteAmplify(null, configure)).not.toThrow();
    expect(() => configureSiteAmplify(undefined, configure)).not.toThrow();
    expect(() => configureSiteAmplify({}, configure)).not.toThrow();
    expect(configure).not.toHaveBeenCalled();
  });

  it('configures Amplify with SSR when outputs are present', () => {
    const configure = vi.fn();
    const outputs = {
      version: '1.4',
      auth: { user_pool_id: 'eu-west-2_example' },
    };

    expect(() => configureSiteAmplify(outputs, configure)).not.toThrow();
    expect(configure).toHaveBeenCalledWith(outputs, { ssr: true });
  });
});
