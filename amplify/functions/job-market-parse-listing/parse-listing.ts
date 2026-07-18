import type { BedrockExtractResult, ConverseFn } from './bedrock-extract';
import { extractJobDescriptionWithBedrock } from './bedrock-extract';
import type { EnqueueParsedListingDeps } from './enqueue';
import { enqueueParsedListing } from './enqueue';
import type { FetchGateDeps, FetchGateFailureReason } from './fetch-gate';
import {
  fetchCareerPageText,
  MAX_PLAIN_TEXT_CHARS,
  MIN_PLAIN_TEXT_CHARS,
} from './fetch-gate';
import { htmlToPlainText } from './html-to-text';

export type ParseJobListingStatus =
  | 'enqueued'
  | 'unfetchable'
  | 'extract_failed'
  | 'rejected';

export type ParseJobListingResult = {
  status: ParseJobListingStatus;
  reason?: string;
  candidateId?: string;
  previewTitle?: string;
  previewExcerpt?: string;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd?: number;
};

export type ParseJobListingInput = {
  url: string;
  /** When provided, skip fetch and extract from pasted HTML/text. */
  pageText?: string;
};

export type ParseJobListingDeps = {
  fetch?: Omit<FetchGateDeps, 'htmlToPlainText'> & {
    htmlToPlainText?: FetchGateDeps['htmlToPlainText'];
  };
  converse: ConverseFn;
  modelId: string;
  enqueue: EnqueueParsedListingDeps;
};

const FETCH_REASON_MESSAGES: Record<FetchGateFailureReason, string> = {
  invalid_url: 'URL must be a valid HTTPS address.',
  blocked_host: 'That host is blocked for security reasons.',
  timeout: 'The listing page timed out while loading.',
  non_2xx: 'The listing page returned an error status.',
  empty_body: 'The listing page had an empty body.',
  content_too_short:
    'The listing page did not contain enough readable job text (possible soft 404 or login wall).',
  unsupported_content_type: 'The listing page was not HTML or plain text.',
  response_too_large: 'The listing page response exceeded the size limit.',
  network_error: 'The listing page could not be reached.',
};

function withUsage(
  result: ParseJobListingResult,
  usage?: { inputTokens: number; outputTokens: number; estimatedCostUsd: number },
): ParseJobListingResult {
  if (!usage) return result;
  return {
    ...result,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    estimatedCostUsd: usage.estimatedCostUsd,
  };
}

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'pasted';
  }
}

function normalisePastedPageText(
  raw: string,
  toPlainText: (html: string) => string,
): { status: 'ok'; plainText: string } | { status: 'unfetchable'; reason: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      status: 'unfetchable',
      reason: 'Paste the listing page text or HTML, then try again.',
    };
  }

  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(trimmed);
  const plainText = (looksLikeHtml ? toPlainText(trimmed) : trimmed).trim();
  if (plainText.length < MIN_PLAIN_TEXT_CHARS) {
    return {
      status: 'unfetchable',
      reason:
        'Pasted content did not contain enough readable job text. Copy the full listing body and try again.',
    };
  }

  return {
    status: 'ok',
    plainText:
      plainText.length > MAX_PLAIN_TEXT_CHARS
        ? plainText.slice(0, MAX_PLAIN_TEXT_CHARS)
        : plainText,
  };
}

async function extractAndEnqueue(
  pageText: string,
  hostname: string,
  deps: ParseJobListingDeps,
): Promise<ParseJobListingResult> {
  const extractResult: BedrockExtractResult = await extractJobDescriptionWithBedrock(
    {
      pageText,
      hostname,
      modelId: deps.modelId,
    },
    deps.converse,
  );

  if (extractResult.status === 'extract_failed') {
    return withUsage(
      { status: 'extract_failed', reason: extractResult.reason },
      extractResult.usage,
    );
  }

  const enqueueResult = await enqueueParsedListing(
    extractResult.extraction,
    deps.enqueue,
  );

  if (enqueueResult.status === 'extract_failed') {
    return withUsage(
      { status: 'extract_failed', reason: enqueueResult.reason },
      extractResult.usage,
    );
  }

  return withUsage(
    {
      status: 'enqueued',
      candidateId: enqueueResult.candidate.id,
      previewTitle: enqueueResult.previewTitle,
      previewExcerpt: enqueueResult.previewExcerpt,
    },
    extractResult.usage,
  );
}

/**
 * Owner-initiated parse: fetch gate (or pasted text) → Bedrock extract → HITL enqueue.
 * Never writes raw/; source is omitted for owner tagging.
 */
export async function parseJobListingFromUrl(
  input: string | ParseJobListingInput,
  deps: ParseJobListingDeps,
): Promise<ParseJobListingResult> {
  const normalised: ParseJobListingInput =
    typeof input === 'string' ? { url: input } : input;
  const trimmedUrl = normalised.url?.trim() ?? '';
  if (!trimmedUrl) {
    return { status: 'rejected', reason: 'A listing URL is required.' };
  }

  const toPlainText = deps.fetch?.htmlToPlainText ?? htmlToPlainText;
  const pasted = normalised.pageText?.trim();

  if (pasted) {
    const page = normalisePastedPageText(pasted, toPlainText);
    if (page.status === 'unfetchable') {
      return { status: 'unfetchable', reason: page.reason };
    }
    return extractAndEnqueue(page.plainText, hostnameFromUrl(trimmedUrl), deps);
  }

  const fetchResult = await fetchCareerPageText(trimmedUrl, {
    ...deps.fetch,
    htmlToPlainText: toPlainText,
  });

  if (fetchResult.status === 'unfetchable') {
    const base = FETCH_REASON_MESSAGES[fetchResult.reason];
    const reason = fetchResult.detail ? `${base} (${fetchResult.detail})` : base;
    return { status: 'unfetchable', reason };
  }

  return extractAndEnqueue(fetchResult.plainText, fetchResult.hostname, deps);
}
