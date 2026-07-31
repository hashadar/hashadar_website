import type { PhotoItem } from '@/data/types';
import { ensureSiteAmplifyFromOutputs } from '@/lib/ensure-site-amplify-from-outputs';
import {
  emptyPortfolioManifest,
  PORTFOLIO_MANIFEST_KEY,
  type PortfolioManifest,
  type PortfolioManifestEntry,
} from '@/lib/site-content/paths';
import {
  createDefaultSiteContentStorage,
  downloadSiteContentText,
  getSiteContentUrl,
  type SiteContentStorage,
} from '@/lib/site-content/storage';

function parsePortfolioManifest(raw: string): PortfolioManifest {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !Array.isArray((parsed as PortfolioManifest).photos)
    ) {
      return emptyPortfolioManifest();
    }
    return parsed as PortfolioManifest;
  } catch {
    return emptyPortfolioManifest();
  }
}

export async function readPortfolioManifest(
  storage: SiteContentStorage,
): Promise<PortfolioManifest> {
  const raw = await downloadSiteContentText(
    PORTFOLIO_MANIFEST_KEY,
    storage.downloadData,
  );
  if (!raw) {
    return emptyPortfolioManifest();
  }
  return parsePortfolioManifest(raw);
}

export async function resolvePhotoItem(
  entry: PortfolioManifestEntry,
  storage: SiteContentStorage,
): Promise<PhotoItem> {
  const src = await getSiteContentUrl(entry.imageKey, storage.getUrl);
  return {
    src,
    alt: entry.alt,
    title: entry.title,
    category: entry.category,
    location: entry.location,
  };
}

export async function getPortfolioPhotos(
  storage?: SiteContentStorage | null,
): Promise<PhotoItem[]> {
  ensureSiteAmplifyFromOutputs();
  const client = storage ?? (await createDefaultSiteContentStorage());
  if (!client) {
    return [];
  }

  const manifest = await readPortfolioManifest(client);
  return Promise.all(
    manifest.photos.map((entry) => resolvePhotoItem(entry, client)),
  );
}

export async function getHomePhotographyTeaser(
  storage?: SiteContentStorage | null,
): Promise<PhotoItem | null> {
  const photos = await getPortfolioPhotos(storage);
  return photos[0] ?? null;
}
