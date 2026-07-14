import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JobMarketLabAdminSection } from '@/components/sections/labs/job-market-lab-admin-section';
import { SiteAuthProvider } from '@/hooks/use-site-auth';
import { jobMarketLab } from '@/data';
import { createMemorySiteAuth } from '@/lib/site-auth';
import type { StartJobMarketRecompute } from '@/lib/job-market-lab';

afterEach(() => {
  cleanup();
});

function renderAdmin(options?: {
  auth?: ReturnType<typeof createMemorySiteAuth>;
  startRecompute?: StartJobMarketRecompute;
}) {
  const auth = options?.auth ?? createMemorySiteAuth();
  return render(
    <SiteAuthProvider auth={auth}>
      <JobMarketLabAdminSection startRecompute={options?.startRecompute} />
    </SiteAuthProvider>,
  );
}

describe('JobMarketLabAdminSection', () => {
  it('does not show admin controls when the visitor is unauthenticated', async () => {
    renderAdmin();

    await waitFor(() => {
      expect(screen.queryByText(/Checking session/i)).not.toBeInTheDocument();
    });

    expect(
      screen.queryByRole('heading', { name: jobMarketLab.admin.heading }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: jobMarketLab.admin.startButtonLabel }),
    ).not.toBeInTheDocument();
  });

  it('shows controls when authenticated and surfaces a started result', async () => {
    const user = userEvent.setup();
    const startRecompute = vi.fn<StartJobMarketRecompute>().mockResolvedValue({
      status: 'started',
      runId: 'run-42',
    });

    renderAdmin({
      auth: createMemorySiteAuth({
        status: 'authenticated',
        email: 'owner@example.com',
      }),
      startRecompute,
    });

    expect(
      await screen.findByRole('heading', { name: jobMarketLab.admin.heading }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: jobMarketLab.admin.startButtonLabel }),
    );

    expect(startRecompute).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText(
        jobMarketLab.admin.startedMessage.replace('{runId}', 'run-42'),
      ),
    ).toBeInTheDocument();
  });

  it('surfaces a rejected single-flight reason to the owner', async () => {
    const user = userEvent.setup();
    const startRecompute = vi.fn<StartJobMarketRecompute>().mockResolvedValue({
      status: 'rejected',
      reason: 'An analysis run is already in progress',
    });

    renderAdmin({
      auth: createMemorySiteAuth({
        status: 'authenticated',
        email: 'owner@example.com',
      }),
      startRecompute,
    });

    await user.click(
      await screen.findByRole('button', {
        name: jobMarketLab.admin.startButtonLabel,
      }),
    );

    expect(
      await screen.findByText(jobMarketLab.admin.rejectedHeading),
    ).toBeInTheDocument();
    expect(
      screen.getByText('An analysis run is already in progress'),
    ).toBeInTheDocument();
  });
});
