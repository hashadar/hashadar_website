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
  it('links to the post as an editorial tile with reduced-motion zoom', () => {
    render(
      <BlogCard
        slug="motion-notes"
        title="Motion notes"
        date="2026-09-04"
        image="/blog/motion-notes/hero.webp"
      />,
    );

    expect(screen.getByRole('link', { name: /Motion notes/ })).toHaveAttribute(
      'href',
      '/blog/motion-notes',
    );
    expect(screen.queryByText('Engineering')).not.toBeInTheDocument();
    expect(screen.queryByText('How the site moves.')).not.toBeInTheDocument();

    const image = screen.getByRole('img', { name: 'Motion notes' });
    expect(image.className).toMatch(/group-hover:scale-/);
    expect(image.className).toMatch(/motion-reduce:group-hover:scale-100/);
  });
});
