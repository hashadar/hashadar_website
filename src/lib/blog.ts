import fs from 'fs';
import path from 'path';
import { cache } from 'react';
import matter from 'gray-matter';
import type { BlogPost, BlogPostFrontmatter } from '@/data/types';
import { processMarkdown } from '@/lib/blog-markdown';

const defaultBlogDirectory = path.join(process.cwd(), 'public', 'blog');

function resolveBlogDirectory(blogDirectory?: string): string {
  return blogDirectory ?? defaultBlogDirectory;
}

function formatDate(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  return '';
}

function normalizeFrontmatter(data: Record<string, unknown>): BlogPostFrontmatter {
  return {
    title: typeof data.title === 'string' ? data.title : '',
    date: formatDate(data.date),
    excerpt: typeof data.excerpt === 'string' ? data.excerpt : '',
    category: typeof data.category === 'string' ? data.category : '',
    tags: Array.isArray(data.tags) ? data.tags : [],
    image: typeof data.image === 'string' ? data.image : '',
    author: typeof data.author === 'string' ? data.author : '',
    aiGeneratedContent:
      data['ai-generated-content'] === true || data.aiGeneratedContent === true,
  };
}

function readBlogPost(slug: string, blogDirectory: string): BlogPost | null {
  const fullPath = path.join(blogDirectory, `${slug}.md`);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  return {
    slug,
    frontmatter: normalizeFrontmatter(data as Record<string, unknown>),
    content: processMarkdown(content),
  };
}

function readBlogPostSummary(slug: string, blogDirectory: string): BlogPost | null {
  const fullPath = path.join(blogDirectory, `${slug}.md`);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data } = matter(fileContents);

  return {
    slug,
    frontmatter: normalizeFrontmatter(data as Record<string, unknown>),
    content: '',
  };
}

export function getAllBlogPosts(blogDirectory?: string): BlogPost[] {
  const dir = resolveBlogDirectory(blogDirectory);

  if (!fs.existsSync(dir)) {
    return [];
  }

  const fileNames = fs.readdirSync(dir).filter((fileName) => fileName.endsWith('.md'));

  const allPostsData = fileNames.map((fileName) => {
    const slug = fileName.replace(/\.md$/, '');
    return readBlogPost(slug, dir)!;
  });

  return sortPostsNewestFirst(allPostsData);
}

function sortPostsNewestFirst(posts: BlogPost[]): BlogPost[] {
  return [...posts].sort((a, b) => {
    const dateA = new Date(a.frontmatter.date).getTime();
    const dateB = new Date(b.frontmatter.date).getTime();
    return dateB - dateA;
  });
}

export function getRecentBlogPosts(limit: number, blogDirectory?: string): BlogPost[] {
  const dir = resolveBlogDirectory(blogDirectory);

  if (!fs.existsSync(dir)) {
    return [];
  }

  const fileNames = fs.readdirSync(dir).filter((fileName) => fileName.endsWith('.md'));

  const summaries = fileNames.map((fileName) => {
    const slug = fileName.replace(/\.md$/, '');
    return readBlogPostSummary(slug, dir)!;
  });

  return sortPostsNewestFirst(summaries).slice(0, limit);
}

const getCachedBlogPostBySlug = cache((slug: string) => {
  return readBlogPost(slug, resolveBlogDirectory());
});

export function getBlogPostBySlug(slug: string, blogDirectory?: string): BlogPost | null {
  if (blogDirectory !== undefined) {
    return readBlogPost(slug, blogDirectory);
  }

  return getCachedBlogPostBySlug(slug);
}

export function getAllBlogSlugs(blogDirectory?: string): string[] {
  const dir = resolveBlogDirectory(blogDirectory);

  if (!fs.existsSync(dir)) {
    return [];
  }

  const fileNames = fs.readdirSync(dir).filter((fileName) => fileName.endsWith('.md'));

  return fileNames.map((fileName) => fileName.replace(/\.md$/, ''));
}
