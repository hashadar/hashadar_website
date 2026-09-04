import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PhotographySection } from '@/components/sections/homepage/photography-section';

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
});

describe('PhotographySection', () => {
  it('keeps a minimal atmosphere and still shows the photo when reduced motion is preferred', () => {
    mockPrefersReducedMotion(true);

    const { container } = render(
      <PhotographySection
        heading="Photography"
        description="Travel and portrait work."
        images={[
          {
            src: '/photos/teaser.webp',
            alt: 'Teaser portrait',
            title: 'Teaser',
            category: 'Portrait',
            location: 'London',
          },
        ]}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Photography' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Teaser portrait' })).toBeVisible();
    expect(container.querySelector('.geometric-pattern')).toBeNull();
  });
});
