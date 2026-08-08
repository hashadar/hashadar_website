import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { JobOsOverview } from '@/components/sections/labs/job-os/job-os-overview';
import { jobOs } from '@/data';
import {
  createJobOs,
  createMemoryJobOsBodyStorage,
  createMemoryJobOsStore,
} from '@/lib/job-os';

afterEach(() => {
  cleanup();
});

function createClient() {
  return createJobOs({
    store: createMemoryJobOsStore(),
    bodies: createMemoryJobOsBodyStorage(),
    now: () => '2026-08-01T12:00:00.000Z',
    createId: (() => {
      let n = 0;
      return () => `ov-${++n}`;
    })(),
  });
}

describe('JobOsOverview', () => {
  it('shows empty state with Opportunities link when there are no attention rows', async () => {
    const jobOsClient = createClient();
    render(<JobOsOverview jobOsClient={jobOsClient} />);

    expect(
      await screen.findByRole('heading', { name: jobOs.overview.heading }),
    ).toBeInTheDocument();
    expect(screen.getByText(jobOs.overview.emptyList)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: jobOs.overview.emptyOpportunitiesCta }),
    ).toHaveAttribute('href', '/labs/job-os/opportunities');
  });

  it('renders attention rows linking to Application detail', async () => {
    const jobOsClient = createClient();
    const employer = await jobOsClient.createEmployer({
      name: 'Acme Analytics',
      sizeTier: 'scaleup',
      prestigeTier: 'mid',
      sector: 'technology',
    });
    expect(employer.status).toBe('created');
    if (employer.status !== 'created') {
      return;
    }

    const opportunity = await jobOsClient.createOpportunity({
      employerId: employer.employer.id,
      noticedAt: '2026-07-20T09:00:00.000Z',
      title: 'Senior data scientist',
    });
    expect(opportunity.status).toBe('created');
    if (opportunity.status !== 'created') {
      return;
    }

    const pursued = await jobOsClient.pursueOpportunity(
      opportunity.opportunity.id,
    );
    expect(pursued.status).toBe('pursued');
    if (pursued.status !== 'pursued') {
      return;
    }
    await jobOsClient.updateTrackingNote(
      pursued.application.id,
      'Recruiter screen booked',
    );

    render(<JobOsOverview jobOsClient={jobOsClient} />);

    await waitFor(() => {
      expect(screen.getByText('Acme Analytics')).toBeInTheDocument();
    });
    expect(screen.getByText('Senior data scientist')).toBeInTheDocument();
    expect(
      screen.getByText(jobOs.overview.statusOptions.researching),
    ).toBeInTheDocument();
    expect(screen.getByText('Recruiter screen booked')).toBeInTheDocument();

    const detailHref = `/labs/job-os/applications/${pursued.application.id}`;
    expect(screen.getByRole('link', { name: 'Acme Analytics' })).toHaveAttribute(
      'href',
      detailHref,
    );
    expect(
      screen.getByRole('link', { name: 'Senior data scientist' }),
    ).toHaveAttribute('href', detailHref);
  });
});
