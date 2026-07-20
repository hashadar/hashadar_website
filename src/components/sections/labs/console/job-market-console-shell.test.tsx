import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JobMarketConsoleShell } from '@/components/sections/labs/console/job-market-console-shell';
import { JobMarketConsoleOverview } from '@/components/sections/labs/console/job-market-console-overview';
import { JobMarketConsoleCorpusPage } from '@/components/sections/labs/console/job-market-console-corpus-page';
import { SiteAuthProvider } from '@/hooks/use-site-auth';
import { jobMarketLab } from '@/data';
import type { AmplifyCorpusDeps } from '@/lib/job-market-corpus-amplify';
import type { AmplifyEmployerDeps } from '@/lib/job-market-employers-amplify';
import { createMemorySiteAuth } from '@/lib/site-auth';

vi.mock('next/navigation', () => ({
  usePathname: () => '/labs/job-market/console',
  useRouter: () => ({ push: vi.fn() }),
}));

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

function createMemoryEmployers(): AmplifyEmployerDeps {
  return {
    listEmployers: async () => [],
    getEmployer: async () => null,
    insertEmployer: async (input) => ({ id: 'emp-1', ...input }),
    persistEmployer: async () => undefined,
  };
}

describe('JobMarketConsoleShell', () => {
  it('blocks unauthenticated visitors from the sidebar shell', async () => {
    render(
      <SiteAuthProvider auth={createMemorySiteAuth()}>
        <JobMarketConsoleShell>
          <p>Secret console content</p>
        </JobMarketConsoleShell>
      </SiteAuthProvider>,
    );

    await waitFor(() => {
      expect(screen.queryByText(/Checking session/i)).not.toBeInTheDocument();
    });

    expect(
      screen.getByRole('heading', {
        name: jobMarketLab.console.unauthenticatedHeading,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Secret console content')).not.toBeInTheDocument();
  });

  it('shows sidebar navigation when authenticated', async () => {
    render(
      <SiteAuthProvider
        auth={createMemorySiteAuth({
          status: 'authenticated',
          email: 'owner@example.com',
        })}
      >
        <JobMarketConsoleShell>
          <p>Secret console content</p>
        </JobMarketConsoleShell>
      </SiteAuthProvider>,
    );

    expect(
      await screen.findByRole('heading', { name: jobMarketLab.console.heading }),
    ).toBeInTheDocument();
    expect(screen.getByText('Secret console content')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Corpus' })).toHaveAttribute(
      'href',
      '/labs/job-market/console/corpus',
    );
  });
});

describe('JobMarketConsoleOverview', () => {
  it('shows status and work-area links without dumping corpus panels', async () => {
    render(
      <JobMarketConsoleOverview
        analysisRuns={{
          listRuns: async () => [
            {
              id: 'run-ok',
              status: 'succeeded',
              updatedAt: '2026-07-04T12:00:00.000Z',
            },
          ],
        }}
        scrapeCandidates={{
          listScrapeCandidates: async () => [
            {
              id: 'c1',
              fileName: 'role.md',
              body: '---\ncollectedAt: 2026-07-01T00:00:00.000Z\n---\nBody',
              status: 'pending',
            },
          ],
        }}
      />,
    );

    expect(
      await screen.findByRole('heading', {
        name: jobMarketLab.console.overview.heading,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: /Open Corpus/i,
      }),
    ).toHaveAttribute('href', '/labs/job-market/console/corpus');
    expect(
      screen.queryByRole('heading', { name: jobMarketLab.upload.heading }),
    ).not.toBeInTheDocument();
  });
});

describe('JobMarketConsoleCorpusPage', () => {
  it('mounts the corpus workspace instead of stacked admin section headings', async () => {
    render(
      <SiteAuthProvider
        auth={createMemorySiteAuth({
          status: 'authenticated',
          email: 'owner@example.com',
        })}
      >
        <JobMarketConsoleCorpusPage
          corpus={createMemoryCorpus()}
          employers={createMemoryEmployers()}
          markdownDeps={{ fetchMarkdown: async () => null }}
        />
      </SiteAuthProvider>,
    );

    expect(
      await screen.findByRole('heading', {
        name: jobMarketLab.console.corpusWorkspace.heading,
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', {
        name: jobMarketLab.console.corpusWorkspace.registryHeading,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: jobMarketLab.upload.heading }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(jobMarketLab.employerAdmin.description),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: jobMarketLab.metadataAdmin.heading }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: jobMarketLab.corpusAdmin.heading }),
    ).not.toBeInTheDocument();
  });
});
