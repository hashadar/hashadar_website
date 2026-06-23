import { format } from 'date-fns';

export const BLOG_FALLBACK_IMAGE = '/img/mangrove_beach.webp';

export function resolveBlogPostImage(
  image: string,
  options?: { imageLoadFailed?: boolean },
): string {
  const hasImage = image && image.trim() !== '';

  if (!hasImage || options?.imageLoadFailed) {
    return BLOG_FALLBACK_IMAGE;
  }

  return image;
}

export function hasBlogPostHeroImage(image: string): boolean {
  const resolvedImage = resolveBlogPostImage(image);
  return resolvedImage !== BLOG_FALLBACK_IMAGE;
}

export function formatBlogCardDate(date: string): string {
  return format(new Date(date), 'MMM d, yyyy');
}

export function formatBlogArticleDate(date: string): string {
  return format(new Date(date), 'MMMM d, yyyy');
}
