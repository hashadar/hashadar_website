import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { JobMarketLabComparePanel } from '@/components/sections/labs/job-market-lab-compare-panel';
import { SiteAuthProvider } from '@/hooks/use-site-auth';
import { jobMarketLab } from '@/data';
import type { CanonicalCvDeps } from '@/lib/canonical-cv';
import type { FetchJobDescriptionMarkdownDeps } from '@/lib/fetch-job-description-markdown';
import type { JobDescriptionCorpusRecord } from '@/lib/job-market-corpus';
import type { AmplifyCorpusDeps } from '@/lib/job-market-corpus-amplify';
import { createMemorySiteAuth } from '@/lib/site-auth';

afterEach(() => {
  cleanup();
});

function createMemoryCorpus(records: JobDescriptionCorpusRecord[]): AmplifyCorpusDeps {
  return {
    getJobDescription: async (id) => records.find((record) => record.id === id) ?? null,
    listJobDescriptions: async () => records,
    saveJobDescription: async () => undefined,
  };
}

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

function createMemoryMarkdown(
  byKey: Record<string, string>,
): FetchJobDescriptionMarkdownDeps {
  return {
    async fetchMarkdown(s3Key) {
      return byKey[s3Key] ?? null;
    },
  };
}

function renderComparePanel(options?: {
  auth?: ReturnType<typeof createMemorySiteAuth>;
  corpus?: AmplifyCorpusDeps;
  canonicalCv?: CanonicalCvDeps;
  markdown?: FetchJobDescriptionMarkdownDeps;
}) {
  const auth = options?.auth ?? createMemorySiteAuth();
  return render(
    <SiteAuthProvider auth={auth}>
      <JobMarketLabComparePanel
        corpus={options?.corpus}
        canonicalCv={options?.canonicalCv}
        markdown={options?.markdown}
      />
    </SiteAuthProvider>,
  );
}

const ownerAuth = () =>
  createMemorySiteAuth({ status: 'authenticated', email: 'owner@example.com' });

const activeJd = {
  id: 'jd-compare-1',
  collectedAt: '2026-07-01T00:00:00.000Z',
  status: 'active' as const,
  title: 'Senior data scientist',
  s3Key: 'raw/senior-data-scientist.md',
};

describe('JobMarketLabComparePanel', () => {
  it('shows no compare controls to guests', async () => {
    renderComparePanel({ auth: createMemorySiteAuth({ status: 'unauthenticated' }) });

    expect(
      screen.queryByRole('heading', { name: jobMarketLab.console.compare.heading }),
    ).not.toBeInTheDocument();
  });

  it('never exposes raw JD markdown in the DOM', async () => {
    renderComparePanel({
      auth: ownerAuth(),
      corpus: createMemoryCorpus([activeJd]),
      canonicalCv: createMemoryCanonicalCv('Python and SQL delivery.'),
      markdown: createMemoryMarkdown({
        'raw/senior-data-scientist.md':
          '---\ncollectedAt: 2026-07-01\n---\n\nSecret JD body with Snowflake.',
      }),
    });

    expect(
      await screen.findByRole('heading', { name: jobMarketLab.console.compare.heading }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Secret JD body|Snowflake role/i)).not.toBeInTheDocument();
  });

  it('runs comparison and shows ontology-shaped results without leaking markdown', async () => {
    const user = userEvent.setup();
    renderComparePanel({
      auth: ownerAuth(),
      corpus: createMemoryCorpus([activeJd]),
      canonicalCv: createMemoryCanonicalCv('Built pipelines with Python and SQL.'),
      markdown: createMemoryMarkdown({
        'raw/senior-data-scientist.md':
          '---\ncollectedAt: 2026-07-01\n---\n\nNeed Python, Snowflake, and Tableau.',
      }),
    });

    await user.selectOptions(
      await screen.findByLabelText(jobMarketLab.console.compare.selectLabel),
      activeJd.id,
    );
    await user.click(
      screen.getByRole('button', { name: jobMarketLab.console.compare.runButtonLabel }),
    );

    expect(
      await screen.findByRole('heading', { name: jobMarketLab.console.compare.matchesHeading }),
    ).toBeInTheDocument();
    expect(screen.getByText('python')).toBeInTheDocument();
    expect(screen.getByText('snowflake')).toBeInTheDocument();
    expect(screen.getByText('tableau')).toBeInTheDocument();
    expect(
      screen.getByText('Prepare a concise example of your python work.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Build demonstrable snowflake experience for similar roles.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Need Python, Snowflake/i)).not.toBeInTheDocument();
  });

  it('blocks comparison when no canonical CV is saved', async () => {
    const user = userEvent.setup();
    renderComparePanel({
      auth: ownerAuth(),
      corpus: createMemoryCorpus([activeJd]),
      canonicalCv: createMemoryCanonicalCv(null),
      markdown: createMemoryMarkdown({
        'raw/senior-data-scientist.md': 'Python role.',
      }),
    });

    await user.selectOptions(
      await screen.findByLabelText(jobMarketLab.console.compare.selectLabel),
      activeJd.id,
    );
    await user.click(
      screen.getByRole('button', { name: jobMarketLab.console.compare.runButtonLabel }),
    );

    expect(
      await screen.findByText(jobMarketLab.console.compare.noCvError),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.queryByRole('heading', {
          name: jobMarketLab.console.compare.matchesHeading,
        }),
      ).not.toBeInTheDocument();
    });
  });
});
