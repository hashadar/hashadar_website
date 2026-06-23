import { describe, expect, it } from 'vitest';
import {
  formatBlogArticleDate,
  formatBlogCardDate,
  hasBlogPostHeroImage,
  resolveBlogPostImage,
} from './blog-presentation';

describe('resolveBlogPostImage', () => {
  it('returns the fallback image when the post has no hero image', () => {
    expect(resolveBlogPostImage('')).toBe('/img/mangrove_beach.webp');
  });

  it('returns the post image when a hero image is set', () => {
    expect(resolveBlogPostImage('/blog/my-post/hero.webp')).toBe(
      '/blog/my-post/hero.webp',
    );
  });

  it('returns the fallback image when the hero image is only whitespace', () => {
    expect(resolveBlogPostImage('   ')).toBe('/img/mangrove_beach.webp');
  });

  it('returns the fallback image when the image failed to load', () => {
    expect(
      resolveBlogPostImage('/blog/my-post/hero.webp', { imageLoadFailed: true }),
    ).toBe('/img/mangrove_beach.webp');
  });
});

describe('hasBlogPostHeroImage', () => {
  it('returns false when the post has no hero image', () => {
    expect(hasBlogPostHeroImage('')).toBe(false);
  });

  it('returns true when the post has a hero image', () => {
    expect(hasBlogPostHeroImage('/blog/my-post/hero.webp')).toBe(true);
  });

  it('returns false when the hero image is the fallback path', () => {
    expect(hasBlogPostHeroImage('/img/mangrove_beach.webp')).toBe(false);
  });
});

describe('formatBlogCardDate', () => {
  it('formats dates for blog listing cards', () => {
    expect(formatBlogCardDate('2025-03-15')).toBe('Mar 15, 2025');
  });
});

describe('formatBlogArticleDate', () => {
  it('formats dates for article headers', () => {
    expect(formatBlogArticleDate('2025-03-15')).toBe('March 15, 2025');
  });
});
