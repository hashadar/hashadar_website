import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MotionReveal, MotionRevealGroup } from '@/components/ui/motion-reveal';

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

  it('clips overflowing content for clip-up reveals', () => {
    mockPrefersReducedMotion(false);

    render(
      <MotionReveal variant="clip-up">
        <p>Clipped content</p>
      </MotionReveal>,
    );

    const content = screen.getByText('Clipped content');
    expect(content.closest('.overflow-hidden')).toBeTruthy();
  });

  it('shows clip-up children immediately when reduced motion is preferred', () => {
    mockPrefersReducedMotion(true);

    render(
      <MotionReveal variant="clip-up">
        <p>Reduced clip</p>
      </MotionReveal>,
    );

    const content = screen.getByText('Reduced clip');
    expect(content).toBeVisible();
    expect(content.parentElement).not.toHaveStyle({ opacity: '0' });
  });
});

describe('MotionRevealGroup', () => {
  it('renders grouped children', () => {
    mockPrefersReducedMotion(false);

    render(
      <MotionRevealGroup>
        <MotionReveal>
          <p>First</p>
        </MotionReveal>
        <MotionReveal>
          <p>Second</p>
        </MotionReveal>
      </MotionRevealGroup>,
    );

    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('shows grouped children immediately when reduced motion is preferred', () => {
    mockPrefersReducedMotion(true);

    render(
      <MotionRevealGroup>
        <MotionReveal variant="fade-up">
          <p>Grouped one</p>
        </MotionReveal>
        <MotionReveal variant="slide-in">
          <p>Grouped two</p>
        </MotionReveal>
      </MotionRevealGroup>,
    );

    const first = screen.getByText('Grouped one');
    const second = screen.getByText('Grouped two');
    expect(first).toBeVisible();
    expect(second).toBeVisible();
    expect(first.parentElement).not.toHaveStyle({ opacity: '0' });
    expect(second.parentElement).not.toHaveStyle({ opacity: '0' });
  });
});
