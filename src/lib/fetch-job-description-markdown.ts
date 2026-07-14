export type FetchJobDescriptionMarkdownDeps = {
  fetchMarkdown: (s3Key: string) => Promise<string | null>;
};

export async function fetchJobDescriptionMarkdown(
  s3Key: string,
  deps: FetchJobDescriptionMarkdownDeps,
): Promise<string | null> {
  const trimmedKey = s3Key.trim();
  if (trimmedKey === '') {
    return null;
  }

  return deps.fetchMarkdown(trimmedKey);
}
