import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { JobMarketLabMarketComparePanel } from '@/components/sections/labs/job-market-lab-market-compare-panel';
import { SiteAuthProvider } from '@/hooks/use-site-auth';
import { jobMarketLab } from '@/data';
import type { CanonicalCvDeps } from '@/lib/canonical-cv';
import type { FetchOwnerJobMarketPulseSourceDeps } from '@/lib/job-market-lab';
import { createMemorySiteAuth } from '@/lib/site-auth';

afterEach(() => {
  cleanup();
});

function createMemoryCanonicalCv(body: string | null): CanonicalCvDeps {
  return {
    async getCanonicalCv() {
      if (body === null) {
        return null;
      }
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

const publishedPulse = {
  snapshot: {
    documentCount: 12,
    publishedAt: '2026-07-14T12:00:00.000Z',
    technologies: [
      { name: 'python', count: 9 },
      { name: 'snowflake', count: 6 },
      { name: 'tableau', count: 4 },
    ],
    skills: [
      { name: 'python', count: 9 },
      { name: 'snowflake', count: 6 },
      { name: 'tableau', count: 4 },
    ],
    seniority: [],
    roleFamily: [],
    clusters: [
      { id: 0, size: 7, label: 'Model governance' },
      { id: 1, size: 4, label: 'Cloud platform engineering' },
    ],
    projection: [],
  },
  corpusMeta: {
    documents: [
      {
        id: 'doc-1',
        collectedAt: '2026-07-01T00:00:00.000Z',
        technologies: ['python', 'snowflake'],
        clusterId: 0,
      },
    ],
  },
};

function renderMarketComparePanel(options?: {
  auth?: ReturnType<typeof createMemorySiteAuth>;
  canonicalCv?: CanonicalCvDeps;
  ownerPulse?: FetchOwnerJobMarketPulseSourceDeps;
}) {
  const auth = options?.auth ?? createMemorySiteAuth();
  return render(
    <SiteAuthProvider auth={auth}>
      <JobMarketLabMarketComparePanel
        canonicalCv={options?.canonicalCv}
        ownerPulse={options?.ownerPulse}
      />
    </SiteAuthProvider>,
  );
}

const ownerAuth = () =>
  createMemorySiteAuth({ status: 'authenticated', email: 'owner@example.com' });

describe('JobMarketLabMarketComparePanel', () => {
  it('shows no market compare controls to guests', async () => {
    renderMarketComparePanel({
      auth: createMemorySiteAuth({ status: 'unauthenticated' }),
    });

    expect(
      screen.queryByRole('heading', {
        name: jobMarketLab.console.marketCompare.heading,
      }),
    ).not.toBeInTheDocument();
  });

  it('runs comparison against published pulse and shows ontology-shaped results', async () => {
    const user = userEvent.setup();
    renderMarketComparePanel({
      auth: ownerAuth(),
      canonicalCv: createMemoryCanonicalCv(
        'Delivered model governance and Python analytics.',
      ),
      ownerPulse: {
        fetchOwnerPayload: async () => publishedPulse,
      },
    });

    await user.click(
      await screen.findByRole('button', {
        name: jobMarketLab.console.marketCompare.runButtonLabel,
      }),
    );

    expect(
      await screen.findByRole('heading', {
        name: jobMarketLab.console.marketCompare.matchesHeading,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('python')).toBeInTheDocument();
    expect(screen.getByText('Model governance')).toBeInTheDocument();
    expect(screen.getByText('snowflake')).toBeInTheDocument();
    expect(screen.getByText('Cloud platform engineering')).toBeInTheDocument();
    expect(
      screen.getByText('Your CV aligns with current market demand for python.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Build demonstrable snowflake experience to reflect current market demand.',
      ),
    ).toBeInTheDocument();
  });

  it('blocks comparison when no canonical CV is saved', async () => {
    const user = userEvent.setup();
    renderMarketComparePanel({
      auth: ownerAuth(),
      canonicalCv: createMemoryCanonicalCv(null),
      ownerPulse: {
        fetchOwnerPayload: async () => publishedPulse,
      },
    });

    await user.click(
      await screen.findByRole('button', {
        name: jobMarketLab.console.marketCompare.runButtonLabel,
      }),
    );

    expect(
      await screen.findByText(jobMarketLab.console.marketCompare.noCvError),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.queryByRole('heading', {
          name: jobMarketLab.console.marketCompare.matchesHeading,
        }),
      ).not.toBeInTheDocument();
    });
  });

  it('blocks comparison when no published pulse is available', async () => {
    const user = userEvent.setup();
    renderMarketComparePanel({
      auth: ownerAuth(),
      canonicalCv: createMemoryCanonicalCv('Python delivery.'),
      ownerPulse: {
        fetchOwnerPayload: async () => null,
      },
    });

    await user.click(
      await screen.findByRole('button', {
        name: jobMarketLab.console.marketCompare.runButtonLabel,
      }),
    );

    expect(
      await screen.findByText(jobMarketLab.console.marketCompare.noPulseError),
    ).toBeInTheDocument();
  });
});
