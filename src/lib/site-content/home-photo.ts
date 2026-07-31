import type { PhotoItem } from '@/data/types';
import {
  HOME_PHOTO_MANIFEST_KEY,
  type HomePhotoManifest,
} from '@/lib/site-content/paths';
import {
  createDefaultSiteContentStorage,
  downloadSiteContentText,
  getSiteContentUrl,
  type SiteContentStorage,
} from '@/lib/site-content/storage';

function parseHomePhotoManifest(raw: string): HomePhotoManifest | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    if (
      typeof record.title !== 'string' ||
      typeof record.alt !== 'string' ||
      typeof record.imageKey !== 'string' ||
      !record.imageKey.trim()
    ) {
      return null;
    }
    return {
      title: record.title,
      alt: record.alt,
      category:
        typeof record.category === 'string' ? record.category : undefined,
      location:
        typeof record.location === 'string' ? record.location : undefined,
      imageKey: record.imageKey,
    };
  } catch {
    return null;
  }
}

export async function readHomePhotoManifest(
  storage: SiteContentStorage,
): Promise<HomePhotoManifest | null> {
  const raw = await downloadSiteContentText(
    HOME_PHOTO_MANIFEST_KEY,
    storage.downloadData,
  );
  if (!raw) {
    return null;
  }
  return parseHomePhotoManifest(raw);
}

export async function resolveHomePhotoItem(
  manifest: HomePhotoManifest,
  storage: SiteContentStorage,
): Promise<PhotoItem> {
  const src = await getSiteContentUrl(manifest.imageKey, storage.getUrl);
  return {
    src,
    alt: manifest.alt,
    title: manifest.title,
    category: manifest.category,
    location: manifest.location,
  };
}

export async function getHomePhotographyTeaser(
  storage?: SiteContentStorage | null,
): Promise<PhotoItem | null> {
  const client = storage ?? (await createDefaultSiteContentStorage());
  if (!client) {
    return null;
  }

  const manifest = await readHomePhotoManifest(client);
  if (!manifest) {
    return null;
  }
  return resolveHomePhotoItem(manifest, client);
}
