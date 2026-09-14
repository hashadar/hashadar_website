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

const lede = [
  "I'm a consultant in Deloitte's AI & Data practice. I work as a software developer on Financial Services projects, across data engineering, analytics, cloud, and machine learning.",
  'I studied mechanical engineering at UCL, and was President of UCL Stage Crew, looking after student productions in the Bloomsbury Theatre and on campus.',
  'I have worked as a freelance photographer, and now spend my free time building my own applications, (trying!) to write, and pursuing the CFA.',
  "If you'd like to talk, I'm on LinkedIn.",
];

afterEach(() => {
  cleanup();
  mockPrefersReducedMotion(false);
});

describe('AboutHeroSection', () => {
  it('opens on biography and portrait, not the name', () => {
    mockPrefersReducedMotion(false);
    const { container } = render(
      <AboutHeroSection
        heading="About"
        lede={lede}
        linkedinHref="https://linkedin.com/in/hdar"
        portrait={{ src: '/img/statement-portrait.webp', alt: 'hasha dar' }}
      />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'About' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /hasha/i })).not.toBeInTheDocument();
    expect(screen.getByText(lede[0])).toBeInTheDocument();
    expect(screen.getByText(lede[1])).toBeInTheDocument();
    expect(screen.getByText(lede[2])).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute(
      'href',
      'https://linkedin.com/in/hdar',
    );
    expect(screen.queryByRole('link', { name: /labs/i })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'hasha dar' })).toBeInTheDocument();
    expect(container.querySelector('canvas')).toBeNull();
    expect(container.querySelector('.geometric-pattern')).toBeNull();
    expect(container.innerHTML).not.toContain('skew');
    expect(container.querySelector('section')?.className).toContain('px-7');
    expect(container.querySelector('section')?.className).toContain('min-h-screen');
    expect(container.innerHTML).not.toContain('max-w-6xl');
  });

  it('shows the biography immediately when reduced motion is preferred', () => {
    mockPrefersReducedMotion(true);
    render(<AboutHeroSection heading="About" lede={lede} />);

    expect(screen.getByRole('heading', { name: 'About' })).toBeVisible();
    expect(screen.getByText(lede[0])).toBeVisible();
  });
});
