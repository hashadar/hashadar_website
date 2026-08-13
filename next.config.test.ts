import { describe, expect, it } from 'vitest';
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
