import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { JobMarketLabPulseFiltersPanel } from '@/components/sections/labs/job-market-lab-pulse-filters-panel';
import { SiteAuthProvider } from '@/hooks/use-site-auth';
import { jobMarketLab } from '@/data';
import { createMemorySiteAuth } from '@/lib/site-auth';

afterEach(() => {
  cleanup();
});

describe('JobMarketLabPulseFiltersPanel', () => {
  it('renders owner filter controls and filtered pulse summary when corpus metadata is available', async () => {
    render(
      <SiteAuthProvider
        auth={createMemorySiteAuth({
          status: 'authenticated',
          email: 'owner@example.com',
        })}
      >
        <JobMarketLabPulseFiltersPanel
          ownerPulse={{
            fetchOwnerPayload: async () => ({
              snapshot: {
                documentCount: 2,
                publishedAt: '2026-07-14T12:00:00.000Z',
                technologies: [
                  { name: 'python', count: 2 },
                  { name: 'sql', count: 1 },
                ],
                skills: [
                  { name: 'python', count: 2 },
                  { name: 'sql', count: 1 },
                ],
                seniority: [{ name: 'senior', count: 2 }],
                roleFamily: [{ name: 'data_science', count: 2 }],
                clusters: [{ id: 0, size: 2, label: 'Python stack' }],
                projection: [],
              },
              corpusMeta: {
                documents: [
                  {
                    id: 'jd-1',
                    collectedAt: '2026-06-01T00:00:00.000Z',
                    seniority: 'senior',
                    roleFamily: 'data_science',
                    employerSizeTier: 'enterprise',
                    employerPrestigeTier: 'elite',
                    technologies: ['python', 'sql'],
                    clusterId: 0,
                  },
                  {
                    id: 'jd-2',
                    collectedAt: '2026-01-01T00:00:00.000Z',
                    seniority: 'mid',
                    roleFamily: 'analytics',
                    employerSizeTier: 'startup',
                    employerPrestigeTier: 'low',
                    technologies: ['python'],
                    clusterId: 0,
                  },
                ],
              },
            }),
          }}
        />
      </SiteAuthProvider>,
    );

    expect(
      await screen.findByRole('heading', {
        name: jobMarketLab.console.pulseFiltersHeading,
      }),
    ).toBeInTheDocument();

    expect(
      await screen.findByLabelText(jobMarketLab.employerAdmin.prestigeTierLabel),
    ).toBeInTheDocument();
    expect(await screen.findByText('python')).toBeInTheDocument();
    expect(await screen.findByText('Python stack')).toBeInTheDocument();
  });

  it('does not render for guests', () => {
    render(
      <SiteAuthProvider auth={createMemorySiteAuth()}>
        <JobMarketLabPulseFiltersPanel />
      </SiteAuthProvider>,
    );

    expect(
      screen.queryByRole('heading', {
        name: jobMarketLab.console.pulseFiltersHeading,
      }),
    ).not.toBeInTheDocument();
  });
});
