import matter from 'gray-matter';
import { validateJobDescriptionMarkdown } from './validate-job-description-markdown';
import type {
  UploadJobDescriptionDeps,
  UploadJobDescriptionResult,
} from './upload-job-description';

export type ScrapeCandidateStatus = 'pending' | 'accepted' | 'rejected';

export type ScrapeCandidateRecord = {
  id: string;
  fileName: string;
  body: string;
  status: ScrapeCandidateStatus;
  title?: string;
  source?: string;
  collectedAt?: string;
  candidateS3Key?: string;
};

export type PutCandidateObject = (input: { key: string; body: string }) => Promise<void>;

export type ScrapeCandidateStoreDeps = {
  getScrapeCandidate: (id: string) => Promise<ScrapeCandidateRecord | null>;
  saveScrapeCandidate: (record: ScrapeCandidateRecord) => Promise<void>;
};

export type CreateScrapeCandidate = (
  input: Omit<ScrapeCandidateRecord, 'id'>,
) => Promise<ScrapeCandidateRecord>;

export type ListScrapeCandidatesDeps = {
  listScrapeCandidates: () => Promise<ScrapeCandidateRecord[]>;
};

export type EnqueueScrapeCandidateDeps = {
  putCandidateObject?: PutCandidateObject;
  createScrapeCandidate: CreateScrapeCandidate;
};

export type EnqueueScrapeCandidateResult =
  | { status: 'enqueued'; candidate: ScrapeCandidateRecord }
  | { status: 'rejected'; reason: string };

export type AcceptScrapeCandidateDeps = ScrapeCandidateStoreDeps & {
  uploadJobDescription: (
    input: { fileName: string; body: string },
    deps?: UploadJobDescriptionDeps,
  ) => Promise<UploadJobDescriptionResult>;
};

export type AcceptScrapeCandidateResult =
  | { status: 'accepted'; s3Key: string; candidate: ScrapeCandidateRecord }
  | { status: 'not_found' }
  | { status: 'not_pending' }
  | { status: 'rejected'; reason: string };

export type RejectScrapeCandidateResult =
  | { status: 'rejected'; candidate: ScrapeCandidateRecord }
  | { status: 'not_found' }
  | { status: 'not_pending' };

function normaliseFileName(fileName: string): string | null {
  const trimmed = fileName.trim();
  if (!trimmed) {
    return null;
  }

  const baseName = trimmed.replace(/^.*[/\\]/, '');
  if (!baseName.toLowerCase().endsWith('.md')) {
    return null;
  }

  return baseName;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function formatCollectedAt(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return undefined;
    }
    return parsed.toISOString();
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  return undefined;
}

function metadataFromBody(body: string): Pick<
  ScrapeCandidateRecord,
  'title' | 'source' | 'collectedAt'
> {
  const { data } = matter(body) as { data: Record<string, unknown> };
  return {
    title: optionalString(data.title),
    source: optionalString(data.source),
    collectedAt: formatCollectedAt(data.collectedAt),
  };
}

export async function listPendingScrapeCandidates(
  deps: ListScrapeCandidatesDeps,
): Promise<ScrapeCandidateRecord[]> {
  const records = await deps.listScrapeCandidates();
  return records.filter((record) => record.status === 'pending');
}

export async function listScrapeCandidates(
  deps: ListScrapeCandidatesDeps,
): Promise<ScrapeCandidateRecord[]> {
  return deps.listScrapeCandidates();
}

export async function enqueueScrapeCandidate(
  input: { fileName: string; body: string },
  deps: EnqueueScrapeCandidateDeps,
): Promise<EnqueueScrapeCandidateResult> {
  const validation = validateJobDescriptionMarkdown(input.body);
  if (validation.status === 'rejected') {
    return validation;
  }

  const fileName = normaliseFileName(input.fileName);
  if (!fileName) {
    return {
      status: 'rejected',
      reason: 'File name must end with .md',
    };
  }

  const candidateS3Key = deps.putCandidateObject
    ? `candidates/${fileName}`
    : undefined;

  if (candidateS3Key && deps.putCandidateObject) {
    await deps.putCandidateObject({ key: candidateS3Key, body: input.body });
  }

  const metadata = metadataFromBody(input.body);
  const candidate = await deps.createScrapeCandidate({
    fileName,
    body: input.body,
    status: 'pending',
    ...metadata,
    ...(candidateS3Key !== undefined ? { candidateS3Key } : {}),
  });

  return { status: 'enqueued', candidate };
}

export async function acceptScrapeCandidate(
  id: string,
  deps: AcceptScrapeCandidateDeps,
): Promise<AcceptScrapeCandidateResult> {
  const existing = await deps.getScrapeCandidate(id);
  if (!existing) {
    return { status: 'not_found' };
  }

  if (existing.status !== 'pending') {
    return { status: 'not_pending' };
  }

  const uploadResult = await deps.uploadJobDescription({
    fileName: existing.fileName,
    body: existing.body,
  });

  if (uploadResult.status === 'rejected') {
    return uploadResult;
  }

  const candidate: ScrapeCandidateRecord = {
    ...existing,
    status: 'accepted',
  };
  await deps.saveScrapeCandidate(candidate);

  return {
    status: 'accepted',
    s3Key: uploadResult.s3Key,
    candidate,
  };
}

export async function rejectScrapeCandidate(
  id: string,
  deps: ScrapeCandidateStoreDeps,
): Promise<RejectScrapeCandidateResult> {
  const existing = await deps.getScrapeCandidate(id);
  if (!existing) {
    return { status: 'not_found' };
  }

  if (existing.status !== 'pending') {
    return { status: 'not_pending' };
  }

  const candidate: ScrapeCandidateRecord = {
    ...existing,
    status: 'rejected',
  };
  await deps.saveScrapeCandidate(candidate);

  return { status: 'rejected', candidate };
}
