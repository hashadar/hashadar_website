import matter from 'gray-matter';
import type { BlogPost, BlogPostFrontmatter } from '@/data/types';
import { processMarkdown } from '@/lib/blog-markdown';
import { BLOG_FALLBACK_IMAGE } from '@/lib/blog-presentation';
import { ensureSiteAmplifyFromOutputs } from '@/lib/ensure-site-amplify-from-outputs';
import {
  BLOG_INDEX_KEY,
  blogPostKey,
  emptyBlogIndex,
  type BlogIndex,
  type BlogIndexEntry,
} from '@/lib/site-content/paths';
import {
  createDefaultSiteContentStorage,
  downloadSiteContentText,
  getSiteContentUrl,
  type SiteContentStorage,
} from '@/lib/site-content/storage';

function parseBlogIndex(raw: string): BlogIndex {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !Array.isArray((parsed as BlogIndex).posts)
    ) {
      return emptyBlogIndex();
    }
    return parsed as BlogIndex;
  } catch {
    return emptyBlogIndex();
  }
}

function sortIndexNewestFirst(posts: BlogIndexEntry[]): BlogIndexEntry[] {
  return [...posts].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateB - dateA;
  });
}

async function resolveHeroUrl(
  heroKey: string,
  storage: SiteContentStorage,
): Promise<string> {
  if (!heroKey.trim()) {
    return BLOG_FALLBACK_IMAGE;
  }
  try {
    return await getSiteContentUrl(heroKey, storage.getUrl);
  } catch {
    return BLOG_FALLBACK_IMAGE;
  }
}

function entryToFrontmatter(
  entry: BlogIndexEntry,
  image: string,
): BlogPostFrontmatter {
  return {
    title: entry.title,
    date: entry.date,
    excerpt: entry.excerpt,
    category: entry.category,
    tags: entry.tags,
    image,
    author: entry.author,
    aiGeneratedContent: entry.aiGeneratedContent === true,
  };
}

export async function readBlogIndex(
  storage: SiteContentStorage,
): Promise<BlogIndex> {
  const raw = await downloadSiteContentText(BLOG_INDEX_KEY, storage.downloadData);
  if (!raw) {
    return emptyBlogIndex();
  }
  return parseBlogIndex(raw);
}

export function frontmatterFromMarkdown(markdown: string): BlogPostFrontmatter {
  const { data } = matter(markdown);
  const record = data as Record<string, unknown>;
  return {
    title: typeof record.title === 'string' ? record.title : '',
    date:
      typeof record.date === 'string'
        ? record.date
        : record.date instanceof Date && !Number.isNaN(record.date.getTime())
          ? record.date.toISOString().slice(0, 10)
          : '',
    excerpt: typeof record.excerpt === 'string' ? record.excerpt : '',
    category: typeof record.category === 'string' ? record.category : '',
    tags: Array.isArray(record.tags) ? (record.tags as string[]) : [],
    image: typeof record.image === 'string' ? record.image : '',
    author: typeof record.author === 'string' ? record.author : '',
    aiGeneratedContent:
      record['ai-generated-content'] === true ||
      record.aiGeneratedContent === true,
  };
}

export async function getAllBlogPostsFromSiteContent(
  storage?: SiteContentStorage | null,
): Promise<BlogPost[]> {
  ensureSiteAmplifyFromOutputs();
  const client = storage ?? (await createDefaultSiteContentStorage());
  if (!client) {
    return [];
  }

  const index = await readBlogIndex(client);
  const posts = sortIndexNewestFirst(index.posts);

  return Promise.all(
    posts.map(async (entry) => {
      const image = await resolveHeroUrl(entry.heroKey, client);
      const markdown = await downloadSiteContentText(
        blogPostKey(entry.slug),
        client.downloadData,
      );
      const body = markdown ? matter(markdown).content : '';
      return {
        slug: entry.slug,
        frontmatter: entryToFrontmatter(entry, image),
        content: processMarkdown(body),
      };
    }),
  );
}

export async function getRecentBlogPostsFromSiteContent(
  limit: number,
  storage?: SiteContentStorage | null,
): Promise<BlogPost[]> {
  ensureSiteAmplifyFromOutputs();
  const client = storage ?? (await createDefaultSiteContentStorage());
  if (!client) {
    return [];
  }

  const index = await readBlogIndex(client);
  const posts = sortIndexNewestFirst(index.posts).slice(0, limit);

  return Promise.all(
    posts.map(async (entry) => {
      const image = await resolveHeroUrl(entry.heroKey, client);
      return {
        slug: entry.slug,
        frontmatter: entryToFrontmatter(entry, image),
        content: '',
      };
    }),
  );
}

export async function getBlogPostBySlugFromSiteContent(
  slug: string,
  storage?: SiteContentStorage | null,
): Promise<BlogPost | null> {
  ensureSiteAmplifyFromOutputs();
  const client = storage ?? (await createDefaultSiteContentStorage());
  if (!client) {
    return null;
  }

  const index = await readBlogIndex(client);
  const entry = index.posts.find((post) => post.slug === slug);
  if (!entry) {
    return null;
  }

  const markdown = await downloadSiteContentText(
    blogPostKey(slug),
    client.downloadData,
  );
  if (!markdown) {
    return null;
  }

  const image = await resolveHeroUrl(entry.heroKey, client);
  const body = matter(markdown).content;

  return {
    slug,
    frontmatter: entryToFrontmatter(entry, image),
    content: processMarkdown(body),
  };
}

export async function getAllBlogSlugsFromSiteContent(
  storage?: SiteContentStorage | null,
): Promise<string[]> {
  ensureSiteAmplifyFromOutputs();
  const client = storage ?? (await createDefaultSiteContentStorage());
  if (!client) {
    return [];
  }

  const index = await readBlogIndex(client);
  return index.posts.map((post) => post.slug);
}
