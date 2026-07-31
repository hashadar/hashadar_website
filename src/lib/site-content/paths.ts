/** Amplify Storage bucket name from defineStorage({ name: 'siteContent' }). */
export const SITE_CONTENT_BUCKET = 'siteContent';

export const PORTFOLIO_MANIFEST_KEY = 'portfolio/manifest.json';
export const BLOG_INDEX_KEY = 'blog/index.json';

export function portfolioImageKey(filename: string): string {
  return `portfolio/images/${filename}`;
}

export function blogPostKey(slug: string): string {
  return `blog/posts/${slug}.md`;
}

export function blogHeroKey(filename: string): string {
  return `blog/images/${filename}`;
}

export type PortfolioManifestEntry = {
  id: string;
  title: string;
  alt: string;
  category?: string;
  location?: string;
  /** Object key under siteContent, e.g. portfolio/images/foo.webp */
  imageKey: string;
};

export type PortfolioManifest = {
  photos: PortfolioManifestEntry[];
};

export type BlogIndexEntry = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  category: string;
  tags: string[];
  author: string;
  /** Object key for hero WebP, or empty when using site fallback */
  heroKey: string;
  aiGeneratedContent?: boolean;
};

export type BlogIndex = {
  posts: BlogIndexEntry[];
};

export function emptyPortfolioManifest(): PortfolioManifest {
  return { photos: [] };
}

export function emptyBlogIndex(): BlogIndex {
  return { posts: [] };
}
