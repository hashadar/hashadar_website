import { describe, expect, it, vi } from 'vitest';
import nextConfig from './next.config';

describe('next.config image optimisation', () => {
  it('keeps the intentional Next image optimisation path enabled', () => {
    expect(nextConfig.images?.unoptimized).not.toBe(true);
    expect(nextConfig.images?.formats).toEqual(
      expect.arrayContaining(['image/webp', 'image/avif']),
    );
    expect(nextConfig.images?.remotePatterns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ hostname: '**.amazonaws.com' }),
        expect.objectContaining({ hostname: '**.cloudfront.net' }),
      ]),
    );
  });
});

describe('next.config dev origins', () => {
  it('allows nothing extra unless DEV_ALLOWED_ORIGINS is set', () => {
    expect(nextConfig.allowedDevOrigins).toEqual([]);
  });

  it('reads a comma-separated list of hostnames from DEV_ALLOWED_ORIGINS', async () => {
    vi.stubEnv('DEV_ALLOWED_ORIGINS', ' 192.168.1.32 ,phone.local,, ');
    vi.resetModules();
    const { default: config } = await import('./next.config');
    expect(config.allowedDevOrigins).toEqual(['192.168.1.32', 'phone.local']);
    vi.unstubAllEnvs();
  });
});

describe('next.config R3F / three', () => {
  it('transpiles three for App Router compatibility', () => {
    expect(nextConfig.transpilePackages).toEqual(
      expect.arrayContaining(['three']),
    );
  });
});

describe('next.config Court Board headers', () => {
  it('keeps every Court Board route out of search indexes', async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    const all = rules.find((rule) => rule.source === '/labs/court-board/:path*');
    expect(all?.headers).toEqual(
      expect.arrayContaining([{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }]),
    );
  });

  it('stops the Organiser link leaking through Referer or caches', async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    for (const source of ['/labs/court-board/o', '/labs/court-board/o/:path*']) {
      const rule = rules.find((r) => r.source === source);
      expect(rule?.headers).toEqual(
        expect.arrayContaining([
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Cache-Control', value: 'no-store' },
        ]),
      );
    }
  });
});
