import { describe, expect, it, vi } from 'vitest';
import { createIsSiteAdmin, type MakeTokenVerifier } from './site-admin';

const pool = { userPoolId: 'eu-west-2_Pool', userPoolClientId: 'client' };

describe('createIsSiteAdmin', () => {
  it('accepts a token the verifier accepts, checked against this pool and client', async () => {
    const verify = vi.fn().mockResolvedValue({ sub: 'admin' });
    const make = vi.fn<MakeTokenVerifier>(() => ({ verify }));
    const isAdmin = createIsSiteAdmin(pool, make);

    await expect(isAdmin('good.jwt.token')).resolves.toBe(true);
    expect(make).toHaveBeenCalledWith({
      userPoolId: 'eu-west-2_Pool',
      clientId: 'client',
    });
    expect(verify).toHaveBeenCalledWith('good.jwt.token');
  });

  it('rejects a token the verifier rejects (bad signature, expired, wrong pool)', async () => {
    const isAdmin = createIsSiteAdmin(pool, () => ({
      verify: vi.fn().mockRejectedValue(new Error('expired')),
    }));
    await expect(isAdmin('bad.jwt.token')).resolves.toBe(false);
  });

  it('rejects missing or non-string tokens without calling the verifier', async () => {
    const verify = vi.fn();
    const isAdmin = createIsSiteAdmin(pool, () => ({ verify }));
    for (const token of [undefined, null, '', 42, {}]) {
      await expect(isAdmin(token)).resolves.toBe(false);
    }
    expect(verify).not.toHaveBeenCalled();
  });

  it('fails closed when no user pool is configured', async () => {
    const make = vi.fn<MakeTokenVerifier>();
    for (const config of [
      { userPoolId: null, userPoolClientId: null },
      { userPoolId: 'eu-west-2_Pool', userPoolClientId: null },
    ]) {
      const isAdmin = createIsSiteAdmin(config, make);
      await expect(isAdmin('any.jwt.token')).resolves.toBe(false);
    }
    expect(make).not.toHaveBeenCalled();
  });
});
