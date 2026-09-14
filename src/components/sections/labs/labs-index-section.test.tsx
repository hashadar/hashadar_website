import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LabsIndexSection } from '@/components/sections/labs/labs-index-section';
import { labs } from '@/data';

afterEach(() => {
  cleanup();
});

describe('LabsIndexSection', () => {
  it('renders a flush catalogue of lab names and short labels', () => {
    const { container } = render(<LabsIndexSection />);

    expect(
      screen.getByRole('heading', { level: 1, name: labs.heading }),
    ).toBeInTheDocument();
    expect(screen.getByText(labs.purposeLine)).toBeInTheDocument();
    expect(container.innerHTML).not.toContain('max-w-6xl');

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
    expect(within(catalogue).getByText(jobOs!.lede)).toBeInTheDocument();
    expect(within(catalogue).getByText(wmw!.lede)).toBeInTheDocument();
    expect(jobOs!.lede.toLowerCase()).toBe('application tracker');
    expect(wmw!.lede.toLowerCase()).toBe('balances and returns');

    expect(within(catalogue).queryByText(jobOs!.description)).not.toBeInTheDocument();
    expect(within(catalogue).queryByText(wmw!.description)).not.toBeInTheDocument();
    expect(within(catalogue).queryByText(jobOs!.ctaLabel)).not.toBeInTheDocument();
    expect(within(catalogue).queryByText(wmw!.ctaLabel)).not.toBeInTheDocument();

    expect(
      screen.queryByRole('link', { name: /job signal lab/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /job-market/i }),
    ).not.toBeInTheDocument();
  });
});
