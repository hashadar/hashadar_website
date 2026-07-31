/**
 * Validate a post-Sign-in return path. Only same-origin relative paths are allowed.
 */
export function safeReturnPath(
  candidate: string | null | undefined,
  fallback = '/admin',
): string {
  if (!candidate) {
    return fallback;
  }

  const trimmed = candidate.trim();
  if (!trimmed.startsWith('/')) {
    return fallback;
  }
  if (trimmed.startsWith('//') || trimmed.includes('://')) {
    return fallback;
  }
  if (trimmed.includes('\\') || trimmed.includes('\0')) {
    return fallback;
  }

  return trimmed;
}
