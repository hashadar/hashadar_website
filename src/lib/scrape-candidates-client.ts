import type { PutCandidateObject } from './scrape-candidates';
import { isAmplifyClientConfigured } from './start-job-market-recompute-client';
import { putRawObjectViaUploadData, type AmplifyUploadData } from './upload-job-description-client';

export async function createDefaultPutCandidateObject(): Promise<PutCandidateObject | null> {
  if (!isAmplifyClientConfigured()) {
    return null;
  }

  try {
    const { uploadData } = await import('aws-amplify/storage');
    return (input) =>
      putRawObjectViaUploadData(input, uploadData as AmplifyUploadData);
  } catch {
    return null;
  }
}
