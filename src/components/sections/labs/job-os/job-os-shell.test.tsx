import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JobOsShell } from '@/components/sections/labs/job-os/job-os-shell';
import { JobOsEmployersWorkspace } from '@/components/sections/labs/job-os/job-os-employers-workspace';
import { SiteAuthProvider } from '@/hooks/use-site-auth';
import { jobOs } from '@/data';
import {
  createJobOs,
  createMemoryJobOsBodyStorage,
  createMemoryJobOsStore,
} from '@/lib/job-os';
import { createMemorySiteAuth } from '@/lib/site-auth';

vi.mock('next/navigation', () => ({
  usePathname: () => '/labs/job-os',
  useRouter: () => ({ push: vi.fn() }),
}));

afterEach(() => {
  cleanup();
});

describe('JobOsShell', () => {
  it('blocks unauthenticated visitors from the sidebar shell', async () => {
    render(
      <SiteAuthProvider auth={createMemorySiteAuth()}>
        <JobOsShell>
          <p>Secret Job OS content</p>
        </JobOsShell>
      </SiteAuthProvider>,
    );

    await waitFor(() => {
      expect(screen.queryByText(/Checking session/i)).not.toBeInTheDocument();
    });

    expect(
      screen.getByRole('heading', {
        name: jobOs.unauthenticatedHeading,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Secret Job OS content')).not.toBeInTheDocument();
  });

  it('shows sidebar navigation when authenticated', async () => {
    render(
      <SiteAuthProvider
        auth={createMemorySiteAuth({
          status: 'authenticated',
          email: 'owner@example.com',
        })}
      >
        <JobOsShell>
          <p>Secret Job OS content</p>
        </JobOsShell>
      </SiteAuthProvider>,
    );

    expect(
      await screen.findByRole('heading', { name: jobOs.shell.heading }),
    ).toBeInTheDocument();
    expect(screen.getByText('Secret Job OS content')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Employers' })).toHaveAttribute(
      'href',
      '/labs/job-os/employers',
    );
    expect(screen.getByRole('link', { name: 'Opportunities' })).toHaveAttribute(
      'href',
      '/labs/job-os/opportunities',
    );
    expect(screen.getByRole('link', { name: 'Applications' })).toHaveAttribute(
      'href',
      '/labs/job-os/applications',
    );
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute(
      'href',
      '/labs/job-os/profile',
    );
  });
});

describe('JobOsEmployersWorkspace', () => {
  it('lists Anon Employer and creates Employers through the facade', async () => {
    const user = userEvent.setup();
    const store = createMemoryJobOsStore();
    const jobOsClient = createJobOs({
      store,
      bodies: createMemoryJobOsBodyStorage(),
      createId: (() => {
        let n = 0;
        return () => `ui-${++n}`;
      })(),
    });

    render(<JobOsEmployersWorkspace jobOsClient={jobOsClient} />);

    expect(
      await screen.findByRole('heading', { name: jobOs.employers.heading }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Anon Employer')).toBeInTheDocument();
    expect(screen.getByText(jobOs.employers.anonBadge)).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: jobOs.employers.addLabel }),
    );
    await user.clear(screen.getByLabelText(jobOs.employers.nameLabel));
    await user.type(
      screen.getByLabelText(jobOs.employers.nameLabel),
      'Willow AI',
    );
    await user.click(
      screen.getByRole('button', { name: jobOs.employers.createLabel }),
    );

    expect(
      await screen.findByText(jobOs.employers.createdLabel),
    ).toBeInTheDocument();
    expect(screen.getByText('Willow AI')).toBeInTheDocument();
  });
});
