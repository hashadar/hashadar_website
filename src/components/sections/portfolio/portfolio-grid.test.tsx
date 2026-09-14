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
          {
            src: '/photos/three.webp',
            alt: 'Third',
            title: 'Three',
            category: 'Portrait',
            location: 'Paris',
          },
        ]}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Photography' })).toBeInTheDocument();
    expect(screen.getByText('from my portfolio')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'First' })).toBeVisible();
    expect(screen.getByRole('img', { name: 'Second' })).toBeVisible();
    expect(container.querySelector('.geometric-pattern')).toBeNull();
    expect(container.innerHTML).not.toContain('SectionBackground');
    expect(container.innerHTML).not.toContain('max-w-6xl');
    expect(container.innerHTML).toContain('col-span-2');
  });

  it('does not feature a lead still with fewer than three photos', () => {
    mockPrefersReducedMotion(true);

    const { container } = render(
      <PortfolioGrid
        images={[
          { src: '/photos/one.webp', alt: 'First', title: 'One' },
          { src: '/photos/two.webp', alt: 'Second', title: 'Two' },
        ]}
      />,
    );

    expect(container.innerHTML).not.toContain('col-span-2');
  });
});
