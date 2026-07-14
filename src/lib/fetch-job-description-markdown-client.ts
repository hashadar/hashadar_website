import { isAmplifyClientConfigured } from './start-job-market-recompute-client';
import type { FetchJobDescriptionMarkdownDeps } from './fetch-job-description-markdown';

export const FETCH_MARKDOWN_NOT_CONFIGURED_REASON =
  'Markdown fetch client is not configured';

export const FETCH_MARKDOWN_UNAUTHENTICATED_REASON =
  'You must be signed in to read job description markdown.';

export const FETCH_MARKDOWN_FAILED_REASON =
  'Unable to read job description markdown. Please try again.';

export type AmplifyDownloadData = (input: {
  path: string;
}) => { result: Promise<{ body?: { text(): Promise<string> } | null }> };

function isUnauthenticatedError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('no current user') ||
    lower.includes('not authorized') ||
    lower.includes('unauthorised') ||
    lower.includes('unauthorized') ||
    lower.includes('not authenticated') ||
    lower.includes('user is not authenticated')
  );
}

export async function fetchMarkdownViaDownloadData(
  s3Key: string,
  downloadData: AmplifyDownloadData,
): Promise<string> {
  const { result } = downloadData({ path: s3Key });
  const output = await result;
  const body = output.body;
  if (!body) {
    throw new Error(FETCH_MARKDOWN_FAILED_REASON);
  }
  return body.text();
}

export async function createDefaultFetchJobDescriptionMarkdownDeps(): Promise<FetchJobDescriptionMarkdownDeps | null> {
  if (!isAmplifyClientConfigured()) {
    return null;
  }

  try {
    const { downloadData } = await import('aws-amplify/storage');
    return {
      async fetchMarkdown(s3Key) {
        try {
          return await fetchMarkdownViaDownloadData(
            s3Key,
            downloadData as AmplifyDownloadData,
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : '';
          if (isUnauthenticatedError(message)) {
            throw new Error(FETCH_MARKDOWN_UNAUTHENTICATED_REASON);
          }
          throw error;
        }
      },
    };
  } catch {
    return null;
  }
}
