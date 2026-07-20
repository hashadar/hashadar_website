import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { JobMarketCorpusWorkspace } from '@/components/sections/labs/console/corpus/job-market-corpus-workspace';
import { SiteAuthProvider } from '@/hooks/use-site-auth';
import { jobMarketLab } from '@/data';
import type { AmplifyCorpusDeps } from '@/lib/job-market-corpus-amplify';
import type { AmplifyEmployerDeps } from '@/lib/job-market-employers-amplify';
import { createMemorySiteAuth } from '@/lib/site-auth';
import type { JobDescriptionCorpusRecord } from '@/lib/job-market-corpus';
import type { EmployerRecord } from '@/lib/job-market-employers';

afterEach(() => {
  cleanup();
});

const copy = jobMarketLab.console.corpusWorkspace;

function createCorpus(
  initial: JobDescriptionCorpusRecord[],
): AmplifyCorpusDeps & { store: Map<string, JobDescriptionCorpusRecord> } {
  const store = new Map(initial.map((record) => [record.id, { ...record }]));
  return {
    store,
    getJobDescription: async (id) => store.get(id) ?? null,
    listJobDescriptions: async () => [...store.values()],
    saveJobDescription: async (record) => {
      store.set(record.id, { ...record });
    },
  };
}

function createEmployers(
  initial: EmployerRecord[],
): AmplifyEmployerDeps & { store: Map<string, EmployerRecord> } {
  const store = new Map(initial.map((record) => [record.id, { ...record }]));
  return {
    store,
    listEmployers: async () => [...store.values()],
    getEmployer: async (id) => store.get(id) ?? null,
    insertEmployer: async (input) => {
      const employer = { id: `emp-${store.size + 1}`, ...input };
      store.set(employer.id, employer);
      return employer;
    },
    persistEmployer: async (employer) => {
      store.set(employer.id, { ...employer });
    },
  };
}

describe('JobMarketCorpusWorkspace', () => {
  it('loads a table, filters rows, and opens markdown detail', async () => {
    const user = userEvent.setup();
    const corpus = createCorpus([
      {
        id: 'raw/role.md',
        s3Key: 'raw/role.md',
        collectedAt: '2026-07-01T00:00:00.000Z',
        status: 'active',
        title: 'Applied AI Architect',
      },
      {
        id: 'raw/old.md',
        s3Key: 'raw/old.md',
        collectedAt: '2026-01-01T00:00:00.000Z',
        status: 'archived',
        title: 'Archived Role',
        employerId: 'emp-1',
        compensationCurrency: 'GBP',
        compensationMin: 1,
        compensationMax: 2,
        compensationPeriod: 'year',
      },
    ]);
    const employers = createEmployers([
      {
        id: 'emp-1',
        name: 'Anthropic',
        sizeTier: 'scaleup',
        prestigeTier: 'elite',
      },
    ]);

    render(
      <SiteAuthProvider
        auth={createMemorySiteAuth({
          status: 'authenticated',
          email: 'owner@example.com',
        })}
      >
        <JobMarketCorpusWorkspace
          corpus={corpus}
          employers={employers}
          markdownDeps={{
            fetchMarkdown: async () =>
              '---\ncollectedAt: 2026-07-01T00:00:00.000Z\n---\nBody copy',
          }}
        />
      </SiteAuthProvider>,
    );

    expect(
      await screen.findByRole('heading', { name: copy.heading }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: copy.registryHeading }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: 'Applied AI Architect' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Archived Role').length).toBeGreaterThan(0);
    expect(
      screen.queryByRole('heading', { name: jobMarketLab.upload.heading }),
    ).not.toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText(copy.statusFilterLabel),
      'active',
    );
    expect(
      screen.getByRole('button', { name: 'Applied AI Architect' }),
    ).toBeInTheDocument();
    expect(screen.queryAllByText('Archived Role')).toHaveLength(0);

    await user.click(
      screen.getByRole('button', { name: 'Applied AI Architect' }),
    );
    expect(
      await screen.findByRole('heading', { name: copy.detailHeading }),
    ).toBeInTheDocument();
    expect(await screen.findByDisplayValue(/Body copy/)).toBeInTheDocument();
  });

  it('expands the registry panel to add employers and show audit counts', async () => {
    const user = userEvent.setup();
    const corpus = createCorpus([
      {
        id: 'raw/role.md',
        s3Key: 'raw/role.md',
        collectedAt: '2026-07-01T00:00:00.000Z',
        status: 'active',
        title: 'Role',
      },
    ]);
    const employers = createEmployers([]);

    render(
      <SiteAuthProvider
        auth={createMemorySiteAuth({
          status: 'authenticated',
          email: 'owner@example.com',
        })}
      >
        <JobMarketCorpusWorkspace
          corpus={corpus}
          employers={employers}
          markdownDeps={{ fetchMarkdown: async () => 'body' }}
          listPendingCandidates={async () => []}
          listRuns={async () => []}
        />
      </SiteAuthProvider>,
    );

    await screen.findAllByText('Role');
    await user.click(
      screen.getByRole('button', { name: new RegExp(copy.registryHeading) }),
    );

    expect(
      await screen.findByRole('heading', { name: copy.auditHeading }),
    ).toBeInTheDocument();
    expect(screen.getByText(copy.auditJobDescriptionsLabel)).toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText(copy.employersNameLabel),
      'Accenture',
    );
    await user.click(
      screen.getByRole('button', { name: copy.employersCreateLabel }),
    );
    await waitFor(() => {
      expect(employers.store.size).toBe(1);
    });
    expect(screen.getByDisplayValue('Accenture')).toBeInTheDocument();
  });
});
