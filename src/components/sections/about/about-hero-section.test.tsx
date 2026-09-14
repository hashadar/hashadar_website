import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AboutHeroSection } from '@/components/sections/about/about-hero-section';

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

describe('AboutHeroSection', () => {
  it('uses a quiet first fold without ornaments or a canvas', () => {
    mockPrefersReducedMotion(false);
    const { container } = render(
      <AboutHeroSection
        name="Hasha Dar"
        title="AI & Data Consultant"
        portrait={{ src: '/img/statement-portrait.webp', alt: 'hasha dar' }}
      />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Hasha Dar' })).toBeInTheDocument();
    expect(screen.getByText('AI & Data Consultant')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'hasha dar' })).toBeInTheDocument();
    expect(container.querySelector('canvas')).toBeNull();
    expect(container.querySelector('.geometric-pattern')).toBeNull();
    expect(container.innerHTML).not.toContain('skew');
  });

  it('shows name and title immediately when reduced motion is preferred', () => {
    mockPrefersReducedMotion(true);
    render(<AboutHeroSection name="Hasha Dar" title="AI & Data Consultant" />);

    expect(screen.getByRole('heading', { name: 'Hasha Dar' })).toBeVisible();
    expect(screen.getByText('AI & Data Consultant')).toBeVisible();
  });
});
