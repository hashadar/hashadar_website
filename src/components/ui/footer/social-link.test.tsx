import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SocialLink } from '@/components/ui/footer/social-link';

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

describe('SocialLink', () => {
  it('remains a labelled control when reduced motion is preferred', () => {
    mockPrefersReducedMotion(true);

    render(
      <SocialLink href="https://github.com/hashadar" icon={<span>GH</span>} label="GitHub" />,
    );

    const link = screen.getByRole('link', { name: 'GitHub' });
    expect(link).toBeVisible();
    expect(link).toHaveAttribute('href', 'https://github.com/hashadar');
  });
});
