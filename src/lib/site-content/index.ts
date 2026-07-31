export {
  SITE_CONTENT_BUCKET,
  PORTFOLIO_MANIFEST_KEY,
  BLOG_INDEX_KEY,
  portfolioImageKey,
  blogPostKey,
  blogHeroKey,
  emptyPortfolioManifest,
  emptyBlogIndex,
  type PortfolioManifest,
  type PortfolioManifestEntry,
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

export {
  getPortfolioPhotos,
  getHomePhotographyTeaser,
  readPortfolioManifest,
} from '@/lib/site-content/portfolio';

export {
  getAllBlogPostsFromSiteContent,
  getRecentBlogPostsFromSiteContent,
  getBlogPostBySlugFromSiteContent,
  getAllBlogSlugsFromSiteContent,
  readBlogIndex,
  frontmatterFromMarkdown,
} from '@/lib/site-content/blog';
