import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PhotoCard } from '@/components/ui/photo-card';

vi.mock('next/image', () => ({
  default: (props: { alt: string; src: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt} src={props.src} className={props.className} />
  ),
}));

const photo = {
  src: '/photos/portrait.webp',
  alt: 'Studio portrait',
  title: 'Studio light',
  category: 'Portrait',
  location: 'London',
};

afterEach(() => {
  cleanup();
});

describe('PhotoCard', () => {
  it('shows caption details and a hover zoom that reduced motion can disable', () => {
    render(<PhotoCard {...photo} showOverlay />);

    expect(screen.getByRole('img', { name: 'Studio portrait' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Studio light' })).toBeInTheDocument();
    expect(screen.getByText('Portrait')).toBeInTheDocument();
    expect(screen.getByText('London')).toBeInTheDocument();

    const image = screen.getByRole('img', { name: 'Studio portrait' });
    expect(image.className).toMatch(/group-hover:scale-/);
    expect(image.className).toMatch(/motion-reduce:group-hover:scale-100/);
  });

  it('keeps auto-aspect photos free of spatial hover zoom under reduced motion', () => {
    render(
      <PhotoCard
        {...photo}
        aspectRatio="auto"
        width={1200}
        height={800}
        showOverlay
      />,
    );

    const image = screen.getByRole('img', { name: 'Studio portrait' });
    expect(image.className).toMatch(/motion-reduce:group-hover:scale-100/);
    expect(image.className).not.toMatch(/group-hover:scale-110/);
  });
});
