import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/blog', () => ({
  getBlogPostBySlug: vi.fn(),
  getAllBlogSlugs: vi.fn(() => []),
}));

import { getBlogPostBySlug } from '@/lib/blog';
import { generateMetadata } from '@/app/blog/[slug]/page';
import { site } from '@/data';
import type { BlogPost } from '@/data/types';

const basePost: BlogPost = {
  slug: 'test-post',
  frontmatter: {
    title: 'Test Post',
    date: '2025-03-15',
    excerpt: 'An excerpt.',
    category: 'Engineering',
    tags: ['testing'],
    image: '',
    author: 'Test Author',
    aiGeneratedContent: false,
  },
  content: '<p>Body</p>',
};

describe('blog post page metadata', () => {
  it('uses the shared fallback image in openGraph when the post has no hero image', async () => {
    vi.mocked(getBlogPostBySlug).mockReturnValue(basePost);

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: 'test-post' }),
    });

    expect(metadata.openGraph?.images).toEqual([
      {
        url: '/img/mangrove_beach.webp',
        alt: 'Test Post',
      },
    ]);
  });

  it('uses the resolved post image in openGraph when a hero image is set', async () => {
    vi.mocked(getBlogPostBySlug).mockReturnValue({
      ...basePost,
      frontmatter: {
        ...basePost.frontmatter,
        image: '/blog/test-post/hero.webp',
      },
    });

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: 'test-post' }),
    });

    expect(metadata.openGraph?.images).toEqual([
      {
        url: '/blog/test-post/hero.webp',
        alt: 'Test Post',
      },
    ]);
  });

  it('keeps title and article fields derived from the loaded post', async () => {
    vi.mocked(getBlogPostBySlug).mockReturnValue(basePost);

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: 'test-post' }),
    });

    expect(metadata).toMatchObject({
      title: `Test Post - ${site.metadata.author}`,
      description: 'An excerpt.',
      openGraph: {
        title: 'Test Post',
        description: 'An excerpt.',
        url: `${site.metadata.siteUrl}/blog/test-post`,
        type: 'article',
        publishedTime: '2025-03-15',
        authors: ['Test Author'],
        tags: ['testing'],
      },
    });
  });
});
