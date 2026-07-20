import type { ParseJobListingFromUrlResult } from './parse-job-listing-client';
import { defaultParseJobListingFromUrl } from './parse-job-listing-client';

export type ParseJobListingInput = {
  url: string;
  pageText?: string;
};

export type ParseJobListingFromUrl = (
  input: string | ParseJobListingInput,
) => Promise<ParseJobListingFromUrlResult>;

export type ParseJobListingDeps = {
  parseListing?: ParseJobListingFromUrl;
};

export async function parseJobListingFromUrl(
  input: string | ParseJobListingInput,
  deps: ParseJobListingDeps = {},
): Promise<ParseJobListingFromUrlResult> {
  const parse = deps.parseListing ?? defaultParseJobListingFromUrl;
  return parse(input);
}

export type {
  ParseJobListingFromUrlResult,
  ParseJobListingStatus,
} from './parse-job-listing-client';
