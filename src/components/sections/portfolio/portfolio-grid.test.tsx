import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PortfolioGrid } from '@/components/sections/portfolio/portfolio-grid';

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

describe('PortfolioGrid', () => {
  it('staggers photos without a competing marketing grid', () => {
    mockPrefersReducedMotion(true);

    const { container } = render(
      <PortfolioGrid
        images={[
          {
            src: '/photos/one.webp',
            alt: 'First',
            title: 'One',
            category: 'Travel',
            location: 'Lisbon',
          },
          {
            src: '/photos/two.webp',
            alt: 'Second',
            title: 'Two',
            category: 'Portrait',
            location: 'London',
          },
        ]}
      />,
    );

    expect(screen.getByRole('img', { name: 'First' })).toBeVisible();
    expect(screen.getByRole('img', { name: 'Second' })).toBeVisible();
    expect(container.querySelector('.geometric-pattern')).toBeNull();
  });
});
