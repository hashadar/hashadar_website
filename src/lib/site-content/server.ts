import 'server-only';

import type { BlogPost, PhotoItem } from '@/data/types';
import { ensureSiteAmplifyFromOutputs } from '@/lib/ensure-site-amplify-from-outputs';
import {
  getHomePhotographyTeaser as readHomePhotographyTeaser,
} from '@/lib/site-content/home-photo';
import {
  getAllBlogPostsFromSiteContent as readAllBlogPosts,
  getAllBlogSlugsFromSiteContent as readAllBlogSlugs,
  getBlogPostBySlugFromSiteContent as readBlogPostBySlug,
  getRecentBlogPostsFromSiteContent as readRecentBlogPosts,
} from '@/lib/site-content/blog';
import { getPortfolioPhotos as readPortfolioPhotos } from '@/lib/site-content/portfolio';
import type { SiteContentStorage } from '@/lib/site-content/storage';

/** Server Component / route entry: configure Amplify from amplify_outputs.json, then load. */
export async function getPortfolioPhotos(
  storage?: SiteContentStorage | null,
): Promise<PhotoItem[]> {
  ensureSiteAmplifyFromOutputs();
  return readPortfolioPhotos(storage);
}

export async function getHomePhotographyTeaser(
  storage?: SiteContentStorage | null,
): Promise<PhotoItem | null> {
  ensureSiteAmplifyFromOutputs();
  return readHomePhotographyTeaser(storage);
}

export async function getAllBlogPostsFromSiteContent(
  storage?: SiteContentStorage | null,
): Promise<BlogPost[]> {
  ensureSiteAmplifyFromOutputs();
  return readAllBlogPosts(storage);
}

export async function getRecentBlogPostsFromSiteContent(
  limit: number,
  storage?: SiteContentStorage | null,
): Promise<BlogPost[]> {
  ensureSiteAmplifyFromOutputs();
  return readRecentBlogPosts(limit, storage);
}

export async function getBlogPostBySlugFromSiteContent(
  slug: string,
  storage?: SiteContentStorage | null,
): Promise<BlogPost | null> {
  ensureSiteAmplifyFromOutputs();
  return readBlogPostBySlug(slug, storage);
}

export async function getAllBlogSlugsFromSiteContent(
  storage?: SiteContentStorage | null,
): Promise<string[]> {
  ensureSiteAmplifyFromOutputs();
  return readAllBlogSlugs(storage);
}
