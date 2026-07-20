import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LabsIndexSection } from '@/components/sections/labs/labs-index-section';
import { labs } from '@/data';

afterEach(() => {
  cleanup();
});

describe('LabsIndexSection', () => {
  it('renders the flagship stage with Labs as the primary heading', () => {
    render(<LabsIndexSection />);

    expect(screen.getByText(labs.brandEyebrow)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: labs.heading })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: labs.flagshipTitle }),
    ).toBeInTheDocument();
    expect(screen.getByText(labs.purposeLine)).toBeInTheDocument();

    const cta = screen.getByRole('link', { name: labs.ctaLabel });
    expect(cta).toHaveAttribute('href', labs.labs[0].href);
    expect(screen.getByRole('figure', { name: labs.teaserAriaLabel })).toBeInTheDocument();
  });

  it('does not render a multi-lab list', () => {
    render(<LabsIndexSection />);

    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
