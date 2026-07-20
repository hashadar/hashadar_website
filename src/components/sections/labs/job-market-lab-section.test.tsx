import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { JobMarketLabSection } from '@/components/sections/labs/job-market-lab-section';
import { SiteAuthProvider } from '@/hooks/use-site-auth';
import { jobMarketLab } from '@/data';
import type { PublishedJobMarketResult } from '@/lib/job-market-lab';
import { createMemorySiteAuth } from '@/lib/site-auth';

afterEach(() => {
  cleanup();
});

function renderLab(
  publication: PublishedJobMarketResult,
  auth = createMemorySiteAuth(),
) {
  return render(
    <SiteAuthProvider auth={auth}>
      <JobMarketLabSection publication={publication} />
    </SiteAuthProvider>,
  );
}

const published: PublishedJobMarketResult = {
  status: 'published',
  snapshot: {
    documentCount: 12,
    publishedAt: '2026-07-14T12:00:00.000Z',
    skills: [
      { name: 'python', count: 9 },
      { name: 'sql', count: 7 },
    ],
    technologies: [
      { name: 'python', count: 9 },
      { name: 'sql', count: 7 },
    ],
    seniority: [
      { name: 'senior', count: 8 },
      { name: 'mid', count: 4 },
    ],
    roleFamily: [
      { name: 'data_science', count: 7 },
      { name: 'analytics', count: 5 },
    ],
    clusters: [
      { id: 0, size: 7, label: 'Theme 1' },
      { id: 1, size: 5, label: 'Theme 2' },
    ],
    projection: [
      { x: 0.1, y: 0.2, clusterId: 0 },
      { x: 0.4, y: 0.6, clusterId: 1 },
    ],
  },
};

describe('JobMarketLabSection', () => {
  it('renders a data-first pulse with technologies, ranked themes, and map', () => {
    renderLab(published);

    expect(screen.queryByText(jobMarketLab.emptyState)).not.toBeInTheDocument();
    expect(screen.getByText(jobMarketLab.brandEyebrow)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: jobMarketLab.heading })).toBeInTheDocument();
    expect(screen.getByText(jobMarketLab.purposeLine)).toBeInTheDocument();
    expect(screen.getByText(jobMarketLab.metricsHeading)).toBeInTheDocument();

    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText(/14 Jul 2026/i)).toBeInTheDocument();
    expect(screen.getByText(jobMarketLab.topSignalsLabel)).toBeInTheDocument();
    expect(screen.getByText(/python · sql/i)).toBeInTheDocument();

    expect(screen.getByText(jobMarketLab.skillsHeading)).toBeInTheDocument();
    expect(screen.getByText(jobMarketLab.skillsCaption)).toBeInTheDocument();
    expect(screen.getByText('python')).toBeInTheDocument();
    expect(screen.getByText('sql')).toBeInTheDocument();

    expect(screen.getByText(jobMarketLab.clustersHeading)).toBeInTheDocument();
    expect(screen.getByText(jobMarketLab.clustersSizeHeading)).toBeInTheDocument();
    expect(screen.getByText(jobMarketLab.clustersMapHeading)).toBeInTheDocument();
    expect(screen.getByText(jobMarketLab.clustersCaption)).toBeInTheDocument();
    expect(screen.getByText('Theme 1')).toBeInTheDocument();
    expect(screen.getByText('Theme 2')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: jobMarketLab.clustersMapHeading }),
    ).toBeInTheDocument();

    expect(screen.getByText(jobMarketLab.taxonomyHeading)).toBeInTheDocument();
    expect(screen.getByText('senior')).toBeInTheDocument();
    expect(screen.getByText('data_science')).toBeInTheDocument();

    expect(screen.queryByText(/Aggregates only/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Guests/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sign-in/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: jobMarketLab.craft.heading }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: jobMarketLab.admin.heading }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(jobMarketLab.corpusAdmin.heading)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', {
        name: jobMarketLab.payPrestigeAnalytics.heading,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: jobMarketLab.console.openConsoleLabel }),
    ).not.toBeInTheDocument();
  });

  it('renders the craft methodology as its own visible section with all stages', () => {
    renderLab(published);

    expect(
      screen.getByRole('heading', { name: jobMarketLab.craft.heading }),
    ).toBeInTheDocument();
    expect(screen.getByText(jobMarketLab.craft.intro)).toBeInTheDocument();
    if (jobMarketLab.craft.closing) {
      expect(screen.getByText(jobMarketLab.craft.closing)).toBeInTheDocument();
    } else {
      expect(screen.queryByText(/Owner curation/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Guests only/i)).not.toBeInTheDocument();
    }

    for (const stage of jobMarketLab.craft.stages) {
      expect(screen.getByRole('heading', { name: stage.title })).toBeInTheDocument();
      expect(screen.getByText(stage.inShort)).toBeInTheDocument();
      expect(screen.getByText(stage.underTheHood)).toBeInTheDocument();
    }

    expect(screen.getAllByText(jobMarketLab.craft.inShortLabel).length).toBe(
      jobMarketLab.craft.stages.length,
    );
    expect(screen.getAllByText(jobMarketLab.craft.underTheHoodLabel).length).toBe(
      jobMarketLab.craft.stages.length,
    );
  });

  it('never embeds owner management panels even for signed-in owners', async () => {
    renderLab(
      published,
      createMemorySiteAuth({
        status: 'authenticated',
        email: 'owner@example.com',
      }),
    );

    expect(
      await screen.findByRole('link', { name: jobMarketLab.console.openConsoleLabel }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: jobMarketLab.admin.heading }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: jobMarketLab.corpusAdmin.heading }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', {
        name: jobMarketLab.payPrestigeAnalytics.heading,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: jobMarketLab.console.compare.heading }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', {
        name: jobMarketLab.console.marketCompare.heading,
      }),
    ).not.toBeInTheDocument();
  });

  it('still shows the empty state when nothing is published', () => {
    renderLab({ status: 'empty' });

    expect(screen.getByText(jobMarketLab.emptyState)).toBeInTheDocument();
    expect(screen.queryByText(jobMarketLab.skillsHeading)).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: jobMarketLab.craft.heading }),
    ).toBeInTheDocument();
    expect(screen.getByText(jobMarketLab.craft.stages[0]!.title)).toBeInTheDocument();
  });
});
