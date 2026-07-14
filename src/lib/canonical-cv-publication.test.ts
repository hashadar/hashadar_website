import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const handlerDir = dirname(fileURLToPath(import.meta.url));

describe('job-market publication handler', () => {
  it('never reads CanonicalCv — guests cannot reach owner CV storage', () => {
    const source = readFileSync(
      join(handlerDir, '../../amplify/functions/job-market-publication/handler.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/CanonicalCv/);
    expect(source).toMatch(/getPublishedJobMarketSnapshot/);
  });
});

describe('CanonicalCv Amplify authorisation', () => {
  it('restricts CanonicalCv to authenticated owners only', () => {
    const source = readFileSync(
      join(handlerDir, '../../amplify/data/resource.ts'),
      'utf8',
    );

    const canonicalCvBlock = source.slice(
      source.indexOf('CanonicalCv:'),
      source.indexOf('startJobMarketRecompute'),
    );

    expect(canonicalCvBlock).toMatch(/CanonicalCv/);
    expect(canonicalCvBlock).toMatch(/allow\.authenticated\(\)/);
    expect(canonicalCvBlock).not.toMatch(/allow\.guest\(\)/);
  });
});
