import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const queries = vi.hoisted(() => ({ isValidOrganiserToken: vi.fn() }));
vi.mock('@/lib/court-board/server-queries', () => queries);

import { GET } from './route';

const request = new Request('http://localhost/labs/court-board/o/token');
const call = (token: string) => GET(request, { params: Promise.resolve({ token }) });

beforeEach(() => {
  queries.isValidOrganiserToken.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Organiser link token exchange', () => {
  it('sets a path-scoped HttpOnly SameSite=Strict cookie and redirects to a relative URL', async () => {
    queries.isValidOrganiserToken.mockResolvedValue(true);
    const response = await call('good-token-0123456789abcdef');

    expect(response.status).toBe(303);
    expect(response.headers.get('Location')).toBe('/labs/court-board/o');

    const cookie = response.cookies.get('cb_org');
    expect(cookie?.value).toBe('good-token-0123456789abcdef');
    expect(cookie).toMatchObject({
      httpOnly: true,
      sameSite: 'strict',
      path: '/labs/court-board/o',
      maxAge: 60 * 60 * 24 * 365,
    });
  });

  it('marks the cookie Secure in production only', async () => {
    queries.isValidOrganiserToken.mockResolvedValue(true);
    vi.stubEnv('NODE_ENV', 'production');
    expect((await call('good-token-0123456789abcdef')).cookies.get('cb_org')?.secure).toBe(true);
    vi.stubEnv('NODE_ENV', 'development');
    expect((await call('good-token-0123456789abcdef')).cookies.get('cb_org')?.secure).toBeFalsy();
  });

  it('never lets the token leak through referrers, caches or search engines', async () => {
    queries.isValidOrganiserToken.mockResolvedValue(true);
    const { headers } = await call('good-token-0123456789abcdef');
    expect(headers.get('Referrer-Policy')).toBe('no-referrer');
    expect(headers.get('Cache-Control')).toBe('no-store');
    expect(headers.get('X-Robots-Tag')).toBe('noindex');
  });

  it('redirects a wrong or replaced token the same way, with no cookie', async () => {
    queries.isValidOrganiserToken.mockResolvedValue(false);
    const response = await call('stale-token-0123456789abcdef');

    expect(response.status).toBe(303);
    expect(response.headers.get('Location')).toBe('/labs/court-board/o');
    expect(response.cookies.get('cb_org')).toBeUndefined();
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
  });

  it('checks the token it was given and does not log it', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    queries.isValidOrganiserToken.mockResolvedValue(true);
    await call('secret-token-0123456789abcdef');
    expect(queries.isValidOrganiserToken).toHaveBeenCalledWith('secret-token-0123456789abcdef');
    expect(JSON.stringify([...log.mock.calls, ...error.mock.calls])).not.toContain('secret-token');
    log.mockRestore();
    error.mockRestore();
  });
});
