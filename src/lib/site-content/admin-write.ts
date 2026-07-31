import {
  BLOG_INDEX_KEY,
  PORTFOLIO_MANIFEST_KEY,
  blogHeroKey,
  blogPostKey,
  portfolioImageKey,
  type BlogIndex,
  type BlogIndexEntry,
  type PortfolioManifest,
  type PortfolioManifestEntry,
} from '@/lib/site-content/paths';
import {
  removeSiteContent,
  uploadSiteContentBlob,
  uploadSiteContentText,
  downloadSiteContentText,
  type SiteContentStorage,
} from '@/lib/site-content/storage';
import { readBlogIndex } from '@/lib/site-content/blog';
import { readPortfolioManifest } from '@/lib/site-content/portfolio';

const JSON_TYPE = 'application/json';
const MARKDOWN_TYPE = 'text/markdown; charset=utf-8';
const WEBP_TYPE = 'image/webp';

function assertWebp(file: File): void {
  if (
    file.type !== 'image/webp' &&
    !file.name.toLowerCase().endsWith('.webp')
  ) {
    throw new Error('Images must be WebP.');
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function savePortfolioManifest(
  manifest: PortfolioManifest,
  storage: SiteContentStorage,
): Promise<void> {
  await uploadSiteContentText(
    PORTFOLIO_MANIFEST_KEY,
    `${JSON.stringify(manifest, null, 2)}\n`,
    JSON_TYPE,
    storage.uploadData,
  );
}

export async function saveBlogIndex(
  index: BlogIndex,
  storage: SiteContentStorage,
): Promise<void> {
  await uploadSiteContentText(
    BLOG_INDEX_KEY,
    `${JSON.stringify(index, null, 2)}\n`,
    JSON_TYPE,
    storage.uploadData,
  );
}

export async function upsertPhoto(input: {
  storage: SiteContentStorage;
  id?: string;
  title: string;
  alt: string;
  category?: string;
  location?: string;
  file?: File | null;
}): Promise<PortfolioManifestEntry> {
  const manifest = await readPortfolioManifest(input.storage);
  const id = input.id?.trim() || `photo-${Date.now()}`;
  const existing = manifest.photos.find((photo) => photo.id === id);

  let imageKey = existing?.imageKey;
  if (input.file) {
    assertWebp(input.file);
    const filename = `${id}.webp`;
    imageKey = portfolioImageKey(filename);
    await uploadSiteContentBlob(
      imageKey,
      input.file,
      WEBP_TYPE,
      input.storage.uploadData,
    );
  }

  if (!imageKey) {
    throw new Error('A WebP image is required for new photos.');
  }

  const entry: PortfolioManifestEntry = {
    id,
    title: input.title.trim(),
    alt: input.alt.trim(),
    category: input.category?.trim() || undefined,
    location: input.location?.trim() || undefined,
    imageKey,
  };

  const photos = existing
    ? manifest.photos.map((photo) => (photo.id === id ? entry : photo))
    : [...manifest.photos, entry];

  await savePortfolioManifest({ photos }, input.storage);
  return entry;
}

export async function deletePhoto(
  id: string,
  storage: SiteContentStorage,
): Promise<void> {
  const manifest = await readPortfolioManifest(storage);
  const existing = manifest.photos.find((photo) => photo.id === id);
  if (!existing) {
    return;
  }

  await removeSiteContent(existing.imageKey, storage.remove);
  await savePortfolioManifest(
    { photos: manifest.photos.filter((photo) => photo.id !== id) },
    storage,
  );
}

export async function reorderPhoto(
  id: string,
  direction: 'up' | 'down',
  storage: SiteContentStorage,
): Promise<void> {
  const manifest = await readPortfolioManifest(storage);
  const index = manifest.photos.findIndex((photo) => photo.id === id);
  if (index < 0) {
    return;
  }

  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= manifest.photos.length) {
    return;
  }

  const photos = [...manifest.photos];
  const [item] = photos.splice(index, 1);
  photos.splice(target, 0, item);
  await savePortfolioManifest({ photos }, storage);
}

export async function upsertPost(input: {
  storage: SiteContentStorage;
  slug: string;
  previousSlug?: string;
  title: string;
  date: string;
  excerpt: string;
  category: string;
  tags: string[];
  author: string;
  aiGeneratedContent?: boolean;
  markdownText: string;
  heroFile?: File | null;
  clearHero?: boolean;
}): Promise<BlogIndexEntry> {
  const slug = slugify(input.slug);
  if (!slug) {
    throw new Error('Slug is required.');
  }

  const index = await readBlogIndex(input.storage);
  const previousSlug = input.previousSlug ? slugify(input.previousSlug) : slug;
  const existing = index.posts.find((post) => post.slug === previousSlug);

  let heroKey = existing?.heroKey ?? '';
  if (input.clearHero) {
    if (heroKey) {
      await removeSiteContent(heroKey, input.storage.remove);
    }
    heroKey = '';
  } else if (input.heroFile) {
    assertWebp(input.heroFile);
    heroKey = blogHeroKey(`${slug}.webp`);
    await uploadSiteContentBlob(
      heroKey,
      input.heroFile,
      WEBP_TYPE,
      input.storage.uploadData,
    );
  }

  if (input.markdownText.trim()) {
    await uploadSiteContentText(
      blogPostKey(slug),
      input.markdownText,
      MARKDOWN_TYPE,
      input.storage.uploadData,
    );
  } else if (!existing) {
    throw new Error('Markdown is required for new posts.');
  } else if (previousSlug !== slug) {
    const previousMarkdown = await downloadSiteContentText(
      blogPostKey(previousSlug),
      input.storage.downloadData,
    );
    if (!previousMarkdown) {
      throw new Error('Could not move post markdown to the new slug.');
    }
    await uploadSiteContentText(
      blogPostKey(slug),
      previousMarkdown,
      MARKDOWN_TYPE,
      input.storage.uploadData,
    );
  }

  if (previousSlug !== slug && existing) {
    await removeSiteContent(blogPostKey(previousSlug), input.storage.remove);
  }

  const entry: BlogIndexEntry = {
    slug,
    title: input.title.trim(),
    date: input.date.trim(),
    excerpt: input.excerpt.trim(),
    category: input.category.trim(),
    tags: input.tags,
    author: input.author.trim(),
    heroKey,
    aiGeneratedContent: input.aiGeneratedContent === true,
  };

  const withoutPrevious = index.posts.filter(
    (post) => post.slug !== previousSlug && post.slug !== slug,
  );
  await saveBlogIndex({ posts: [...withoutPrevious, entry] }, input.storage);
  return entry;
}

export async function deletePost(
  slug: string,
  storage: SiteContentStorage,
): Promise<void> {
  const normalised = slugify(slug);
  const index = await readBlogIndex(storage);
  const existing = index.posts.find((post) => post.slug === normalised);
  if (!existing) {
    return;
  }

  await removeSiteContent(blogPostKey(normalised), storage.remove);
  if (existing.heroKey) {
    await removeSiteContent(existing.heroKey, storage.remove);
  }
  await saveBlogIndex(
    { posts: index.posts.filter((post) => post.slug !== normalised) },
    storage,
  );
}

export { slugify };
