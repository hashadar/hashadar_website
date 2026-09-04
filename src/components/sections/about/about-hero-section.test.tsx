import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AboutHeroSection } from '@/components/sections/about/about-hero-section';

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
  it('uses an elevated DOM entrance without a canvas', () => {
    mockPrefersReducedMotion(false);
    const { container } = render(
      <AboutHeroSection name="Hasha Dar" title="AI & Data Consultant" />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Hasha Dar' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'AI & Data Consultant' }),
    ).toBeInTheDocument();
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('shows name and title immediately when reduced motion is preferred', () => {
    mockPrefersReducedMotion(true);
    render(<AboutHeroSection name="Hasha Dar" title="AI & Data Consultant" />);

    expect(screen.getByRole('heading', { name: 'Hasha Dar' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'AI & Data Consultant' })).toBeVisible();
  });
});
