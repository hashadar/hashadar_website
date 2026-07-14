import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('job market lab ingest wiring', () => {
  const backendTs = readFileSync(
    path.join(process.cwd(), 'amplify', 'backend.ts'),
    'utf8',
  );

  it('registers the ingest function and raw/ ObjectCreated notification', () => {
    expect(backendTs).toMatch(/jobMarketIngest/);
    expect(backendTs).toMatch(/EventType\.OBJECT_CREATED/);
    expect(backendTs).toMatch(/prefix:\s*'raw\/'/);
  });

  it('does not wire corpus recompute into the ingest path', () => {
    expect(backendTs).not.toMatch(/recompute/i);
    expect(backendTs).not.toMatch(/AnalysisRun/);
  });
});
