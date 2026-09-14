import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BlogGrid } from '@/components/sections/blog/blog-grid';
import { blog } from '@/data';
import type { BlogPost } from '@/data/types';

vi.mock('next/image', () => ({
  default: (props: { alt: string; src: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt} src={props.src} className={props.className} />
  ),
}));

afterEach(() => {
  cleanup();
});

function post(overrides: Partial<BlogPost['frontmatter']> & { slug: string }): BlogPost {
  const { slug, ...frontmatter } = overrides;
  return {
    slug,
    content: '',
    frontmatter: {
      title: 'A post',
      date: '2026-01-01',
      excerpt: 'Should not appear on the index.',
      category: 'Engineering',
      tags: ['ignored'],
      image: '/img/should-not-render.webp',
      author: 'Hasha',
      ...frontmatter,
    },
  };
}

describe('BlogGrid', () => {
  it('renders a flush card catalogue without filter chrome', () => {
    const { container } = render(
      <BlogGrid
        posts={[
          post({
            slug: 'older',
            title: 'Why your flights are delayed',
            date: '2026-01-03',
            image: '/blog/older/hero.webp',
          }),
          post({
            slug: 'newer',
            title: 'PWD 2026 Week 1 - Silver!',
            date: '2026-01-04',
            image: '/blog/newer/hero.webp',
          }),
        ]}
      />,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: blog.heading }),
    ).toBeInTheDocument();
    expect(screen.getByText(blog.description)).toBeInTheDocument();
    expect(container.innerHTML).not.toContain('max-w-6xl');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Should not appear on the index.'),
    ).not.toBeInTheDocument();

    const catalogue = screen.getByRole('navigation', {
      name: blog.catalogueAriaLabel,
    });
    const links = within(catalogue).getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', '/blog/newer');
    expect(links[1]).toHaveAttribute('href', '/blog/older');
    expect(
      within(catalogue).getByRole('heading', {
        name: 'PWD 2026 Week 1 - Silver!',
      }),
    ).toBeInTheDocument();
    expect(
      within(catalogue).getByRole('img', { name: 'PWD 2026 Week 1 - Silver!' }),
    ).toHaveAttribute('src', '/blog/newer/hero.webp');
    expect(within(catalogue).getByText('4 Jan 2026')).toBeInTheDocument();
    expect(within(catalogue).getByText('3 Jan 2026')).toBeInTheDocument();
  });

  it('shows a quiet empty state when nothing is published', () => {
    render(<BlogGrid posts={[]} />);

    expect(screen.getByText(blog.emptyState)).toBeInTheDocument();
    expect(blog.emptyState.toLowerCase()).toBe('nothing published yet.');
    expect(screen.queryByRole('link', { name: /PWD|flights/i })).not.toBeInTheDocument();
  });
});
