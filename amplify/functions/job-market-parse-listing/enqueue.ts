import {
  assembleJobDescriptionMarkdown,
  slugifyFileName,
  type ExtractedJobDescription,
} from './assemble-markdown';
import { validateJobDescriptionMarkdown } from './validate-markdown';

export type ScrapeCandidateRecord = {
  id: string;
  fileName: string;
  body: string;
  status: 'pending' | 'accepted' | 'rejected';
  title?: string;
  source?: string;
  collectedAt?: string;
  candidateS3Key?: string;
};

export type PutCandidateObject = (input: {
  key: string;
  body: string;
}) => Promise<void>;

export type CreateScrapeCandidate = (
  input: Omit<ScrapeCandidateRecord, 'id'>,
) => Promise<ScrapeCandidateRecord>;

export type EnqueueParsedListingDeps = {
  putCandidateObject: PutCandidateObject;
  createScrapeCandidate: CreateScrapeCandidate;
  now?: () => Date;
};

export type EnqueueParsedListingResult =
  | {
      status: 'enqueued';
      candidate: ScrapeCandidateRecord;
      previewTitle: string;
      previewExcerpt: string;
    }
  | { status: 'extract_failed'; reason: string };

function previewExcerptFromBody(body: string): string {
  const withoutFm = body.replace(/^---[\s\S]*?---\s*/, '');
  return withoutFm.trim().slice(0, 280);
}

/**
 * Validate assembled markdown and enqueue as a pending ScrapeCandidate (candidates/* only).
 */
export async function enqueueParsedListing(
  extraction: ExtractedJobDescription,
  deps: EnqueueParsedListingDeps,
): Promise<EnqueueParsedListingResult> {
  const collectedAt = (deps.now?.() ?? new Date()).toISOString();
  const body = assembleJobDescriptionMarkdown({
    ...extraction,
    collectedAt,
  });

  const validation = validateJobDescriptionMarkdown(body);
  if (validation.status === 'rejected') {
    return { status: 'extract_failed', reason: validation.reason };
  }

  const fileName = slugifyFileName(extraction.title, collectedAt);
  const candidateS3Key = `candidates/${fileName}`;
  await deps.putCandidateObject({ key: candidateS3Key, body });

  const candidate = await deps.createScrapeCandidate({
    fileName,
    body,
    status: 'pending',
    title: extraction.title,
    collectedAt,
    candidateS3Key,
  });

  return {
    status: 'enqueued',
    candidate,
    previewTitle: extraction.title,
    previewExcerpt: previewExcerptFromBody(body),
  };
}
