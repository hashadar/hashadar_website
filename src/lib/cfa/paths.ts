/** Amplify Storage bucket name from defineStorage({ name: 'cfaScreenshots' }). */
export const CFA_SCREENSHOTS_BUCKET = 'cfaScreenshots';

/** Capture screenshots, kept for reference on each Question. */
export function screenshotKey(
  captureId: string,
  index: number,
  extension: 'png' | 'jpg',
): string {
  return `screenshots/${captureId}/${index + 1}.${extension}`;
}

/** Result written by the `cfa-assist` function for one job. */
export function assistResultKey(jobId: string): string {
  return `assist/${jobId}.json`;
}

/** Random id safe for storage keys and job ids. */
export function newCfaId(prefix: string): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return `${prefix}-${random}`;
}
