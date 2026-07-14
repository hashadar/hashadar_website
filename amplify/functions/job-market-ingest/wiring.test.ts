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

  it('does not start recompute from the S3 ObjectCreated ingest notification', () => {
    const notificationBlock =
      backendTs.match(
        /addEventNotification\([\s\S]*?\);\s*/,
      )?.[0] ?? '';

    expect(notificationBlock).toMatch(/jobMarketIngest\.resources\.lambda/);
    expect(notificationBlock).not.toMatch(/jobMarketRecompute/);
    expect(notificationBlock).not.toMatch(/AnalysisRun/);
  });
});
