import { describe, expect, it, vi } from 'vitest';
import {
  fetchCareerPageText,
  isBlockedHostname,
  isBlockedIpAddress,
  type FetchHttpResponse,
} from './fetch-gate';
import { htmlToPlainText } from './html-to-text';

function htmlResponse(
  overrides: Partial<{
    status: number;
    body: string;
    contentType: string | null;
    location: string | null;
    url: string;
  }> = {},
): FetchHttpResponse {
  const body = overrides.body ?? `<html><body>${'Senior data scientist role. '.repeat(20)}</body></html>`;
  const headers = new Map<string, string>();
  if (overrides.contentType !== null) {
    headers.set('content-type', overrides.contentType ?? 'text/html; charset=utf-8');
  }
  if (overrides.location) {
    headers.set('location', overrides.location);
  }
  const encoded = new TextEncoder().encode(body);
  return {
    status: overrides.status ?? 200,
    url: overrides.url ?? 'https://boards.greenhouse.io/example/jobs/1',
    headers: {
      get(name: string) {
        return headers.get(name.toLowerCase()) ?? null;
      },
    },
    async arrayBuffer() {
      return encoded.buffer.slice(
        encoded.byteOffset,
        encoded.byteOffset + encoded.byteLength,
      );
    },
  };
}

describe('SSRF denylist', () => {
  it('blocks localhost and private hostnames', () => {
    expect(isBlockedHostname('localhost')).toBe(true);
    expect(isBlockedHostname('metadata.google.internal')).toBe(true);
    expect(isBlockedHostname('127.0.0.1')).toBe(true);
    expect(isBlockedHostname('10.0.0.5')).toBe(true);
    expect(isBlockedHostname('192.168.1.1')).toBe(true);
    expect(isBlockedHostname('boards.greenhouse.io')).toBe(false);
  });

  it('blocks private and link-local addresses', () => {
    expect(isBlockedIpAddress('169.254.169.254')).toBe(true);
    expect(isBlockedIpAddress('172.16.0.1')).toBe(true);
    expect(isBlockedIpAddress('8.8.8.8')).toBe(false);
  });
});

describe('fetchCareerPageText', () => {
  it('rejects non-HTTPS URLs before any network call', async () => {
    const fetchHttp = vi.fn();
    const result = await fetchCareerPageText('http://example.com/jobs/1', {
      fetchHttp,
      resolveHostAddresses: async () => ['8.8.8.8'],
      htmlToPlainText,
    });
    expect(result).toEqual({ status: 'unfetchable', reason: 'invalid_url' });
    expect(fetchHttp).not.toHaveBeenCalled();
  });

  it('rejects hosts that resolve to private addresses', async () => {
    const result = await fetchCareerPageText('https://evil.example/jobs/1', {
      fetchHttp: vi.fn(),
      resolveHostAddresses: async () => ['10.0.0.9'],
      htmlToPlainText,
    });
    expect(result).toEqual({ status: 'unfetchable', reason: 'blocked_host' });
  });

  it('returns unfetchable on timeout', async () => {
    const result = await fetchCareerPageText('https://boards.greenhouse.io/jobs/1', {
      fetchHttp: async () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        throw error;
      },
      resolveHostAddresses: async () => ['8.8.8.8'],
      htmlToPlainText,
    });
    expect(result.status).toBe('unfetchable');
    if (result.status === 'unfetchable') {
      expect(result.reason).toBe('timeout');
    }
  });

  it('returns unfetchable on non-2xx', async () => {
    const result = await fetchCareerPageText('https://boards.greenhouse.io/jobs/1', {
      fetchHttp: async () => htmlResponse({ status: 404, body: 'missing' }),
      resolveHostAddresses: async () => ['8.8.8.8'],
      htmlToPlainText,
    });
    expect(result).toMatchObject({ status: 'unfetchable', reason: 'non_2xx' });
  });

  it('returns unfetchable when stripped text is too short', async () => {
    const result = await fetchCareerPageText('https://boards.greenhouse.io/jobs/1', {
      fetchHttp: async () =>
        htmlResponse({ body: '<html><body><script>x</script>Hi</body></html>' }),
      resolveHostAddresses: async () => ['8.8.8.8'],
      htmlToPlainText,
    });
    expect(result).toEqual({ status: 'unfetchable', reason: 'content_too_short' });
  });

  it('returns plain text on a successful HTML fetch', async () => {
    const result = await fetchCareerPageText('https://boards.greenhouse.io/jobs/1', {
      fetchHttp: async () => htmlResponse(),
      resolveHostAddresses: async () => ['8.8.8.8'],
      htmlToPlainText,
    });
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.hostname).toBe('boards.greenhouse.io');
      expect(result.plainText.length).toBeGreaterThan(200);
      expect(result.plainText).toContain('Senior data scientist');
    }
  });

  it('follows a single HTTPS redirect after re-validating the host', async () => {
    const fetchHttp = vi
      .fn()
      .mockResolvedValueOnce(
        htmlResponse({
          status: 302,
          location: 'https://jobs.lever.co/acme/role',
          body: '',
        }),
      )
      .mockResolvedValueOnce(htmlResponse({ url: 'https://jobs.lever.co/acme/role' }));

    const result = await fetchCareerPageText('https://boards.greenhouse.io/jobs/1', {
      fetchHttp,
      resolveHostAddresses: async () => ['8.8.8.8'],
      htmlToPlainText,
    });

    expect(result.status).toBe('ok');
    expect(fetchHttp).toHaveBeenCalledTimes(2);
  });
});

describe('htmlToPlainText', () => {
  it('strips scripts and styles while keeping body text', () => {
    const text = htmlToPlainText(
      '<html><head><style>.x{}</style></head><body><script>alert(1)</script><p>Hello</p><p>World</p></body></html>',
    );
    expect(text).toContain('Hello');
    expect(text).toContain('World');
    expect(text).not.toContain('alert');
    expect(text).not.toContain('.x');
  });
});
