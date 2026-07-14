import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { JobMarketLabConsoleSection } from '@/components/sections/labs/job-market-lab-console-section';
import { SiteAuthProvider } from '@/hooks/use-site-auth';
import { jobMarketLab } from '@/data';
import type { AmplifyCorpusDeps } from '@/lib/job-market-corpus-amplify';
import type { CanonicalCvDeps } from '@/lib/canonical-cv';
import { createMemorySiteAuth } from '@/lib/site-auth';
import type { ListAnalysisRunsDeps } from '@/lib/job-market-lab';

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

function createMemoryCanonicalCv(): CanonicalCvDeps {
  return {
    getCanonicalCv: async () => null,
    saveCanonicalCv: async (input) => ({
      id: 'current',
      body: input.body,
      updatedAt: input.updatedAt,
    }),
  };
}

function renderConsole(options?: {
  auth?: ReturnType<typeof createMemorySiteAuth>;
  analysisRuns?: ListAnalysisRunsDeps;
  canonicalCv?: CanonicalCvDeps;
}) {
  const auth = options?.auth ?? createMemorySiteAuth();
  return render(
    <SiteAuthProvider auth={auth}>
      <JobMarketLabConsoleSection
        corpus={createMemoryCorpus()}
        analysisRuns={options?.analysisRuns}
        canonicalCv={options?.canonicalCv ?? createMemoryCanonicalCv()}
      />
    </SiteAuthProvider>,
  );
}

describe('JobMarketLabConsoleSection', () => {
  it('blocks unauthenticated visitors from corpus and run management', async () => {
    renderConsole();

    await waitFor(() => {
      expect(screen.queryByText(/Checking session/i)).not.toBeInTheDocument();
    });

    expect(
      screen.getByRole('heading', {
        name: jobMarketLab.console.unauthenticatedHeading,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: jobMarketLab.admin.heading }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: jobMarketLab.corpusAdmin.heading }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: jobMarketLab.console.runsHeading }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: jobMarketLab.console.cv.heading }),
    ).not.toBeInTheDocument();
  });

  it('shows facade-backed management and live run history when authenticated', async () => {
    renderConsole({
      auth: createMemorySiteAuth({
        status: 'authenticated',
        email: 'owner@example.com',
      }),
      analysisRuns: {
        listRuns: async () => [
          {
            id: 'run-fail',
            status: 'failed',
            errorMessage: 'Embedding cache write failed',
            updatedAt: '2026-07-04T12:00:00.000Z',
          },
        ],
      },
    });

    expect(
      await screen.findByRole('heading', { name: jobMarketLab.console.heading }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: jobMarketLab.admin.heading }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: jobMarketLab.console.cv.heading }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: jobMarketLab.upload.heading }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: jobMarketLab.hitlQueue.heading }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: jobMarketLab.employerAdmin.heading }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: jobMarketLab.metadataAdmin.heading }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: jobMarketLab.payPrestigeAnalytics.heading }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: jobMarketLab.corpusAdmin.heading }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: jobMarketLab.console.themeLabelsHeading }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: jobMarketLab.console.runsHeading }),
    ).toBeInTheDocument();
    expect(await screen.findByText('run-fail')).toBeInTheDocument();
    expect(
      screen.getByText(
        `${jobMarketLab.console.failureReasonLabel}: Embedding cache write failed`,
      ),
    ).toBeInTheDocument();
  });
});
