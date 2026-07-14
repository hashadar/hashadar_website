import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MotionReveal } from '@/components/ui/motion-reveal';

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
  mockPrefersReducedMotion(false);
});

describe('MotionReveal', () => {
  it('shows children immediately when reduced motion is preferred', () => {
    mockPrefersReducedMotion(true);

    render(
      <MotionReveal>
        <p>Visible content</p>
      </MotionReveal>,
    );

    const content = screen.getByText('Visible content');
    expect(content).toBeVisible();
    expect(content.parentElement).not.toHaveStyle({ opacity: '0' });
  });

  it('renders children as a static wrapper when variant is none', () => {
    mockPrefersReducedMotion(false);

    render(
      <MotionReveal variant="none">
        <p>Static content</p>
      </MotionReveal>,
    );

    expect(screen.getByText('Static content')).toBeVisible();
  });
});
