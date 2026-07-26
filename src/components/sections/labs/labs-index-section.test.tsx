import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LabsIndexSection } from '@/components/sections/labs/labs-index-section';
import { labs } from '@/data';

afterEach(() => {
  cleanup();
});

describe('LabsIndexSection', () => {
  it('renders the Labs stage without advertising a retired lab route', () => {
    render(<LabsIndexSection />);

    expect(screen.getByText(labs.brandEyebrow)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: labs.heading })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: labs.flagshipTitle }),
    ).toBeInTheDocument();
    expect(screen.getByText(labs.purposeLine)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: labs.ctaLabel })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /job signal lab/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /job-market/i })).not.toBeInTheDocument();
    expect(screen.getByRole('figure', { name: labs.teaserAriaLabel })).toBeInTheDocument();
  });

  it('does not render a multi-lab list', () => {
    render(<LabsIndexSection />);

    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
