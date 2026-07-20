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
  employerId?: string;
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
  assistWithLlm?: AssistWithLlm;
};

export type ScrapeCandidateLlmEnrichment = Partial<
  Pick<ScrapeCandidateRecord, 'title' | 'source' | 'collectedAt' | 'body'>
>;

export type AssistWithLlm = (
  candidate: ScrapeCandidateRecord,
) => Promise<ScrapeCandidateLlmEnrichment>;

export type AcceptScrapeCandidateOptions = {
  llmAssist?: boolean;
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
  'title' | 'source' | 'collectedAt' | 'employerId'
> {
  const { data } = matter(body) as { data: Record<string, unknown> };
  return {
    title: optionalString(data.title),
    source: optionalString(data.source),
    collectedAt: formatCollectedAt(data.collectedAt),
    employerId: optionalString(data.employerId),
  };
}

function setOptionalFrontmatterField(
  data: Record<string, unknown>,
  key: 'title' | 'source' | 'collectedAt' | 'employerId',
  value: string | undefined,
) {
  if (value !== undefined) {
    data[key] = value;
  } else {
    delete data[key];
  }
}

function rewriteFrontmatter(
  body: string,
  fields: Pick<
    ScrapeCandidateRecord,
    'title' | 'source' | 'collectedAt' | 'employerId'
  >,
): string {
  const parsed = matter(body);
  const nextData = { ...(parsed.data as Record<string, unknown>) };
  setOptionalFrontmatterField(nextData, 'title', fields.title);
  setOptionalFrontmatterField(nextData, 'source', fields.source);
  setOptionalFrontmatterField(nextData, 'collectedAt', fields.collectedAt);
  setOptionalFrontmatterField(nextData, 'employerId', fields.employerId);
  return matter.stringify(parsed.content, nextData);
}

function applyLlmEnrichment(
  existing: ScrapeCandidateRecord,
  enrichment: ScrapeCandidateLlmEnrichment,
): Pick<ScrapeCandidateRecord, 'body' | 'title' | 'source' | 'collectedAt'> {
  const title = existing.title ?? enrichment.title;
  const source = existing.source ?? enrichment.source;
  const collectedAt = existing.collectedAt ?? enrichment.collectedAt;

  if (enrichment.body) {
    return {
      body: enrichment.body,
      title,
      source,
      collectedAt,
    };
  }

  const body =
    title !== existing.title ||
    source !== existing.source ||
    collectedAt !== existing.collectedAt
      ? rewriteFrontmatter(existing.body, { title, source, collectedAt })
      : existing.body;

  return {
    body,
    title,
    source,
    collectedAt,
  };
}

export type OwnerCandidateMetadataInput = {
  title?: string;
  source?: string;
  collectedAt?: string;
  employerId?: string;
};

export type ApplyOwnerMetadataResult =
  | { ok: true; candidate: ScrapeCandidateRecord }
  | { ok: false; reason: string };

/** Owner intake edits: overwrite metadata and sync YAML frontmatter for accept. */
export function applyOwnerMetadata(
  existing: ScrapeCandidateRecord,
  input: OwnerCandidateMetadataInput,
): ApplyOwnerMetadataResult {
  const title = optionalString(input.title?.trim());
  const source = optionalString(input.source?.trim());
  const employerId = optionalString(input.employerId?.trim());
  const collectedAtRaw = input.collectedAt?.trim() ?? '';
  const collectedAt = collectedAtRaw
    ? formatCollectedAt(collectedAtRaw)
    : undefined;

  if (collectedAtRaw && collectedAt === undefined) {
    return {
      ok: false,
      reason: 'Frontmatter requires a valid collectedAt',
    };
  }

  const next = {
    title,
    source,
    collectedAt,
    employerId,
  };

  return {
    ok: true,
    candidate: {
      ...existing,
      ...next,
      body: rewriteFrontmatter(existing.body, next),
    },
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
  options: AcceptScrapeCandidateOptions = {},
): Promise<AcceptScrapeCandidateResult> {
  const existing = await deps.getScrapeCandidate(id);
  if (!existing) {
    return { status: 'not_found' };
  }

  if (existing.status !== 'pending') {
    return { status: 'not_pending' };
  }

  const llmAssist = options.llmAssist ?? false;
  let acceptBody = existing.body;
  let enrichedFields: Pick<ScrapeCandidateRecord, 'title' | 'source' | 'collectedAt'> = {
    title: existing.title,
    source: existing.source,
    collectedAt: existing.collectedAt,
  };

  if (llmAssist && deps.assistWithLlm) {
    const enrichment = await deps.assistWithLlm(existing);
    const applied = applyLlmEnrichment(existing, enrichment);
    acceptBody = applied.body;
    enrichedFields = {
      title: applied.title,
      source: applied.source,
      collectedAt: applied.collectedAt,
    };
  }

  const uploadResult = await deps.uploadJobDescription({
    fileName: existing.fileName,
    body: acceptBody,
  });

  if (uploadResult.status === 'rejected') {
    return uploadResult;
  }

  const candidate: ScrapeCandidateRecord = {
    ...existing,
    ...enrichedFields,
    body: acceptBody,
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
