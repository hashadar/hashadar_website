import type { JobDescriptionCorpusRecord } from '@/lib/job-market-corpus';

export type CorpusStatusFilter = 'all' | 'active' | 'archived';

export type CorpusTableFilters = {
  status: CorpusStatusFilter;
  search: string;
  missingEmployer: boolean;
  missingPay: boolean;
};

export function hasMissingPay(record: JobDescriptionCorpusRecord): boolean {
  return (
    record.compensationCurrency == null ||
    record.compensationMin == null ||
    record.compensationMax == null ||
    record.compensationPeriod == null
  );
}

export function displayTitle(record: JobDescriptionCorpusRecord): string {
  if (record.title?.trim()) {
    return record.title.trim();
  }
  const key = record.s3Key ?? record.id;
  const base = key.replace(/^.*[/\\]/, '');
  return base || record.id;
}

export function compensationSummary(record: JobDescriptionCorpusRecord): string {
  if (
    record.compensationCurrency == null ||
    record.compensationMin == null ||
    record.compensationMax == null
  ) {
    return '—';
  }
  const period = record.compensationPeriod ? ` / ${record.compensationPeriod}` : '';
  return `${record.compensationCurrency} ${record.compensationMin}–${record.compensationMax}${period}`;
}

export function filterCorpusRecords(
  records: JobDescriptionCorpusRecord[],
  filters: CorpusTableFilters,
): JobDescriptionCorpusRecord[] {
  const query = filters.search.trim().toLowerCase();

  return records.filter((record) => {
    if (filters.status !== 'all' && record.status !== filters.status) {
      return false;
    }
    if (filters.missingEmployer && record.employerId) {
      return false;
    }
    if (filters.missingPay && !hasMissingPay(record)) {
      return false;
    }
    if (!query) {
      return true;
    }
    const haystack = [
      record.title ?? '',
      record.s3Key ?? '',
      record.id,
      record.source ?? '',
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });
}
