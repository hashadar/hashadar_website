export type JobDescriptionStatus = 'active' | 'archived';

export type JobDescriptionCorpusRecord = {
  id: string;
  collectedAt: string;
  status: JobDescriptionStatus;
  title?: string;
  seniority?: string;
  roleFamily?: string;
  source?: string;
  s3Key?: string;
  contentHash?: string;
};

export const DEFAULT_MAX_AGE_MONTHS = 18;

export type ArchiveJobDescriptionDeps = {
  getJobDescription: (id: string) => Promise<JobDescriptionCorpusRecord | null>;
  saveJobDescription: (record: JobDescriptionCorpusRecord) => Promise<void>;
};

export type ArchiveJobDescriptionResult =
  | { status: 'archived'; record: JobDescriptionCorpusRecord }
  | { status: 'not_found' }
  | { status: 'already_archived'; record: JobDescriptionCorpusRecord };

export type PrepareActiveCorpusDeps = {
  listJobDescriptions: () => Promise<JobDescriptionCorpusRecord[]>;
  saveJobDescription: (record: JobDescriptionCorpusRecord) => Promise<void>;
  now?: Date;
  maxAgeMonths?: number;
};

export function selectActiveCorpus(
  records: JobDescriptionCorpusRecord[],
): JobDescriptionCorpusRecord[] {
  return records.filter((record) => record.status === 'active');
}

export function isOlderThanAgeWindow(
  collectedAt: string,
  now: Date,
  maxAgeMonths: number = DEFAULT_MAX_AGE_MONTHS,
): boolean {
  const collected = new Date(collectedAt);
  if (Number.isNaN(collected.getTime())) {
    return false;
  }

  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - maxAgeMonths);
  return collected.getTime() < cutoff.getTime();
}

export type RestoreJobDescriptionResult =
  | { status: 'restored'; record: JobDescriptionCorpusRecord }
  | { status: 'not_found' }
  | { status: 'already_active'; record: JobDescriptionCorpusRecord };

export async function archiveJobDescription(
  id: string,
  deps: ArchiveJobDescriptionDeps,
): Promise<ArchiveJobDescriptionResult> {
  const existing = await deps.getJobDescription(id);
  if (!existing) {
    return { status: 'not_found' };
  }

  if (existing.status === 'archived') {
    return { status: 'already_archived', record: existing };
  }

  const record: JobDescriptionCorpusRecord = {
    ...existing,
    status: 'archived',
  };
  await deps.saveJobDescription(record);
  return { status: 'archived', record };
}

export async function restoreJobDescription(
  id: string,
  deps: ArchiveJobDescriptionDeps,
): Promise<RestoreJobDescriptionResult> {
  const existing = await deps.getJobDescription(id);
  if (!existing) {
    return { status: 'not_found' };
  }

  if (existing.status === 'active') {
    return { status: 'already_active', record: existing };
  }

  const record: JobDescriptionCorpusRecord = {
    ...existing,
    status: 'active',
  };
  await deps.saveJobDescription(record);
  return { status: 'restored', record };
}

export async function prepareActiveCorpusForAnalysis(
  deps: PrepareActiveCorpusDeps,
): Promise<JobDescriptionCorpusRecord[]> {
  const now = deps.now ?? new Date();
  const maxAgeMonths = deps.maxAgeMonths ?? DEFAULT_MAX_AGE_MONTHS;
  const records = await deps.listJobDescriptions();

  for (const record of records) {
    if (
      record.status === 'active' &&
      isOlderThanAgeWindow(record.collectedAt, now, maxAgeMonths)
    ) {
      await deps.saveJobDescription({ ...record, status: 'archived' });
    }
  }

  const refreshed = await deps.listJobDescriptions();
  return selectActiveCorpus(refreshed);
}
