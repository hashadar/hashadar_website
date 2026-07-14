import { selectActiveCorpus, type JobDescriptionCorpusRecord } from './job-market-corpus';
import {
  EMPLOYER_PRESTIGE_TIERS,
  EMPLOYER_SIZE_TIERS,
  type EmployerRecord,
} from './job-market-employers';

export type MissingDataRate = {
  field:
    | 'employerLink'
    | 'compensationCurrency'
    | 'compensationMin'
    | 'compensationMax'
    | 'compensationPeriod'
    | 'completeCompensation';
  present: number;
  missing: number;
  missingRate: number;
};

export type TierBucket = {
  tier: string;
  count: number;
};

export type CompensationCurrencySummary = {
  currency: string;
  count: number;
  medianMin?: number;
  medianMax?: number;
};

export type OwnerPayPrestigeAnalytics = {
  activeDocumentCount: number;
  missingDataRates: MissingDataRate[];
  prestigeTierBreakdown: TierBucket[];
  sizeTierBreakdown: TierBucket[];
  compensationByCurrency: CompensationCurrencySummary[];
};

export type GetOwnerPayPrestigeAnalyticsDeps = {
  listJobDescriptions: () => Promise<JobDescriptionCorpusRecord[]>;
  listEmployers: () => Promise<EmployerRecord[]>;
};

const MISSING_DATA_FIELDS = [
  'employerLink',
  'compensationCurrency',
  'compensationMin',
  'compensationMax',
  'compensationPeriod',
  'completeCompensation',
] as const satisfies ReadonlyArray<MissingDataRate['field']>;

function median(values: number[]): number | undefined {
  if (values.length === 0) {
    return undefined;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
}

function hasEmployerLink(record: JobDescriptionCorpusRecord): boolean {
  return Boolean(record.employerId?.trim());
}

function hasCompensationCurrency(record: JobDescriptionCorpusRecord): boolean {
  return Boolean(record.compensationCurrency?.trim());
}

function hasCompensationMin(record: JobDescriptionCorpusRecord): boolean {
  return record.compensationMin != null;
}

function hasCompensationMax(record: JobDescriptionCorpusRecord): boolean {
  return record.compensationMax != null;
}

function hasCompensationPeriod(record: JobDescriptionCorpusRecord): boolean {
  return record.compensationPeriod != null;
}

function hasCompleteCompensation(record: JobDescriptionCorpusRecord): boolean {
  return (
    hasCompensationCurrency(record) &&
    hasCompensationPeriod(record) &&
    (hasCompensationMin(record) || hasCompensationMax(record))
  );
}

function fieldPresent(
  field: MissingDataRate['field'],
  record: JobDescriptionCorpusRecord,
): boolean {
  switch (field) {
    case 'employerLink':
      return hasEmployerLink(record);
    case 'compensationCurrency':
      return hasCompensationCurrency(record);
    case 'compensationMin':
      return hasCompensationMin(record);
    case 'compensationMax':
      return hasCompensationMax(record);
    case 'compensationPeriod':
      return hasCompensationPeriod(record);
    case 'completeCompensation':
      return hasCompleteCompensation(record);
  }
}

function buildMissingDataRates(
  records: JobDescriptionCorpusRecord[],
): MissingDataRate[] {
  const total = records.length;

  return MISSING_DATA_FIELDS.map((field) => {
    const present = records.filter((record) => fieldPresent(field, record)).length;
    const missing = total - present;

    return {
      field,
      present,
      missing,
      missingRate: total === 0 ? 0 : missing / total,
    };
  });
}

function buildTierBreakdown<T extends string>(
  tiers: readonly T[],
  counts: Map<T, number>,
): TierBucket[] {
  return tiers.map((tier) => ({
    tier,
    count: counts.get(tier) ?? 0,
  }));
}

function buildCompensationByCurrency(
  records: JobDescriptionCorpusRecord[],
): CompensationCurrencySummary[] {
  const byCurrency = new Map<string, { mins: number[]; maxes: number[] }>();

  for (const record of records) {
    if (!hasCompensationCurrency(record)) {
      continue;
    }

    if (!hasCompensationMin(record) && !hasCompensationMax(record)) {
      continue;
    }

    const currency = record.compensationCurrency!.trim().toUpperCase();
    const bucket = byCurrency.get(currency) ?? { mins: [], maxes: [] };

    if (hasCompensationMin(record)) {
      bucket.mins.push(record.compensationMin!);
    }
    if (hasCompensationMax(record)) {
      bucket.maxes.push(record.compensationMax!);
    }

    byCurrency.set(currency, bucket);
  }

  return [...byCurrency.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, values]) => ({
      currency,
      count: Math.max(values.mins.length, values.maxes.length),
      medianMin: median(values.mins),
      medianMax: median(values.maxes),
    }));
}

export async function getOwnerPayPrestigeAnalytics(
  deps: GetOwnerPayPrestigeAnalyticsDeps,
): Promise<OwnerPayPrestigeAnalytics> {
  const [records, employers] = await Promise.all([
    deps.listJobDescriptions(),
    deps.listEmployers(),
  ]);

  const activeRecords = selectActiveCorpus(records);
  const employersById = new Map(employers.map((entry) => [entry.id, entry]));
  const prestigeCounts = new Map<string, number>();
  const sizeCounts = new Map<string, number>();

  for (const record of activeRecords) {
    if (!record.employerId) {
      continue;
    }

    const linkedEmployer = employersById.get(record.employerId);
    if (!linkedEmployer) {
      continue;
    }

    prestigeCounts.set(
      linkedEmployer.prestigeTier,
      (prestigeCounts.get(linkedEmployer.prestigeTier) ?? 0) + 1,
    );
    sizeCounts.set(
      linkedEmployer.sizeTier,
      (sizeCounts.get(linkedEmployer.sizeTier) ?? 0) + 1,
    );
  }

  return {
    activeDocumentCount: activeRecords.length,
    missingDataRates: buildMissingDataRates(activeRecords),
    prestigeTierBreakdown: buildTierBreakdown(EMPLOYER_PRESTIGE_TIERS, prestigeCounts),
    sizeTierBreakdown: buildTierBreakdown(EMPLOYER_SIZE_TIERS, sizeCounts),
    compensationByCurrency: buildCompensationByCurrency(activeRecords),
  };
}
