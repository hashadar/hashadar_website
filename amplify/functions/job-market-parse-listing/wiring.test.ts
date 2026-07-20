import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('job market parse-listing wiring', () => {
  const backendTs = readFileSync(
    path.join(process.cwd(), 'amplify', 'backend.ts'),
    'utf8',
  );
  const dataTs = readFileSync(
    path.join(process.cwd(), 'amplify', 'data', 'resource.ts'),
    'utf8',
  );
  const storageTs = readFileSync(
    path.join(process.cwd(), 'amplify', 'storage', 'resource.ts'),
    'utf8',
  );
  const resourceTs = readFileSync(
    path.join(
      process.cwd(),
      'amplify',
      'functions',
      'job-market-parse-listing',
      'resource.ts',
    ),
    'utf8',
  );

  it('exposes authenticated parseJobListingFromUrl mutation', () => {
    expect(dataTs).toMatch(/parseJobListingFromUrl/);
    expect(dataTs).toMatch(/jobMarketParseListing/);
    expect(dataTs).toMatch(/allow\.resource\(jobMarketParseListing\)/);
  });

  it('grants parse Lambda Bedrock invoke and candidates storage access', () => {
    expect(backendTs).toMatch(/jobMarketParseListing/);
    expect(backendTs).toMatch(/bedrock:InvokeModel/);
    expect(resourceTs).toMatch(/BEDROCK_PARSE_MODEL_ID/);
    expect(resourceTs).toMatch(/qwen\.qwen3-32b/);
    expect(storageTs).toMatch(/jobMarketParseListing/);
    expect(storageTs).toMatch(/candidates\/\*/);
  });
});
