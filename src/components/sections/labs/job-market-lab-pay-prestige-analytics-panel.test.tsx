import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { JobMarketLabPayPrestigeAnalyticsPanel } from '@/components/sections/labs/job-market-lab-pay-prestige-analytics-panel';
import { SiteAuthProvider } from '@/hooks/use-site-auth';
import { jobMarketLab } from '@/data';
import { createMemorySiteAuth } from '@/lib/site-auth';
import type { GetOwnerPayPrestigeAnalyticsDeps } from '@/lib/job-market-lab';
import type { JobDescriptionCorpusRecord } from '@/lib/job-market-corpus';
import type { EmployerRecord } from '@/lib/job-market-employers';

afterEach(() => {
  cleanup();
});

function doc(
  overrides: Partial<JobDescriptionCorpusRecord> & Pick<JobDescriptionCorpusRecord, 'id'>,
): JobDescriptionCorpusRecord {
  return {
    collectedAt: '2026-01-15T00:00:00.000Z',
    status: 'active',
    title: 'Data scientist',
    ...overrides,
  };
}

function createMemoryAnalyticsDeps(): GetOwnerPayPrestigeAnalyticsDeps {
  const employers: EmployerRecord[] = [
    { id: 'emp-1', name: 'Alpha Bank', sizeTier: 'enterprise', prestigeTier: 'elite' },
  ];

  return {
    listJobDescriptions: async () => [
      doc({
        id: 'jd-1',
        employerId: 'emp-1',
        compensationCurrency: 'GBP',
        compensationMin: 90000,
        compensationMax: 110000,
        compensationPeriod: 'year',
      }),
      doc({ id: 'jd-2' }),
    ],
    listEmployers: async () => employers,
  };
}

function renderPanel(
  auth = createMemorySiteAuth(),
  analytics = createMemoryAnalyticsDeps(),
) {
  return render(
    <SiteAuthProvider auth={auth}>
      <JobMarketLabPayPrestigeAnalyticsPanel analytics={analytics} />
    </SiteAuthProvider>,
  );
}

const ownerAuth = () =>
  createMemorySiteAuth({ status: 'authenticated', email: 'owner@example.com' });

describe('JobMarketLabPayPrestigeAnalyticsPanel', () => {
  it('shows no analytics controls to guests', async () => {
    renderPanel();

    await waitFor(() => {
      expect(screen.queryByText(/Checking session/i)).not.toBeInTheDocument();
    });

    expect(
      screen.queryByRole('heading', {
        name: jobMarketLab.payPrestigeAnalytics.heading,
      }),
    ).not.toBeInTheDocument();
  });

  it('renders compensation and tier analytics for authenticated owners', async () => {
    renderPanel(ownerAuth());

    expect(
      await screen.findByRole('heading', {
        name: jobMarketLab.payPrestigeAnalytics.heading,
      }),
    ).toBeInTheDocument();

    expect(await screen.findByText(jobMarketLab.payPrestigeAnalytics.disclosureHeading)).toBeInTheDocument();
    expect(
      screen.getByText(jobMarketLab.payPrestigeAnalytics.missingDataHeading),
    ).toBeInTheDocument();
    expect(
      screen.getByText(jobMarketLab.payPrestigeAnalytics.missingFieldLabels.employerLink),
    ).toBeInTheDocument();
    expect(
      screen.getByText(jobMarketLab.payPrestigeAnalytics.disclosureLabels.range),
    ).toBeInTheDocument();
    expect(
      screen.getByText(jobMarketLab.payPrestigeAnalytics.prestigeHeading),
    ).toBeInTheDocument();
    expect(screen.getByText('elite')).toBeInTheDocument();
    expect(
      screen.getByText(jobMarketLab.payPrestigeAnalytics.compensationHeading),
    ).toBeInTheDocument();
    expect(screen.getByText('GBP')).toBeInTheDocument();
    expect(screen.getByText(/£90,000/)).toBeInTheDocument();
  });

  it('shows an error when analytics loading fails', async () => {
    renderPanel(ownerAuth(), {
      listJobDescriptions: async () => {
        throw new Error('network');
      },
      listEmployers: async () => [],
    });

    expect(
      await screen.findByText(jobMarketLab.payPrestigeAnalytics.errorLabel),
    ).toBeInTheDocument();
  });
});
