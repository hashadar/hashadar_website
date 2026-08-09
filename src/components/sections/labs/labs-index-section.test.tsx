import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LabsIndexSection } from '@/components/sections/labs/labs-index-section';
import { labs } from '@/data';

afterEach(() => {
  cleanup();
});

describe('LabsIndexSection', () => {
  it('renders Labs brand and both lab destinations without the retired job-market route', () => {
    render(<LabsIndexSection />);

    expect(screen.getByText(labs.brandEyebrow)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: labs.heading }),
    ).toBeInTheDocument();
    expect(screen.getByText(labs.purposeLine)).toBeInTheDocument();

    const catalogue = screen.getByRole('navigation', {
      name: labs.catalogueAriaLabel,
    });
    const jobOs = labs.labs.find((lab) => lab.href === '/labs/job-os');
    const wmw = labs.labs.find((lab) => lab.href === '/labs/wmw');
    expect(jobOs).toBeDefined();
    expect(wmw).toBeDefined();

    expect(
      within(catalogue).getByRole('heading', { level: 2, name: jobOs!.title }),
    ).toBeInTheDocument();
    expect(
      within(catalogue).getByRole('link', { name: new RegExp(jobOs!.title) }),
    ).toHaveAttribute('href', '/labs/job-os');
    expect(
      within(catalogue).getByRole('link', { name: new RegExp(wmw!.title) }),
    ).toHaveAttribute('href', '/labs/wmw');
    expect(within(catalogue).getByText(wmw!.lede)).toBeInTheDocument();
    expect(within(catalogue).getByText(wmw!.description)).toBeInTheDocument();
    expect(wmw!.lede.toLowerCase()).toBe('net worth tracker');
    expect(wmw!.description).toContain('account returns');
    expect(wmw!.description).not.toContain('Account');

    expect(
      screen.queryByRole('link', { name: /job signal lab/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /job-market/i }),
    ).not.toBeInTheDocument();
  });
});
