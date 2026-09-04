import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Lightbox } from '@/components/ui/lightbox';

vi.mock('next/image', () => ({
  default: (props: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt} src={props.src} />
  ),
}));

function mockPrefersReducedMotion(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? matches : false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

afterEach(() => {
  cleanup();
  mockPrefersReducedMotion(false);
  document.body.style.overflow = '';
});

const images = [
  {
    src: '/photos/one.webp',
    alt: 'First photo',
    title: 'One',
    category: 'Travel',
    location: 'Lisbon',
  },
];

describe('Lightbox', () => {
  it('shows the current photo when open', () => {
    mockPrefersReducedMotion(false);

    render(
      <Lightbox
        isOpen
        images={images}
        currentIndex={0}
        onClose={() => {}}
      />,
    );

    expect(screen.getByRole('img', { name: 'First photo' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'One' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close lightbox' })).toBeInTheDocument();
  });

  it('appears immediately when reduced motion is preferred', () => {
    mockPrefersReducedMotion(true);

    render(
      <Lightbox
        isOpen
        images={images}
        currentIndex={0}
        onClose={() => {}}
      />,
    );

    const image = screen.getByRole('img', { name: 'First photo' });
    expect(image).toBeVisible();
    expect(image.closest('[style]')).not.toHaveStyle({ opacity: '0' });
  });
});
