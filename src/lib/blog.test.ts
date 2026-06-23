import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

const requestCache = new Map<string, unknown>();

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();

  return {
    ...actual,
    cache: <T extends (...args: unknown[]) => unknown>(fn: T) =>
      ((...args: Parameters<T>) => {
        const key = JSON.stringify(args);
        if (!requestCache.has(key)) {
          requestCache.set(key, fn(...args));
        }
        return requestCache.get(key) as ReturnType<T>;
      }) as T,
  };
});

import {
  getAllBlogPosts,
  getAllBlogSlugs,
  getBlogPostBySlug,
  getRecentBlogPosts,
} from './blog';

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../test/fixtures/blog',
);

describe('getBlogPostBySlug', () => {
  it('returns a typed BlogPost with normalised frontmatter and HTML content', () => {
    const post = getBlogPostBySlug('complete-post', fixturesDir);

    expect(post).not.toBeNull();
    expect(post!.slug).toBe('complete-post');
    expect(post!.frontmatter).toEqual({
      title: 'Complete Post',
      date: '2025-03-15',
      excerpt: 'A complete blog post for testing.',
      category: 'Engineering',
      tags: ['testing', 'blog'],
      image: '/blog/complete-post/hero.webp',
      author: 'Test Author',
      aiGeneratedContent: true,
    });
    expect(post!.content).toContain('Hello');
    expect(post!.content).toMatch(/<p\b/);
  });

  it('returns null for a missing slug', () => {
    expect(getBlogPostBySlug('does-not-exist', fixturesDir)).toBeNull();
  });

  it('normalises kebab-case ai-generated-content to aiGeneratedContent', () => {
    const post = getBlogPostBySlug('kebab-ai-flag', fixturesDir);

    expect(post!.frontmatter.aiGeneratedContent).toBe(true);
  });

  it('normalises camelCase aiGeneratedContent', () => {
    const post = getBlogPostBySlug('camel-ai-flag', fixturesDir);

    expect(post!.frontmatter.aiGeneratedContent).toBe(true);
  });

  it('parses GFM tables and maths through the full reader path', () => {
    const post = getBlogPostBySlug('gfm-maths-post', fixturesDir);

    expect(post).not.toBeNull();
    expect(post!.content).toMatch(/<table\b/);
    expect(post!.content).toContain('Alpha');
    expect(post!.content).toMatch(/class="katex"/);
    expect(post!.content).toContain('E = mc^2');
    expect(post!.content).toContain('\\int_0^1');
  });

  it('fills defaults for missing optional frontmatter fields', () => {
    const post = getBlogPostBySlug('minimal-post', fixturesDir);

    expect(post!.frontmatter).toEqual({
      title: 'Minimal Post',
      date: '2025-01-10',
      excerpt: '',
      category: '',
      tags: [],
      image: '',
      author: '',
      aiGeneratedContent: false,
    });
  });

  it('reads each slug once when loaded twice without a custom directory', () => {
    const blogDir = path.join(process.cwd(), 'public', 'blog');
    const slug = `cache-dedupe-${Date.now()}`;
    const filePath = path.join(blogDir, `${slug}.md`);

    fs.mkdirSync(blogDir, { recursive: true });
    fs.writeFileSync(
      filePath,
      `---
title: Cache Test
date: 2025-01-01
---

Cached body.`,
    );

    const readSpy = vi.spyOn(fs, 'readFileSync');

    try {
      requestCache.clear();
      getBlogPostBySlug(slug);
      getBlogPostBySlug(slug);

      const slugReads = readSpy.mock.calls.filter(([file]) => file === filePath);
      expect(slugReads).toHaveLength(1);
    } finally {
      fs.unlinkSync(filePath);
      readSpy.mockRestore();
    }
  });
});

describe('getAllBlogPosts', () => {
  it('returns posts sorted newest-first', () => {
    const posts = getAllBlogPosts(fixturesDir);
    const titles = posts.map((post) => post.frontmatter.title);

    expect(titles.indexOf('Newer Post')).toBeLessThan(titles.indexOf('Older Post'));
  });
});

describe('getRecentBlogPosts', () => {
  it('returns only the N most recent posts in newest-first order', () => {
    const posts = getRecentBlogPosts(2, fixturesDir);

    expect(posts).toHaveLength(2);
    expect(posts[0].frontmatter.title).toBe('Newer Post');
    expect(posts[1].frontmatter.title).toBe('Complete Post');
  });

  it('includes teaser frontmatter without processing post body to HTML', () => {
    const posts = getRecentBlogPosts(6, fixturesDir);
    const complete = posts.find((post) => post.slug === 'complete-post');

    expect(complete).toBeDefined();
    expect(complete!.frontmatter).toEqual({
      title: 'Complete Post',
      date: '2025-03-15',
      excerpt: 'A complete blog post for testing.',
      category: 'Engineering',
      tags: ['testing', 'blog'],
      image: '/blog/complete-post/hero.webp',
      author: 'Test Author',
      aiGeneratedContent: true,
    });
    expect(complete!.content).toBe('');
    expect(getBlogPostBySlug('complete-post', fixturesDir)!.content).toMatch(/<p\b/);
  });
});

describe('getAllBlogSlugs', () => {
  it('returns slugs for all markdown files in the directory', () => {
    const slugs = getAllBlogSlugs(fixturesDir);

    expect(slugs).toContain('complete-post');
    expect(slugs).toContain('minimal-post');
    expect(slugs.length).toBeGreaterThanOrEqual(6);
  });
});

describe('missing or empty blog directory', () => {
  it('returns an empty array from getAllBlogPosts when the directory is missing', () => {
    const missingDir = path.join(os.tmpdir(), 'missing-blog-dir-test');

    expect(getAllBlogPosts(missingDir)).toEqual([]);
  });

  it('returns null from getBlogPostBySlug when the directory is missing', () => {
    const missingDir = path.join(os.tmpdir(), 'missing-blog-dir-test');

    expect(getBlogPostBySlug('any-slug', missingDir)).toBeNull();
  });

  it('returns an empty array from getAllBlogSlugs when the directory is missing', () => {
    const missingDir = path.join(os.tmpdir(), 'missing-blog-dir-test');

    expect(getAllBlogSlugs(missingDir)).toEqual([]);
  });

  it('returns empty results for an existing but empty directory', () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'empty-blog-dir-'));

    try {
      expect(getAllBlogPosts(emptyDir)).toEqual([]);
      expect(getRecentBlogPosts(3, emptyDir)).toEqual([]);
      expect(getAllBlogSlugs(emptyDir)).toEqual([]);
      expect(getBlogPostBySlug('any-slug', emptyDir)).toBeNull();
    } finally {
      fs.rmdirSync(emptyDir);
    }
  });

  it('returns an empty array from getRecentBlogPosts when the directory is missing', () => {
    const missingDir = path.join(os.tmpdir(), 'missing-blog-dir-test');

    expect(getRecentBlogPosts(3, missingDir)).toEqual([]);
  });
});
