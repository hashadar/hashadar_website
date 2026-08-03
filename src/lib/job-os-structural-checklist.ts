import type { HuntProfileRecord, OpportunityRecord } from '@/lib/job-os';

export const STRUCTURAL_CHECKLIST_DIMENSIONS = [
  'compensation',
  'seniority',
  'role_family',
  'must_haves',
  'deal_breakers',
] as const;

export type StructuralChecklistDimension =
  (typeof STRUCTURAL_CHECKLIST_DIMENSIONS)[number];

export type StructuralChecklistVerdict = 'pass' | 'fail' | 'unknown';

export type StructuralChecklistRow = {
  dimension: StructuralChecklistDimension;
  verdict: StructuralChecklistVerdict;
};

export type StructuralChecklist = {
  rows: StructuralChecklistRow[];
};

function normaliseTag(value: string): string {
  return value.trim().toLowerCase();
}

function opportunityTagSet(opportunity: OpportunityRecord): Set<string> | null {
  const tags = (opportunity.technologies ?? [])
    .map(normaliseTag)
    .filter(Boolean);
  if (tags.length === 0) {
    return null;
  }
  return new Set(tags);
}

function evaluateCompensation(
  profile: HuntProfileRecord,
  opportunity: OpportunityRecord,
): StructuralChecklistVerdict {
  if (profile.compensationFloor == null) {
    return 'pass';
  }
  if (
    opportunity.compensationDisclosure !== 'range' ||
    opportunity.compensationMax == null
  ) {
    return 'unknown';
  }
  if (
    profile.compensationCurrency &&
    opportunity.compensationCurrency &&
    profile.compensationCurrency.toUpperCase() !==
      opportunity.compensationCurrency.toUpperCase()
  ) {
    return 'unknown';
  }
  if (
    profile.compensationPeriod &&
    opportunity.compensationPeriod &&
    profile.compensationPeriod !== opportunity.compensationPeriod
  ) {
    return 'unknown';
  }
  return opportunity.compensationMax >= profile.compensationFloor
    ? 'pass'
    : 'fail';
}

function evaluateExactMatch(
  profileValue: string | undefined,
  opportunityValue: string | undefined,
): StructuralChecklistVerdict {
  if (!profileValue?.trim()) {
    return 'pass';
  }
  if (!opportunityValue?.trim()) {
    return 'unknown';
  }
  return profileValue === opportunityValue ? 'pass' : 'fail';
}

function evaluateMustHaves(
  profile: HuntProfileRecord,
  opportunity: OpportunityRecord,
): StructuralChecklistVerdict {
  const mustHaves = (profile.mustHaveTags ?? [])
    .map(normaliseTag)
    .filter(Boolean);
  if (mustHaves.length === 0) {
    return 'pass';
  }
  const tags = opportunityTagSet(opportunity);
  if (!tags) {
    return 'unknown';
  }
  return mustHaves.every((tag) => tags.has(tag)) ? 'pass' : 'fail';
}

function evaluateDealBreakers(
  profile: HuntProfileRecord,
  opportunity: OpportunityRecord,
): StructuralChecklistVerdict {
  const dealBreakers = (profile.dealBreakerTags ?? [])
    .map(normaliseTag)
    .filter(Boolean);
  if (dealBreakers.length === 0) {
    return 'pass';
  }
  const tags = opportunityTagSet(opportunity);
  if (!tags) {
    return 'unknown';
  }
  return dealBreakers.some((tag) => tags.has(tag)) ? 'fail' : 'pass';
}

/** Pure Structural checklist — core five dimensions only. */
export function evaluateStructuralChecklist(
  profile: HuntProfileRecord,
  opportunity: OpportunityRecord,
): StructuralChecklist {
  return {
    rows: [
      {
        dimension: 'compensation',
        verdict: evaluateCompensation(profile, opportunity),
      },
      {
        dimension: 'seniority',
        verdict: evaluateExactMatch(
          profile.targetSeniority,
          opportunity.seniority,
        ),
      },
      {
        dimension: 'role_family',
        verdict: evaluateExactMatch(
          profile.targetRoleFamily,
          opportunity.roleFamily,
        ),
      },
      {
        dimension: 'must_haves',
        verdict: evaluateMustHaves(profile, opportunity),
      },
      {
        dimension: 'deal_breakers',
        verdict: evaluateDealBreakers(profile, opportunity),
      },
    ],
  };
}
