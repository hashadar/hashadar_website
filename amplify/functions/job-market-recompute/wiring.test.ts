import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('job market recompute wiring', () => {
  const backendTs = readFileSync(
    path.join(process.cwd(), 'amplify', 'backend.ts'),
    'utf8',
  );
  const authTs = readFileSync(
    path.join(process.cwd(), 'amplify', 'auth', 'resource.ts'),
    'utf8',
  );
  const dataTs = readFileSync(
    path.join(process.cwd(), 'amplify', 'data', 'resource.ts'),
    'utf8',
  );

  it('disables Cognito self-sign-up (admin create only)', () => {
    expect(backendTs).toMatch(/allowAdminCreateUserOnly:\s*true/);
    expect(authTs).toMatch(/loginWith:\s*\{[\s\S]*email:\s*true/);
  });

  it('wires recompute orchestration to the analyse worker', () => {
    expect(backendTs).toMatch(/jobMarketRecompute/);
    expect(backendTs).toMatch(/jobMarketAnalyse/);
    expect(backendTs).toMatch(/JOB_MARKET_ANALYSE_FUNCTION_NAME/);
    expect(backendTs).toMatch(/grantInvoke/);
  });

  it('exposes guest publication query and authenticated recompute mutation', () => {
    expect(dataTs).toMatch(/getPublishedJobMarketSnapshot/);
    expect(dataTs).toMatch(/startJobMarketRecompute/);
    expect(dataTs).toMatch(/parseJobListingFromUrl/);
    expect(dataTs).toMatch(/allow\.guest\(\)/);
    expect(dataTs).toMatch(/AnalysisRun/);
    expect(dataTs).toMatch(/CorpusSnapshot/);
    expect(dataTs).toMatch(/LabPublication/);
    expect(dataTs).toMatch(/ThemeLabelOverride/);
  });
});
