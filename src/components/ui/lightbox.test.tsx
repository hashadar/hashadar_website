import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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

  it('closes on Escape and does not trap keyboard on a canvas', () => {
    const onClose = vi.fn();

    const { container } = render(
      <Lightbox
        isOpen
        images={images}
        currentIndex={0}
        onClose={onClose}
      />,
    );

    expect(container.querySelector('canvas')).toBeNull();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('moves between photos with arrow keys', () => {
    const onNext = vi.fn();
    const onPrevious = vi.fn();
    const gallery = [
      ...images,
      {
        src: '/photos/two.webp',
        alt: 'Second photo',
        title: 'Two',
      },
    ];

    render(
      <Lightbox
        isOpen
        images={gallery}
        currentIndex={0}
        onClose={() => {}}
        onNext={onNext}
        onPrevious={onPrevious}
      />,
    );

    fireEvent.keyDown(document, { key: 'ArrowRight' });
    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrevious).toHaveBeenCalledTimes(1);
  });
});
