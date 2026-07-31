import { describe, expect, it, vi } from 'vitest';
import {
  getHomePhotographyTeaser,
  readHomePhotoManifest,
} from '@/lib/site-content/home-photo';
import type { SiteContentStorage } from '@/lib/site-content/storage';

function createStorage(files: Record<string, string>): SiteContentStorage {
  return {
    uploadData: vi.fn(),
    remove: vi.fn(),
    downloadData: ({ path }) => ({
      result: (async () => {
        const text = files[path];
        if (text === undefined) {
          throw new Error('missing');
        }
        return {
          body: {
            text: async () => text,
            blob: async () => new Blob([text]),
          },
        };
      })(),
    }),
    getUrl: async ({ path }) => ({
      url: new URL(`https://example.test/${path}`),
    }),
  };
}

describe('home photo', () => {
  it('returns null when the Home Photo manifest is missing', async () => {
    const storage = createStorage({});
    expect(await readHomePhotoManifest(storage)).toBeNull();
    expect(await getHomePhotographyTeaser(storage)).toBeNull();
  });

  it('resolves the Home Photo independently of portfolio Photos', async () => {
    const storage = createStorage({
      'home/photography.json': JSON.stringify({
        title: 'Home shot',
        alt: 'A distinct home image',
        category: 'Travel',
        imageKey: 'home/images/photography.webp',
      }),
    });

    const teaser = await getHomePhotographyTeaser(storage);

    expect(teaser).toEqual({
      title: 'Home shot',
      alt: 'A distinct home image',
      category: 'Travel',
      location: undefined,
      src: 'https://example.test/home/images/photography.webp',
    });
  });
});
