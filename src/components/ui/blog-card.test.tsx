import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BlogCard } from '@/components/ui/blog-card';

vi.mock('next/image', () => ({
  default: (props: { alt: string; src: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt} src={props.src} className={props.className} />
  ),
}));

afterEach(() => {
  cleanup();
});

describe('BlogCard', () => {
  it('links to the post and matches PhotoCard hover zoom language', () => {
    render(
      <BlogCard
        slug="motion-notes"
        title="Motion notes"
        excerpt="How the site moves."
        category="Engineering"
        date="2026-09-04"
        author="Hasha"
        image="/blog/motion-notes/hero.webp"
      />,
    );

    expect(screen.getByRole('link', { name: /Motion notes/ })).toHaveAttribute(
      'href',
      '/blog/motion-notes',
    );
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText('How the site moves.')).toBeInTheDocument();

    const image = screen.getByRole('img', { name: 'Motion notes' });
    expect(image.className).toMatch(/group-hover:scale-/);
    expect(image.className).toMatch(/motion-reduce:group-hover:scale-100/);
  });
});
