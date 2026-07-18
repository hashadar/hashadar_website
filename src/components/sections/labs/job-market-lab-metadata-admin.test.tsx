import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { JobMarketLabMetadataAdmin } from '@/components/sections/labs/job-market-lab-metadata-admin';
import { SiteAuthProvider } from '@/hooks/use-site-auth';
import { jobMarketLab } from '@/data';
import { createMemorySiteAuth } from '@/lib/site-auth';
import type { AmplifyCorpusDeps } from '@/lib/job-market-corpus-amplify';
import type { AmplifyEmployerDeps } from '@/lib/job-market-employers-amplify';
import type { UpdateJobDescriptionStructuredFieldsDeps } from '@/lib/job-market-employers';
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
    s3Key: `keys/${overrides.id}.md`,
    contentHash: 'hash',
    ...overrides,
  };
}

function createMemoryMetadataDeps(): {
  corpus: AmplifyCorpusDeps;
  employers: AmplifyEmployerDeps;
  metadata: UpdateJobDescriptionStructuredFieldsDeps;
  corpusStore: Map<string, JobDescriptionCorpusRecord>;
  employerStore: Map<string, EmployerRecord>;
  markdownFiles: Map<string, string>;
} {
  const corpusStore = new Map([
    ['jd-1', doc({ id: 'jd-1', title: 'Senior analyst' })],
  ]);
  const employerStore = new Map<string, EmployerRecord>([
    ['emp-1', { id: 'emp-1', name: 'Alpha Bank', sizeTier: 'enterprise', prestigeTier: 'high' }],
  ]);
  const markdownFiles = new Map([
    [
      'keys/jd-1.md',
      `---
collectedAt: 2026-01-15T00:00:00.000Z
title: Senior analyst
---

Body.
`,
    ],
  ]);

  const corpus: AmplifyCorpusDeps = {
    async getJobDescription(id) {
      return corpusStore.get(id) ?? null;
    },
    async listJobDescriptions() {
      return [...corpusStore.values()];
    },
    async saveJobDescription(record) {
      corpusStore.set(record.id, record);
    },
  };

  const employers: AmplifyEmployerDeps = {
    async listEmployers() {
      return [...employerStore.values()];
    },
    async getEmployer(id) {
      return employerStore.get(id) ?? null;
    },
    async insertEmployer() {
      throw new Error('not used');
    },
    async persistEmployer() {
      throw new Error('not used');
    },
  };

  const metadata: UpdateJobDescriptionStructuredFieldsDeps = {
    getJobDescription: corpus.getJobDescription,
    saveJobDescription: corpus.saveJobDescription,
    getEmployer: employers.getEmployer,
    getMarkdown: async (s3Key) => markdownFiles.get(s3Key) ?? null,
    overwriteMarkdown: async (input) => {
      markdownFiles.set(input.s3Key, input.body);
      return { status: 'uploaded', s3Key: input.s3Key };
    },
  };

  return { corpus, employers, metadata, corpusStore, employerStore, markdownFiles };
}

function renderMetadataAdmin(
  auth = createMemorySiteAuth(),
  deps = createMemoryMetadataDeps(),
) {
  return render(
    <SiteAuthProvider auth={auth}>
      <JobMarketLabMetadataAdmin
        corpus={deps.corpus}
        employers={deps.employers}
        metadata={deps.metadata}
      />
    </SiteAuthProvider>,
  );
}

const ownerAuth = () =>
  createMemorySiteAuth({ status: 'authenticated', email: 'owner@example.com' });

describe('JobMarketLabMetadataAdmin', () => {
  it('shows no metadata controls to guests', async () => {
    renderMetadataAdmin(createMemorySiteAuth({ status: 'unauthenticated' }));

    expect(screen.queryByText(jobMarketLab.metadataAdmin.heading)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: jobMarketLab.metadataAdmin.saveButtonLabel }),
    ).not.toBeInTheDocument();
  });

  it('lets the signed-in owner link structured metadata to a job description', async () => {
    const user = userEvent.setup();
    const deps = createMemoryMetadataDeps();
    renderMetadataAdmin(ownerAuth(), deps);

    expect(
      await screen.findByRole('heading', { name: jobMarketLab.metadataAdmin.heading }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Senior analyst')).toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText(`${jobMarketLab.metadataAdmin.employerLabel} (jd-1)`),
      'emp-1',
    );
    await user.selectOptions(
      screen.getByLabelText(`${jobMarketLab.metadataAdmin.seniorityLabel} (jd-1)`),
      'senior',
    );
    await user.selectOptions(
      screen.getByLabelText(`${jobMarketLab.metadataAdmin.roleFamilyLabel} (jd-1)`),
      'data_science',
    );
    await user.type(
      screen.getByLabelText(`${jobMarketLab.metadataAdmin.compensationCurrencyLabel} (jd-1)`),
      'GBP',
    );
    await user.type(
      screen.getByLabelText(`${jobMarketLab.metadataAdmin.compensationMinLabel} (jd-1)`),
      '80000',
    );
    await user.type(
      screen.getByLabelText(`${jobMarketLab.metadataAdmin.compensationMaxLabel} (jd-1)`),
      '95000',
    );
    await user.selectOptions(
      screen.getByLabelText(`${jobMarketLab.metadataAdmin.compensationPeriodLabel} (jd-1)`),
      'year',
    );
    await user.click(
      screen.getByRole('button', { name: jobMarketLab.metadataAdmin.saveButtonLabel }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          jobMarketLab.metadataAdmin.savedMessage.replace('{title}', 'Senior analyst'),
        ),
      ).toBeInTheDocument();
    });

    expect(deps.corpusStore.get('jd-1')).toEqual(
      expect.objectContaining({
        employerId: 'emp-1',
        seniority: 'senior',
        roleFamily: 'data_science',
        compensationCurrency: 'GBP',
        compensationMin: 80000,
        compensationMax: 95000,
        compensationPeriod: 'year',
      }),
    );
  });
});
