import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { JobMarketFitWorkspace } from '@/components/sections/labs/console/fit/job-market-fit-workspace';
import { SiteAuthProvider } from '@/hooks/use-site-auth';
import { jobMarketLab } from '@/data';
import type { CanonicalCvDeps } from '@/lib/canonical-cv';
import type { AmplifyCorpusDeps } from '@/lib/job-market-corpus-amplify';
import { createMemorySiteAuth } from '@/lib/site-auth';

afterEach(() => {
  cleanup();
});

function createMemoryCorpus(): AmplifyCorpusDeps {
  return {
    getJobDescription: async () => null,
    listJobDescriptions: async () => [],
    saveJobDescription: async () => undefined,
  };
}

function createMemoryCv(body: string): CanonicalCvDeps {
  return {
    async getCanonicalCv() {
      return {
        id: 'current',
        body,
        updatedAt: '2026-07-14T12:00:00.000Z',
      };
    },
    async saveCanonicalCv(input) {
      return {
        id: 'current',
        body: input.body,
        updatedAt: input.updatedAt,
      };
    },
  };
}

describe('JobMarketFitWorkspace', () => {
  it('renders a persistent CV column and mode tabs for fit actions', async () => {
    const user = userEvent.setup();
    render(
      <SiteAuthProvider
        auth={createMemorySiteAuth({
          status: 'authenticated',
          email: 'owner@example.com',
        })}
      >
        <JobMarketFitWorkspace
          corpus={createMemoryCorpus()}
          canonicalCv={createMemoryCv('Python and SQL experience.')}
        />
      </SiteAuthProvider>,
    );

    expect(
      await screen.findByRole('heading', {
        name: jobMarketLab.console.fitWorkspace.heading,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: jobMarketLab.console.fitWorkspace.cvColumnHeading,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', {
        name: jobMarketLab.console.fitWorkspace.modeRoleLabel,
      }),
    ).toHaveAttribute('aria-selected', 'true');

    await user.click(
      screen.getByRole('tab', {
        name: jobMarketLab.console.fitWorkspace.modeMarketLabel,
      }),
    );
    expect(
      screen.getByRole('tab', {
        name: jobMarketLab.console.fitWorkspace.modeMarketLabel,
      }),
    ).toHaveAttribute('aria-selected', 'true');
  });
});
