import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JobMarketLabCorpusAdmin } from '@/components/sections/labs/job-market-lab-corpus-admin';
import { SiteAuthProvider } from '@/hooks/use-site-auth';
import { jobMarketLab } from '@/data';
import { createMemorySiteAuth } from '@/lib/site-auth';
import type { AmplifyCorpusDeps } from '@/lib/job-market-corpus-amplify';
import type { JobDescriptionCorpusRecord } from '@/lib/job-market-corpus';

afterEach(() => {
  cleanup();
});

function doc(
  overrides: Partial<JobDescriptionCorpusRecord> & Pick<JobDescriptionCorpusRecord, 'id'>,
): JobDescriptionCorpusRecord {
  return {
    collectedAt: '2026-01-15T00:00:00.000Z',
    status: 'active',
    title: 'Sample role',
    s3Key: `keys/${overrides.id}.md`,
    contentHash: 'hash',
    ...overrides,
  };
}

function createMemoryCorpus(
  initial: JobDescriptionCorpusRecord[],
): AmplifyCorpusDeps & {
  store: Map<string, JobDescriptionCorpusRecord>;
  deleteS3: ReturnType<typeof vi.fn>;
} {
  const store = new Map(initial.map((item) => [item.id, { ...item }]));
  const deleteS3 = vi.fn(async () => {
    throw new Error('S3 delete must never be called for soft-archive');
  });
  return {
    store,
    deleteS3,
    async getJobDescription(id) {
      return store.get(id) ?? null;
    },
    async listJobDescriptions() {
      return [...store.values()];
    },
    async saveJobDescription(record) {
      store.set(record.id, record);
    },
  };
}

function renderAdmin(
  auth = createMemorySiteAuth(),
  corpus = createMemoryCorpus([doc({ id: 'jd-1' })]),
) {
  return render(
    <SiteAuthProvider auth={auth}>
      <JobMarketLabCorpusAdmin corpus={corpus} />
    </SiteAuthProvider>,
  );
}

const ownerAuth = () =>
  createMemorySiteAuth({ status: 'authenticated', email: 'owner@example.com' });

describe('JobMarketLabCorpusAdmin', () => {
  it('shows no corpus management controls to guests', async () => {
    renderAdmin(createMemorySiteAuth({ status: 'unauthenticated' }));

    expect(screen.queryByText(jobMarketLab.corpusAdmin.heading)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: jobMarketLab.corpusAdmin.archiveLabel }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: jobMarketLab.corpusAdmin.restoreLabel }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('jd-1')).not.toBeInTheDocument();
  });

  it('lets the signed-in owner soft-archive an active job description without deleting storage', async () => {
    const user = userEvent.setup();
    const corpus = createMemoryCorpus([
      doc({ id: 'jd-1', title: 'Risk modeller', status: 'active' }),
    ]);
    renderAdmin(ownerAuth(), corpus);

    expect(await screen.findByText(jobMarketLab.corpusAdmin.heading)).toBeInTheDocument();
    expect(screen.getByText('Risk modeller')).toBeInTheDocument();
    expect(screen.getByText('jd-1')).toBeInTheDocument();
    expect(screen.getByText(jobMarketLab.corpusAdmin.statusActiveLabel)).toBeInTheDocument();
    expect(screen.queryByText(/secret JD body|markdown|# Role/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: jobMarketLab.corpusAdmin.archiveLabel }));

    await waitFor(() => {
      expect(screen.getByText(jobMarketLab.corpusAdmin.statusArchivedLabel)).toBeInTheDocument();
    });
    expect(corpus.store.get('jd-1')?.status).toBe('archived');
    expect(corpus.store.has('jd-1')).toBe(true);
    expect(corpus.deleteS3).not.toHaveBeenCalled();
  });

  it('lets the signed-in owner restore an archived job description to active', async () => {
    const user = userEvent.setup();
    const corpus = createMemoryCorpus([
      doc({ id: 'jd-2', title: 'Quant analyst', status: 'archived' }),
    ]);
    renderAdmin(ownerAuth(), corpus);

    expect(await screen.findByText(jobMarketLab.corpusAdmin.statusArchivedLabel)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: jobMarketLab.corpusAdmin.restoreLabel }));

    await waitFor(() => {
      expect(screen.getByText(jobMarketLab.corpusAdmin.statusActiveLabel)).toBeInTheDocument();
    });
    expect(corpus.store.get('jd-2')?.status).toBe('active');
    expect(corpus.deleteS3).not.toHaveBeenCalled();
  });
});
