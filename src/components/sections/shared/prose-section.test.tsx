import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ProseSection } from '@/components/sections/shared/prose-section';

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

describe('ProseSection', () => {
  it('renders a single string as one paragraph', () => {
    render(
      <ProseSection heading="About" content="Hello from the prose section." />,
    );

    expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument();
    expect(screen.getByText('Hello from the prose section.')).toBeInTheDocument();
  });

  it('renders array content as multiple paragraphs', () => {
    render(
      <ProseSection
        heading="Professional"
        content={['First paragraph.', 'Second paragraph.']}
      />,
    );

    expect(screen.getByText('First paragraph.')).toBeInTheDocument();
    expect(screen.getByText('Second paragraph.')).toBeInTheDocument();
  });

  it('renders an optional CTA link', () => {
    render(
      <ProseSection
        heading="About"
        content="Body copy."
        cta={{ label: 'Learn more about me', href: '/about' }}
      />,
    );

    expect(screen.getByRole('link', { name: 'Learn more about me' })).toHaveAttribute(
      'href',
      '/about',
    );
  });

  it('remains visible when reduced motion is preferred', () => {
    mockPrefersReducedMotion(true);

    render(
      <ProseSection heading="About" content="Accessible copy." id="about" />,
    );

    expect(screen.getByText('Accessible copy.')).toBeVisible();
    expect(document.getElementById('about')).toBeInTheDocument();
  });
});
