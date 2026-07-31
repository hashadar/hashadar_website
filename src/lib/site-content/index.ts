export {
  SITE_CONTENT_BUCKET,
  PORTFOLIO_MANIFEST_KEY,
  BLOG_INDEX_KEY,
  HOME_PHOTO_MANIFEST_KEY,
  portfolioImageKey,
  homeImageKey,
  blogPostKey,
  blogHeroKey,
  emptyPortfolioManifest,
  emptyBlogIndex,
  type PortfolioManifest,
  type PortfolioManifestEntry,
  type HomePhotoManifest,
  type BlogIndex,
  type BlogIndexEntry,
} from '@/lib/site-content/paths';

export {
  createDefaultSiteContentStorage,
  downloadSiteContentText,
  uploadSiteContentText,
  uploadSiteContentBlob,
  removeSiteContent,
  getSiteContentUrl,
  type SiteContentStorage,
} from '@/lib/site-content/storage';

export { readPortfolioManifest } from '@/lib/site-content/portfolio';

export { readHomePhotoManifest } from '@/lib/site-content/home-photo';

export {
  readBlogIndex,
  frontmatterFromMarkdown,
} from '@/lib/site-content/blog';
