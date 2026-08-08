import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LabsIndexSection } from '@/components/sections/labs/labs-index-section';
import { labs } from '@/data';

afterEach(() => {
  cleanup();
});

describe('LabsIndexSection', () => {
  it('renders Job OS as the labs flagship without advertising the retired job-market route', () => {
    render(<LabsIndexSection />);

    expect(screen.getByText(labs.brandEyebrow)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: labs.heading })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: labs.flagshipTitle }),
    ).toBeInTheDocument();
    expect(screen.getByText(labs.purposeLine)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: labs.ctaLabel })).toHaveAttribute(
      'href',
      '/labs/job-os',
    );
    expect(screen.queryByRole('link', { name: /job signal lab/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /job-market/i })).not.toBeInTheDocument();
    expect(screen.getByRole('figure', { name: labs.teaserAriaLabel })).toBeInTheDocument();
  });

  it('lists WMW in the Labs catalogue with a link to /labs/wmw', () => {
    render(<LabsIndexSection />);

    const catalogue = screen.getByRole('navigation', {
      name: labs.catalogueAriaLabel,
    });
    expect(
      within(catalogue).getByRole('heading', {
        level: 2,
        name: labs.catalogueHeading,
      }),
    ).toBeInTheDocument();

    const wmw = labs.labs.find((lab) => lab.href === '/labs/wmw');
    expect(wmw).toBeDefined();
    expect(
      within(catalogue).getByRole('link', { name: wmw!.title }),
    ).toHaveAttribute('href', '/labs/wmw');
    expect(within(catalogue).getByText(wmw!.description)).toBeInTheDocument();
  });
});
