import { describe, expect, it } from 'vitest';
import { evaluateStructuralChecklist } from '@/lib/job-os-structural-checklist';
import type { HuntProfileRecord, OpportunityRecord } from '@/lib/job-os';

function profile(
  overrides: Partial<HuntProfileRecord> = {},
): HuntProfileRecord {
  return {
    id: 'hunt-profile',
    contentUpdatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

function opportunity(
  overrides: Partial<OpportunityRecord> = {},
): OpportunityRecord {
  return {
    id: 'opp-1',
    employerId: 'emp-1',
    status: 'open',
    noticedAt: '2026-08-01T00:00:00.000Z',
    contentUpdatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

function verdict(
  checklist: ReturnType<typeof evaluateStructuralChecklist>,
  dimension: string,
) {
  return checklist.rows.find((row) => row.dimension === dimension)?.verdict;
}

describe('Structural checklist', () => {
  it('marks compensation pass/fail/unknown from floor vs range', () => {
    const hunt = profile({
      compensationFloor: 100000,
      compensationCurrency: 'GBP',
      compensationPeriod: 'year',
    });

    expect(
      verdict(
        evaluateStructuralChecklist(
          hunt,
          opportunity({
            compensationDisclosure: 'range',
            compensationCurrency: 'GBP',
            compensationPeriod: 'year',
            compensationMax: 120000,
          }),
        ),
        'compensation',
      ),
    ).toBe('pass');

    expect(
      verdict(
        evaluateStructuralChecklist(
          hunt,
          opportunity({
            compensationDisclosure: 'range',
            compensationCurrency: 'GBP',
            compensationPeriod: 'year',
            compensationMax: 90000,
          }),
        ),
        'compensation',
      ),
    ).toBe('fail');

    expect(
      verdict(
        evaluateStructuralChecklist(
          hunt,
          opportunity({ compensationDisclosure: 'unknown' }),
        ),
        'compensation',
      ),
    ).toBe('unknown');
  });

  it('matches seniority and role family or unknown when Opportunity fields missing', () => {
    const hunt = profile({
      targetSeniority: 'senior',
      targetRoleFamily: 'engineering',
    });

    expect(
      verdict(
        evaluateStructuralChecklist(
          hunt,
          opportunity({ seniority: 'senior', roleFamily: 'engineering' }),
        ),
        'seniority',
      ),
    ).toBe('pass');
    expect(
      verdict(
        evaluateStructuralChecklist(
          hunt,
          opportunity({ seniority: 'mid', roleFamily: 'product' }),
        ),
        'role_family',
      ),
    ).toBe('fail');
    expect(
      verdict(evaluateStructuralChecklist(hunt, opportunity()), 'seniority'),
    ).toBe('unknown');
  });

  it('evaluates must-haves and deal-breakers against technologies', () => {
    const hunt = profile({
      mustHaveTags: ['TypeScript', 'AWS'],
      dealBreakerTags: ['PHP'],
    });

    expect(
      verdict(
        evaluateStructuralChecklist(
          hunt,
          opportunity({ technologies: ['typescript', 'aws', 'react'] }),
        ),
        'must_haves',
      ),
    ).toBe('pass');
    expect(
      verdict(
        evaluateStructuralChecklist(
          hunt,
          opportunity({ technologies: ['typescript'] }),
        ),
        'must_haves',
      ),
    ).toBe('fail');
    expect(
      verdict(
        evaluateStructuralChecklist(
          hunt,
          opportunity({ technologies: ['typescript', 'aws', 'php'] }),
        ),
        'deal_breakers',
      ),
    ).toBe('fail');
    expect(
      verdict(evaluateStructuralChecklist(hunt, opportunity()), 'must_haves'),
    ).toBe('unknown');
  });
});
